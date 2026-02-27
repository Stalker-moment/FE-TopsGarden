"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { 
  FaBolt, 
  FaPlug, 
  FaTachometerAlt, 
  FaHistory, 
  FaCalendarAlt, 
  FaLeaf, 
  FaChartLine,
  FaExclamationCircle,
  FaTrash,
  FaCog
} from "react-icons/fa";
import { ApexOptions } from "apexcharts";
import { PzemData, PzemDevice, PzemLog } from "@/types/pzem";
import DeviceSettingsModal from "./DeviceSettingsModal";
import ConfirmationModal from "./ConfirmationModal";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Configuration
const HTTPS_API_URL = process.env.NEXT_PUBLIC_HTTPS_API_URL || "localhost:3001";
const API_URL = `https://${HTTPS_API_URL}`;
const WS_URL = process.env.NEXT_PUBLIC_WS_PZEM_URL || `wss://${HTTPS_API_URL}/pzem`;

// --- Components ---

const CardMetric = ({ 
  title, 
  value, 
  unit, 
  icon, 
  color, 
  subValue 
}: { 
  title: string; 
  value: string | number; 
  unit: string; 
  icon: React.ReactNode; 
  color: string;
  subValue?: string;
}) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="relative overflow-hidden rounded-[2rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 shadow-lg"
  >
    <div className={`absolute right-0 top-0 p-4 opacity-10 text-6xl ${color}`}>
      {icon}
    </div>
    <div className="relative z-10">
      <div className={`p-3 w-fit rounded-2xl bg-white dark:bg-gray-700 shadow-sm ${color} text-2xl mb-4`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <h4 className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-1 tracking-tight">
        {value} <span className="text-lg font-medium text-gray-400 ml-1">{unit}</span>
      </h4>
      {subValue && (
        <p className="text-xs font-semibold text-gray-400 mt-2 flex items-center gap-1">
          {subValue}
        </p>
      )}
    </div>
  </motion.div>
);

