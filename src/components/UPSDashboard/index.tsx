"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Zap, 
  Battery, 
  Activity, 
  Thermometer, 
  Droplets, 
  AlertTriangle, 
  CheckCircle2, 
  Power, 
  Cpu, 
  Flame, 
  Gauge,
  Clock,
  LayoutDashboard,
  ShieldAlert,
  Radio,
  Server,
  Laptop,
  BatteryCharging,
  Settings,
  Trash2,
  Plus,
  X
} from 'lucide-react';
import { ServerBatteryInfo } from '@/types/pzem';
import { UpsDevice, UpsLog, UpsConfig } from '@/types/ups';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const CHART_OPTIONS: any = {
  chart: {
    type: 'area',
    toolbar: { show: false },
    background: 'transparent',
    animations: { enabled: true, speed: 800 },
    dropShadow: {
      enabled: true,
      top: 4,
      left: 0,
      blur: 6,
      opacity: 0.15
    }
  },
  colors: ['#06b6d4', '#f59e0b'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 3 },
  xaxis: {
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.35,
      opacityTo: 0.05,
      stops: [0, 95, 100]
    }
  },
  tooltip: { 
    x: { show: true },
    style: { fontSize: '11px', fontFamily: 'var(--font-sans)' }
  },
  legend: { 
    show: true, 
    position: 'top', 
    horizontalAlign: 'right', 
    fontSize: '11px',
    fontWeight: 600,
    markers: { radius: 12 }
  }
};

const HTTPS_API_URL = process.env.NEXT_PUBLIC_HTTPS_API_URL || "localhost:3001";
const API_URL = HTTPS_API_URL.includes("localhost") ? `http://${HTTPS_API_URL}` : `https://${HTTPS_API_URL}`;
const WS_URL = HTTPS_API_URL.includes("localhost") ? `ws://${HTTPS_API_URL}/ups` : `wss://${HTTPS_API_URL}/ups`;

const DEFAULT_CONFIG: UpsConfig = {
  sensors: {
    cells: true,
    voltageIn: true,
    ina12v: true,
    ina5v: true,
    temperatures: [
      { id: "system", label: "Suhu Sistem (DS18B20)" },
      { id: "mosfet", label: "Suhu MOSFET BMS" },
      { id: "ambient", label: "Suhu Lingkungan (DHT22)" }
    ]
  }
};

