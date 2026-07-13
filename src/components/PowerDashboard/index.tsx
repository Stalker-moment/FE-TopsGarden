"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
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
  FaCog,
  FaChartBar,
  FaExclamationTriangle,
  FaLaptop,
  FaBatteryFull,
  FaBatteryHalf,
  FaBatteryQuarter,
  FaBatteryEmpty,
  FaThermometerHalf,
  FaMemory,
  FaCheckCircle,
  FaArrowLeft,
  FaArrowRight,
  FaExpand,
  FaCompress,
  FaMobileAlt,
  FaTimes,
  FaPowerOff,
  FaTimesCircle
} from "react-icons/fa";
import { MdElectricBolt } from "react-icons/md";
import { ApexOptions } from "apexcharts";
import { 
  PzemData, PzemDevice, PzemLog,
  PzemHourlyUsageResponse, PzemMinutelyUsageResponse,
  PzemDailyUsageResponse, PzemMonthlyUsageResponse, PzemYearlyUsageResponse,
  PowerOutageLogsResponse, PowerOutageLogItem, ServerBatteryInfo
} from "@/types/pzem";

import DeviceSettingsModal from "./DeviceSettingsModal";
import ConfirmationModal from "./ConfirmationModal";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// Configuration
const HTTPS_API_URL = process.env.NEXT_PUBLIC_HTTPS_API_URL || "localhost:3001";
const API_URL = `https://${HTTPS_API_URL}`;
const WS_URL = process.env.NEXT_PUBLIC_WS_PZEM_URL || `wss://${HTTPS_API_URL}/pzem`;
const PLN_RATE = 1444.70;
const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

// ─────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────

const CardMetric = ({ 
  title, value, unit, icon, color, subValue 
}: { 
  title: string; value: string | number; unit: string; icon: React.ReactNode; color: string; subValue?: string;
}) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-4 md:p-6 shadow-lg"
  >
    <div className={`absolute right-0 top-0 p-3 md:p-4 opacity-10 text-5xl md:text-6xl ${color}`}>
      {icon}
    </div>
    <div className="relative z-10">
      <div className={`p-2.5 md:p-3 w-fit rounded-xl md:rounded-2xl bg-white dark:bg-gray-700 shadow-sm ${color} text-xl md:text-2xl mb-3 md:mb-4`}>
        {icon}
      </div>
      <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <h4 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-gray-100 mt-1 tracking-tight">
        {value} <span className="text-base md:text-lg font-medium text-gray-400 ml-1">{unit}</span>
      </h4>
      {subValue && (
        <p className="text-[10px] md:text-xs font-semibold text-gray-400 mt-1.5 md:mt-2 flex items-center gap-1">
          {subValue}
        </p>
      )}
    </div>
  </motion.div>
);

