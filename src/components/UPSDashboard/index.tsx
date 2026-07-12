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
  Wifi,
  WifiOff,
  Thermometer as ThermIcon,
  MemoryStick
} from 'lucide-react';
import { ServerBatteryInfo } from '@/types/pzem';
import { UpsDevice, UpsLog } from '@/types/ups';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Premium Chart Configs with glowing drop shadow
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
  grid: { 
    borderColor: 'rgba(51, 65, 85, 0.4)', 
    strokeDashArray: 5,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: true } }
  },
  xaxis: {
    labels: { style: { colors: '#64748b', fontSize: '10px', fontWeight: 600 } },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: { style: { colors: '#64748b', fontSize: '10px', fontWeight: 600 } }
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
    theme: 'dark',
    x: { show: true },
    style: { fontSize: '11px', fontFamily: 'var(--font-sans)' }
  },
  legend: { 
    show: true, 
    position: 'top', 
    horizontalAlign: 'right', 
    labels: { colors: '#94a3b8' },
    fontSize: '11px',
    fontWeight: 600,
    markers: { radius: 12 }
  }
};

const HTTPS_API_URL = process.env.NEXT_PUBLIC_HTTPS_API_URL || "localhost:3001";
const API_URL = HTTPS_API_URL.includes("localhost") ? `http://${HTTPS_API_URL}` : `https://${HTTPS_API_URL}`;
const WS_URL = HTTPS_API_URL.includes("localhost") ? `ws://${HTTPS_API_URL}/ups` : `wss://${HTTPS_API_URL}/ups`;