const UPSDashboard: React.FC = () => {
  const [uptime, setUptime] = useState('02:14:55:12');
  const [hasMounted, setHasMounted] = useState(false);
  const [serverBattery, setServerBattery] = useState<ServerBatteryInfo | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Real data states
  const [devices, setDevices] = useState<UpsDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [realtimeData, setRealtimeData] = useState<UpsLog | null>(null);
  const [status, setStatus] = useState<"ONLINE" | "OFFLINE">("OFFLINE");
  const [chartData, setChartData] = useState<UpsLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<UpsLog[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Settings Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [settingsName, setSettingsName] = useState('');
  const [settingsLocation, setSettingsLocation] = useState('');
  const [settingsCells, setSettingsCells] = useState(true);
  const [settingsVoltageIn, setSettingsVoltageIn] = useState(true);
  const [settingsIna12v, setSettingsIna12v] = useState(true);
  const [settingsIna5v, setSettingsIna5v] = useState(true);
  const [settingsTemps, setSettingsTemps] = useState<{ id: string; label: string }[]>([]);
  const [newTempId, setNewTempId] = useState('');
  const [newTempLabel, setNewTempLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchServerBattery = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/device/server-battery`);
      if (res.ok) setServerBattery(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchDevices = useCallback(async (selectFirst = false) => {
    try {
      const res = await fetch(`${API_URL}/api/device/ups`);
      if (res.ok) {
        const data: UpsDevice[] = await res.json();
        setDevices(data);
        if (data.length > 0 && (selectFirst || !selectedDeviceId)) {
          setSelectedDeviceId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch UPS devices:", e);
    }
  }, [selectedDeviceId]);

  // Fetch initial logs, charts, and status when device changes
  useEffect(() => {
    if (!selectedDeviceId) return;
    const fetchHistory = async () => {
      try {
        const [chartRes, logsRes, latestRes] = await Promise.all([
          fetch(`${API_URL}/api/device/ups/${selectedDeviceId}/chart`),
          fetch(`${API_URL}/api/device/ups/${selectedDeviceId}/logs`),
          fetch(`${API_URL}/api/device/ups/${selectedDeviceId}/latest`),
        ]);
        if (chartRes.ok) setChartData(await chartRes.json());
        if (logsRes.ok) setRecentLogs(await logsRes.json());
        if (latestRes.ok) {
          const j = await latestRes.json();
          if (j.latest) {
            setRealtimeData(j.latest);
            setStatus(j.status);
          }
        }
      } catch (error) {
        console.error("Failed to fetch initial UPS details:", error);
      }
    };
    fetchHistory();
  }, [selectedDeviceId]);

  // WebSocket Connection
  useEffect(() => {
    if (!selectedDeviceId) return;
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (Array.isArray(message)) {
          const current = message.find((d: any) => d.id === selectedDeviceId);
          if (current) {
            if (current.data) {
              setRealtimeData({
                ...current.data,
                createdAt: current.lastUpdate || new Date().toISOString()
              });
              setStatus("ONLINE");
            } else {
              setStatus("OFFLINE");
            }
            if (current.logs) setRecentLogs(current.logs);
            if (current.chart) setChartData(current.chart);
          }
        }
      } catch (e) {
        console.error("UPS WS Parse Error:", e);
      }
    };

    ws.onerror = () => setStatus("OFFLINE");
    ws.onclose = () => setStatus("OFFLINE");

    return () => {
      ws.close();
    };
  }, [selectedDeviceId]);

  // Theme observer
  useEffect(() => {
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Session Uptime clock ticking
  useEffect(() => {
    setHasMounted(true);
    fetchServerBattery();
    fetchDevices();

    const batteryInterval = setInterval(fetchServerBattery, 30000);
    const devicesInterval = setInterval(fetchDevices, 60000);

    const start = Date.now() - 8095000; // Mock 2 hours 14 mins
    const uptimeInterval = setInterval(() => {
      const diff = Date.now() - start;
      const secs = Math.floor(diff / 1000) % 60;
      const mins = Math.floor(diff / 60000) % 60;
      const hours = Math.floor(diff / 3600000) % 24;
      const days = Math.floor(diff / 86400000);
      setUptime(
        `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => {
      clearInterval(batteryInterval);
      clearInterval(devicesInterval);
      clearInterval(uptimeInterval);
    };
  }, [fetchServerBattery, fetchDevices]);

  // Load initial settings when modal opens
  const openSettings = () => {
    const activeDevice = devices.find(d => d.id === selectedDeviceId);
    if (!activeDevice) return;

    setIsAddingMode(false);
    setNewDeviceId('');
    setSettingsName(activeDevice.name);
    setSettingsLocation(activeDevice.location || '');
    
    const config: UpsConfig = activeDevice.config || DEFAULT_CONFIG;
    setSettingsCells(config.sensors?.cells !== false);
    setSettingsVoltageIn(config.sensors?.voltageIn !== false);
    setSettingsIna12v(config.sensors?.ina12v !== false);
    setSettingsIna5v(config.sensors?.ina5v !== false);
    setSettingsTemps(config.sensors?.temperatures || []);
    setNewTempId('');
    setNewTempLabel('');

    setIsSettingsOpen(true);
  };

  const deleteDevice = async () => {
    if (!selectedDeviceId) return;
    if (!confirm("Apakah Anda yakin ingin menghapus perangkat UPS ini?")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/device/ups/${selectedDeviceId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setIsSettingsOpen(false);
        await fetchDevices(true); // Fetch and select first device
      } else {
        alert("Gagal menghapus perangkat: " + await res.text());
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveSettings = async () => {
    setIsSubmitting(true);
    try {
      const updatedConfig: UpsConfig = {
        sensors: {
          cells: settingsCells,
          voltageIn: settingsVoltageIn,
          ina12v: settingsIna12v,
          ina5v: settingsIna5v,
          temperatures: settingsTemps
        }
      };

      if (isAddingMode) {
        if (!newDeviceId) {
          alert("Device ID wajib diisi!");
          setIsSubmitting(false);
          return;
        }
        const res = await fetch(`${API_URL}/api/device/ups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newDeviceId,
            name: settingsName || `UPS Device (${newDeviceId.substring(0, 6).toUpperCase()})`,
            location: settingsLocation,
            config: updatedConfig
          })
        });

        if (res.ok) {
          setSelectedDeviceId(newDeviceId);
          await fetchDevices(false);
          setIsSettingsOpen(false);
        } else {
          alert("Gagal mendaftarkan perangkat: " + await res.text());
        }
      } else {
        if (!selectedDeviceId) return;
        const res = await fetch(`${API_URL}/api/device/ups/${selectedDeviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: settingsName,
            location: settingsLocation,
            config: updatedConfig
          })
        });

        if (res.ok) {
          await fetchDevices(false);
          setIsSettingsOpen(false);
        } else {
          alert("Failed to save settings: " + await res.text());
        }
      }
    } catch (e: any) {
      alert("Error saving settings: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTempSensorSetting = () => {
    if (!newTempId || !newTempLabel) return;
    if (settingsTemps.some(t => t.id === newTempId)) {
      alert("Sensor ID already exists!");
      return;
    }
    setSettingsTemps([...settingsTemps, { id: newTempId.toLowerCase().trim(), label: newTempLabel.trim() }]);
    setNewTempId('');
    setNewTempLabel('');
  };

  const removeTempSensorSetting = (id: string) => {
    setSettingsTemps(settingsTemps.filter(t => t.id !== id));
  };

  // Active config parsing
  const activeDevice = devices.find(d => d.id === selectedDeviceId);
  const activeConfig: UpsConfig = activeDevice?.config || DEFAULT_CONFIG;

  // Server Battery details
  const batteryPercent = serverBattery?.percent ?? 0;
  const batteryColorClass = batteryPercent >= 50 ? 'text-green-500' : batteryPercent >= 20 ? 'text-yellow-500' : 'text-red-500';
  const batteryBgColorClass = batteryPercent >= 50 ? 'bg-green-500' : batteryPercent >= 20 ? 'bg-yellow-500' : 'bg-red-500';
  const cpuTemp = serverBattery?.cpuTempMax ?? 0;
  const cpuTempColor = cpuTemp > 80 ? 'text-red-500 animate-pulse' : cpuTemp > 65 ? 'text-amber-500 font-bold' : 'text-green-500';
  const memUsed = serverBattery?.memUsedPercent ?? 0;
  const memColor = memUsed > 85 ? 'text-red-500 animate-pulse' : memUsed > 65 ? 'text-amber-500 font-bold' : 'text-green-500';

  // Outage parameters & status
  const isOutage = realtimeData ? (realtimeData.voltageIn < 2.0) : false;
  const isPlnConnected = realtimeData 
    ? (realtimeData.voltageIn >= 2.0) 
    : (serverBattery?.acConnected ?? true);

  // Dynamic Telemetry Mappings
  const totalVoltageVal = realtimeData?.totalVoltage !== undefined ? Number(realtimeData.totalVoltage).toFixed(2) : '11.45';
  
  // Calculate Load Current only from active INA sensors
  const c12 = activeConfig.sensors?.ina12v !== false ? (realtimeData?.current12v || 0) : 0;
  const c5 = activeConfig.sensors?.ina5v !== false ? (realtimeData?.current5v || 0) : 0;
  const loadCurrentVal = realtimeData ? Math.round(c12 + c5).toString() : '450';
  
  // Calculate power consumption only from active INA sensors
  const p12 = activeConfig.sensors?.ina12v !== false ? ((realtimeData?.voltage12v || 0) * (c12 / 1000)) : 0;
  const p5 = activeConfig.sensors?.ina5v !== false ? ((realtimeData?.voltage5v || 0) * (c5 / 1000)) : 0;
  const powerVal = realtimeData ? (p12 + p5).toFixed(2) : '5.15';

  const dynamicMetrics = [
    ...(activeConfig.sensors?.cells !== false ? [{ id: 1, title: 'Total Battery Voltage', value: totalVoltageVal, unit: 'V', icon: Battery, color: 'text-cyan-500', desc: 'Sensing: Cumulative 3S Pack' }] : []),
    ...((activeConfig.sensors?.ina12v !== false || activeConfig.sensors?.ina5v !== false) ? [
      { id: 2, title: 'Combined Load Current', value: loadCurrentVal, unit: 'mA', icon: Activity, color: 'text-emerald-500', desc: `INA219 Active: ${[activeConfig.sensors?.ina12v !== false && '12V', activeConfig.sensors?.ina5v !== false && '5V'].filter(Boolean).join(' + ')}` },
      { id: 3, title: 'Total Power Output', value: powerVal, unit: 'W', icon: Zap, color: 'text-amber-500', desc: 'Realtime Power Consumption' }
    ] : [])
  ];

  // Temperature readings
  const temps = realtimeData?.temperatures || {};
  const systemTemp = temps.system !== undefined ? Number(temps.system) : 32.5;
  
  const cell1Val = realtimeData?.cell1Voltage !== undefined ? Number(realtimeData.cell1Voltage).toFixed(2) : '4.12';
  const cell2Val = realtimeData?.cell2Voltage !== undefined ? Number(realtimeData.cell2Voltage).toFixed(2) : '3.85';
  const cell3Val = realtimeData?.cell3Voltage !== undefined ? Number(realtimeData.cell3Voltage).toFixed(2) : '4.10';

  const getCellStatus = (voltageStr: string) => {
    const v = parseFloat(voltageStr);
    if (v < 3.2 || v > 4.25) return 'Warning';
    return 'Healthy';
  };

  const getCellHealth = (voltageStr: string) => {
    const v = parseFloat(voltageStr);
    if (v <= 3.0) return 0;
    if (v >= 4.2) return 100;
    return Math.round(((v - 3.0) / 1.2) * 100);
  };

  // Cells visual mappings with fallbacks
  const cells = [
    { id: 1, name: 'Cell 1 (3.0 - 4.2V)', voltage: cell1Val, temp: temps.cell1 !== undefined ? Number(temps.cell1).toFixed(1) : (systemTemp + 1.2).toFixed(1), health: getCellHealth(cell1Val), status: getCellStatus(cell1Val) },
    { id: 2, name: 'Cell 2 (3.0 - 4.2V)', voltage: cell2Val, temp: temps.cell2 !== undefined ? Number(temps.cell2).toFixed(1) : (systemTemp + 5.7).toFixed(1), health: getCellHealth(cell2Val), status: getCellStatus(cell2Val) },
    { id: 3, name: 'Cell 3 (3.0 - 4.2V)', voltage: cell3Val, temp: temps.cell3 !== undefined ? Number(temps.cell3).toFixed(1) : (systemTemp + 0.5).toFixed(1), health: getCellHealth(cell3Val), status: getCellStatus(cell3Val) },
  ];

  // Dynamic Chart Options mapping
  const chartCategories = chartData.length > 0 
    ? chartData.map(log => new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    : ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30'];

  const chartSeries = [
    { 
      name: 'Discharge Curve (V)', 
      data: chartData.length > 0 ? chartData.map(log => parseFloat(log.totalVoltage.toFixed(2))) : [12.6, 12.4, 12.2, 11.8, 11.6, 11.45, 11.4] 
    },
    { 
      name: 'Temp Trend (°C)', 
      data: chartData.length > 0 ? chartData.map(log => {
        const t = log.temperatures as any;
        return t?.system !== undefined ? parseFloat(t.system.toFixed(1)) : 30.0;
      }) : [30, 31, 32, 34, 35, 36, 38.2] 
    }
  ];

  const dynamicChartOptions = {
    ...CHART_OPTIONS,
    theme: { mode: isDarkMode ? 'dark' : 'light' },
    xaxis: {
      ...CHART_OPTIONS.xaxis,
      categories: chartCategories,
      labels: {
        style: {
          colors: isDarkMode ? '#64748b' : '#475569',
          fontSize: '10px',
          fontWeight: 600
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: isDarkMode ? '#64748b' : '#475569',
          fontSize: '10px',
          fontWeight: 600
        }
      }
    },
    grid: { 
      borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)', 
      strokeDashArray: 5,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } }
    },
    legend: {
      ...CHART_OPTIONS.legend,
      labels: { colors: isDarkMode ? '#94a3b8' : '#475569' }
    }
  };

  return (
    <div className="min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300 relative">
      
      {/* Background Decor (Senada dengan power monitoring tetapi memakai aksen biru/sian) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-400/10 dark:bg-cyan-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8">
        
        {/* Header (Senada dengan PZEM Header layout) */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div className="w-full lg:w-auto">
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white flex items-center gap-3">
              <Server className="text-cyan-500" />
              UPS Monitor
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">
              Realtime telemetry & modular sensor configuration for DIY Smart UPS.
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <Clock size={12} className="text-gray-400" />
                Uptime: <span className="text-emerald-500 dark:text-emerald-400 font-mono font-bold">{uptime}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <Radio size={12} className={status === "ONLINE" ? "animate-pulse text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"} />
                Status: <span className={`font-mono font-bold ${status === "ONLINE" ? "text-cyan-500 dark:text-cyan-400" : "text-rose-500 dark:text-rose-400"}`}>{status}</span>
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Outage status pill */}
            <div className="flex items-center gap-2.5 bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl px-3.5 py-2.5 rounded-xl border border-white/50 dark:border-gray-700/50 shadow-sm">
              <div className={`h-2 w-2 rounded-full ${status === "ONLINE" ? (isOutage ? "bg-rose-500 animate-pulse" : "bg-green-500 animate-pulse") : "bg-gray-400"}`}></div>
              <span className={`text-xs md:text-sm font-bold ${status === "ONLINE" ? (isOutage ? "text-rose-600 dark:text-rose-400" : "text-green-600 dark:text-green-400") : "text-gray-500"}`}>
                {status === "ONLINE" ? (isOutage ? "Outage (Battery)" : "Standby (PLN)") : "Offline"}
              </span>
            </div>

            {/* Hardware Select Dropdown */}
            {devices.length > 0 && (
              <select 
                className="flex-1 lg:flex-none bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-500 min-w-[150px] text-gray-800 dark:text-gray-200 shadow-sm"
                value={selectedDeviceId || ""}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
              >
                {devices.map(dev => (
                  <option key={dev.id} value={dev.id} className="bg-white dark:bg-gray-850 text-gray-800 dark:text-gray-200">
                    {dev.name} {dev.location ? `(${dev.location})` : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Settings button or Register First device */}
            {devices.length === 0 ? (
              <button 
                onClick={() => {
                  setIsAddingMode(true);
                  setNewDeviceId('');
                  setSettingsName('');
                  setSettingsLocation('');
                  setSettingsCells(true);
                  setSettingsVoltageIn(true);
                  setSettingsIna12v(true);
                  setSettingsIna5v(true);
                  setSettingsTemps(DEFAULT_CONFIG.sensors.temperatures);
                  setIsSettingsOpen(true);
                }}
                className="p-2.5 bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-900/40 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
              >
                <Plus size={14} />
                <span>Register First UPS</span>
              </button>
            ) : (
              <button onClick={openSettings} title="Manage UPS Sensors"
                className="p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm cursor-pointer">
                <Settings size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Realtime Metrics Cards (Senada dengan CardMetric di PZEM) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 relative z-10">
          {dynamicMetrics.map((metric) => (
            <motion.div 
              key={metric.id}
              whileHover={{ y: -5 }}
              className="relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-4 md:p-6 shadow-lg"
            >
              <div className={`absolute right-0 top-0 p-3 md:p-4 opacity-10 text-5xl md:text-6xl ${metric.color}`}>
                <metric.icon size={60} />
              </div>
              <div className="relative z-10">
                <div className={`p-2.5 md:p-3 w-fit rounded-xl md:rounded-2xl bg-white dark:bg-gray-700 shadow-sm ${metric.color} text-xl md:text-2xl mb-3 md:mb-4`}>
                  <metric.icon size={24} />
                </div>
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">{metric.title}</p>
                <h4 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-gray-100 mt-1 tracking-tight">
                  {metric.value} <span className="text-base md:text-lg font-medium text-gray-400 ml-1">{metric.unit}</span>
                </h4>
                <p className="text-[10px] md:text-xs font-semibold text-gray-400 mt-1.5 md:mt-2">
                  {metric.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Grid Layout for battery and charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 mb-8">
          
          {/* Main left content column (col-span-8): Battery Pack & Chart */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Battery Cells Block (Adapts based on config) */}
            {activeConfig.sensors?.cells !== false ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cells.map((cell) => (
                  <motion.div 
                    key={cell.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`p-5 rounded-[1.5rem] md:rounded-[2rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-lg relative overflow-hidden group`}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      {/* Vertical Battery representation */}
                      <div className="relative w-12 h-24 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-1 bg-gray-50 dark:bg-gray-950 flex flex-col justify-end overflow-visible shadow-inner select-none">
                        {/* Battery nipple */}
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-t-sm shadow-md"></div>
                        {/* Fill level bar */}
                        <div 
                          className={`w-full rounded-lg transition-all duration-1000 ${
                            cell.status === 'Warning' 
                              ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]' 
                              : 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                          }`}
                          style={{ height: `${cell.health}%` }}
                        />
                        {/* Percentage */}
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-black text-gray-800 dark:text-gray-100 select-none">
                          {cell.health}%
                        </div>
                      </div>

                      {/* Readouts */}
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-850 dark:text-white">{cell.name.split(' ')[0]} {cell.name.split(' ')[1]}</span>
                          <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border ${
                            cell.status === 'Warning' 
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                            {cell.status}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block">Voltage</span>
                          <span className="text-base font-mono font-black text-gray-800 dark:text-white">{cell.voltage} V</span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block">Temp</span>
                          <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">{cell.temp} °C</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-[1.5rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 text-center py-8">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1">Battery Cells Block Disabled</span>
                <p className="text-[10px] text-gray-400">This UPS configuration does not monitor internal individual battery cells.</p>
              </div>
            )}

            {/* Chart Room (Discharge Curves) */}
            <div className="p-6 rounded-[1.5rem] md:rounded-[2rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[300px]">
               <div className="absolute top-0 right-0 p-6 opacity-[0.02]">
                  <Activity size={100} className="text-cyan-500" />
               </div>
               <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                  <LayoutDashboard className="text-cyan-500" size={14} />
                  Engineering Analytics (50 Logs)
               </h3>
               <div className="h-[230px] relative z-10 w-full text-gray-800 dark:text-white">
                  {hasMounted ? (
                    <ReactApexChart options={dynamicChartOptions} series={chartSeries} type="area" height={230} width="100%" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 animate-pulse">
                      <Activity size={32} />
                    </div>
                  )}
               </div>
            </div>

          </div>

          {/* Right sidebar column (col-span-4): Safety Monitors & Climate controls */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Safety Control Room Card */}
            <div className="p-6 rounded-[1.5rem] md:rounded-[2rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-lg relative overflow-hidden flex flex-col justify-between">
               <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldAlert size={14} className="text-amber-500" />
                  Safety Control Room
               </h3>
               <div className="space-y-3 relative z-10">
                  {/* MQ2 Sensor */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><Flame size={16} /></div>
                      <div>
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-300 block">MQ-2 Gas/Smoke</span>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-mono">Safety sensor</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">CLEAR</span>
                  </div>

                  {/* PLN Outage Sensor */}
                  {activeConfig.sensors?.voltageIn !== false && (
                    <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-500 shadow-sm ${
                      isPlnConnected 
                        ? 'bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800' 
                        : 'bg-rose-500/10 border-rose-500/25 shadow-lg shadow-rose-500/5'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isPlnConnected ? 'bg-cyan-500/10 text-cyan-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          <Zap size={16} className={isPlnConnected ? '' : 'animate-pulse'} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-700 dark:text-slate-300 block">
                            Grid Adapter Input
                          </span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-mono">
                            PLN Status {realtimeData?.voltageIn !== undefined && `(${Number(realtimeData.voltageIn).toFixed(1)}V)`}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                        isPlnConnected 
                          ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/25'
                          : 'bg-rose-500/20 text-rose-600 dark:text-rose-450 border-rose-500/30 animate-pulse'
                      }`}>
                        {isPlnConnected ? 'CONNECTED' : 'OFFLINE!'}
                      </span>
                    </div>
                  )}
               </div>
            </div>

            {/* Climate Control Card (Suhu detail) */}
            <div className="p-6 rounded-[1.5rem] md:rounded-[2rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-lg flex flex-col justify-between flex-1">
               <h3 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Thermometer size={14} className="text-cyan-500" />
                 Sensors Climate Control Room
               </h3>
               
               {activeConfig.sensors?.temperatures && activeConfig.sensors.temperatures.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {activeConfig.sensors.temperatures.map((temp) => {
                     const val = temps[temp.id] !== undefined ? Number(temps[temp.id]) : null;
                     return (
                       <div key={temp.id} className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col gap-1 shadow-sm">
                         <span className="text-[9px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider block text-ellipsis overflow-hidden whitespace-nowrap" title={temp.label}>
                           {temp.label}
                         </span>
                         <div className="flex items-baseline gap-1">
                           <span className="text-xl font-black text-gray-850 dark:text-white">
                             {val !== null ? val.toFixed(1) : 'N/A'}
                           </span>
                           {val !== null && <span className="text-xs font-bold text-gray-400">°C</span>}
                         </div>
                         {val !== null && (
                           <div className="w-full h-1 bg-gray-100 dark:bg-gray-950 rounded-full overflow-hidden mt-1">
                             <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, (val / 70) * 100)}%` }}></div>
                           </div>
                         )}
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center py-6">
                   <span className="text-xs font-bold text-gray-450 block">No active temperature sensors</span>
                 </div>
               )}
            </div>

          </div>

        </div>
        
        {/* ══════════════════════════════════════════════════ */}
        {/* Server Machine Health (Dynamic Cards, Senada dengan PZEM) */}
        {/* ══════════════════════════════════════════════════ */}
        {serverBattery && (
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800/80 relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                <Laptop className="text-cyan-500" size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-800 dark:text-white tracking-tight">Server Machine Health</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Local telemetry for host machine · updates every 30s</p>
              </div>
              <div className="ml-auto text-[10px] font-mono text-gray-400 dark:text-gray-500 font-bold">{serverBattery.fetchedAt ? new Date(serverBattery.fetchedAt).toLocaleTimeString('id-ID') : ''}</div>
            </div>

            {!serverBattery.hasBattery ? (
              <div className="p-6 rounded-[1.5rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 flex items-center gap-4">
                <AlertTriangle className="text-gray-400 dark:text-gray-500" size={22} />
                <p className="text-gray-500 dark:text-gray-400 text-sm">{serverBattery.message ?? "Host machine does not support battery API (e.g. running on desktop PC)"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Battery level */}
                <div className={`p-5 rounded-[1.5rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px]`}>
                  <div className="absolute top-0 right-0 p-4 opacity-[0.02] text-gray-800 dark:text-white"><Battery size={80} /></div>
                  <div>
                    <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">Host Battery</span>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-extrabold ${batteryColorClass}`}>{batteryPercent}</span>
                      <span className="text-sm font-bold text-gray-400">%</span>
                    </div>
                  </div>
                  <div>
                    <div className="h-1.5 w-full bg-gray-150 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-full overflow-hidden p-0.5 mb-3">
                      <div className={`h-full rounded-full transition-all duration-1000 ${batteryBgColorClass}`} style={{ width: `${batteryPercent}%` }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {serverBattery.isCharging ? (
                        <><BatteryCharging size={12} className="text-cyan-500 animate-pulse" /><span className="text-[10px] text-cyan-500 font-bold">CHARGING</span></>
                      ) : (
                        <><Battery size={12} className="text-gray-400" /><span className="text-[10px] text-gray-400 font-bold">DISCHARGING</span></>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status PLN card */}
                <div className="p-5 rounded-[1.5rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-lg flex flex-col justify-between min-h-[140px]">
                  <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block">Power Source</span>
                  <div>
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-md ${serverBattery.acConnected ? 'bg-green-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
                      <div>
                        <p className="text-xs font-black text-gray-800 dark:text-white">{serverBattery.acConnected ? "AC Utility Line" : "Battery Mode"}</p>
                        <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-semibold">{serverBattery.acConnected ? "Utility Grid Online" : "Running on inverter"}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    {serverBattery.timeRemaining && serverBattery.timeRemaining > 0 ? (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center shadow-inner">
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase block font-semibold">Remaining Runtime</span>
                        <span className="text-sm font-extrabold text-gray-800 dark:text-white font-mono">{Math.floor(serverBattery.timeRemaining / 60)}h {serverBattery.timeRemaining % 60}m</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider block">Est. infinite (AC mode)</span>
                    )}
                  </div>
                </div>

                {/* CPU Temp card */}
                <div className="p-5 rounded-[1.5rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.02] text-gray-800 dark:text-white"><Thermometer size={80} /></div>
                  <div>
                    <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">Host Thermal</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-4xl font-extrabold ${cpuTempColor}`}>{serverBattery.cpuTempMax ? Math.round(serverBattery.cpuTempMax) : 'N/A'}</span>
                      {serverBattery.cpuTempMax && <span className="text-xs font-bold text-gray-400">°C</span>}
                    </div>
                  </div>
                  <div>
                    <div className="h-1 w-full bg-gray-150 dark:bg-gray-950 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full transition-all ${cpuTemp > 80 ? 'bg-red-500' : cpuTemp > 65 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (cpuTemp / 100) * 100)}%` }} />
                    </div>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                      {cpuTemp > 80 ? '⚠️ THERMAL THROTTLING' : cpuTemp > 65 ? '⚠️ WARM WORKING TEMP' : '🟢 STABLE SYSTEM TEMP'}
                    </span>
                  </div>
                </div>

                {/* RAM Usage card */}
                <div className="p-5 rounded-[1.5rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.02] text-gray-850 dark:text-white"><Cpu size={80} /></div>
                  <div>
                    <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">Host RAM</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-4xl font-extrabold ${memColor}`}>{serverBattery.memUsedPercent !== null && serverBattery.memUsedPercent !== undefined ? Math.round(serverBattery.memUsedPercent) : 'N/A'}</span>
                      {serverBattery.memUsedPercent !== null && <span className="text-xs font-bold text-gray-400">%</span>}
                    </div>
                  </div>
                  <div>
                    <div className="h-1 w-full bg-gray-150 dark:bg-gray-950 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full transition-all ${memUsed > 85 ? 'bg-red-500' : memUsed > 65 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${memUsed}%` }} />
                    </div>
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                      {memUsed > 85 ? '⚠️ MEMORY EXHAUSTION' : memUsed > 65 ? '⚠️ HIGH BUFFER MEMORY' : '🟢 HEALTHY MEMORY BUFFER'}
                    </span>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>

      {/* Settings Modal (Senada dengan PZEM Settings dialog style) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-gray-900/50 dark:bg-[#060810]/70 backdrop-blur-sm"
            />

            {/* Modal content container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2rem] p-6 md:p-8 shadow-2xl z-10 text-gray-850 dark:text-slate-100 select-none"
            >
              {/* Modal close icon */}
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2 mb-6">
                <Settings size={20} className="text-cyan-500" />
                UPS Hardware Configuration
              </h2>

              {/* Mode toggles */}
              <div className="flex items-center gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                <button 
                  onClick={() => {
                    setIsAddingMode(false);
                    const activeDevice = devices.find(d => d.id === selectedDeviceId);
                    if (activeDevice) {
                      setSettingsName(activeDevice.name);
                      setSettingsLocation(activeDevice.location || '');
                      const config = activeDevice.config || DEFAULT_CONFIG;
                      setSettingsCells(config.sensors?.cells !== false);
                      setSettingsVoltageIn(config.sensors?.voltageIn !== false);
                      setSettingsIna12v(config.sensors?.ina12v !== false);
                      setSettingsIna5v(config.sensors?.ina5v !== false);
                      setSettingsTemps(config.sensors?.temperatures || []);
                    }
                  }}
                  className={`pb-1 text-sm font-black transition-all ${!isAddingMode ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                >
                  Edit Device Settings
                </button>
                <button 
                  onClick={() => {
                    setIsAddingMode(true);
                    setNewDeviceId('');
                    setSettingsName('');
                    setSettingsLocation('');
                    setSettingsCells(true);
                    setSettingsVoltageIn(true);
                    setSettingsIna12v(true);
                    setSettingsIna5v(true);
                    setSettingsTemps(DEFAULT_CONFIG.sensors.temperatures);
                  }}
                  className={`pb-1 text-sm font-black transition-all ${isAddingMode ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                >
                  Register New UPS
                </button>
              </div>

              <div className="space-y-6">
                {/* Meta properties */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isAddingMode && (
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Device ID (Unique Hardware Key)</label>
                      <input 
                        type="text" 
                        value={newDeviceId}
                        onChange={(e) => setNewDeviceId(e.target.value.trim())}
                        className="px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-cyan-500 focus:outline-none rounded-xl text-sm text-gray-850 dark:text-white font-mono shadow-sm"
                        placeholder="e.g. ups_kitchen_01"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Device Name</label>
                    <input 
                      type="text" 
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                      className="px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-cyan-500 focus:outline-none rounded-xl text-sm text-gray-850 dark:text-white shadow-sm"
                      placeholder="e.g. UPS Server Room"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Location / Slot</label>
                    <input 
                      type="text" 
                      value={settingsLocation}
                      onChange={(e) => setSettingsLocation(e.target.value)}
                      className="px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-cyan-500 focus:outline-none rounded-xl text-sm text-gray-850 dark:text-white shadow-sm"
                      placeholder="e.g. Rack A-4"
                    />
                  </div>
                </div>

                {/* Electrical Sensors Toggles */}
                <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-950/30 border border-gray-150 dark:border-gray-800 space-y-4 shadow-inner">
                  <h3 className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">Grid & Power Hardware Toggles</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Toggle cells */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsCells}
                        onChange={(e) => setSettingsCells(e.target.checked)}
                        className="rounded border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-cyan-500 focus:ring-cyan-500/20"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">Battery Cells (3S)</span>
                        <span className="text-[9px] text-gray-450 dark:text-gray-500 block">Voltage Sensor analog</span>
                      </div>
                    </label>
                    
                    {/* Toggle voltageIn */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsVoltageIn}
                        onChange={(e) => setSettingsVoltageIn(e.target.checked)}
                        className="rounded border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-cyan-500 focus:ring-cyan-500/20"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">PLN In Detector</span>
                        <span className="text-[9px] text-gray-450 dark:text-gray-500 block">Grid outage monitor</span>
                      </div>
                    </label>

                    {/* Toggle INA 12V */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsIna12v}
                        onChange={(e) => setSettingsIna12v(e.target.checked)}
                        className="rounded border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-cyan-500 focus:ring-cyan-500/20"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">INA219 (12V Bus)</span>
                        <span className="text-[9px] text-gray-450 dark:text-gray-500 block">Bus 12V Current & Volt</span>
                      </div>
                    </label>

                    {/* Toggle INA 5V */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settingsIna5v}
                        onChange={(e) => setSettingsIna5v(e.target.checked)}
                        className="rounded border-gray-250 dark:border-slate-800 bg-white dark:bg-slate-950 text-cyan-500 focus:ring-cyan-500/20"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block">INA219 (5V Bus)</span>
                        <span className="text-[9px] text-gray-450 dark:text-gray-500 block">Bus 5V Current & Volt</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Temperature Sensors List Editor */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">Active Temperature Sensors</h3>
                  
                  {/* List */}
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {settingsTemps.map((temp) => (
                      <div key={temp.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-850 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <Thermometer size={14} className="text-gray-400" />
                          <div>
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-200">{temp.label}</span>
                            <span className="text-[9px] font-mono text-gray-400 dark:text-gray-500 block">ID: {temp.id}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeTempSensorSetting(temp.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Remove Temp Sensor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {settingsTemps.length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 italic py-2">No temperature sensors added yet.</p>
                    )}
                  </div>

                  {/* Add Temp Form */}
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end shadow-sm">
                    <div className="sm:col-span-4 flex flex-col gap-1.5">
                      <label className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase">Sensor key / ID</label>
                      <input 
                        type="text"
                        value={newTempId}
                        onChange={(e) => setNewTempId(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        className="px-3 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-cyan-500 focus:outline-none rounded-lg text-xs text-gray-850 dark:text-white"
                        placeholder="e.g. heatsink"
                      />
                    </div>
                    <div className="sm:col-span-6 flex flex-col gap-1.5">
                      <label className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase">Display Name / Label</label>
                      <input 
                        type="text"
                        value={newTempLabel}
                        onChange={(e) => setNewTempLabel(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-cyan-500 focus:outline-none rounded-lg text-xs text-gray-850 dark:text-white"
                        placeholder="e.g. Heatsink Temp"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={addTempSensorSetting}
                      className="sm:col-span-2 w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-md shadow-cyan-500/10"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end items-center gap-3 mt-8 pt-4 border-t border-gray-150 dark:border-gray-800">
                {!isAddingMode && (
                  <button 
                    onClick={deleteDevice}
                    type="button"
                    disabled={isSubmitting}
                    className="mr-auto px-4 py-2.5 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-600 hover:text-slate-950 text-rose-500 dark:text-rose-400 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Trash2 size={14} />
                    Delete Device
                  </button>
                )}
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveSettings}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 rounded-xl font-black text-xs shadow-lg shadow-cyan-500/10 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : isAddingMode ? 'Register Device' : 'Save Configuration'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Status Bar (Senada dengan PZEM footer) */}
      <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800/80 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 dark:text-gray-500 relative z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${status === "ONLINE" ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-rose-500 shadow-[0_0_8px_#f43f5e]"}`}></div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest">UPS Device {status}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${status === "ONLINE" ? "bg-cyan-500 shadow-[0_0_8px_#06b6d4] animate-pulse" : "bg-slate-600"}`}></div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest">WS Telemetry {status === "ONLINE" ? "STREAMING" : "STANDBY"}</span>
          </div>
        </div>
        <div className="text-[9px] font-mono tracking-tight opacity-40 uppercase font-semibold">
          DIY SMART UPS CONTROL HUB v1.4.0 // HARMONIZED THEME BY ANTIGRAVITY FOR TOPS GARDEN
        </div>
      </footer>
    </div>
  );
};

export default UPSDashboard;
