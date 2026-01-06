"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  FaExclamationCircle
} from "react-icons/fa";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// --- Mock Data ---

interface PowerData {
  voltage: number;
  current: number;
  power: number;
  energy: number;
  frequency: number;
  pf: number;
  updatedAt: string;
}

interface MonthlyHistory {
  date: string;
  energy: number; // kWh
}

const MOCK_REALTIME: PowerData = {
  voltage: 223.5,
  current: 4.12,
  power: 920.8, 
  energy: 45.25, // kWh accumulating this month
  frequency: 50.02,
  pf: 0.95,
  updatedAt: new Date().toISOString()
};

// Generate mock daily usage for the current month
const generateMockMonthlyHistory = (): MonthlyHistory[] => {
  const days = 30;
  const data: MonthlyHistory[] = [];
  const now = new Date();
  for (let i = 1; i <= days; i++) {
    data.push({
      date: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`,
      energy: Number((Math.random() * 5 + 2).toFixed(2)) // Random between 2 and 7 kWh
    });
  }
  return data;
};

const MOCK_MONTHLY_HISTORY = generateMockMonthlyHistory();

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
  const [data, setData] = useState<PowerData>(MOCK_REALTIME);

  useEffect(() => {
    // Check theme
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // --- Charts Configuration ---

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
      categories: MOCK_MONTHLY_HISTORY.map(d => d.date.split('-')[2]), // Just the day
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

  const energySeries = [{ name: 'Energy Usage', data: MOCK_MONTHLY_HISTORY.map(d => d.energy) }];

  const powerTrendOptions: ApexOptions = {
    chart: { type: 'area', sparkline: { enabled: false }, toolbar: { show: false }, background: 'transparent' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    colors: ['#f59e0b'], // Amber
    grid: { borderColor: isDarkMode ? '#334155' : '#e2e8f0', strokeDashArray: 4 },
    xaxis: {
      type: 'datetime',
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { show: false },
    tooltip: { theme: isDarkMode ? 'dark' : 'light', x: { show: false } },
    theme: { mode: isDarkMode ? 'dark' : 'light' }
  };
  
  // Mock trend data
  const powerTrendSeries = [{
    name: "Active Power",
    data: Array.from({ length: 20 }, (_, i) => ({
      x: new Date().getTime() - (20 - i) * 60000,
      y: 900 + Math.random() * 100 - 50
    }))
  }];

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
          <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">PZEM-004 Connected</span>
          </div>
        </div>

        {/* Realtime Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <CardMetric 
            title="Total Energy (Month)" 
            value={data.energy} 
            unit="kWh" 
            icon={<FaLeaf />} 
            color="text-green-500" 
            subValue={`Est. Cost: Rp ${(data.energy * 1444.70).toLocaleString('id-ID')}`} // Assuming 1444 IDR per kWh
          />
          <CardMetric 
            title="Active Power" 
            value={data.power} 
            unit="W" 
            icon={<FaBolt />} 
            color="text-yellow-500"
            subValue={`PF: ${data.pf}`}
          />
          <CardMetric 
            title="Voltage" 
            value={data.voltage} 
            unit="V" 
            icon={<FaPlug />} 
            color="text-blue-500"
            subValue={`Freq: ${data.frequency} Hz`}
          />
          <CardMetric 
            title="Current" 
            value={data.current} 
            unit="A" 
            icon={<FaTachometerAlt />} 
            color="text-red-500"
          />
        </div>

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
                Monthly Usage
              </h3>
              <select className="bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1 text-sm outline-none">
                <option>This Month</option>
                <option>Last Month</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
              <ReactApexChart options={energyChartOptions} series={energySeries} type="bar" height="100%" />
            </div>
            <div className="mt-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 flex items-start gap-3">
              <FaExclamationCircle className="text-orange-500 mt-1 shrink-0" />
              <p className="text-sm text-orange-700 dark:text-orange-300">
                <strong>Note:</strong> Data usage resets automatically at the beginning of each month (Day 1). Ensure sensors are calibrated for accuracy.
              </p>
            </div>
          </motion.div>

          {/* Realtime Power Trend */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 rounded-[2rem] bg-gradient-to-br from-gray-900 to-gray-800 p-6 md:p-8 shadow-xl text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl"></div>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-2 relative z-10">
              <FaChartLine className="text-yellow-400"/> 
              Live Load Trend
            </h3>
            <p className="text-gray-400 text-sm mb-6 relative z-10">Last 20 minutes active power.</p>
            
            <div className="h-[200px] -mx-4 relative z-10">
               <ReactApexChart options={powerTrendOptions} series={powerTrendSeries} type="area" height="100%" />
            </div>

            <div className="mt-6 space-y-4 relative z-10">
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="text-gray-400 text-sm">Peak Load (Today)</span>
                <span className="font-bold text-lg">1,240 W</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                <span className="text-gray-400 text-sm">Base Load</span>
                <span className="font-bold text-lg">250 W</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Grid Stability</span>
                <span className="font-bold text-green-400 text-sm bg-green-900/30 px-2 py-1 rounded">Stable</span>
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
            <button className="text-sm font-semibold text-blue-500 hover:underline">View All History</button>
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
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                      <td className="py-3 px-4 font-medium">{new Date(Date.now() - i * 3600000).toLocaleTimeString()}</td>
                      <td className="py-3 px-4">220.{Math.floor(Math.random()*9)}</td>
                      <td className="py-3 px-4">{(Math.random()*3 + 1).toFixed(2)}</td>
                      <td className="py-3 px-4">{(Math.random()*500 + 200).toFixed(1)}</td>
                      <td className="py-3 px-4">{(45.25 - i * 0.5).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default PowerDashboard;