// Battery Icon Component
const BatteryIcon = ({ percent }: { percent: number }) => {
  if (percent >= 75) return <FaBatteryFull className="text-green-400" size={20} />;
  if (percent >= 40) return <FaBatteryHalf className="text-yellow-400" size={20} />;
  if (percent >= 15) return <FaBatteryQuarter className="text-orange-400" size={20} />;
  return <FaBatteryEmpty className="text-red-400" size={20} />;
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

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

  // === kWh Usage Chart State ===
  type UsageView = "minutely" | "hourly" | "daily" | "monthly" | "yearly";
  const [usageView, setUsageView] = useState<UsageView>("daily");
  const [usageYear, setUsageYear] = useState(new Date().getFullYear());
  const [usageMonth, setUsageMonth] = useState(new Date().getMonth() + 1);
  const [usageDay, setUsageDay] = useState(new Date().getDate());
  const [usageHour, setUsageHour] = useState(new Date().getHours());

  // Custom Pickers State
  const [activePicker, setActivePicker] = useState<"date" | "month" | "hour" | "year" | null>(null);
  const [pickerYear, setPickerYear] = useState(usageYear);
  const [pickerNavMonth, setPickerNavMonth] = useState(usageMonth);
  const [pickerNavYear, setPickerNavYear] = useState(usageYear);

  useEffect(() => {
    setPickerYear(usageYear);
    setPickerNavYear(usageYear);
  }, [usageYear]);

  useEffect(() => {
    setPickerNavMonth(usageMonth);
  }, [usageMonth]);

  const [minutelyUsage, setMinutelyUsage] = useState<PzemMinutelyUsageResponse | null>(null);
  const [hourlyUsage, setHourlyUsage] = useState<PzemHourlyUsageResponse | null>(null);
  const [dailyUsage, setDailyUsage] = useState<PzemDailyUsageResponse | null>(null);
  const [monthlyUsage, setMonthlyUsage] = useState<PzemMonthlyUsageResponse | null>(null);
  const [yearlyUsage, setYearlyUsage] = useState<PzemYearlyUsageResponse | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);


  // === Outage Log State ===
  const [outageLogs, setOutageLogs] = useState<PowerOutageLogItem[]>([]);
  const [outageTotal, setOutageTotal] = useState(0);
  const [outagePage, setOutagePage] = useState(1);
  const [outageLoading, setOutageLoading] = useState(false);

  // === Server Battery State ===
  const [serverBattery, setServerBattery] = useState<ServerBatteryInfo | null>(null);

  // Chart toggles
  const [activeMetrics, setActiveMetrics] = useState({ power: true, voltage: false, current: false });
  const [selectedUsageMetric, setSelectedUsageMetric] = useState<"kwh" | "voltage" | "current">("kwh");

  // Fullscreen modal state
  const [fullscreenChart, setFullscreenChart] = useState<"usage" | "trend" | null>(null);

  // Relay & Overcurrent protection state
  const [activeRelayState, setActiveRelayState] = useState<boolean>(true);
  const [activeHasRelay, setActiveHasRelay] = useState<boolean>(false);
  const [activeThreshold, setActiveThreshold] = useState<number>(10.0);
  const [activeDelay, setActiveDelay] = useState<number>(0);
  const [activeAutoReconnect, setActiveAutoReconnect] = useState<boolean>(false);
  const [activeReconnectDelay, setActiveReconnectDelay] = useState<number>(30);

  useEffect(() => {
    const dev = devices.find(d => d.id === selectedDeviceId);
    if (dev) {
      setActiveHasRelay(dev.hasRelay || false);
      setActiveRelayState(dev.relayState !== false);
      setActiveThreshold(dev.overcurrentThreshold !== undefined ? dev.overcurrentThreshold : 10.0);
      setActiveDelay(dev.overcurrentDelay !== undefined ? dev.overcurrentDelay : 0);
      setActiveAutoReconnect(dev.autoReconnect || false);
      setActiveReconnectDelay(dev.reconnectDelay !== undefined ? dev.reconnectDelay : 30);
    }
  }, [selectedDeviceId, devices]);

  const toggleRelay = async () => {
    if (!selectedDeviceId) return;
    const targetState = !activeRelayState;
    setActiveRelayState(targetState);
    try {
      const res = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/relay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relayState: targetState })
      });
      if (!res.ok) {
        setActiveRelayState(!targetState);
        alert("Failed to toggle relay");
      } else {
        fetchDevices();
      }
    } catch {
      setActiveRelayState(!targetState);
      alert("Error toggling relay");
    }
  };

  useEffect(() => {
    if (fullscreenChart) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreenChart]);

  // Listen for Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreenChart(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);



  // WebSocket Reference
  const wsRef = useRef<WebSocket | null>(null);
  const pendingWsData = useRef<any>(null);
  const isHoveringChart = useRef(false);
  const lastHeavyUpdate = useRef(0);

  const applyPendingUpdate = useCallback(() => {
    if (pendingWsData.current) {
      const message = pendingWsData.current;
      pendingWsData.current = null;
      const current = message.find((d: any) => d.id === selectedDeviceId);
      if (current) {
        if (current.hasRelay !== undefined) setActiveHasRelay(current.hasRelay);
        if (current.relayState !== undefined) setActiveRelayState(current.relayState);
        if (current.overcurrentThreshold !== undefined) setActiveThreshold(current.overcurrentThreshold);
        if (current.overcurrentDelay !== undefined) setActiveDelay(current.overcurrentDelay);
        if (current.autoReconnect !== undefined) setActiveAutoReconnect(current.autoReconnect);
        if (current.reconnectDelay !== undefined) setActiveReconnectDelay(current.reconnectDelay);

        if (current.data) {
          setRealtimeData({ id: current.id, ...current.data, createdAt: current.lastUpdate || new Date().toISOString() });
          setStatus("ONLINE");
          if (current.logs) setRecentLogs(current.logs);
          if (current.chart) setChartData(current.chart);
          lastHeavyUpdate.current = Date.now();
        }
      }
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    const saved = localStorage.getItem("pzem_max_power");
    if (saved) setMaxPowerLimit(Number(saved));
  }, []);

  const handleMaxPowerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    setMaxPowerLimit(val);
    if (val !== '') localStorage.setItem("pzem_max_power", val.toString());
  };

  useEffect(() => {
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // 1. Fetch Devices List
  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/device/pzem`);
      if (res.ok) {
        const data: PzemDevice[] = await res.json();
        setDevices(data);
        if (data.length > 0 && !selectedDeviceId) setSelectedDeviceId("all");
      }
    } catch (error) { console.error("Failed to fetch devices:", error); }
  }, [selectedDeviceId]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);


  // 2. Fetch Initial Data when device selected
  useEffect(() => {
    if (!selectedDeviceId) return;
    const fetchHistory = async () => {
      try {
        const [chartRes, logsRes, latestRes] = await Promise.all([
          fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/chart`),
          fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/logs?limit=10`),
          fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/latest`),
        ]);
        if (chartRes.ok) setChartData(await chartRes.json());
        if (logsRes.ok) setRecentLogs(await logsRes.json());
        if (latestRes.ok) {
          const j = await latestRes.json();
          if (j.latest) { 
            setRealtimeData(j.latest); 
            setStatus(j.status); 
          } else {
            setRealtimeData(null);
            setStatus("OFFLINE");
          }
        }
      } catch (error) { 
        console.error("Failed to fetch history:", error); 
        setRealtimeData(null);
        setRecentLogs([]);
        setChartData([]);
        setStatus("OFFLINE");
      }
    };
    fetchHistory();
  }, [selectedDeviceId]);

  // 3. WebSocket Connection
  useEffect(() => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (Array.isArray(message)) {
          if (isHoveringChart.current) {
            pendingWsData.current = message;
          } else {
            if (selectedDeviceId === "all") {
              const activeDevs = message.filter((d: any) => d.isActive !== false && d.data);
              if (activeDevs.length > 0) {
                const totalEnergy = activeDevs.reduce((sum: number, d: any) => sum + (d.data.energy || 0), 0);
                const totalPower = activeDevs.reduce((sum: number, d: any) => sum + (d.data.power || 0), 0);
                const avgVoltage = activeDevs.reduce((sum: number, d: any) => sum + (d.data.voltage || 0), 0) / activeDevs.length;
                const totalCurrent = activeDevs.reduce((sum: number, d: any) => sum + (d.data.current || 0), 0);
                const avgFreq = activeDevs.reduce((sum: number, d: any) => sum + (d.data.frequency || 0), 0) / activeDevs.length;
                const avgPf = activeDevs.reduce((sum: number, d: any) => sum + (d.data.pf || 0), 0) / activeDevs.length;

                setRealtimeData({
                  id: "all",
                  voltage: avgVoltage,
                  current: totalCurrent,
                  power: totalPower,
                  energy: totalEnergy,
                  frequency: avgFreq,
                  pf: avgPf,
                  createdAt: new Date().toISOString()
                });
                setStatus("ONLINE");

                const now = Date.now();
                if (now - lastHeavyUpdate.current > 3000) {
                  lastHeavyUpdate.current = now;
                  fetch(`${API_URL}/api/device/pzem/all/chart`).then(r => r.json()).then(setChartData).catch(() => {});
                  fetch(`${API_URL}/api/device/pzem/all/logs?limit=10`).then(r => r.json()).then(setRecentLogs).catch(() => {});
                }
              } else {
                setRealtimeData(null);
                setStatus("OFFLINE");
                setRecentLogs([]);
                setChartData([]);
              }
            } else {
              const current = message.find((d: any) => d.id === selectedDeviceId);
              if (current) {
                if (current.hasRelay !== undefined) setActiveHasRelay(current.hasRelay);
                if (current.relayState !== undefined) setActiveRelayState(current.relayState);
                if (current.overcurrentThreshold !== undefined) setActiveThreshold(current.overcurrentThreshold);
                if (current.overcurrentDelay !== undefined) setActiveDelay(current.overcurrentDelay);
                if (current.autoReconnect !== undefined) setActiveAutoReconnect(current.autoReconnect);
                if (current.reconnectDelay !== undefined) setActiveReconnectDelay(current.reconnectDelay);

                if (current.data) {
                  setRealtimeData({ id: current.id, ...current.data, createdAt: current.lastUpdate || new Date().toISOString() });
                  setStatus("ONLINE");
                  
                  const now = Date.now();
                  if (now - lastHeavyUpdate.current > 3000) {
                    lastHeavyUpdate.current = now;
                    if (current.logs) setRecentLogs(current.logs);
                    if (current.chart) setChartData(current.chart);
                  }
                } else {
                  setRealtimeData(null);
                  setStatus("OFFLINE");
                  setRecentLogs([]);
                  setChartData([]);
                }
              }
            }
          }
        }
      } catch (e) { console.error("WS Parse Error", e); }
    };
    ws.onerror = () => setStatus("OFFLINE");
    ws.onclose = () => setStatus("OFFLINE");
    return () => ws.close();
  }, [selectedDeviceId]);

  // 4. Fetch kWh Usage Chart data
  const fetchUsageData = useCallback(async () => {
    if (!selectedDeviceId) return;
    setUsageLoading(true);
    try {
      const dateStr = `${usageYear}-${String(usageMonth).padStart(2, '0')}-${String(usageDay).padStart(2, '0')}`;
      if (usageView === "minutely") {
        const res = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/minutely-usage?date=${dateStr}&hour=${usageHour}`);
        if (res.ok) setMinutelyUsage(await res.json());
      } else if (usageView === "hourly") {
        const res = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/hourly-usage?date=${dateStr}`);
        if (res.ok) setHourlyUsage(await res.json());
      } else if (usageView === "daily") {
        const res = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/daily-usage?year=${usageYear}&month=${usageMonth}`);
        if (res.ok) setDailyUsage(await res.json());
      } else if (usageView === "monthly") {
        const res = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/monthly-usage?year=${usageYear}`);
        if (res.ok) setMonthlyUsage(await res.json());
      } else {
        const res = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/yearly-usage`);
        if (res.ok) setYearlyUsage(await res.json());
      }
    } catch (e) { console.error("Usage fetch error", e); }
    setUsageLoading(false);
  }, [selectedDeviceId, usageView, usageYear, usageMonth, usageDay, usageHour]);

  useEffect(() => { fetchUsageData(); }, [fetchUsageData]);


  // 5. Fetch Outage Logs
  const fetchOutageLogs = useCallback(async () => {
    if (!selectedDeviceId) return;
    setOutageLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/outage-logs?limit=10&page=${outagePage}`);
      if (res.ok) {
        const data: PowerOutageLogsResponse = await res.json();
        setOutageLogs(data.logs);
        setOutageTotal(data.total);
      }
    } catch (e) { console.error("Outage log fetch error", e); }
    setOutageLoading(false);
  }, [selectedDeviceId, outagePage]);

  useEffect(() => { fetchOutageLogs(); }, [fetchOutageLogs]);

  // Auto-refresh outage logs every 60s (realtime matlis detection)
  useEffect(() => {
    if (!selectedDeviceId) return;
    const interval = setInterval(fetchOutageLogs, 60000);
    return () => clearInterval(interval);
  }, [fetchOutageLogs, selectedDeviceId]);

  // 6. Fetch Server Battery (poll every 30s)
  const fetchServerBattery = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/device/server-battery`);
      if (res.ok) setServerBattery(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchServerBattery();
    const interval = setInterval(fetchServerBattery, 30000);
    return () => clearInterval(interval);
  }, [fetchServerBattery]);

  // 7. Reset Energy Handler
  const confirmResetEnergy = async () => {
    if (!selectedDeviceId) return;
    try {
      const res = await fetch(`${API_URL}/api/device/pzem/${selectedDeviceId}/reset-command`, { method: 'POST' });
      alert(res.ok ? "Reset command queued. Device will reset energy on next update." : "Failed to send reset command.");
    } catch { alert("Error sending reset command."); }
    finally { setIsResetConfirmOpen(false); }
  };

  // ─────── Derived Data ───────
  const displayData = realtimeData || { voltage: 0, current: 0, power: 0, energy: 0, frequency: 0, pf: 0 };
  const estimatedCost = displayData.energy * PLN_RATE;
  const co2Saved = (displayData.energy * 0.85).toFixed(3);

  // === Real-time Today's kWh Estimate ===
  // Update nowState setiap menit agar tanggal dan bulan selalu akurat
  const [nowState, setNowState] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNowState(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const isCurrentMonth = useMemo(
    () => usageYear === nowState.getFullYear() && usageMonth === nowState.getMonth() + 1,
    [usageYear, usageMonth, nowState]
  );
  const currentMonthNum = nowState.getMonth() + 1; // 1-based, stable number
  const todayDateLabel = useMemo(
    () => nowState.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    [nowState]
  );
  const todayDateStr = useMemo(() => {
    const y = nowState.getFullYear();
    const m = String(nowState.getMonth() + 1).padStart(2, '0');
    const d = String(nowState.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [nowState]);

  const todayLiveUsage = useMemo(() => {
    if (!realtimeData || !isCurrentMonth) return null;
    const liveEnergy = realtimeData.energy;

    if (dailyUsage && dailyUsage.days.length > 0) {
      // Cari index hari ini (misal "05 Jul")
      const todayIndex = dailyUsage.days.findIndex(d => d.dateLabel === todayDateLabel);
      if (todayIndex >= 0) {
        // Cari snapshot baseline dari hari kemarin / sebelumnya yang energyKwh > 0
        let base = 0;
        for (let i = todayIndex - 1; i >= 0; i--) {
          if (dailyUsage.days[i].energyKwh > 0) {
            base = dailyUsage.days[i].energyKwh;
            break;
          }
        }
        if (base > 0) {
          if (liveEnergy < base) {
            return { kwh: parseFloat(liveEnergy.toFixed(3)), isReset: true };
          }
          return { kwh: parseFloat((liveEnergy - base).toFixed(3)), isReset: false };
        }
        // Jika belum ada baseline snapshot sebelumnya, pakai usageKwh dari kalkulasi backend hari ini
        const todayBackendKwh = dailyUsage.days[todayIndex].usageKwh;
        if (todayBackendKwh > 0) {
          return { kwh: parseFloat(todayBackendKwh.toFixed(3)), isReset: false };
        }
      }
    }

    if (liveEnergy > 0) {
      return { kwh: parseFloat(liveEnergy.toFixed(3)), isReset: false };
    }
    return null;
  }, [realtimeData, dailyUsage, isCurrentMonth, todayDateLabel]);

  // Helper check if a timestamp (ms) falls into a recorded outage event
  const isOutageAt = useCallback((timestampMs: number) => {
    if (!outageLogs || outageLogs.length === 0) return false;
    return outageLogs.some(log => {
      const start = new Date(log.startedAt).getTime() - 60000;
      const end = log.endedAt ? new Date(log.endedAt).getTime() + 60000 : Date.now();
      return timestampMs >= start && timestampMs <= end;
    });
  }, [outageLogs]);

  // Helper to format duration seconds into human readable text
  const formatOutageDuration = useCallback((totalSec: number) => {
    if (totalSec >= 3600) {
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      return `${h}j ${m}m`;
    }
    if (totalSec >= 60) {
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m}m ${s}s`;
    }
    return `${totalSec}s`;
  }, []);

  // Helper to find all outage logs that intersect with [startMs, endMs]
  const getOutageSummaryForRange = useCallback((startMs: number, endMs: number) => {
    if (!outageLogs || outageLogs.length === 0) return { count: 0, totalDurationSec: 0 };

    const matching = outageLogs.filter(log => {
      const logStart = new Date(log.startedAt).getTime();
      const logEnd = log.endedAt ? new Date(log.endedAt).getTime() : Date.now();
      return Math.max(startMs, logStart) <= Math.min(endMs, logEnd);
    });

    if (matching.length === 0) return { count: 0, totalDurationSec: 0 };

    let totalDurationSec = 0;
    matching.forEach(log => {
      const logStart = new Date(log.startedAt).getTime();
      const logEnd = log.endedAt ? new Date(log.endedAt).getTime() : Date.now();
      const overlapStart = Math.max(startMs, logStart);
      const overlapEnd = Math.min(endMs, logEnd);
      const sec = Math.max(0, Math.floor((overlapEnd - overlapStart) / 1000));
      totalDurationSec += sec;
    });

    return { count: matching.length, totalDurationSec };
  }, [outageLogs]);

  // Usage chart series & categories (with live today bar injected)
  const usageChartSeries = useMemo(() => {
    if (selectedUsageMetric === "voltage") {
      if (usageView === "minutely" && minutelyUsage) {
        return [{ name: "Tegangan Rata-Rata (V)", data: minutelyUsage.minutes.map(m => m.avgVoltage || 0) }];
      }
      if (usageView === "hourly" && hourlyUsage) {
        return [{ name: "Tegangan Rata-Rata (V)", data: hourlyUsage.hours.map(h => h.avgVoltage || 0) }];
      }
      if (usageView === "daily" && dailyUsage) {
        const isTodayItem = (d: any) => d.dateLabel === todayDateLabel;
        const hasToday = dailyUsage.days.some(isTodayItem);
        const data = dailyUsage.days.map(d => isTodayItem(d) ? displayData.voltage : (d.avgVoltage || 0));
        if (!hasToday && todayLiveUsage !== null && isCurrentMonth) data.push(displayData.voltage);
        return [{ name: "Tegangan Rata-Rata (V)", data }];
      }
      if (usageView === "monthly" && monthlyUsage) {
        return [{ name: "Tegangan Rata-Rata (V)", data: monthlyUsage.months.map(m => m.avgVoltage || 0) }];
      }
      if (usageView === "yearly" && yearlyUsage) {
        return [{ name: "Tegangan Rata-Rata (V)", data: yearlyUsage.years.map(y => y.avgVoltage || 0) }];
      }
    }

    if (selectedUsageMetric === "current") {
      if (usageView === "minutely" && minutelyUsage) {
        return [{ name: "Arus Rata-Rata (A)", data: minutelyUsage.minutes.map(m => m.avgCurrent || 0) }];
      }
      if (usageView === "hourly" && hourlyUsage) {
        return [{ name: "Arus Rata-Rata (A)", data: hourlyUsage.hours.map(h => (h.avgPower && h.avgVoltage ? parseFloat((h.avgPower / h.avgVoltage).toFixed(2)) : 0)) }];
      }
      if (usageView === "daily" && dailyUsage) {
        const isTodayItem = (d: any) => d.dateLabel === todayDateLabel;
        const hasToday = dailyUsage.days.some(isTodayItem);
        const data = dailyUsage.days.map(d => isTodayItem(d) ? displayData.current : (d.avgCurrent || 0));
        if (!hasToday && todayLiveUsage !== null && isCurrentMonth) data.push(displayData.current);
        return [{ name: "Arus Rata-Rata (A)", data }];
      }
      if (usageView === "monthly" && monthlyUsage) {
        return [{ name: "Arus Rata-Rata (A)", data: monthlyUsage.months.map(m => m.avgCurrent || 0) }];
      }
      if (usageView === "yearly" && yearlyUsage) {
        return [{ name: "Arus Rata-Rata (A)", data: yearlyUsage.years.map(y => y.avgCurrent || 0) }];
      }
    }

    // Default: kWh / Power (W)
    if (usageView === "minutely" && minutelyUsage) {
      const nowMs = Date.now();
      return [{
        name: "Daya Rata-Rata (W)",
        data: minutelyUsage.minutes.map(m => {
          const minuteStartMs = new Date(usageYear, usageMonth - 1, usageDay, usageHour, m.minute, 0).getTime();
          const minuteEndMs = minuteStartMs + 59999;
          const isFuture = minuteStartMs > nowMs;
          if (isFuture) return 0;
          const summary = getOutageSummaryForRange(minuteStartMs, minuteEndMs);
          const isMatlis = summary.count > 0 || (m.count > 0 && m.avgVoltage < 10);
          if (isMatlis) return m.avgPower > 0 ? m.avgPower : 4;
          return m.avgPower;
        })
      }];
    }
    if (usageView === "hourly" && hourlyUsage) {
      const nowMs = Date.now();
      return [{
        name: "Konsumsi (kWh)",
        data: hourlyUsage.hours.map(h => {
          const hourStartMs = new Date(usageYear, usageMonth - 1, usageDay, h.hour, 0, 0).getTime();
          const hourEndMs = hourStartMs + 3599999;
          const isFuture = hourStartMs > nowMs;
          if (isFuture) return 0;
          const summary = getOutageSummaryForRange(hourStartMs, hourEndMs);
          const isMatlis = summary.count > 0 || (h.count > 0 && h.avgVoltage < 10);
          if (isMatlis) return h.usageKwh > 0 ? parseFloat(h.usageKwh.toFixed(4)) : 0.005;
          return parseFloat(h.usageKwh.toFixed(4));
        })
      }];
    }
    if (usageView === "daily" && dailyUsage) {
      const nowMs = Date.now();
      const isTodayItem = (d: any) => d.dateLabel === todayDateLabel;
      const hasToday = dailyUsage.days.some(isTodayItem);
      const data = dailyUsage.days.map(d => {
        if (isTodayItem(d) && todayLiveUsage !== null && isCurrentMonth) {
          return todayLiveUsage.kwh;
        }
        const dayDate = new Date(d.date);
        const dayStartMs = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0).getTime();
        const dayEndMs = dayStartMs + 86399999;
        const isFuture = dayStartMs > nowMs;
        if (isFuture) return 0;
        const summary = getOutageSummaryForRange(dayStartMs, dayEndMs);
        const isMatlis = summary.count > 0 || (d.avgVoltage !== undefined && d.avgVoltage > 0 && d.avgVoltage < 10 && d.usageKwh === 0);
        if (isMatlis) return d.usageKwh > 0 ? parseFloat(d.usageKwh.toFixed(3)) : 0.005;
        return parseFloat(d.usageKwh.toFixed(3));
      });
      if (!hasToday && todayLiveUsage !== null && isCurrentMonth) {
        data.push(todayLiveUsage.kwh);
      }
      return [{ name: "Konsumsi (kWh)", data }];
    }
    if (usageView === "monthly" && monthlyUsage) {
      const data = monthlyUsage.months.map(m => {
        if (isCurrentMonth && m.month === currentMonthNum) {
          return parseFloat((m.usageKwh + (todayLiveUsage?.kwh ?? 0)).toFixed(3));
        }
        return m.usageKwh;
      });
      return [{ name: "Konsumsi (kWh)", data }];
    }
    if (usageView === "yearly" && yearlyUsage) {
      return [{ name: "Konsumsi (kWh)", data: yearlyUsage.years.map(y => y.usageKwh) }];
    }
    return [{ name: "Konsumsi (kWh)", data: [] }];
  }, [selectedUsageMetric, usageView, minutelyUsage, hourlyUsage, dailyUsage, monthlyUsage, yearlyUsage, todayLiveUsage, displayData, isCurrentMonth, currentMonthNum, getOutageSummaryForRange, usageYear, usageMonth, usageDay, usageHour, todayDateLabel]);

  const usageChartCategories = useMemo(() => {
    if (usageView === "minutely" && minutelyUsage) return minutelyUsage.minutes.map(m => m.label);
    if (usageView === "hourly" && hourlyUsage) return hourlyUsage.hours.map(h => h.label);
    if (usageView === "daily" && dailyUsage) {
      const isTodayItem = (d: any) => d.dateLabel === todayDateLabel;
      const hasToday = dailyUsage.days.some(isTodayItem);
      const cats = dailyUsage.days.map(d => d.dateLabel);
      if (!hasToday && todayLiveUsage !== null && isCurrentMonth) cats.push(`${todayDateLabel}`);
      return cats;
    }
    if (usageView === "monthly" && monthlyUsage) return monthlyUsage.months.map(m => m.label);
    if (usageView === "yearly" && yearlyUsage) return yearlyUsage.years.map(y => String(y.year));
    return [];
  }, [usageView, minutelyUsage, hourlyUsage, dailyUsage, monthlyUsage, yearlyUsage, todayLiveUsage, todayDateLabel, isCurrentMonth]);

  // Colors per bar: red = outage (0V/0W), orange = reset day, amber = live today, cyan = minutely, violet = hourly, blue = normal
  const usageBarColors = useMemo(() => {
    if (selectedUsageMetric === "voltage") return ["#3b82f6"];
    if (selectedUsageMetric === "current") return ["#ef4444"];
    if (usageView === "minutely" && minutelyUsage) {
      const nowMs = Date.now();
      return minutelyUsage.minutes.map(m => {
        const minuteStartMs = new Date(usageYear, usageMonth - 1, usageDay, usageHour, m.minute, 0).getTime();
        const minuteEndMs = minuteStartMs + 59999;
        if (minuteStartMs > nowMs) return "#06b6d4";
        const summary = getOutageSummaryForRange(minuteStartMs, minuteEndMs);
        const isMatlis = summary.count > 0 || (m.count > 0 && m.avgVoltage < 10);
        return isMatlis ? "#ef4444" : "#06b6d4";
      });
    }
    if (usageView === "hourly" && hourlyUsage) {
      const nowMs = Date.now();
      return hourlyUsage.hours.map(h => {
        const hourStartMs = new Date(usageYear, usageMonth - 1, usageDay, h.hour, 0, 0).getTime();
        const hourEndMs = hourStartMs + 3599999;
        if (hourStartMs > nowMs) return "#8b5cf6";
        const summary = getOutageSummaryForRange(hourStartMs, hourEndMs);
        const isMatlis = summary.count > 0 || (h.count > 0 && h.avgVoltage < 10);
        return isMatlis ? "#ef4444" : "#8b5cf6";
      });
    }
    if (usageView === "daily" && dailyUsage) {
      const nowMs = Date.now();
      const isTodayItem = (d: any) => d.dateLabel === todayDateLabel;
      const hasToday = dailyUsage.days.some(isTodayItem);
      const colors: string[] = dailyUsage.days.map(d => {
        if (isTodayItem(d) && todayLiveUsage !== null && isCurrentMonth) {
          return todayLiveUsage.isReset ? "#f97316" : "#f59e0b"; // amber = live hari ini
        }
        const dayDate = new Date(d.date);
        const dayStartMs = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0).getTime();
        const dayEndMs = dayStartMs + 86399999;
        if (dayStartMs <= nowMs) {
          const summary = getOutageSummaryForRange(dayStartMs, dayEndMs);
          if (summary.count > 0 || (d.avgVoltage !== undefined && d.avgVoltage > 0 && d.avgVoltage < 10)) {
            return "#ef4444";
          }
        }
        return d.isResetDay ? "#f97316" : "#3b82f6";
      });
      if (!hasToday && todayLiveUsage !== null && isCurrentMonth) {
        colors.push(todayLiveUsage.isReset ? "#f97316" : "#f59e0b");
      }
      return colors;
    }
    return undefined;
  }, [selectedUsageMetric, usageView, minutelyUsage, hourlyUsage, dailyUsage, todayLiveUsage, getOutageSummaryForRange, usageYear, usageMonth, usageDay, usageHour, todayDateLabel, isCurrentMonth]);

  const usageSummary = useMemo(() => {
    const liveAdd = (isCurrentMonth && todayLiveUsage) ? todayLiveUsage.kwh : 0;
    if (usageView === "minutely" && minutelyUsage) {
      return {
        total: minutelyUsage.totalKwh,
        cost: minutelyUsage.estimatedCost,
        label: `Jam ${String(usageHour).padStart(2, '0')}:00, ${usageDay} ${MONTH_NAMES[usageMonth - 1]}`
      };
    }
    if (usageView === "hourly" && hourlyUsage) {
      return {
        total: hourlyUsage.totalKwh,
        cost: hourlyUsage.estimatedCost,
        label: `24 Jam — ${usageDay} ${MONTH_NAMES[usageMonth - 1]} ${usageYear}`
      };
    }
    if (usageView === "daily" && dailyUsage) {
      const total = parseFloat((dailyUsage.totalKwh + liveAdd).toFixed(3));
      return { total, cost: parseFloat((total * PLN_RATE).toFixed(0)), label: `${MONTH_NAMES[usageMonth - 1]} ${usageYear}` };
    }
    if (usageView === "monthly" && monthlyUsage) {
      const total = parseFloat((monthlyUsage.totalKwh + liveAdd).toFixed(3));
      return { total, cost: parseFloat((total * PLN_RATE).toFixed(0)), label: `Tahun ${usageYear}` };
    }
    if (usageView === "yearly" && yearlyUsage) {
      const total = yearlyUsage.years.reduce((s, y) => s + y.usageKwh, 0);
      return { total: parseFloat(total.toFixed(3)), cost: parseFloat((total * PLN_RATE).toFixed(0)), label: "5 Tahun Terakhir" };
    }
    return { total: 0, cost: 0, label: "" };
  }, [usageView, minutelyUsage, hourlyUsage, dailyUsage, monthlyUsage, yearlyUsage, usageYear, usageMonth, usageDay, usageHour, todayLiveUsage, isCurrentMonth]);

  // Join arrays into stable string keys for chart options memoization
  const usageBarColorsKey = (usageBarColors || []).join(",");
  const usageCategoriesKey = usageChartCategories.join(",");

  // kWh Chart Options
  const usageChartOptions: ApexOptions = useMemo(() => ({
    chart: {
      type: 'bar',
      toolbar: { show: false },
      background: 'transparent',
      animations: {
        enabled: true,
        speed: 400,
        dynamicAnimation: {
          enabled: true,
          speed: 300,
        }
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: usageView === "yearly" ? "40%" : usageView === "monthly" ? "50%" : "70%",
        distributed: true,
      },
    },
    colors: usageBarColors ?? ["#3b82f6"],
    dataLabels: { enabled: false },
    grid: { borderColor: isDarkMode ? '#334155' : '#e2e8f0', strokeDashArray: 4, yaxis: { lines: { show: true } } },
    xaxis: {
      categories: usageChartCategories,
      labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '11px' }, rotate: usageView === "daily" ? -45 : 0 },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' },
        formatter: (val: number) => {
          if (selectedUsageMetric === "voltage") return `${val.toFixed(1)} V`;
          if (selectedUsageMetric === "current") return `${val.toFixed(2)} A`;
          return usageView === "minutely" ? `${val.toFixed(1)} W` : `${val.toFixed(2)} kWh`;
        }
      }
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      followCursor: false,
      intersect: false,
      shared: true,
      y: {
        formatter: (val: number, { dataPointIndex }: any) => {
          const nowMs = Date.now();
          
          const formatVal = (v: number) => {
            if (selectedUsageMetric === "voltage") return `${v.toFixed(1)} V`;
            if (selectedUsageMetric === "current") return `${v.toFixed(2)} A`;
            return usageView === "minutely" ? `${v.toFixed(1)} W` : `${v.toFixed(3)} kWh`;
          };

          if (usageView === "minutely" && minutelyUsage?.minutes?.[dataPointIndex]) {
            const m = minutelyUsage.minutes[dataPointIndex];
            const minuteStartMs = new Date(usageYear, usageMonth - 1, usageDay, usageHour, m.minute, 0).getTime();
            const minuteEndMs = minuteStartMs + 59999;
            if (minuteStartMs <= nowMs) {
              const summary = getOutageSummaryForRange(minuteStartMs, minuteEndMs);
              if (summary.count > 0 || (m.count > 0 && m.avgVoltage < 10)) {
                const durStr = summary.totalDurationSec > 0 ? formatOutageDuration(summary.totalDurationSec) : "1m";
                const formattedStr = formatVal(val);
                return `${formattedStr} (⚡ MATI LISTRIK: ${summary.count || 1}x, Durasi: ${durStr})`;
              }
            }
          }
          if (usageView === "hourly" && hourlyUsage?.hours?.[dataPointIndex]) {
            const h = hourlyUsage.hours[dataPointIndex];
            const hourStartMs = new Date(usageYear, usageMonth - 1, usageDay, h.hour, 0, 0).getTime();
            const hourEndMs = hourStartMs + 3599999;
            if (hourStartMs <= nowMs) {
              const summary = getOutageSummaryForRange(hourStartMs, hourEndMs);
              if (summary.count > 0 || (h.count > 0 && h.avgVoltage < 10)) {
                const durStr = summary.totalDurationSec > 0 ? formatOutageDuration(summary.totalDurationSec) : "1m";
                const formattedStr = formatVal(val);
                return `${formattedStr} (⚡ MATI LISTRIK: ${summary.count || 1}x, Durasi: ${durStr})`;
              }
            }
          }
          if (usageView === "daily" && dailyUsage?.days?.[dataPointIndex]) {
            const d = dailyUsage.days[dataPointIndex];
            const dayDate = new Date(d.date);
            const dayStartMs = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0).getTime();
            const dayEndMs = dayStartMs + 86399999;
            if (dayStartMs <= nowMs) {
              const summary = getOutageSummaryForRange(dayStartMs, dayEndMs);
              if (summary.count > 0 || (d.avgVoltage !== undefined && d.avgVoltage > 0 && d.avgVoltage < 10)) {
                const durStr = summary.totalDurationSec > 0 ? formatOutageDuration(summary.totalDurationSec) : "1m";
                const formattedStr = formatVal(val);
                return `${formattedStr} (⚡ MATI LISTRIK: ${summary.count || 1}x, Durasi: ${durStr})`;
              }
            }
          }
          if (selectedUsageMetric === "voltage") return `${val.toFixed(1)} V`;
          if (selectedUsageMetric === "current") return `${val.toFixed(2)} A`;
          return usageView === "minutely" ? `${val.toFixed(1)} W` : `${val.toFixed(3)} kWh`;
        }
      }
    },
    legend: { show: false },
    theme: { mode: isDarkMode ? 'dark' : 'light' }
  }), [isDarkMode, usageCategoriesKey, usageBarColorsKey, usageBarColors, usageChartCategories, usageView, selectedUsageMetric, minutelyUsage, hourlyUsage, dailyUsage, getOutageSummaryForRange, formatOutageDuration, usageYear, usageMonth, usageDay, usageHour]);


  // Live Trend Options
  const powerTrendSeries: any[] = [];
  const powerTrendColors: string[] = [];
  const powerTrendYAxis: any[] = [];

  if (activeMetrics.power) {
    powerTrendSeries.push({ name: "Power (W)", data: chartData.map(d => ({ x: new Date(d.createdAt).getTime(), y: d.power })) });
    powerTrendColors.push('#f59e0b');
    powerTrendYAxis.push({ seriesName: 'Power (W)', show: true, labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' }, formatter: (val: number) => val.toFixed(1) } });
  }
  if (activeMetrics.voltage) {
    powerTrendSeries.push({ name: "Voltage (V)", data: chartData.map(d => ({ x: new Date(d.createdAt).getTime(), y: d.voltage })) });
    powerTrendColors.push('#3b82f6');
    powerTrendYAxis.push({ seriesName: 'Voltage (V)', opposite: powerTrendYAxis.length > 0, show: true, labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' }, formatter: (val: number) => val.toFixed(1) } });
  }
  if (activeMetrics.current) {
    powerTrendSeries.push({ name: "Current (A)", data: chartData.map(d => ({ x: new Date(d.createdAt).getTime(), y: d.current })) });
    powerTrendColors.push('#ef4444');
    powerTrendYAxis.push({ seriesName: 'Current (A)', opposite: powerTrendYAxis.length > 0, show: true, labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' }, formatter: (val: number) => val.toFixed(2) } });
  }
  if (powerTrendYAxis.length === 0) powerTrendYAxis.push({ show: false });

  const powerTrendColorsKey = powerTrendColors.join(",");
  const powerTrendYAxisKey = powerTrendYAxis.length;

  const powerTrendOptions: ApexOptions = useMemo(() => ({
    chart: { 
      type: 'area', 
      toolbar: { show: false }, 
      background: 'transparent', 
      animations: { 
        enabled: false
      } 
    },
    stroke: { curve: 'smooth', width: 2 },
    legend: { show: false },
    dataLabels: { enabled: false },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    colors: powerTrendColors,
    grid: { borderColor: isDarkMode ? '#334155' : '#e2e8f0', strokeDashArray: 4 },
    xaxis: { type: 'datetime', labels: { show: false, datetimeUTC: false }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
    yaxis: powerTrendYAxis,
    tooltip: { 
      theme: isDarkMode ? 'dark' : 'light', 
      followCursor: false,
      intersect: false,
      shared: true,
      x: { formatter: (val) => new Date(val).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) },
      y: { formatter: (val, { seriesIndex, w }) => {
        const name = w?.globals?.seriesNames?.[seriesIndex] || "";
        if (name.includes('Power')) return val.toFixed(1) + " W";
        if (name.includes('Voltage')) return val.toFixed(1) + " V";
        if (name.includes('Current')) return val.toFixed(2) + " A";
        return val.toString();
      }}
    },
    theme: { mode: isDarkMode ? 'dark' : 'light' }
  }), [isDarkMode, powerTrendColorsKey, powerTrendYAxisKey, powerTrendColors, powerTrendYAxis]);

  // Fullscreen Usage Options
  const fullscreenUsageOptions: ApexOptions = useMemo(() => ({
    ...usageChartOptions,
    chart: {
      ...usageChartOptions.chart,
      toolbar: { show: true, tools: { download: true, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } }
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: '11px', colors: ['#ffffff'] },
      formatter: (val: number) => usageView === "minutely" ? `${val.toFixed(0)}W` : `${val.toFixed(2)}`
    },
    xaxis: {
      ...usageChartOptions.xaxis,
      labels: {
        style: { colors: '#9ca3af', fontSize: '12px' },
        rotate: usageView === "daily" || usageView === "minutely" ? -45 : 0
      }
    },
    yaxis: {
      labels: {
        style: { colors: '#9ca3af', fontSize: '12px' },
        formatter: (val: number) => usageView === "minutely" ? `${val.toFixed(1)} W` : `${val.toFixed(2)} kWh`
      }
    },
    theme: { mode: 'dark' }
  }), [usageChartOptions, usageView]);

  // Fullscreen Trend Options
  const fullscreenTrendOptions: ApexOptions = {
    ...powerTrendOptions,
    chart: {
      ...powerTrendOptions.chart,
      toolbar: { show: true, tools: { download: true, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } }
    },
    theme: { mode: 'dark' }
  };


  // Battery color helper
  const batteryColor = serverBattery?.percent !== undefined
    ? serverBattery.percent >= 50 ? "text-green-500" : serverBattery.percent >= 20 ? "text-yellow-500" : "text-red-500"
    : "text-gray-400";

  const batteryBgColor = serverBattery?.percent !== undefined
    ? serverBattery.percent >= 50 ? "bg-green-500" : serverBattery.percent >= 20 ? "bg-yellow-500" : "bg-red-500"
    : "bg-gray-400";

  const currentYear = new Date().getFullYear();

  // Render Fullscreen Overlay in Portal directly under document.body
  const renderFullscreenModal = () => {
    if (!fullscreenChart || typeof window === "undefined") return null;
    return createPortal(
      <AnimatePresence>
        {fullscreenChart && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999999] bg-gray-950/98 backdrop-blur-2xl p-4 md:p-6 flex flex-col justify-between text-white overflow-hidden"
          >
            {/* Top Bar with prominent Close Button */}
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 shrink-0">
                  {fullscreenChart === "usage" ? <FaChartBar size={20} /> : <FaChartLine size={20} />}
                </div>
                <div>
                  <h2 className="text-sm md:text-xl font-extrabold flex items-center gap-2 text-white">
                    {fullscreenChart === "usage" ? (
                      <>Grafik Konsumsi &mdash; {
                        usageView === "minutely" ? `Jam ${String(usageHour).padStart(2,'0')}:00, ${usageDay} ${MONTH_NAMES[usageMonth - 1]}` :
                        usageView === "hourly" ? `24 Jam (${usageDay} ${MONTH_NAMES[usageMonth - 1]} ${usageYear})` :
                        usageView === "daily" ? `${MONTH_NAMES[usageMonth - 1]} ${usageYear}` :
                        usageView === "monthly" ? `Tahun ${usageYear}` :
                        "5 Tahun Terakhir"
                      }</>
                    ) : (
                      "Live Power Trend (Real-time)"
                    )}
                  </h2>
                  <p className="text-xs text-gray-400 hidden sm:block">
                    {fullscreenChart === "usage" 
                      ? `Total: ${usageSummary.total.toFixed(3)} kWh (Rp ${usageSummary.cost.toLocaleString('id-ID')})`
                      : `Current Load: ${displayData.power.toFixed(1)} W · Voltage: ${displayData.voltage.toFixed(1)} V`
                    }
                  </p>
                </div>
              </div>

              {/* Landscape Indicator Badge */}
              <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-xs font-semibold shadow-inner">
                <FaMobileAlt className="animate-bounce text-cyan-400" />
                <span>Mode Landscape disarankan pada HP/Tablet</span>
              </div>

              {/* Controls & PROMINENT RED CLOSE BUTTON */}
              <div className="flex items-center gap-3">
                {fullscreenChart === "usage" ? (
                  <div className="hidden sm:flex bg-gray-900 rounded-xl p-1 gap-1 border border-gray-800">
                    {(["minutely", "hourly", "daily", "monthly", "yearly"] as UsageView[]).map(v => (
                      <button key={v} onClick={() => setUsageView(v)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          usageView === v ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
                        }`}>
                        {v === "minutely" ? "1 Jam" : v === "hourly" ? "24 Jam" : v === "daily" ? "Harian" : v === "monthly" ? "Bulanan" : "Tahunan"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    {[["power","Power","yellow"],["voltage","Voltage","blue"],["current","Current","red"]].map(([key, label, col]) => (
                      <button key={key} onClick={() => setActiveMetrics(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${
                          activeMetrics[key as keyof typeof activeMetrics]
                            ? `bg-${col}-900/40 text-${col}-400 border-${col}-700`
                            : "bg-transparent text-gray-500 border-gray-700"
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* SANGAT JELAS: Tombol Merah Tutup Fullscreen / Tekan ESC */}
                <button
                  onClick={() => setFullscreenChart(null)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-red-600/40 transition-all border border-red-400 flex items-center gap-2 shrink-0 cursor-pointer"
                  title="Tutup Fullscreen (atau tekan tombol ESC)"
                >
                  <FaTimes size={15} />
                  <span>Keluar Fullscreen (ESC)</span>
                </button>
              </div>
            </div>

            {/* Mobile Landscape Notice */}
            <div className="sm:hidden mt-2 p-2 rounded-xl bg-cyan-950/60 border border-cyan-800 flex items-center justify-between text-xs text-cyan-300 shrink-0">
              <span className="flex items-center gap-1.5 font-semibold">
                <FaMobileAlt className="text-cyan-400 animate-pulse" />
                <span>Mode Landscape disarankan</span>
              </span>
              <button
                onClick={() => setFullscreenChart(null)}
                className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1"
              >
                <FaTimes size={10} /> Keluar
              </button>
            </div>

            {/* Chart Container */}
            <div 
              className="flex-1 w-full mt-3 min-h-0 relative"
              onMouseEnter={() => { isHoveringChart.current = true; }}
              onMouseLeave={() => { isHoveringChart.current = false; applyPendingUpdate(); }}
            >
              {fullscreenChart === "usage" ? (
                <ReactApexChart options={fullscreenUsageOptions} series={usageChartSeries} type="bar" height="100%" />
              ) : (
                <ReactApexChart options={fullscreenTrendOptions} series={powerTrendSeries} type="area" height="100%" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  };


  return (
    <div className="min-h-screen text-gray-800 dark:text-gray-100 transition-colors duration-300">
      
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-yellow-400/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-orange-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8">
        {isSettingsOpen ? (
          <DeviceSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} devices={devices} onDevicesUpdate={fetchDevices} apiUrl={API_URL} />
        ) : (
          <>
            {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div className="w-full lg:w-auto">
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white flex items-center gap-3">
              <FaBolt className="text-yellow-500" />
              Power Monitor
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">
              Realtime monitoring & historical energy usage via PZEM-004T.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Server Battery Mini Card */}
            {serverBattery?.hasBattery && (
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <FaLaptop className="text-gray-500" size={13} />
                <BatteryIcon percent={serverBattery.percent ?? 0} />
                <span className={`text-xs font-bold ${batteryColor}`}>{serverBattery.percent}%</span>
                <span className="text-xs text-gray-400">{serverBattery.isCharging ? "⚡" : "🔋"}</span>
              </div>
            )}

            {/* Device Selector */}
            {devices.length > 0 && (
              <select 
                className="flex-1 lg:flex-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-yellow-500 min-w-[150px]"
                value={selectedDeviceId || ""}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
              >
                <option value="all">Semua Alat (All Devices)</option>
                {devices.map(dev => (
                  <option key={dev.id} value={dev.id}>{dev.name} ({dev.location})</option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-2.5 bg-white dark:bg-gray-800 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className={`h-2 w-2 rounded-full ${status === "ONLINE" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></div>
              <span className={`text-xs md:text-sm font-bold ${status === "ONLINE" ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}>
                {status === "ONLINE" ? "Connected" : "Offline"}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                disabled={selectedDeviceId === "all"}
                onClick={() => setIsResetConfirmOpen(true)} 
                title={selectedDeviceId === "all" ? "Pilih alat spesifik untuk mereset kWh" : "Reset Energy (kWh)"}
                className={`p-2.5 rounded-lg transition-colors ${
                  selectedDeviceId === "all"
                    ? "bg-gray-100 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    : "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40"
                }`}
              >
                <FaTrash size={14} />
              </button>
              <button onClick={() => setIsSettingsOpen(true)} title="Manage Sensors"
                className="p-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <FaCog size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Modals */}
        <ConfirmationModal isOpen={isResetConfirmOpen} onClose={() => setIsResetConfirmOpen(false)} onConfirm={confirmResetEnergy} title="Reset Energy Counter?" message="Are you sure you want to reset the energy (kWh) counter for this device? This action cannot be undone." confirmText="Yes, Reset" isDanger={true} />

        {/* Realtime Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <CardMetric title="Total Energy (Month)" value={displayData.energy.toFixed(2)} unit="kWh" icon={<FaLeaf />} color="text-green-500" subValue={`Est. Cost: Rp ${(displayData.energy * PLN_RATE).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`} />
          <CardMetric title="Active Power" value={displayData.power.toFixed(1)} unit="W" icon={<FaBolt />} color="text-yellow-500" subValue={`PF: ${displayData.pf.toFixed(2)}`} />
          <CardMetric title="Voltage" value={displayData.voltage.toFixed(1)} unit="V" icon={<FaPlug />} color="text-blue-500" subValue={`Freq: ${displayData.frequency.toFixed(1)} Hz`} />
          <CardMetric title="Current" value={displayData.current.toFixed(2)} unit="A" icon={<FaTachometerAlt />} color="text-red-500" />
        </div>

        {/* Relay Protection Widget (If Active Device has Relay) */}
        {activeHasRelay && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 p-5 rounded-[1.5rem] md:rounded-[2rem] border backdrop-blur-xl shadow-xl relative overflow-hidden transition-all duration-500 ${
              !activeRelayState
                ? 'bg-red-500/10 border-red-500/30 dark:border-red-500/40 shadow-red-500/5'
                : 'bg-white/70 dark:bg-gray-800/60 border-white/50 dark:border-gray-700/50'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
              
              {/* Left Side: Status Info */}
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl flex items-center justify-center text-xl shadow-md transition-all duration-500 ${
                  !activeRelayState
                    ? 'bg-red-500 text-white animate-pulse shadow-red-500/30'
                    : 'bg-emerald-500 text-white shadow-emerald-500/20'
                }`}>
                  {activeRelayState ? <FaPlug /> : <FaTimesCircle />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none block">Booster Pump Safety Relay</span>
                    {!activeRelayState && (
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 animate-pulse">TRIPPED!</span>
                    )}
                  </div>
                  <h4 className="text-xl font-black text-gray-800 dark:text-white mt-1.5 leading-none">
                    Status: <span className={activeRelayState ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                      {activeRelayState ? 'Connected (ON)' : 'Disconnected (OFF/Trip)'}
                    </span>
                  </h4>
                  <p className="text-xs text-gray-550 dark:text-gray-400 mt-1">
                    {!activeRelayState 
                      ? 'Relay terputus otomatis karena kelebihan beban arus atau dimatikan manual.' 
                      : `Sirkuit aman. Batas: ${activeThreshold.toFixed(1)}A ${activeDelay > 0 ? `(Tunda ${activeDelay}s)` : '(Instan)'}. Auto-Reconnect: ${activeAutoReconnect ? `Aktif (${activeReconnectDelay}s)` : 'Nonaktif'}.`
                    }
                  </p>
                </div>
              </div>

              {/* Right Side: Switch controls */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                {/* Current Threshold Badge */}
                <div className="bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-center shadow-inner flex flex-col justify-center min-w-[80px]">
                  <span className="text-[7px] text-gray-455 dark:text-gray-500 uppercase tracking-wider block font-bold mb-0.5">Threshold</span>
                  <span className="text-sm font-mono font-black text-gray-800 dark:text-white">{activeThreshold.toFixed(1)} <span className="text-xs text-gray-400">A</span></span>
                </div>

                {/* Delay Badge */}
                <div className="bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-center shadow-inner flex flex-col justify-center min-w-[85px]">
                  <span className="text-[7px] text-gray-455 dark:text-gray-500 uppercase tracking-wider block font-bold mb-0.5">Trip Delay</span>
                  <span className="text-sm font-mono font-black text-gray-800 dark:text-white">{activeDelay === 0 ? "Instan" : `${activeDelay}s`}</span>
                </div>

                {/* Auto Reconnect Cooldown Badge */}
                <div className="bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-center shadow-inner flex flex-col justify-center min-w-[85px]">
                  <span className="text-[7px] text-gray-455 dark:text-gray-500 uppercase tracking-wider block font-bold mb-0.5">Auto-Rec</span>
                  <span className="text-sm font-mono font-black text-gray-800 dark:text-white">{activeAutoReconnect ? `${activeReconnectDelay}s` : "OFF"}</span>
                </div>

                {/* Control Action Button */}
                <button
                  onClick={toggleRelay}
                  className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-extrabold text-xs shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border active:scale-95 ${
                    !activeRelayState
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-600/20'
                      : 'bg-red-600 hover:bg-red-500 text-white border-red-400 shadow-red-600/20'
                  }`}
                >
                  <FaPowerOff size={14} />
                  <span>{activeRelayState ? 'Cutoff Circuit (OFF)' : 'Reset & Reconnect (ON)'}</span>
                </button>
              </div>

            </div>
          </motion.div>
        )}

        {/* Load Bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 md:px-6 md:py-5 rounded-[1.5rem] bg-white/70 dark:bg-gray-900 border border-white/50 dark:border-gray-800 shadow-xl relative overflow-hidden backdrop-blur-xl">
          <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay pointer-events-none"></div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 relative z-10">
            <div className="flex items-center gap-3 w-full md:w-auto md:min-w-[160px]">
              <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-blue-500 dark:text-blue-400">
                <FaTachometerAlt size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-none mb-1 block">Load %</span>
                <div className="text-2xl font-black text-gray-800 dark:text-white leading-none">
                  {((displayData.power / (typeof maxPowerLimit === 'number' && maxPowerLimit > 0 ? maxPowerLimit : 1)) * 100).toFixed(1)}<span className="text-xl text-gray-500">%</span>
                </div>
              </div>
            </div>
            <div className="flex-1 w-full space-y-2">
              <div className="flex justify-between items-end text-xs sm:text-sm">
                <span className="text-gray-600 dark:text-gray-400 font-mono font-semibold">0W</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400 font-mono">LIMIT:</span>
                  <input type="number" value={maxPowerLimit} onChange={handleMaxPowerChange}
                    className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 w-16 sm:w-20 text-center font-mono text-blue-600 dark:text-blue-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors text-xs sm:text-sm" />
                  <span className="text-gray-600 dark:text-gray-400 font-mono">W</span>
                </div>
              </div>
              <div className="h-6 sm:h-7 w-full bg-gray-200 dark:bg-gray-950/90 p-[4px] border border-gray-300 dark:border-gray-800/80 shadow-inner rounded-[4px] relative overflow-hidden">
                {(() => {
                  const safeLimit = typeof maxPowerLimit === 'number' && maxPowerLimit > 0 ? maxPowerLimit : 1;
                  let fillPct = Math.min(100, Math.max(0, (displayData.power / safeLimit) * 100));
                  let fillColors = 'from-blue-600 via-blue-500 to-blue-400';
                  if (fillPct >= 80) fillColors = 'from-red-600 via-red-500 to-red-400';
                  else if (fillPct >= 60) fillColors = 'from-yellow-600 via-yellow-500 to-yellow-400';
                  return (
                    <div className="relative w-full h-full rounded-[2px] overflow-hidden bg-white/50 dark:bg-gray-900/50">
                      <div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${fillColors} transition-all duration-[800ms] ease-out`} style={{ width: `${fillPct}%` }}>
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent"></div>
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
          {/* Energy Usage Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 rounded-[2rem] bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/50 dark:border-gray-700 p-6 md:p-8 shadow-lg overflow-hidden relative">
            <div className="absolute -top-8 -right-8 w-48 h-48 bg-green-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2"><FaCalendarAlt className="text-green-500"/> Energy Usage</h3>
              <span className="text-xs px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold border border-green-200 dark:border-green-800">Accumulated</span>
            </div>
            <div className="flex flex-col md:flex-row gap-6 items-stretch">
              <div className="flex-1 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 flex flex-col justify-between relative overflow-hidden shadow-lg">
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/10 rounded-t-2xl" />
                <div className="relative z-10">
                  <p className="text-green-100 text-sm font-semibold uppercase tracking-widest mb-3">Total Consumed</p>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl md:text-6xl font-black text-white leading-none tabular-nums">{displayData.energy.toFixed(3)}</span>
                    <span className="text-2xl font-semibold text-green-200 mb-1">kWh</span>
                  </div>
                  <p className="text-green-200 text-xs mt-3 font-medium">Since last reset</p>
                </div>
                <div className="relative z-10 mt-6 pt-4 border-t border-white/20">
                  <p className="text-green-100 text-[10px] uppercase tracking-wider mb-1">Estimated Cost</p>
                  <p className="text-white font-black text-xl md:text-2xl">Rp {estimatedCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</p>
                  <p className="text-green-200 text-[10px] mt-0.5">@ Rp 1,444/kWh (PLN)</p>
                </div>
              </div>
              <div className="flex flex-col gap-4 md:w-48 lg:w-52">
                <div className="flex-1 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800/50 p-4 flex flex-col justify-between">
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">CO₂ Emission</span>
                  <div><span className="text-3xl font-black text-teal-700 dark:text-teal-300">{co2Saved}</span><span className="text-sm text-teal-500 ml-1">kg</span></div>
                  <span className="text-xs text-teal-500">CO₂ equivalent</span>
                </div>
                <div className="flex-1 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800/50 p-4 flex flex-col justify-between">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">Avg Power</span>
                  <div><span className="text-3xl font-black text-violet-700 dark:text-violet-300">{chartData.length > 0 ? (chartData.reduce((s, d) => s + d.power, 0) / chartData.length).toFixed(1) : displayData.power.toFixed(1)}</span><span className="text-sm text-violet-500 ml-1">W</span></div>
                  <span className="text-xs text-violet-500">recent average</span>
                </div>
              </div>
            </div>
            <div className="mt-5 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 flex items-start gap-3">
              <FaExclamationCircle className="text-orange-500 mt-0.5 shrink-0" />
              <p className="text-sm text-orange-700 dark:text-orange-300"><strong>Note:</strong> Data usage accumulates until manually reset or configured auto-reset.</p>
            </div>
          </motion.div>

          {/* Realtime Power Trend */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="lg:col-span-1 rounded-[2rem] bg-white/60 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 backdrop-blur-md border border-white/50 dark:border-gray-700 p-6 md:p-8 shadow-xl text-gray-800 dark:text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4 relative z-10">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 mb-1"><FaChartLine className="text-yellow-500 dark:text-yellow-400"/> Live Trend</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Real-time fluctuations.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 overflow-x-auto max-w-full no-scrollbar">
                  {[["power","Power","yellow"],["voltage","Voltage","blue"],["current","Current","red"]].map(([key, label, col]) => (
                    <button key={key} onClick={() => setActiveMetrics(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                        activeMetrics[key as keyof typeof activeMetrics]
                          ? `bg-${col}-100 dark:bg-${col}-900/30 text-${col}-700 dark:text-${col}-400 border-${col}-300 dark:border-${col}-700`
                          : 'bg-transparent text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setFullscreenChart("trend")}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700/70 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors shrink-0"
                  title="Buka Fullscreen Landscape">
                  <FaExpand size={13} />
                </button>
              </div>
            </div>
            <div 
              className="h-[200px] -mx-2 md:-mx-4 relative z-10"
              onMouseEnter={() => { isHoveringChart.current = true; }}
              onMouseLeave={() => { isHoveringChart.current = false; applyPendingUpdate(); }}
            >
              <ReactApexChart options={powerTrendOptions} series={powerTrendSeries} type="area" height="100%" />
            </div>
            <div className="mt-6 space-y-4 relative z-10">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Current Load</span>
                <span className="font-bold text-lg">{displayData.power.toFixed(1)} W</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Status</span>
                <span className={`font-bold text-sm px-2 py-1 rounded ${status === "ONLINE" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>{status}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ══════════════════════════════════════════ */}
        {/* kWh Usage Chart (Daily / Monthly / Yearly) */}
        {/* ══════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="mb-8 rounded-[2rem] bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/50 dark:border-gray-700 p-6 md:p-8 shadow-lg overflow-hidden relative">
          
          {/* Glow */}
          <div className="absolute -top-8 -left-8 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-30">
            {activePicker && (
              <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActivePicker(null)} />
            )}
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaChartBar className="text-blue-500" />
                Konsumsi &mdash; {
                  usageView === "minutely" ? `Jam ${String(usageHour).padStart(2,'0')}:00, ${usageDay} ${MONTH_NAMES[usageMonth - 1]}` :
                  usageView === "hourly" ? `24 Jam (${usageDay} ${MONTH_NAMES[usageMonth - 1]} ${usageYear})` :
                  usageView === "daily" ? `${MONTH_NAMES[usageMonth - 1]} ${usageYear}` :
                  usageView === "monthly" ? `Tahun ${usageYear}` :
                  "5 Tahun Terakhir"
                }

                {/* Live badge — tampil saat melihat bulan ini & device online */}
                {isCurrentMonth && status === "ONLINE" && usageView !== "yearly" && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Live
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {usageView === "minutely" ? "Rata-rata daya & konsumsi per-menit dalam 1 jam. " :
                 usageView === "hourly" ? "Rata-rata daya & konsumsi per-jam dalam 24 jam. " :
                 usageView === "daily" ? "Konsumsi harian dari snapshot tengah malam. " :
                 usageView === "monthly" ? "Total konsumsi per bulan. " : "Total konsumsi per tahun. "}
                <span className="text-orange-500 font-semibold">Bar oranye = hari/bulan reset kWh.</span>
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">

              {/* Metric Selector (kWh / Voltage / Current) */}
              <div className="flex bg-gray-100 dark:bg-gray-700/60 rounded-xl p-1 gap-1 shrink-0 overflow-x-auto max-w-full no-scrollbar">
                <button
                  onClick={() => setSelectedUsageMetric("kwh")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    selectedUsageMetric === "kwh"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  kWh Usage
                </button>
                <button
                  onClick={() => setSelectedUsageMetric("voltage")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    selectedUsageMetric === "voltage"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  Avg Tegangan (V)
                </button>
                <button
                  onClick={() => setSelectedUsageMetric("current")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    selectedUsageMetric === "current"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  Avg Arus (A)
                </button>
              </div>

              {/* Toggle View */}
              <div className="flex bg-gray-100 dark:bg-gray-700/60 rounded-xl p-1 gap-1 overflow-x-auto max-w-full no-scrollbar shrink-0">
                {(["minutely", "hourly", "daily", "monthly", "yearly"] as UsageView[]).map(v => (
                  <button key={v}
                    onClick={() => setUsageView(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      usageView === v
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}>
                    {v === "minutely" ? "1 Jam" : v === "hourly" ? "24 Jam" : v === "daily" ? "Harian" : v === "monthly" ? "Bulanan" : "Tahunan"}
                  </button>
                ))}
              </div>

              {/* Period Navigator — arrows + label */}
              {usageView !== "yearly" && (
                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1 shrink-0">
                  {/* Prev button */}
                  <button
                    onClick={() => {
                      if (usageView === "minutely") {
                        if (usageHour === 0) {
                          setUsageHour(23);
                          const dt = new Date(usageYear, usageMonth - 1, usageDay - 1);
                          setUsageYear(dt.getFullYear());
                          setUsageMonth(dt.getMonth() + 1);
                          setUsageDay(dt.getDate());
                        } else {
                          setUsageHour(h => h - 1);
                        }
                      } else if (usageView === "hourly") {
                        const dt = new Date(usageYear, usageMonth - 1, usageDay - 1);
                        setUsageYear(dt.getFullYear());
                        setUsageMonth(dt.getMonth() + 1);
                        setUsageDay(dt.getDate());
                      } else if (usageView === "daily") {
                        if (usageMonth === 1) {
                          setUsageMonth(12);
                          setUsageYear(y => y - 1);
                        } else {
                          setUsageMonth(m => m - 1);
                        }
                      } else if (usageView === "monthly") {
                        setUsageYear(y => y - 1);
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
                    title="Sebelumnya"
                  >
                    <FaArrowLeft size={11} />
                  </button>

                  {/* Pickers Container */}
                  <div className="flex items-center gap-1 sm:gap-2 px-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {usageView === "minutely" && (
                      <div className="flex items-center gap-1.5">
                        {/* Date Picker Button */}
                        <div className="relative">
                          <button
                            onClick={() => {
                              setPickerNavMonth(usageMonth);
                              setPickerNavYear(usageYear);
                              setActivePicker(p => p === "date" ? null : "date");
                            }}
                            className="bg-transparent border border-blue-200/50 dark:border-blue-900/50 hover:border-blue-500/80 dark:hover:border-blue-500/80 px-2.5 py-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <span>{usageDay} {MONTH_NAMES[usageMonth - 1]} {usageYear}</span>
                            <span className="text-[10px] opacity-70">▼</span>
                          </button>
                          
                          {activePicker === "date" && (
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[100] w-[280px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-xl">
                              {/* Header */}
                              <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                                <button
                                  onClick={() => {
                                    if (pickerNavMonth === 1) {
                                      setPickerNavMonth(12);
                                      setPickerNavYear(y => y - 1);
                                    } else {
                                      setPickerNavMonth(m => m - 1);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                                >
                                  <FaArrowLeft size={10} />
                                </button>
                                <span className="font-extrabold text-xs sm:text-sm text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                  {MONTH_NAMES[pickerNavMonth - 1]} {pickerNavYear}
                                </span>
                                <button
                                  onClick={() => {
                                    if (pickerNavMonth === 12) {
                                      setPickerNavMonth(1);
                                      setPickerNavYear(y => y + 1);
                                    } else {
                                      setPickerNavMonth(m => m + 1);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                                >
                                  <FaArrowRight size={10} />
                                </button>
                              </div>

                              {/* Weekdays */}
                              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(name => (
                                  <span key={name} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                                    {name}
                                  </span>
                                ))}
                              </div>

                              {/* Calendar Days */}
                              <div className="grid grid-cols-7 gap-1 text-center">
                                {Array.from({ length: new Date(pickerNavYear, pickerNavMonth - 1, 1).getDay() }).map((_, idx) => (
                                  <div key={`empty-${idx}`} />
                                ))}
                                {Array.from({ length: new Date(pickerNavYear, pickerNavMonth, 0).getDate() }).map((_, idx) => {
                                  const dNum = idx + 1;
                                  const isSelected = dNum === usageDay && pickerNavMonth === usageMonth && pickerNavYear === usageYear;
                                  const isFuture = new Date(pickerNavYear, pickerNavMonth - 1, dNum) > new Date();
                                  return (
                                    <button
                                      key={`day-${dNum}`}
                                      disabled={isFuture}
                                      onClick={() => {
                                        setUsageYear(pickerNavYear);
                                        setUsageMonth(pickerNavMonth);
                                        setUsageDay(dNum);
                                        setActivePicker(null);
                                      }}
                                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        isSelected
                                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                          : isFuture
                                          ? "opacity-20 cursor-not-allowed text-gray-400"
                                          : "hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300"
                                      }`}
                                    >
                                      {dNum}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <span className="text-gray-400">·</span>

                        {/* Hour Picker Button */}
                        <div className="relative">
                          <button
                            onClick={() => setActivePicker(p => p === "hour" ? null : "hour")}
                            className="bg-transparent border border-blue-200/50 dark:border-blue-900/50 hover:border-blue-500/80 dark:hover:border-blue-500/80 px-2.5 py-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <span>{String(usageHour).padStart(2, '0')}:00</span>
                            <span className="text-[10px] opacity-70">▼</span>
                          </button>

                          {activePicker === "hour" && (
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[100] w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 shadow-xl max-h-48 overflow-y-auto no-scrollbar">
                              <div className="flex flex-col gap-0.5">
                                {Array.from({ length: 24 }).map((_, h) => {
                                  const isSelected = h === usageHour;
                                  return (
                                    <button
                                      key={h}
                                      onClick={() => {
                                        setUsageHour(h);
                                        setActivePicker(null);
                                      }}
                                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                        isSelected
                                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                          : "hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300"
                                      }`}
                                    >
                                      {String(h).padStart(2, '0')}:00
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {usageView === "hourly" && (
                      <div className="relative">
                        <button
                          onClick={() => {
                            setPickerNavMonth(usageMonth);
                            setPickerNavYear(usageYear);
                            setActivePicker(p => p === "date" ? null : "date");
                          }}
                          className="bg-transparent border border-blue-200/50 dark:border-blue-900/50 hover:border-blue-500/80 dark:hover:border-blue-500/80 px-2.5 py-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <span>{usageDay} {MONTH_NAMES[usageMonth - 1]} {usageYear}</span>
                          <span className="text-[10px] opacity-70">▼</span>
                        </button>
                        
                        {activePicker === "date" && (
                          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[100] w-[280px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-xl">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                              <button
                                onClick={() => {
                                  if (pickerNavMonth === 1) {
                                    setPickerNavMonth(12);
                                    setPickerNavYear(y => y - 1);
                                  } else {
                                    setPickerNavMonth(m => m - 1);
                                  }
                                }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                              >
                                <FaArrowLeft size={10} />
                              </button>
                              <span className="font-extrabold text-xs sm:text-sm text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                {MONTH_NAMES[pickerNavMonth - 1]} {pickerNavYear}
                              </span>
                              <button
                                onClick={() => {
                                  if (pickerNavMonth === 12) {
                                    setPickerNavMonth(1);
                                    setPickerNavYear(y => y + 1);
                                  } else {
                                    setPickerNavMonth(m => m + 1);
                                  }
                                }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                              >
                                <FaArrowRight size={10} />
                              </button>
                            </div>

                            {/* Weekdays */}
                            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(name => (
                                <span key={name} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                                  {name}
                                </span>
                              ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 gap-1 text-center">
                              {Array.from({ length: new Date(pickerNavYear, pickerNavMonth - 1, 1).getDay() }).map((_, idx) => (
                                <div key={`empty-${idx}`} />
                              ))}
                              {Array.from({ length: new Date(pickerNavYear, pickerNavMonth, 0).getDate() }).map((_, idx) => {
                                const dNum = idx + 1;
                                const isSelected = dNum === usageDay && pickerNavMonth === usageMonth && pickerNavYear === usageYear;
                                const isFuture = new Date(pickerNavYear, pickerNavMonth - 1, dNum) > new Date();
                                return (
                                  <button
                                    key={`day-${dNum}`}
                                    disabled={isFuture}
                                    onClick={() => {
                                      setUsageYear(pickerNavYear);
                                      setUsageMonth(pickerNavMonth);
                                      setUsageDay(dNum);
                                      setActivePicker(null);
                                    }}
                                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                      isSelected
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                        : isFuture
                                        ? "opacity-20 cursor-not-allowed text-gray-400"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300"
                                    }`}
                                  >
                                    {dNum}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {usageView === "daily" && (
                      <div className="relative">
                        <button
                          onClick={() => {
                            setPickerYear(usageYear);
                            setActivePicker(p => p === "month" ? null : "month");
                          }}
                          className="bg-transparent border border-blue-200/50 dark:border-blue-900/50 hover:border-blue-500/80 dark:hover:border-blue-500/80 px-2.5 py-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <span>{MONTH_NAMES[usageMonth - 1]} {usageYear}</span>
                          <span className="text-[10px] opacity-70">▼</span>
                        </button>
                        
                        {activePicker === "month" && (
                          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[100] w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-xl">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                              <button onClick={() => setPickerYear(y => y - 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500">
                                <FaArrowLeft size={10} />
                              </button>
                              <span className="font-bold text-sm text-gray-800 dark:text-gray-100">{pickerYear}</span>
                              <button onClick={() => setPickerYear(y => y + 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500">
                                <FaArrowRight size={10} />
                              </button>
                            </div>
                            {/* Grid */}
                            <div className="grid grid-cols-3 gap-2">
                              {MONTH_NAMES.map((mName, idx) => {
                                const mNum = idx + 1;
                                const isSelected = pickerYear === usageYear && mNum === usageMonth;
                                const isFutureMonth = pickerYear > new Date().getFullYear() || (pickerYear === new Date().getFullYear() && mNum > (new Date().getMonth() + 1));
                                return (
                                  <button
                                    key={mName}
                                    disabled={isFutureMonth}
                                    onClick={() => {
                                      setUsageYear(pickerYear);
                                      setUsageMonth(mNum);
                                      setActivePicker(null);
                                    }}
                                    className={`py-2 text-xs font-bold rounded-xl transition-all ${
                                      isSelected
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                        : isFutureMonth
                                        ? "opacity-20 cursor-not-allowed text-gray-400"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300"
                                    }`}
                                  >
                                    {mName.slice(0, 3)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {usageView === "monthly" && (
                      <div className="relative">
                        <button
                          onClick={() => setActivePicker(p => p === "year" ? null : "year")}
                          className="bg-transparent border border-blue-200/50 dark:border-blue-900/50 hover:border-blue-500/80 dark:hover:border-blue-500/80 px-2.5 py-1.5 rounded-lg text-blue-600 dark:text-blue-400 font-bold cursor-pointer text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <span>Tahun {usageYear}</span>
                          <span className="text-[10px] opacity-70">▼</span>
                        </button>
                        
                        {activePicker === "year" && (
                          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[100] w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 shadow-xl">
                            <div className="flex flex-col gap-0.5">
                              {Array.from({ length: new Date().getFullYear() - 2020 + 1 }).map((_, idx) => {
                                const y = new Date().getFullYear() - idx;
                                const isSelected = y === usageYear;
                                return (
                                  <button
                                    key={y}
                                    onClick={() => {
                                      setUsageYear(y);
                                      setActivePicker(null);
                                    }}
                                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                                      isSelected
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300"
                                    }`}
                                  >
                                    Tahun {y}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Next button — disabled if future */}
                  <button
                    onClick={() => {
                      if (usageView === "minutely") {
                        if (usageHour === 23) {
                          setUsageHour(0);
                          const dt = new Date(usageYear, usageMonth - 1, usageDay + 1);
                          setUsageYear(dt.getFullYear());
                          setUsageMonth(dt.getMonth() + 1);
                          setUsageDay(dt.getDate());
                        } else {
                          setUsageHour(h => h + 1);
                        }
                      } else if (usageView === "hourly") {
                        const dt = new Date(usageYear, usageMonth - 1, usageDay + 1);
                        setUsageYear(dt.getFullYear());
                        setUsageMonth(dt.getMonth() + 1);
                        setUsageDay(dt.getDate());
                      } else if (usageView === "daily") {
                        if (usageMonth === 12) {
                          setUsageMonth(1);
                          setUsageYear(y => y + 1);
                        } else {
                          setUsageMonth(m => m + 1);
                        }
                      } else if (usageView === "monthly") {
                        setUsageYear(y => y + 1);
                      }
                    }}
                    disabled={(() => {
                      const today = new Date();
                      if (usageView === "minutely") {
                        const sel = new Date(usageYear, usageMonth - 1, usageDay, usageHour);
                        return sel >= new Date(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours());
                      }
                      if (usageView === "hourly") {
                        const sel = new Date(usageYear, usageMonth - 1, usageDay);
                        return sel >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      }
                      if (usageView === "daily") {
                        return usageYear === today.getFullYear() && usageMonth >= (today.getMonth() + 1);
                      }
                      if (usageView === "monthly") {
                        return usageYear >= today.getFullYear();
                      }
                      return true;
                    })()}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Berikutnya"
                  >
                    <FaArrowRight size={11} />
                  </button>
                </div>
              )}

              {/* Refresh */}
              <button
                onClick={fetchUsageData}
                disabled={usageLoading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {usageLoading ? (
                  <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin inline-block" />
                ) : (
                  "↻"
                )}
                Refresh
              </button>

              {/* Fullscreen Expand Button */}
              <button
                onClick={() => setFullscreenChart("usage")}
                className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 transition-colors shrink-0"
                title="Buka Fullscreen Landscape"
              >
                <FaExpand size={13} />
              </button>
            </div>
          </div>


          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 relative z-10">
            {/* Total kWh */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 text-white relative overflow-hidden">
              {isCurrentMonth && status === "ONLINE" && usageView !== "yearly" && (
                <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#fbbf24]" />
              )}
              <p className="text-xs text-blue-100 uppercase tracking-wide mb-1">Total Konsumsi</p>
              <p className="text-2xl font-black">{usageSummary.total.toFixed(3)}<span className="text-sm font-normal ml-1">kWh</span></p>
              <p className="text-xs text-blue-200 mt-1">{usageSummary.label}</p>
            </div>

            {/* Estimated Cost */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white">
              <p className="text-xs text-emerald-100 uppercase tracking-wide mb-1">Estimasi Biaya</p>
              <p className="text-xl font-black">Rp {usageSummary.cost.toLocaleString('id-ID')}</p>
              <p className="text-xs text-emerald-200 mt-1">@ Rp 1.444/kWh</p>
            </div>

            {/* Today Live Card (jika ada) atau Legend */}
            {isCurrentMonth && todayLiveUsage !== null && usageView === "daily" ? (
              <div className="col-span-2 md:col-span-1 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 text-white relative overflow-hidden">
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
                  <span className="text-[10px] font-black text-white/80 uppercase">Live</span>
                </div>
                <p className="text-xs text-amber-100 uppercase tracking-wide mb-1">Hari Ini (Estimasi)</p>
                <p className="text-2xl font-black">{todayLiveUsage.kwh.toFixed(3)}<span className="text-sm font-normal ml-1">kWh</span></p>
                <p className="text-xs text-amber-200 mt-1">
                  {todayLiveUsage.isReset ? "⚠️ Setelah reset hari ini" : `≈ Rp ${(todayLiveUsage.kwh * PLN_RATE).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`}
                </p>
              </div>
            ) : (
              <div className="col-span-2 md:col-span-1 rounded-2xl bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 p-4">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Keterangan Warna</p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-amber-400 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">Hari ini (Live)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-blue-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">Data selesai</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-orange-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">Hari reset kWh</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-red-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600 dark:text-gray-300">Mati Listrik (0V/0W)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bar Chart */}
          <div 
            className="relative z-10" 
            style={{ minHeight: 260 }}
            onMouseEnter={() => { isHoveringChart.current = true; }}
            onMouseLeave={() => { isHoveringChart.current = false; applyPendingUpdate(); }}
          >
            {usageLoading && usageChartSeries[0].data.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-gray-400 dark:text-gray-600">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Memuat data...</span>
                </div>
              </div>
            ) : usageChartSeries[0].data.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-gray-400 dark:text-gray-600">
                <div className="text-center">
                  <FaChartBar size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Belum ada data snapshot</p>
                  <p className="text-xs mt-1">Data akan tersedia setelah tengah malam pertama</p>
                </div>
              </div>
            ) : (
              <ReactApexChart key={`${usageView}-${usageYear}-${usageMonth}`} options={usageChartOptions} series={usageChartSeries} type="bar" height={280} />
            )}
          </div>
        </motion.div>



        {/* ══════════════════════════════════════════ */}
        {/* Server Battery Monitor */}
        {/* ══════════════════════════════════════════ */}
        {serverBattery && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="mb-8 rounded-[2rem] bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/50 dark:border-gray-700 p-6 md:p-8 shadow-lg overflow-hidden relative">
            
            <div className="absolute -top-8 right-16 w-48 h-48 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FaLaptop className="text-cyan-500" />
                Monitor Baterai Server
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Update tiap 30 detik · {serverBattery.fetchedAt ? new Date(serverBattery.fetchedAt).toLocaleTimeString('id-ID') : '—'}
              </span>
            </div>

            {!serverBattery.hasBattery ? (
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-gray-100 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600">
                <FaExclamationCircle className="text-gray-400" size={24} />
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300">Tidak ada baterai terdeteksi</p>
                  <p className="text-xs text-gray-500 mt-0.5">{serverBattery.message}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                
                {/* Battery Level */}
                <div className="col-span-2 md:col-span-1 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-200 dark:border-cyan-800/50 p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">Baterai</span>
                    <BatteryIcon percent={serverBattery.percent ?? 0} />
                  </div>
                  <div>
                    <span className={`text-4xl font-black ${batteryColor}`}>{serverBattery.percent}%</span>
                  </div>
                  {/* Battery bar */}
                  <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${batteryBgColor}`} style={{ width: `${serverBattery.percent}%` }}></div>
                  </div>
                  <span className="text-xs text-gray-500">{serverBattery.isCharging ? "⚡ Sedang mengisi daya" : "🔋 Menggunakan baterai"}</span>
                </div>

                {/* AC & Time */}
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 p-5 flex flex-col justify-between">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Status Daya</span>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${serverBattery.acConnected ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-gray-400'}`}></div>
                      <span className="text-sm font-semibold">{serverBattery.acConnected ? "PLN Terhubung" : "PLN Tidak Ada"}</span>
                    </div>
                    {serverBattery.timeRemaining && serverBattery.timeRemaining > 0 && (
                      <div>
                        <p className="text-xs text-gray-500">Estimasi sisa</p>
                        <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                          {Math.floor(serverBattery.timeRemaining / 60)}j {serverBattery.timeRemaining % 60}m
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* CPU Temp */}
                <div className="rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/40 p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <FaThermometerHalf className="text-orange-500" size={14} />
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">CPU Temp</span>
                  </div>
                  <span className={`text-3xl font-black ${
                    (serverBattery.cpuTempMax ?? 0) > 80 ? 'text-red-500' :
                    (serverBattery.cpuTempMax ?? 0) > 65 ? 'text-orange-500' : 'text-green-500'
                  }`}>
                    {serverBattery.cpuTempMax ? `${serverBattery.cpuTempMax}°C` : "N/A"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    {(serverBattery.cpuTempMax ?? 0) > 80 ? "🔴 Terlalu panas!" : (serverBattery.cpuTempMax ?? 0) > 65 ? "🟡 Hangat" : "🟢 Normal"}
                  </span>
                </div>

                {/* RAM Usage */}
                <div className="rounded-2xl bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/40 p-5 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <FaMemory className="text-violet-500" size={14} />
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">RAM Usage</span>
                  </div>
                  <span className={`text-3xl font-black ${
                    (serverBattery.memUsedPercent ?? 0) > 85 ? 'text-red-500' :
                    (serverBattery.memUsedPercent ?? 0) > 65 ? 'text-orange-500' : 'text-violet-600 dark:text-violet-400'
                  }`}>
                    {serverBattery.memUsedPercent !== null && serverBattery.memUsedPercent !== undefined ? `${serverBattery.memUsedPercent}%` : "N/A"}
                  </span>
                  {serverBattery.memUsedPercent !== null && serverBattery.memUsedPercent !== undefined && (
                    <div className="mt-2 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${serverBattery.memUsedPercent}%` }}></div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* TABEL RIWAYAT MATI LISTRIK (POWER OUTAGES) */}
        {/* ══════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="mb-8 rounded-[2rem] bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/50 dark:border-gray-700 overflow-hidden shadow-lg">
          
          {/* Header Bar */}
          <div className="px-6 md:px-8 py-5 bg-gradient-to-r from-red-600/10 via-amber-600/5 to-transparent border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                <span className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                  <FaExclamationTriangle size={15} />
                </span>
                Riwayat Kejadian Mati Listrik (Power Outage Logs)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Catatan otomatis deteksi 0.0V / pemadaman listrik dari sensor ESP32 BedRoom
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                Total {outageTotal} Kejadian
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">
                  <th className="py-3 px-5 font-bold">Status</th>
                  <th className="py-3 px-5 font-bold">Mulai Padam</th>
                  <th className="py-3 px-5 font-bold">Selesai / Menyala</th>
                  <th className="py-3 px-5 font-bold">Durasi Mati Listrik</th>
                  <th className="py-3 px-5 font-bold">Tegangan Akhir</th>
                </tr>
              </thead>
              <tbody className="text-sm cursor-default divide-y divide-gray-100 dark:divide-gray-700/50">
                {outageLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      <span className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin inline-block mr-2" />
                      Memuat data mati listrik...
                    </td>
                  </tr>
                ) : outageLogs.length > 0 ? (
                  outageLogs.map((log, idx) => (
                    <tr key={log.id} className={`group transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white/40 dark:bg-transparent' : 'bg-gray-50/60 dark:bg-gray-900/20'} hover:bg-red-50/40 dark:hover:bg-red-950/20`}>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          log.status === "BERLANGSUNG"
                            ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800 animate-pulse"
                            : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${log.status === "BERLANGSUNG" ? "bg-red-500 animate-ping" : "bg-green-500"}`} />
                          {log.status === "BERLANGSUNG" ? "SEDANG MATI LISTRIK" : "SELESAI (KEMBALI NYALA)"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {new Date(log.startedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {log.endedAt ? (
                          new Date(log.endedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        ) : (
                          <span className="text-red-500 font-bold">Masih Padam...</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-gray-800 dark:text-gray-200">
                        {log.durationFormatted || (log.durationSec ? `${Math.floor(log.durationSec / 60)}m ${log.durationSec % 60}s` : "Memproses...")}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs font-semibold text-red-500">
                        {log.lastVoltage.toFixed(1)} V
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                        <FaCheckCircle size={26} className="text-green-500/60" />
                        <p className="text-sm font-semibold">Tidak ada catatan mati listrik</p>
                        <p className="text-xs">Listrik PLN berjalan stabil tanpa pemadaman terdeteksi.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Outage Table Pagination */}
          {outageTotal > 10 && (
            <div className="px-6 py-3 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
              <span className="text-gray-500">
                Halaman {outagePage} dari {Math.ceil(outageTotal / 10)}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={outagePage <= 1}
                  onClick={() => setOutagePage(p => p - 1)}
                  className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={outagePage >= Math.ceil(outageTotal / 10)}
                  onClick={() => setOutagePage(p => p + 1)}
                  className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* History Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-[2rem] bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/50 dark:border-gray-700 overflow-hidden shadow-lg">
          <div className="px-6 md:px-8 py-5 bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
              <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"><FaHistory size={14}/></span>
              Recent Logs
            </h3>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              {recentLogs.length} entries
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">
                  {selectedDeviceId === "all" && <th className="py-3 px-5 font-bold">Device</th>}
                  <th className="py-3 px-5 font-bold">Time</th>
                  <th className="py-3 px-5 font-bold">Voltage</th>
                  <th className="py-3 px-5 font-bold">Current</th>
                  <th className="py-3 px-5 font-bold">Power</th>
                  <th className="py-3 px-5 font-bold">Energy</th>
                </tr>
              </thead>
              <tbody className="text-sm cursor-default divide-y divide-gray-100 dark:divide-gray-700/50">
                {recentLogs.length > 0 ? recentLogs.map((log, idx) => {
                  const isHighPower = log.power > 100;
                  const isMidPower = log.power > 30;
                  return (
                    <tr key={log.id} className={`group transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white/40 dark:bg-transparent' : 'bg-gray-50/60 dark:bg-gray-900/20'} hover:bg-blue-50/60 dark:hover:bg-blue-900/10`}>
                      {selectedDeviceId === "all" && (
                        <td className="py-3.5 px-5 font-semibold text-gray-600 dark:text-gray-400 text-xs">
                          {log.deviceName || "Unknown"}
                        </td>
                      )}
                      <td className="py-3.5 px-5"><span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">{new Date(log.createdAt).toLocaleString('id-ID', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></td>
                      <td className="py-3.5 px-5"><span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-300"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>{log.voltage.toFixed(1)}<span className="text-xs text-gray-400">V</span></span></td>
                      <td className="py-3.5 px-5"><span className="inline-flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500"/>{log.current.toFixed(2)}<span className="text-xs text-gray-400">A</span></span></td>
                      <td className="py-3.5 px-5"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${isHighPower ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200' : isMidPower ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200'}`}>{log.power.toFixed(1)} W</span></td>
                      <td className="py-3.5 px-5"><span className="font-mono font-semibold text-violet-700 dark:text-violet-300">{log.energy.toFixed(3)}<span className="text-xs font-normal text-gray-400 ml-1">kWh</span></span></td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={selectedDeviceId === "all" ? 6 : 5} className="py-12 text-center"><div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-600"><FaHistory size={28} className="opacity-30"/><p className="text-sm font-medium">No logs available yet</p><p className="text-xs">Logs will appear when the device sends data</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Render Fullscreen Modal via Portal at root DOM */}
        {renderFullscreenModal()}
          </>
        )}
      </div>
    </div>
  );
};

export default PowerDashboard;