const PowerDashboard: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // State for Real Data
  const [devices, setDevices] = useState<PzemDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [realtimeData, setRealtimeData] = useState<PzemData | null>(null);
  const [status, setStatus] = useState<"ONLINE" | "OFFLINE">("OFFLINE");
  const [chartData, setChartData] = useState<PzemLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<PzemLog[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  
  // Max Power Limit for Load LCD
  const [maxPowerLimit, setMaxPowerLimit] = useState<number | ''>(450);

  useEffect(() => {
    const saved = localStorage.getItem("pzem_max_power");
    if (saved) setMaxPowerLimit(Number(saved));
  }, []);

  const handleMaxPowerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    setMaxPowerLimit(val);
    if (val !== '') {
      localStorage.setItem("pzem_max_power", val.toString());
    }
  };

  // Chart toggles
  const [activeMetrics, setActiveMetrics] = useState({
    power: true,
    voltage: false,
    current: false
  });

  // WebSocket Reference
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Check theme
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // 1. Fetch Devices List
  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/device/pzem`);
      if (res.ok) {
        const data: PzemDevice[] = await res.json();
        setDevices(data);
        if (data.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch devices:", error);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []); // Run once on mount

  // 2. Fetch Initial Data (Chart & Logs) when device selected
  useEffect(() => {
    if (!selectedDeviceId) return;

    const fetchHistory = async () => {
      try {
        // Fetch Chart Data
        const chartRes = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/chart`);
        if (chartRes.ok) {
          const chartJson = await chartRes.json();
          setChartData(chartJson);
        }

        // Fetch Logs
        const logsRes = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/logs?limit=10`);
        if (logsRes.ok) {
          const logsJson = await logsRes.json();
          setRecentLogs(logsJson);
        }
        
        // Fetch Latest (First load before WS kicks in)
        const latestRes = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/latest`);
        if (latestRes.ok) {
           const latestJson = await latestRes.json();
           if (latestJson.latest) {
             setRealtimeData(latestJson.latest);
             setStatus(latestJson.status);
           }
        }

      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };

    fetchHistory();
  }, [selectedDeviceId]);

  // 3. WebSocket Connection
  useEffect(() => {
    // Cleanup previous connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to PZEM WebSocket");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        // Message format: Array of devices with data
        // [ { id, name, ..., data: { voltage, ... }, logs: [], chart: [] }, ... ]
        
        if (Array.isArray(message)) {
          // Find data for currently selected device
          const currentDeviceData = message.find((d: any) => d.id === selectedDeviceId);
          
          if (currentDeviceData && currentDeviceData.data) {
            setRealtimeData({
              id: currentDeviceData.id,
              ...currentDeviceData.data,
              createdAt: currentDeviceData.lastUpdate || new Date().toISOString()
            });
            setStatus("ONLINE");
            
            // UPDATE: Realtime logs and chart data from WebSocket
            if (currentDeviceData.logs) {
              setRecentLogs(currentDeviceData.logs);
            }
            if (currentDeviceData.chart) {
              setChartData(currentDeviceData.chart);
            }
          }
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setStatus("OFFLINE");
    };

    ws.onclose = () => {
      console.log("Disconnected from PZEM WebSocket");
      setStatus("OFFLINE");
    };

    return () => {
      ws.close();
    };
  }, [selectedDeviceId]); // Re-connect or filter when device changes? 
  // Actually, usually WS subscribes to all, so we just filter in onmessage. 
  // But putting it in useEffect[selectedDeviceId] is fine, it just reconnects/re-filters.
  // Better optimization: Keep WS open, just update filter in state. 
  // But for simplicity, let's leave as is or move selectedDeviceId check into callback (use ref or careful dependency)

  // 4. Reset Energy Handler
  const confirmResetEnergy = async () => {
    if (!selectedDeviceId) return;

    try {
      const res = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/reset-command`, {
        method: 'POST'
      });
      if (res.ok) {
        alert("Reset command queued. The device will reset energy on next update.");
       // Optionally update local state to show 'Pending'
      } else {
        alert("Failed to send reset command.");
      }
    } catch (error) {
      console.error("Reset error:", error);
      alert("Error sending reset command.");
    } finally {
      setIsResetConfirmOpen(false);
    }
  };

  const handleResetClick = () => {
     if (!selectedDeviceId) return;
     setIsResetConfirmOpen(true);
  };


  // --- Helper Data ---
  
  // Use realtimeData if available, otherwise fallback to empty/zeros
  const displayData = realtimeData || {
    voltage: 0,
    current: 0,
    power: 0,
    energy: 0,
    frequency: 0,
    pf: 0,
    updatedAt: new Date().toISOString()
  };

  // Prepare dynamic Chart Series and Y-Axis for Live Load Trend
  const powerTrendSeries: any[] = [];
  const powerTrendColors: string[] = [];
  const powerTrendYAxis: any[] = [];

  if (activeMetrics.power) {
    powerTrendSeries.push({
      name: "Power (W)",
      data: chartData.map(d => ({ x: new Date(d.createdAt).getTime(), y: d.power }))
    });
    powerTrendColors.push('#f59e0b'); // Yellow
    powerTrendYAxis.push({
      seriesName: 'Power (W)',
      show: true,
      labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' }, formatter: (val: number) => val.toFixed(1) }
    });
  }

  if (activeMetrics.voltage) {
    powerTrendSeries.push({
      name: "Voltage (V)",
      data: chartData.map(d => ({ x: new Date(d.createdAt).getTime(), y: d.voltage }))
    });
    powerTrendColors.push('#3b82f6'); // Blue
    powerTrendYAxis.push({
      seriesName: 'Voltage (V)',
      opposite: powerTrendYAxis.length > 0, // Put on right if power is active
      show: true,
      labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' }, formatter: (val: number) => val.toFixed(1) }
    });
  }

  if (activeMetrics.current) {
    powerTrendSeries.push({
      name: "Current (A)",
      data: chartData.map(d => ({ x: new Date(d.createdAt).getTime(), y: d.current }))
    });
    powerTrendColors.push('#ef4444'); // Red
    powerTrendYAxis.push({
      seriesName: 'Current (A)',
      opposite: powerTrendYAxis.length > 0, // Put on right if another axis is active
      show: true,
      labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' }, formatter: (val: number) => val.toFixed(2) }
    });
  }

  // Force at least one invisible axis if none selected to avoid ApexCharts crash
  if (powerTrendYAxis.length === 0) {
    powerTrendYAxis.push({ show: false });
  }

  // For Energy Chart (Monthly), backend doesn't give monthly summary yet in the docs provided.
  // The docs mention "Grafik "Live Load Trend" via GET /:id/chart".
  // It doesn't explicitly mention a monthly bar chart endpoint, but "Trigger Reset Energi (Bulanan)" implies manual reset.
  // I will hide the Monthly Bar Chart for now or mock it / use the single total energy value.
  // Or, if I have historical logs, I could aggregate, but "Recent Logs" limit is small.
  // I'll comment out the Monthly Chart data or leave it static for now as "Coming Soon" or aggregate if possible.
  // Let's just use a dummy or the total energy as a single bar.
  
  const energyChartOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    colors: ['#22c55e'],
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: '60%', dataLabels: { position: 'top' } }
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => val + " kWh",
      offsetY: -20,
      style: { fontSize: '10px', colors: [isDarkMode ? '#cbd5e1' : '#334155'] }
    },
    grid: { borderColor: isDarkMode ? '#334155' : '#e2e8f0', strokeDashArray: 4 },
    xaxis: {
      categories: ['Current Total'], 
      labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' } },
      title: { text: "kWh", style: { color: isDarkMode ? '#9ca3af' : '#6b7280' } }
    },
    tooltip: { theme: isDarkMode ? 'dark' : 'light' },
    theme: { mode: isDarkMode ? 'dark' : 'light' }
  };

  const energySeries = [{ name: 'Total Energy', data: [displayData.energy] }];

  const powerTrendOptions: ApexOptions = {
    chart: { type: 'area', sparkline: { enabled: false }, toolbar: { show: false }, background: 'transparent', animations: { enabled: true } },
    stroke: { curve: 'smooth', width: 2 },
    legend: { show: false }, // We use custom toggles above chart
    // Disable dataLabels to avoid clutter
    dataLabels: { enabled: false },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    colors: powerTrendColors,
    grid: { borderColor: isDarkMode ? '#334155' : '#e2e8f0', strokeDashArray: 4 },
    xaxis: {
      type: 'datetime',
      labels: { 
        show: false,
        datetimeUTC: false // Force local time
      }, 
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: {
         enabled: false // Disable x-axis tooltip since we use the main tooltip
      }
    },
    yaxis: powerTrendYAxis,
    tooltip: { 
      theme: isDarkMode ? 'dark' : 'light', 
      x: { 
        format: 'HH:mm:ss',
        formatter: (val) => {
             return new Date(val).toLocaleTimeString('id-ID', { 
               timeZone: 'Asia/Jakarta',
               hour: '2-digit', 
               minute: '2-digit', 
               second: '2-digit',
               hour12: false 
             });
        }
      },
      y: {
        formatter: (val, { seriesIndex, w }) => {
          if (!w || !w.globals || !w.globals.seriesNames) return val.toFixed(1);
          const name = w.globals.seriesNames[seriesIndex] || "";
          if (name.includes('Power')) return val.toFixed(1) + " W";
          if (name.includes('Voltage')) return val.toFixed(1) + " V";
          if (name.includes('Current')) return val.toFixed(2) + " A";
          return val.toString();
        }
      }
    },
    theme: { mode: isDarkMode ? 'dark' : 'light' }
  };

  return (
    <div className="min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300">
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-yellow-400/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-orange-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white flex items-center gap-3">
              <FaBolt className="text-yellow-500" />
              Power Monitor
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Realtime monitoring & historical energy usage via PZEM-004T.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Device Selector */}
            {devices.length > 0 && (
               <select 
                 className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-yellow-500"
                 value={selectedDeviceId || ""}
                 onChange={(e) => setSelectedDeviceId(e.target.value)}
               >
                 {devices.map(dev => (
                   <option key={dev.id} value={dev.id}>{dev.name} ({dev.location})</option>
                 ))}
               </select>
            )}

            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className={`h-2 w-2 rounded-full ${status === "ONLINE" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></div>
              <span className={`text-sm font-semibold ${status === "ONLINE" ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}>
                {status === "ONLINE" ? "Connected" : "Offline"}
              </span>
            </div>
            
            <button 
                onClick={handleResetClick}
                title="Reset Energy (kWh)"
                className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
            >
                <FaTrash size={14} />
            </button>
            
            <button 
                onClick={() => setIsSettingsOpen(true)}
                title="Manage Sensors"
                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
                <FaCog size={14} />
            </button>
          </div>
        </div>

        {/* Settings Modal */}
        <DeviceSettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          devices={devices}
          onDevicesUpdate={fetchDevices}
          apiUrl={API_URL}
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          onConfirm={confirmResetEnergy}
          title="Reset Energy Counter?"
          message="Are you sure you want to reset the energy (kWh) counter for this device? This action cannot be undone."
          confirmText="Yes, Reset"
          isDanger={true}
        />

        {/* Realtime Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <CardMetric 
            title="Total Energy (Month)" 
            value={displayData.energy.toFixed(2)} 
            unit="kWh" 
            icon={<FaLeaf />} 
            color="text-green-500" 
            subValue={`Est. Cost: Rp ${(displayData.energy * 1444.70).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`} // Assuming 1444 IDR per kWh
          />
          <CardMetric 
            title="Active Power" 
            value={displayData.power.toFixed(1)} 
            unit="W" 
            icon={<FaBolt />} 
            color="text-yellow-500"
            subValue={`PF: ${displayData.pf.toFixed(2)}`}
          />
          <CardMetric 
            title="Voltage" 
            value={displayData.voltage.toFixed(1)} 
            unit="V" 
            icon={<FaPlug />} 
            color="text-blue-500"
            subValue={`Freq: ${displayData.frequency.toFixed(1)} Hz`}
          />
          <CardMetric 
            title="Current" 
            value={displayData.current.toFixed(2)} 
            unit="A" 
            icon={<FaTachometerAlt />} 
            color="text-red-500"
          />
        </div>

        {/* Load Percentage Bar (LCD physical reference) */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 md:px-6 md:py-5 rounded-[1.5rem] bg-white/70 dark:bg-gray-900 border border-white/50 dark:border-gray-800 text-gray-800 dark:text-white shadow-xl relative overflow-hidden backdrop-blur-xl"
        >
          {/* LCD Glow Effect */}
          <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay pointer-events-none"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 relative z-10">
            {/* Percentage Text Area */}
            <div className="flex items-center gap-3 w-full md:w-auto md:min-w-[160px]">
              <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-500 dark:text-blue-400 flex items-center justify-center">
                <FaTachometerAlt size={20} />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1">Load %</span>
                <div className="text-2xl font-black text-gray-800 dark:text-white flex items-baseline gap-1 leading-none">
                  {((displayData.power / (typeof maxPowerLimit === 'number' && maxPowerLimit > 0 ? maxPowerLimit : 1)) * 100).toFixed(1)}<span className="text-xl text-gray-500">%</span>
                </div>
              </div>
            </div>

            {/* LCD Progress Bar Area */}
            <div className="flex-1 w-full space-y-2">
              <div className="flex justify-between items-end text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 font-mono font-semibold tracking-wider">0W</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400 font-mono tracking-wider">LIMIT:</span>
                  <input
                    type="number"
                    value={maxPowerLimit}
                    onChange={handleMaxPowerChange}
                    className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 w-16 sm:w-20 text-center font-mono text-blue-600 dark:text-blue-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors text-xs sm:text-sm"
                  />
                  <span className="text-gray-600 dark:text-gray-400 font-mono tracking-wider">W</span>
                </div>
              </div>

              {/* Smooth Continuous Progress Bar */}
              <div className="h-6 sm:h-7 w-full bg-gray-200 dark:bg-gray-950/90 p-[4px] border border-gray-300 dark:border-gray-800/80 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] rounded-[4px] relative overflow-hidden backdrop-blur-sm transform -skew-x-[12deg] ml-1">
                {/* Subtle digital grid overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMCA0TDAgMEw0IDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-20 dark:opacity-40 pointer-events-none z-20"></div>
                
                {(() => {
                  const safeLimit = typeof maxPowerLimit === 'number' && maxPowerLimit > 0 ? maxPowerLimit : 1;
                  let fillPct = (displayData.power / safeLimit) * 100;
                  fillPct = Math.min(100, Math.max(0, fillPct));
                  
                  let fillColors = 'from-blue-600 via-blue-500 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
                  let tipColor = 'bg-blue-300';
                  if (fillPct >= 80) {
                    fillColors = 'from-red-600 via-red-500 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
                    tipColor = 'bg-red-300';
                  } else if (fillPct >= 60) {
                    fillColors = 'from-yellow-600 via-yellow-500 to-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]';
                    tipColor = 'bg-yellow-200';
                  }

                  return (
                     <div className="relative w-full h-full rounded-[2px] overflow-hidden z-10 bg-white/50 dark:bg-gray-900/50">
                        {/* The animated continuous fill */}
                        <div 
                          className={`absolute top-0 left-0 h-full bg-gradient-to-r ${fillColors} transition-all duration-[800ms] ease-out`}
                          style={{ width: `${fillPct}%` }}
                        >
                          {/* Inner light gradient for a 3D glass effect */}
                          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/60 dark:from-white/30 to-transparent"></div>
                          {/* Highlight tip at the end of the progress bar */}
                          <div className={`absolute top-0 right-0 bottom-0 w-1 ${tipColor} opacity-90 shadow-[0_0_8px_rgba(255,255,255,1)]`}></div>
                        </div>
                     </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Charts Section */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          
          {/* Daily Consumption Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 rounded-[2rem] bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/50 dark:border-gray-700 p-6 md:p-8 shadow-lg"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaCalendarAlt className="text-green-500"/> 
                Energy Usage
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ReactApexChart options={energyChartOptions} series={energySeries} type="bar" height="100%" />
            </div>
            <div className="mt-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 flex items-start gap-3">
              <FaExclamationCircle className="text-orange-500 mt-1 shrink-0" />
              <p className="text-sm text-orange-700 dark:text-orange-300">
                <strong>Note:</strong> Data usage accumulates until manually reset or configured auto-reset.
              </p>
            </div>
          </motion.div>

          {/* Realtime Power Trend */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 rounded-[2rem] bg-white/60 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 backdrop-blur-md border border-white/50 dark:border-gray-700 p-6 md:p-8 shadow-xl text-gray-800 dark:text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4 relative z-10">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 mb-1">
                  <FaChartLine className="text-yellow-500 dark:text-yellow-400"/> 
                  Live Trend
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Real-time fluctuations.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveMetrics(p => ({ ...p, power: !p.power }))}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${activeMetrics.power ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  Power
                </button>
                <button 
                  onClick={() => setActiveMetrics(p => ({ ...p, voltage: !p.voltage }))}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${activeMetrics.voltage ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  Voltage
                </button>
                <button 
                  onClick={() => setActiveMetrics(p => ({ ...p, current: !p.current }))}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${activeMetrics.current ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700' : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  Current
                </button>
              </div>
            </div>
            
            <div className="h-[200px] -mx-4 relative z-10">
               <ReactApexChart options={powerTrendOptions} series={powerTrendSeries} type="area" height="100%" />
            </div>

            <div className="mt-6 space-y-4 relative z-10">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Current Load</span>
                <span className="font-bold text-lg text-gray-800 dark:text-white">{displayData.power.toFixed(1)} W</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-gray-500 dark:text-gray-400 text-sm">Status</span>
                 <span className={`font-bold text-sm px-2 py-1 rounded ${status === "ONLINE" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
                    {status}
                 </span>
              </div>
            </div>
          </motion.div>
        
        </div>

        {/* History Table Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-[2rem] bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/50 dark:border-gray-700 p-6 md:p-8 shadow-lg"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FaHistory className="text-blue-500"/> 
              Recent Logs
            </h3>
            {/* <button className="text-sm font-semibold text-blue-500 hover:underline">View All History</button> */}
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Time</th>
                    <th className="py-3 px-4 font-semibold">Voltage (V)</th>
                    <th className="py-3 px-4 font-semibold">Current (A)</th>
                    <th className="py-3 px-4 font-semibold">Power (W)</th>
                    <th className="py-3 px-4 font-semibold">Energy (Total kWh)</th>
                  </tr>
                </thead>
                <tbody className="text-sm cursor-default">
                  {recentLogs.length > 0 ? (
                    recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                        <td className="py-3 px-4 font-medium">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-4">{log.voltage.toFixed(1)}</td>
                        <td className="py-3 px-4">{log.current.toFixed(2)}</td>
                        <td className="py-3 px-4">{log.power.toFixed(1)}</td>
                        <td className="py-3 px-4">{log.energy.toFixed(3)}</td>
                        </tr>
                    ))
                  ) : (
                      <tr>
                          <td colSpan={5} className="py-4 text-center text-gray-500">No logs available</td>
                      </tr>
                  )}
                </tbody>
             </table>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default PowerDashboard;