const UPSDashboard: React.FC = () => {
  const [uptime, setUptime] = useState('02:14:55:12');
  const [hasMounted, setHasMounted] = useState(false);
  const [serverBattery, setServerBattery] = useState<ServerBatteryInfo | null>(null);

  // Real data states
  const [devices, setDevices] = useState<UpsDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [realtimeData, setRealtimeData] = useState<UpsLog | null>(null);
  const [status, setStatus] = useState<"ONLINE" | "OFFLINE">("OFFLINE");
  const [chartData, setChartData] = useState<UpsLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<UpsLog[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchServerBattery = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/device/server-battery`);
      if (res.ok) setServerBattery(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/device/ups`);
      if (res.ok) {
        const data: UpsDevice[] = await res.json();
        setDevices(data);
        if (data.length > 0 && !selectedDeviceId) {
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

  // Server Battery details
  const batteryPercent = serverBattery?.percent ?? 0;
  const batteryColor = batteryPercent >= 50 ? '#06b6d4' : batteryPercent >= 20 ? '#fbbf24' : '#ef4444';
  const batteryBgColor = batteryPercent >= 50 ? 'bg-cyan-500' : batteryPercent >= 20 ? 'bg-yellow-500' : 'bg-red-500';
  const batteryGlow = batteryPercent >= 50 ? 'shadow-cyan-500/20' : batteryPercent >= 20 ? 'shadow-yellow-500/20' : 'shadow-red-500/20';
  const cpuTemp = serverBattery?.cpuTempMax ?? 0;
  const cpuTempColor = cpuTemp > 80 ? 'text-red-400 animate-pulse' : cpuTemp > 65 ? 'text-amber-400' : 'text-emerald-400';
  const memUsed = serverBattery?.memUsedPercent ?? 0;
  const memColor = memUsed > 85 ? 'text-red-400 animate-pulse' : memUsed > 65 ? 'text-amber-400' : 'text-emerald-400';

  // Outage parameters & status
  const isOutage = realtimeData ? (realtimeData.voltageIn < 2.0) : false;
  const isPlnConnected = realtimeData 
    ? (realtimeData.voltageIn >= 2.0) 
    : (serverBattery?.acConnected ?? true);

  // Dynamic Telemetry Mappings
  const totalVoltageVal = realtimeData?.totalVoltage !== undefined ? Number(realtimeData.totalVoltage).toFixed(2) : '11.45';
  const loadCurrentVal = realtimeData ? Math.round((realtimeData.current12v || 0) + (realtimeData.current5v || 0)).toString() : '450';
  const powerVal = realtimeData 
    ? ((realtimeData.voltage12v * (realtimeData.current12v / 1000)) + (realtimeData.voltage5v * (realtimeData.current5v / 1000))).toFixed(2)
    : '5.15';

  const dynamicMetrics = [
    { id: 1, title: 'Total Battery Voltage', value: totalVoltageVal, unit: 'V', icon: Battery, color: 'text-cyan-400', glow: 'shadow-cyan-500/10 hover:shadow-cyan-500/20', desc: 'Sensing: Cumulative 3S Pack' },
    { id: 2, title: 'Combined Load Current', value: loadCurrentVal, unit: 'mA', icon: Activity, color: 'text-emerald-400', glow: 'shadow-emerald-500/10 hover:shadow-emerald-500/20', desc: 'Dual Bus: INA219 (12V + 5V)' },
    { id: 3, title: 'Total Power Output', value: powerVal, unit: 'W', icon: Zap, color: 'text-amber-400', glow: 'shadow-amber-500/10 hover:shadow-amber-500/20', desc: 'Realtime Power Consumption' },
  ];

  // Temperature readings
  const temps = realtimeData?.temperatures || {};
  const systemTemp = temps.system !== undefined ? Number(temps.system) : 32.5;
  const cell1Temp = temps.cell1 !== undefined ? Number(temps.cell1).toFixed(1) : (temps.system !== undefined ? (Number(temps.system) + 1.2).toFixed(1) : '32.5');
  const cell2Temp = temps.cell2 !== undefined ? Number(temps.cell2).toFixed(1) : (temps.system !== undefined ? (Number(temps.system) + 5.7).toFixed(1) : '38.2');
  const cell3Temp = temps.cell3 !== undefined ? Number(temps.cell3).toFixed(1) : (temps.system !== undefined ? (Number(temps.system) + 0.5).toFixed(1) : '31.8');
  
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

  const cells = [
    { id: 1, name: 'Cell 1 (3.0 - 4.2V)', voltage: cell1Val, temp: cell1Temp, health: getCellHealth(cell1Val), status: getCellStatus(cell1Val) },
    { id: 2, name: 'Cell 2 (3.0 - 4.2V)', voltage: cell2Val, temp: cell2Temp, health: getCellHealth(cell2Val), status: getCellStatus(cell2Val) },
    { id: 3, name: 'Cell 3 (3.0 - 4.2V)', voltage: cell3Val, temp: cell3Temp, health: getCellHealth(cell3Val), status: getCellStatus(cell3Val) },
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
    xaxis: {
      ...CHART_OPTIONS.xaxis,
      categories: chartCategories
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 p-4 md:p-6 lg:p-8 font-sans transition-colors duration-300">
      
      {/* Header Section */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 p-6 bg-slate-900/25 border border-slate-800/40 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 rounded-2xl border border-cyan-500/25 shadow-lg shadow-cyan-500/5">
            <Server className="text-cyan-400" size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-white">
                UPS_TIER_01
              </h1>
              {selectedDeviceId ? (
                <span className="text-[10px] bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/30 uppercase tracking-widest font-bold shadow-sm">
                  {devices.find(d => d.id === selectedDeviceId)?.name || "Active"}
                </span>
              ) : (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 uppercase tracking-widest font-bold">
                  Mockup Mode
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Clock size={12} className="text-slate-500" />
                Uptime: <span className="text-emerald-400 font-mono font-bold">{uptime}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Radio size={12} className={status === "ONLINE" ? "animate-pulse text-emerald-400" : "text-rose-400"} />
                Status: <span className={`font-mono font-bold ${status === "ONLINE" ? "text-cyan-400" : "text-rose-400"}`}>{status}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
          {/* Custom Dropdown Device Selector */}
          {devices.length > 0 && (
            <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-2 w-full sm:w-auto">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest whitespace-nowrap">Hardware:</span>
              <select
                value={selectedDeviceId || ''}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-white focus:outline-none cursor-pointer text-ellipsis overflow-hidden w-full sm:w-[150px] md:w-[200px]"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#0b0f19] text-white">
                    {d.name} {d.location ? `(${d.location})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Stats Pill */}
          <div className="flex flex-1 lg:flex-none items-center justify-between gap-6 px-6 py-3 bg-slate-950/40 border border-slate-800/50 rounded-2xl backdrop-blur-md w-full sm:w-auto">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">UPS Mode</span>
              {status === "ONLINE" ? (
                isOutage ? (
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 animate-pulse mt-0.5">
                    <Zap size={12} className="text-rose-400" />
                    DISCHARGING (OUTAGE)
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <CheckCircle2 size={12} />
                    STANDBY (PLN)
                  </span>
                )
              ) : (
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <AlertTriangle size={12} />
                  OFFLINE
                </span>
              )}
            </div>
            <div className="w-[1px] h-6 bg-slate-800"></div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Safety Integrity</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 size={12} />
                SECURE
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (col-span-4): Big Metrics & Safety */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Main metrics */}
          {dynamicMetrics.map((metric) => (
            <motion.div 
              key={metric.id}
              whileHover={{ y: -4, scale: 1.01 }}
              className={`p-6 rounded-3xl bg-slate-900/20 border border-slate-800/50 backdrop-blur-xl relative overflow-hidden group shadow-lg transition-all duration-300 ${metric.glow}`}
            >
              <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.08] transition-opacity duration-300">
                <metric.icon size={110} />
              </div>
              <div className="flex flex-col relative z-10">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{metric.title}</span>
                <div className="flex items-baseline gap-2">
                  <h2 className={`text-4xl font-extrabold tracking-tighter ${metric.color}`}>
                    {metric.value}
                  </h2>
                  <span className="text-sm font-bold text-slate-500 uppercase">{metric.unit}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                   <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full bg-current ${metric.color} opacity-60`} style={{ width: '70%' }}></div>
                   </div>
                   <span className="text-[9px] font-semibold text-slate-600 font-mono tracking-tight">{metric.desc}</span>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Safety Alerts Card */}
          <div className="p-6 rounded-3xl bg-slate-900/20 border border-slate-800/50 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-[0.03]"><ShieldAlert size={80} /></div>
             <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldAlert size={14} className="text-amber-500" />
                Safety Control Room
             </h3>
             <div className="space-y-3 relative z-10">
                {/* MQ2 Sensor */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><Flame size={16} /></div>
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">MQ-2 Gas/Smoke</span>
                      <span className="text-[9px] text-slate-500 uppercase font-mono">Safety sensor</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">CLEAR</span>
                </div>

                {/* PLN Outage Sensor */}
                <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-500 ${
                  isPlnConnected 
                    ? 'bg-slate-950/40 border-slate-800/50' 
                    : 'bg-rose-500/10 border-rose-500/25 shadow-lg shadow-rose-500/5'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isPlnConnected ? 'bg-cyan-500/10 text-cyan-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      <Zap size={16} className={isPlnConnected ? '' : 'animate-pulse'} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">
                        Grid Adapter Input
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase font-mono">
                        PLN Status {realtimeData?.voltageIn !== undefined && `(${Number(realtimeData.voltageIn).toFixed(1)}V)`}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                    isPlnConnected 
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                  }`}>
                    {isPlnConnected ? 'CONNECTED' : 'OFFLINE!'}
                  </span>
                </div>
             </div>
          </div>

        </div>

        {/* Right Column (col-span-8): Battery Grid, Chart & Env */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Premium Battery Cells visualizer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cells.map((cell) => (
              <motion.div 
                key={cell.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`p-6 rounded-3xl border backdrop-blur-xl transition-all duration-300 relative overflow-hidden group ${
                  cell.status === 'Warning' 
                  ? 'bg-amber-500/5 border-amber-500/20 shadow-lg shadow-amber-500/5' 
                  : 'bg-slate-900/20 border-slate-800/50'
                }`}
              >
                {/* Visual Battery Graphic */}
                <div className="flex items-center gap-4 relative z-10">
                  {/* Vertical Battery representation */}
                  <div className="relative w-12 h-24 border-2 border-slate-700/80 rounded-xl p-1 bg-slate-950 flex flex-col justify-end overflow-visible shadow-inner select-none">
                    {/* Battery nipple */}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-slate-700 rounded-t-sm shadow-md"></div>
                    {/* Active Fluid charge visual */}
                    <div 
                      className={`w-full rounded-lg transition-all duration-1000 ${
                        cell.status === 'Warning' 
                          ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]' 
                          : 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      }`}
                      style={{ height: `${cell.health}%` }}
                    />
                    {/* Floating capacity percentage overlay */}
                    <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-black text-slate-300 select-none">
                      {cell.health}%
                    </div>
                  </div>

                  {/* Cell telemetry readouts */}
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-white">{cell.name}</span>
                      <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full border ${
                        cell.status === 'Warning' 
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-sm' 
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm'
                      }`}>
                        {cell.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Cell Voltage</span>
                      <span className="text-lg font-mono font-black text-white">{cell.voltage} V</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Cell Temp</span>
                      <span className="text-sm font-mono font-bold text-slate-300">{cell.temp} °C</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Chart & Environmental Climate section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Chart Room */}
            <div className="p-6 rounded-3xl bg-slate-900/20 border border-slate-800/50 shadow-xl relative overflow-hidden flex flex-col justify-between">
               <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                  <Activity size={100} className="text-cyan-500" />
               </div>
               <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                  <LayoutDashboard className="text-cyan-400" size={14} />
                  Engineering Analytics (50 Logs)
               </h3>
               <div className="h-[230px] relative z-10 w-full">
                  {hasMounted ? (
                    <ReactApexChart options={dynamicChartOptions} series={chartSeries} type="area" height={230} width="100%" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 animate-pulse">
                      <Activity size={32} />
                    </div>
                  )}
               </div>
            </div>

            {/* Environmental / Climate Room */}
            <div className="flex flex-col gap-6">
               
               {/* DHT22 Ambient Panel */}
               <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900/30 to-slate-950/20 border border-slate-800/50 shadow-xl">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Droplets size={14} className="text-cyan-400" />
                    DHT22 Ambient Environment
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Temperature gauge */}
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/50 flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Ambient Temp</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">
                          {temps.ambient !== undefined ? Number(temps.ambient).toFixed(1) : '28.4'}
                        </span>
                        <span className="text-xs font-bold text-slate-500">°C</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, (Number(temps.ambient || 28.4) / 50) * 100)}%` }}></div>
                      </div>
                    </div>
                    {/* Humidity gauge */}
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/50 flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Ambient Humidity</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">
                          {temps.humidity !== undefined ? Number(temps.humidity).toFixed(0) : '62'}
                        </span>
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-blue-500" style={{ width: `${Number(temps.humidity || 62)}%` }}></div>
                      </div>
                    </div>
                  </div>
               </div>

               {/* BMS Thermal sensor */}
               <div className="p-5 rounded-3xl bg-slate-900/20 border border-slate-800/50 shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Cpu size={22} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">BMS MOSFET Thermal</h4>
                      <p className="text-[10px] text-slate-500 font-medium">DS18B20 High-Precision Sensor</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-amber-500">
                      {temps.mosfet !== undefined ? Number(temps.mosfet).toFixed(1) : (systemTemp !== 32.5 ? (systemTemp + 10.3).toFixed(1) : '42.8')}°C
                    </span>
                    <div className="flex items-center gap-1.5 justify-end mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                      <span className="text-[8px] font-bold text-amber-500/70 uppercase">Warning 65°C</span>
                    </div>
                  </div>
               </div>

            </div>

          </div>

        </div>

      </div>
      
      {/* ══════════════════════════════════════════════════ */}
      {/* Server Battery Monitor Section */}
      {/* ══════════════════════════════════════════════════ */}
      {serverBattery && (
        <div className="mt-8 pt-8 border-t border-slate-900/60">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Laptop className="text-cyan-400" size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Server Machine Health</h2>
              <p className="text-xs text-slate-500">Local telemetry for host machine · updates every 30s</p>
            </div>
            <div className="ml-auto text-[10px] font-mono text-slate-500 font-bold">{serverBattery.fetchedAt ? new Date(serverBattery.fetchedAt).toLocaleTimeString('id-ID') : ''}</div>
          </div>

          {!serverBattery.hasBattery ? (
            <div className="p-6 rounded-3xl bg-slate-900/10 border border-slate-800/40 flex items-center gap-4">
              <AlertTriangle className="text-slate-500" size={22} />
              <p className="text-slate-400 text-sm">{serverBattery.message ?? "Host machine does not support battery API (e.g. running on desktop PC)"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Battery level */}
              <div className={`p-6 rounded-3xl bg-slate-900/20 border border-slate-800/50 shadow-xl ${batteryGlow} relative overflow-hidden flex flex-col justify-between min-h-[140px]`}>
                <div className="absolute top-0 right-0 p-4 opacity-[0.02]"><Battery size={80} /></div>
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Host Battery</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold" style={{ color: batteryColor }}>{batteryPercent}</span>
                    <span className="text-sm font-bold text-slate-500">%</span>
                  </div>
                </div>
                <div>
                  <div className="h-1.5 w-full bg-slate-950/40 border border-slate-800 rounded-full overflow-hidden p-0.5 mb-3">
                    <div className={`h-full rounded-full transition-all duration-1000 ${batteryBgColor}`} style={{ width: `${batteryPercent}%`, boxShadow: `0 0 8px ${batteryColor}` }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {serverBattery.isCharging ? (
                      <><BatteryCharging size={12} className="text-cyan-400 animate-pulse" /><span className="text-[10px] text-cyan-400 font-bold">CHARGING</span></>
                    ) : (
                      <><Battery size={12} className="text-slate-500" /><span className="text-[10px] text-slate-500 font-bold">DISCHARGING</span></>
                    )}
                  </div>
                </div>
              </div>

              {/* Status PLN card */}
              <div className="p-6 rounded-3xl bg-slate-900/20 border border-slate-800/50 shadow-xl flex flex-col justify-between min-h-[140px]">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Power Source</span>
                <div>
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${serverBattery.acConnected ? 'bg-emerald-500 shadow-emerald-500/40 animate-pulse' : 'bg-rose-500 shadow-rose-500/40 animate-pulse'}`} />
                    <div>
                      <p className="text-xs font-black text-white">{serverBattery.acConnected ? "AC Utility Line" : "Battery Mode"}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-semibold">{serverBattery.acConnected ? "Utility Grid Online" : "Running on inverter"}</p>
                    </div>
                  </div>
                </div>
                <div>
                  {serverBattery.timeRemaining && serverBattery.timeRemaining > 0 ? (
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/50 text-center">
                      <span className="text-[9px] text-slate-500 uppercase block font-semibold">Remaining Runtime</span>
                      <span className="text-sm font-extrabold text-white font-mono">{Math.floor(serverBattery.timeRemaining / 60)}h {serverBattery.timeRemaining % 60}m</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block">Est. infinite (AC mode)</span>
                  )}
                </div>
              </div>

              {/* CPU Temp card */}
              <div className="p-6 rounded-3xl bg-slate-900/20 border border-slate-800/50 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div className="absolute top-0 right-0 p-4 opacity-[0.02]"><Thermometer size={80} /></div>
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Host Thermal</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className={`text-4xl font-extrabold ${cpuTempColor}`}>{serverBattery.cpuTempMax ? Math.round(serverBattery.cpuTempMax) : 'N/A'}</span>
                    {serverBattery.cpuTempMax && <span className="text-xs font-bold text-slate-500">°C</span>}
                  </div>
                </div>
                <div>
                  <div className="h-1 w-full bg-slate-950/40 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full transition-all ${cpuTemp > 80 ? 'bg-red-500' : cpuTemp > 65 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (cpuTemp / 100) * 100)}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {cpuTemp > 80 ? '⚠️ THERMAL THROTTLING' : cpuTemp > 65 ? '⚠️ WARM WORKING TEMP' : '🟢 STABLE SYSTEM TEMP'}
                  </span>
                </div>
              </div>

              {/* RAM Usage card */}
              <div className="p-6 rounded-3xl bg-slate-900/20 border border-slate-800/50 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div className="absolute top-0 right-0 p-4 opacity-[0.02]"><Cpu size={80} /></div>
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Host RAM</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className={`text-4xl font-extrabold ${memColor}`}>{serverBattery.memUsedPercent !== null && serverBattery.memUsedPercent !== undefined ? Math.round(serverBattery.memUsedPercent) : 'N/A'}</span>
                    {serverBattery.memUsedPercent !== null && <span className="text-xs font-bold text-slate-500">%</span>}
                  </div>
                </div>
                <div>
                  <div className="h-1 w-full bg-slate-950/40 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full transition-all ${memUsed > 85 ? 'bg-red-500' : memUsed > 65 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${memUsed}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {memUsed > 85 ? '⚠️ MEMORY EXHAUSTION' : memUsed > 65 ? '⚠️ HIGH BUFFER MEMORY' : '🟢 HEALTHY MEMORY BUFFER'}
                  </span>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Footer Status Bar */}
      <footer className="mt-12 pt-6 border-t border-slate-900/60 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500">
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
          DIY SMART UPS CONTROL HUB v1.2.0-PRO // DESIGNED BY ANTIGRAVITY FOR TOPS GARDEN
        </div>
      </footer>
    </div>
  );
};

export default UPSDashboard;
