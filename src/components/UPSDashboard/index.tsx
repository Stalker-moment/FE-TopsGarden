"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Static Chart Configs to avoid re-renders
const CHART_OPTIONS: any = {
  chart: {
    type: 'area',
    toolbar: { show: false },
    background: 'transparent',
    animations: { enabled: true }
  },
  colors: ['#22d3ee', '#fbbf24'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  grid: { borderColor: '#334155', strokeDashArray: 4 },
  xaxis: {
    categories: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30'],
    labels: { style: { colors: '#94a3b8', fontSize: '10px' } },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: { style: { colors: '#94a3b8', fontSize: '10px' } }
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.1,
      stops: [0, 90, 100]
    }
  },
  tooltip: { theme: 'dark' },
  legend: { show: true, position: 'top', horizontalAlign: 'right', labels: { colors: '#e2e8f0' } }
};

const CHART_SERIES = [
  { name: 'Discharge Curve (V)', data: [12.6, 12.4, 12.2, 11.8, 11.6, 11.45, 11.4] },
  { name: 'Temp Trend (C)', data: [30, 31, 32, 34, 35, 36, 38.2] }
];

// Mock Metrics
const MAIN_METRICS = [
  { id: 1, title: 'Total Voltage', value: '11.45', unit: 'V', icon: Battery, color: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  { id: 2, title: 'Load Current', value: '450', unit: 'mA', icon: Activity, color: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  { id: 3, title: 'Power Consumption', value: '5.15', unit: 'W', icon: Zap, color: 'text-cyan-500', glow: 'shadow-cyan-600/20' },
];

const HTTPS_API_URL = process.env.NEXT_PUBLIC_HTTPS_API_URL || "localhost:3001";
const API_URL = `https://${HTTPS_API_URL}`;

const CELLS = [
  { id: 1, name: 'Cell 1', voltage: '4.12', temp: '32.5', health: 98, status: 'Healthy' },
  { id: 2, name: 'Cell 2', voltage: '3.85', temp: '38.2', health: 75, status: 'Warning' },
  { id: 3, name: 'Cell 3', voltage: '4.10', temp: '31.8', health: 96, status: 'Healthy' },
];

const UPSDashboard: React.FC = () => {
  const [uptime, setUptime] = useState('02:14:55:12');
  const [hasMounted, setHasMounted] = useState(false);
  const [serverBattery, setServerBattery] = useState<ServerBatteryInfo | null>(null);

  const fetchServerBattery = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/device/server-battery`);
      if (res.ok) setServerBattery(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setHasMounted(true);
    fetchServerBattery();
    const interval = setInterval(fetchServerBattery, 30000);
    return () => clearInterval(interval);
  }, [fetchServerBattery]);

  const batteryPercent = serverBattery?.percent ?? 0;
  const batteryColor = batteryPercent >= 50 ? '#22d3ee' : batteryPercent >= 20 ? '#fbbf24' : '#ef4444';
  const batteryBgColor = batteryPercent >= 50 ? 'bg-cyan-500' : batteryPercent >= 20 ? 'bg-yellow-500' : 'bg-red-500';
  const batteryGlow = batteryPercent >= 50 ? 'shadow-cyan-500/20' : batteryPercent >= 20 ? 'shadow-yellow-500/20' : 'shadow-red-500/20';
  const cpuTemp = serverBattery?.cpuTempMax ?? 0;
  const cpuTempColor = cpuTemp > 80 ? 'text-red-400' : cpuTemp > 65 ? 'text-amber-400' : 'text-emerald-400';
  const memUsed = serverBattery?.memUsedPercent ?? 0;
  const memColor = memUsed > 85 ? 'text-red-400' : memUsed > 65 ? 'text-amber-400' : 'text-emerald-400';

  
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 font-sans">
      
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
            <Server className="text-cyan-400" size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              UPS_TIER_01
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30 uppercase tracking-widest font-bold">Mockup</span>
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Clock size={12} />
                Uptime: <span className="text-emerald-400 font-mono">{uptime}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Radio size={12} className="animate-pulse" />
                Signal: <span className="text-cyan-400 font-mono">-64 dBm</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="flex-1 lg:flex-none flex items-center justify-between gap-8 px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl backdrop-blur-md">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Mode</span>
              <span className="text-sm font-black text-white flex items-center gap-2">
                <Power size={14} className="text-emerald-400" />
                ONLINE (PLN)
              </span>
            </div>
            <div className="w-[1px] h-8 bg-slate-700"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Safety Status</span>
              <span className="text-sm font-black text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={14} />
                SECURE
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Big Metrics */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {MAIN_METRICS.map((metric) => (
            <motion.div 
              key={metric.id}
              whileHover={{ scale: 1.02 }}
              className={`p-6 rounded-[2rem] bg-slate-900/50 border border-slate-800 backdrop-blur-xl relative overflow-hidden group shadow-xl ${metric.glow}`}
            >
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <metric.icon size={80} />
              </div>
              <div className="flex flex-col relative z-10">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{metric.title}</span>
                <div className="flex items-baseline gap-2">
                  <h2 className={`text-4xl font-black tracking-tighter ${metric.color}`}>
                    {metric.value}
                  </h2>
                  <span className="text-lg font-bold text-slate-600">{metric.unit}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                   <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full bg-current ${metric.color} opacity-50`} style={{ width: '65%' }}></div>
                   </div>
                   <span className="text-[10px] font-mono text-slate-500 italic">INA219 Realtime</span>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Safety Alerts Card */}
          <div className="p-6 rounded-[2rem] bg-slate-900/50 border border-slate-800 shadow-xl">
             <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber-500" />
                Safety Monitors
             </h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <Flame size={18} className="text-emerald-400" />
                    <span className="text-sm font-bold text-slate-300">MQ-2 Gas/Smoke</span>
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter bg-emerald-500/10 px-2 py-0.5 rounded">CLEAR</span>
                </div>
                 <div className={`flex items-center justify-between p-3 rounded-xl ${serverBattery?.acConnected ? 'bg-cyan-500/5 border border-cyan-500/20' : 'bg-red-500/5 border border-red-500/20'}`}>
                   <div className="flex items-center gap-3">
                     <Zap size={18} className={serverBattery?.acConnected ? 'text-cyan-400' : 'text-red-400'} />
                     <span className="text-sm font-bold text-slate-300">PLN Detector</span>
                   </div>
                   <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${
                     serverBattery?.acConnected 
                       ? 'bg-cyan-500/10 text-cyan-400'
                       : 'bg-red-500/10 text-red-400 animate-pulse'
                   }`}>
                     {serverBattery ? (serverBattery.acConnected ? 'CONNECTED' : 'OFFLINE!') : 'N/A'}
                   </span>
                 </div>
             </div>
          </div>
        </div>

        {/* Center: Battery Health Grid & Charts */}
        <div className="lg:col-span-3 flex flex-col gap-8">
          
          {/* Battery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CELLS.map((cell) => (
              <motion.div 
                key={cell.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-[2rem] border backdrop-blur-xl transition-all ${
                  cell.status === 'Warning' 
                  ? 'bg-amber-500/5 border-amber-500/30 shadow-amber-500/10 shadow-lg' 
                  : 'bg-slate-900/50 border-slate-800'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400">
                    <Battery size={20} className={cell.status === 'Warning' ? 'text-amber-500' : 'text-cyan-400'} />
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border ${
                    cell.status === 'Warning' 
                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {cell.status}
                  </span>
                </div>
                
                <h4 className="text-lg font-black text-white mb-4">{cell.name}</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Voltage</span>
                    <span className="text-xl font-mono font-black text-white">{cell.voltage}V</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">DS18B20 Temp</span>
                    <span className="text-xl font-mono font-black text-white">{cell.temp}°C</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span>Health Capacity</span>
                    <span>{cell.health}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        cell.status === 'Warning' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                      }`} 
                      style={{ width: `${cell.health}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Environmental & BMS Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Chart Area */}
            <div className="p-8 rounded-[2.5rem] bg-slate-900/50 border border-slate-800 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Activity size={120} className="text-cyan-500" />
               </div>
               <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3 relative z-10">
                  <LayoutDashboard className="text-cyan-400" />
                  Engineering Analytics
               </h3>
               <div className="h-[250px] relative z-10 w-full overflow-hidden">
                  {hasMounted ? (
                    <ReactApexChart options={CHART_OPTIONS} series={CHART_SERIES} type="area" height={250} width="100%" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 animate-pulse">
                      <Activity size={40} />
                    </div>
                  )}
               </div>
            </div>

            {/* Environmental & Thermal */}
            <div className="flex flex-col gap-6">
               <div className="flex-1 p-6 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Droplets size={16} className="text-cyan-400" />
                    DHT22 Ambient Environment
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Temperature</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">28.4</span>
                        <span className="text-sm font-bold text-slate-500">°C</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Humidity</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">62</span>
                        <span className="text-sm font-bold text-slate-500">%</span>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="p-6 rounded-[2rem] bg-slate-900/50 border border-slate-800 shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Cpu size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">BMS MOSFET Thermal</h4>
                      <p className="text-xs text-slate-500">DS18B20 High-Precision Sensor</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-amber-500">42.8°C</span>
                    <div className="flex items-center gap-1.5 justify-end mt-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                      <span className="text-[10px] font-bold text-amber-500/70 uppercase">Warning Threshold</span>
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
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Laptop className="text-cyan-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Server Battery Monitor</h2>
              <p className="text-xs text-slate-500">Baterai laptop server · Update setiap 30 detik</p>
            </div>
            <div className="ml-auto text-[10px] font-mono text-slate-600">{serverBattery.fetchedAt ? new Date(serverBattery.fetchedAt).toLocaleTimeString('id-ID') : ''}</div>
          </div>

          {!serverBattery.hasBattery ? (
            <div className="p-6 rounded-[2rem] bg-slate-900/50 border border-slate-800 flex items-center gap-4">
              <AlertTriangle className="text-slate-500" size={24} />
              <p className="text-slate-400 text-sm">{serverBattery.message ?? "Tidak ada baterai terdeteksi"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              
              {/* Battery Level */}
              <div className={`col-span-2 md:col-span-1 p-6 rounded-[2rem] bg-slate-900/50 border border-slate-800 shadow-xl ${batteryGlow} relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-4 opacity-10"><Battery size={80} /></div>
                <div className="flex flex-col relative z-10">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Baterai Server</span>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-5xl font-black" style={{ color: batteryColor }}>{batteryPercent}</span>
                    <span className="text-xl font-bold text-slate-600">%</span>
                  </div>
                  {/* Battery Bar */}
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700 mb-3">
                    <div className={`h-full rounded-full transition-all duration-1000 ${batteryBgColor}`} style={{ width: `${batteryPercent}%`, boxShadow: `0 0 10px ${batteryColor}` }} />
                  </div>
                  <div className="flex items-center gap-2">
                    {serverBattery.isCharging ? (
                      <><BatteryCharging size={14} className="text-cyan-400 animate-pulse" /><span className="text-xs text-cyan-400 font-semibold">Mengisi Daya</span></>
                    ) : (
                      <><Battery size={14} className="text-slate-500" /><span className="text-xs text-slate-500 font-semibold">Discharging</span></>
                    )}
                  </div>
                </div>
              </div>

              {/* AC Status + Time Remaining */}
              <div className="p-6 rounded-[2rem] bg-slate-900/50 border border-slate-800 shadow-xl flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Status PLN</span>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full shadow-lg ${serverBattery.acConnected ? 'bg-emerald-500 shadow-emerald-500/50 animate-pulse' : 'bg-red-500 shadow-red-500/50'}`} />
                    <div>
                      <p className="text-sm font-black text-white">{serverBattery.acConnected ? "PLN Terhubung" : "PLN Terputus!"}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{serverBattery.acConnected ? "AC Connected" : "On Battery"}</p>
                    </div>
                  </div>
                  {serverBattery.timeRemaining && serverBattery.timeRemaining > 0 && (
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Estimasi Sisa</p>
                      <p className="text-xl font-black text-white font-mono">{Math.floor(serverBattery.timeRemaining / 60)}j {serverBattery.timeRemaining % 60}m</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CPU Temp */}
              <div className="p-6 rounded-[2rem] bg-slate-900/50 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Thermometer size={80} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">CPU Temp</span>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-4xl font-black ${cpuTempColor}`}>{serverBattery.cpuTempMax ? Math.round(serverBattery.cpuTempMax) : 'N/A'}</span>
                  {serverBattery.cpuTempMax && <span className="text-lg font-bold text-slate-600">°C</span>}
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${cpuTemp > 80 ? 'bg-red-500' : cpuTemp > 65 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (cpuTemp / 100) * 100)}%` }} />
                </div>
                <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest">
                  {cpuTemp > 80 ? '🔴 Overheat!' : cpuTemp > 65 ? '🟡 Hangat' : '🟢 Normal'}
                </p>
              </div>

              {/* RAM Usage */}
              <div className="p-6 rounded-[2rem] bg-slate-900/50 border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Cpu size={80} /></div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 block">RAM Usage</span>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-4xl font-black ${memColor}`}>{serverBattery.memUsedPercent !== null && serverBattery.memUsedPercent !== undefined ? Math.round(serverBattery.memUsedPercent) : 'N/A'}</span>
                  {serverBattery.memUsedPercent !== null && <span className="text-lg font-bold text-slate-600">%</span>}
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${memUsed > 85 ? 'bg-red-500' : memUsed > 65 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${memUsed}%` }} />
                </div>
                <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-widest">
                  {memUsed > 85 ? '🔴 Kritis' : memUsed > 65 ? '🟡 Tinggi' : '🟢 Normal'}
                </p>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Footer / Status Bar */}
      <footer className="mt-12 pt-8 border-t border-slate-800/50 flex justify-between items-center text-slate-500">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">ESP32 Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Data Stream Active</span>
          </div>
        </div>
        <div className="text-[10px] font-mono tracking-tighter opacity-50 uppercase">
          DIY UPS MONITORING SYSTEM v1.0.4-BETA // TOP'S GARDEN ENGINEERING
        </div>
      </footer>
    </div>
  );
};

export default UPSDashboard;
