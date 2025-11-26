"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import CryptoJS from 'crypto-js';
import {
    FaTint, FaThermometerHalf, FaCloudSun, FaArrowLeft,
    FaRegCalendarAlt, FaRegClock, FaInfoCircle, FaLightbulb,
    FaSun, FaMoon, FaBolt, FaEye, FaLink, FaUnlink, FaExclamationTriangle, FaSpinner, FaLeaf, FaRedo
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from 'next/dynamic';
import { ApexOptions } from "apexcharts";

// Impor dinamis ApexCharts
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// --- Konfigurasi API & Kunci Enkripsi ---
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const WS_SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET_KEY;
const WSS_HOST = HTTPSAPIURL || '';

// --- Tipe Data ---
type HistoricalEntryNumeric = { time: string; value: number };
type HistoricalEntryBoolean = { time: string; value: boolean };

interface SensorData {
    ph: number | typeof NaN;
    temperature: number | typeof NaN;
    humidity: number | typeof NaN;
    voltage: number | typeof NaN;
    ldr: boolean;
    updatedAt: string;
}

interface DecryptedSensorData {
    latest?: {
        ph?: number | null; temperature?: number | null; humidity?: number | null;
        voltage?: number | null; ldr?: boolean | null; updatedAt?: string | null;
    } | null;
    history?: {
        voltage?: { value?: (number | null)[], timestamp?: (string | null)[] } | null;
        ph?: { value?: (number | null)[], timestamp?: (string | null)[] } | null;
        temperature?: { value?: (number | null)[], timestamp?: (string | null)[] } | null;
        humidity?: { value?: (number | null)[], timestamp?: (string | null)[] } | null;
        ldr?: { value?: (boolean | null)[], timestamp?: (string | null)[] } | null;
    } | null;
}

const MAX_HISTORY_LENGTH = 30;

// --- Helper Functions ---
const formatTimeHM = (timeString: string | null | undefined): string => {
    if (!timeString) return "--:--";
    try {
        let date: Date;
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeString)) { date = new Date(timeString.endsWith('Z') ? timeString : timeString + 'Z'); }
        else { if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) return timeString.substring(0, 5); if (/^\d{2}:\d{2}$/.test(timeString)) return timeString; const today = new Date(); const [hours, minutes, seconds] = timeString.split(':').map(Number); if (isFinite(hours) && isFinite(minutes)) { today.setHours(hours, minutes, seconds || 0, 0); date = today; } else { throw new Error("Cannot parse time string."); } }
        if (isNaN(date.getTime())) { return "--:--"; }
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    } catch (e) { return "--:--"; }
};

const decryptData = (encryptedData: { iv: string; content: string }): DecryptedSensorData | null => {
    if (!WS_SECRET_KEY) return null;
    try {
        const { iv, content } = encryptedData;
        if (!/^[0-9a-fA-F]{32}$/.test(iv)) return null;
        if (typeof content !== 'string' || content.length === 0) return null;
        const ivWordArray = CryptoJS.enc.Hex.parse(iv);
        const encryptedHexToBase64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(content));
        const key = CryptoJS.enc.Utf8.parse(WS_SECRET_KEY);
        const decrypted = CryptoJS.AES.decrypt(encryptedHexToBase64, key, { iv: ivWordArray, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedStr) return {};
        const parsedData = JSON.parse(decryptedStr);
        return parsedData as DecryptedSensorData;
    } catch (error) { return null; }
};

// ============================================================
// KOMPONEN SENSOR DETAIL
// ============================================================
interface SensorDetailViewProps {
    sensorId: string;
    onBack: () => void;
    isDarkMode: boolean;
    currentValue?: number | typeof NaN;
    historicalData?: HistoricalEntryNumeric[];
    currentPhValue?: number | typeof NaN;
    currentVoltageValue?: number | typeof NaN;
    phHistoricalData?: HistoricalEntryNumeric[];
    voltageHistoricalData?: HistoricalEntryNumeric[];
}

const SensorDetailView: React.FC<SensorDetailViewProps> = ({
    sensorId, onBack, isDarkMode, currentValue, historicalData,
    currentPhValue, currentVoltageValue, phHistoricalData, voltageHistoricalData
}) => {
    const isCombinedView = sensorId === 'ph';

    const primarySensorDetails = useMemo(() => {
        switch (sensorId) {
            case "ph": return { label: "Water pH", unit: "pH", icon: <FaTint />, color: "#3b82f6", range: { min: 6.0, max: 7.0 }, desc: "Tingkat keasaman air nutrisi." };
            case "temperature": return { label: "Temperature", unit: "°C", icon: <FaThermometerHalf />, color: "#ef4444", range: { min: 18, max: 28 }, desc: "Suhu lingkungan tanaman." };
            case "humidity": return { label: "Humidity", unit: "%", icon: <FaCloudSun />, color: "#22c55e", range: { min: 45, max: 75 }, desc: "Kelembaban udara sekitar." };
            default: return { label: "Unknown", unit: "", icon: <FaInfoCircle/>, color: "#6b7280", range: null, desc: "-" };
        }
    }, [sensorId]);

    const secondarySensorDetails = useMemo(() => {
        if (!isCombinedView) return null;
        return { label: "Voltage", unit: "V", icon: <FaBolt />, color: "#f97316", range: { min: 3.0, max: 5.0 } };
    }, [isCombinedView]);

    const calculateStats = (data: HistoricalEntryNumeric[] | undefined) => {
        const validData = data || [];
        const values = validData.map(d => d.value).filter((v): v is number => typeof v === 'number' && isFinite(v));
        if (values.length === 0) return { min: '-', max: '-', avg: '-' };
        return {
            min: Math.min(...values).toFixed(1),
            max: Math.max(...values).toFixed(1),
            avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
        };
    };

    const stats1 = useMemo(() => calculateStats(isCombinedView ? phHistoricalData : historicalData), [isCombinedView, phHistoricalData, historicalData]);
    const stats2 = useMemo(() => calculateStats(voltageHistoricalData), [voltageHistoricalData]);

    const categories = useMemo(() => (isCombinedView ? phHistoricalData : historicalData)?.map(d => d.time) || [], [isCombinedView, phHistoricalData, historicalData]);

    const chartSeries = useMemo(() => {
        if (isCombinedView && phHistoricalData && voltageHistoricalData) {
            return [
                { name: primarySensorDetails.label, data: phHistoricalData.map(d => d.value) },
                { name: "Voltage", data: voltageHistoricalData.map(d => d.value) }
            ];
        } else if (historicalData) {
            return [{ name: primarySensorDetails.label, data: historicalData.map(d => d.value) }];
        } return [];
    }, [isCombinedView, historicalData, phHistoricalData, voltageHistoricalData, primarySensorDetails]);

    const chartOptions: ApexOptions = useMemo(() => ({
        chart: { type: 'area', background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
        colors: isCombinedView ? [primarySensorDetails.color, secondarySensorDetails?.color || '#f97316'] : [primarySensorDetails.color],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        grid: { borderColor: isDarkMode ? '#374151' : '#f3f4f6', strokeDashArray: 4 },
        xaxis: { categories: categories, labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: isCombinedView ? [
            { title: { text: "pH", style: { color: primarySensorDetails.color } }, labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' }, formatter: (v) => v.toFixed(1) } },
            { opposite: true, title: { text: "Volt", style: { color: secondarySensorDetails?.color } }, labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' }, formatter: (v) => v.toFixed(1) } }
        ] : { labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280' }, formatter: (v) => v.toFixed(1) } },
        theme: { mode: isDarkMode ? 'dark' : 'light' },
        tooltip: { theme: isDarkMode ? 'dark' : 'light', x: { show: false } }
    }), [isCombinedView, categories, primarySensorDetails, secondarySensorDetails, isDarkMode]);

    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-5xl mx-auto">
            <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors group">
                <FaArrowLeft className="transition-transform group-hover:-translate-x-1" /> Kembali ke Dashboard
            </button>
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-2xl p-6 md:p-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${isDarkMode ? 'from-gray-700 to-gray-600' : 'from-white to-gray-50'} shadow-lg text-3xl`} style={{ color: primarySensorDetails.color }}>
                            {primarySensorDetails.icon}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{isCombinedView ? "Kualitas Air & Daya" : `Sensor ${primarySensorDetails.label}`}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{primarySensorDetails.desc}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">{primarySensorDetails.label}</p>
                            <p className="text-4xl font-black text-gray-800 dark:text-white">
                                {typeof (isCombinedView ? currentPhValue : currentValue) === 'number' ? (isCombinedView ? currentPhValue : currentValue)?.toFixed(1) : '--'}
                                <span className="text-lg font-medium text-gray-400 ml-1">{primarySensorDetails.unit}</span>
                            </p>
                        </div>
                        {isCombinedView && (
                            <div className="text-right pl-6 border-l border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Voltage</p>
                                <p className="text-4xl font-black text-gray-800 dark:text-white">
                                    {typeof currentVoltageValue === 'number' ? currentVoltageValue.toFixed(1) : '--'}
                                    <span className="text-lg font-medium text-gray-400 ml-1">V</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="h-[350px] w-full bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-900/30 rounded-3xl border border-gray-100 dark:border-gray-700/50 p-2 mb-8">
                    {chartSeries.length > 0 && typeof window !== 'undefined' ? (
                        <Chart options={chartOptions} series={chartSeries} type="area" height="100%" />
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-2">
                            <FaSpinner className="animate-spin text-2xl"/>
                            <span className="text-sm">Memuat grafik...</span>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primarySensorDetails.color }}></span>
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase">Statistik {primarySensorDetails.label}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div><p className="text-xs text-gray-400">Min</p><p className="text-lg font-bold text-gray-800 dark:text-white">{stats1.min}</p></div>
                            <div><p className="text-xs text-gray-400">Avg</p><p className="text-lg font-bold text-gray-800 dark:text-white">{stats1.avg}</p></div>
                            <div><p className="text-xs text-gray-400">Max</p><p className="text-lg font-bold text-gray-800 dark:text-white">{stats1.max}</p></div>
                        </div>
                    </div>
                    {isCombinedView && secondarySensorDetails && (
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: secondarySensorDetails.color }}></span>
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase">Statistik {secondarySensorDetails.label}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div><p className="text-xs text-gray-400">Min</p><p className="text-lg font-bold text-gray-800 dark:text-white">{stats2.min}</p></div>
                                <div><p className="text-xs text-gray-400">Avg</p><p className="text-lg font-bold text-gray-800 dark:text-white">{stats2.avg}</p></div>
                                <div><p className="text-xs text-gray-400">Max</p><p className="text-lg font-bold text-gray-800 dark:text-white">{stats2.max}</p></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// ============================================================
// KOMPONEN SPARKLINE CHART
// ============================================================
const SparklineChart = ({ data, color, isDarkMode }: { data: HistoricalEntryNumeric[], color: string, isDarkMode: boolean }) => {
    const options: ApexOptions = {
        chart: { type: 'line', sparkline: { enabled: true }, animations: { enabled: false } },
        stroke: { curve: 'smooth', width: 2, colors: [color] },
        fill: { opacity: 0 },
        tooltip: { fixed: { enabled: false }, x: { show: false }, y: { title: { formatter: () => '' } }, marker: { show: false } },
        theme: { mode: isDarkMode ? 'dark' : 'light' }
    };
    const series = [{ data: data.slice(-10).map(d => d.value) }];
    if (!data || data.length < 2) return null;
    return (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none">
             {typeof window !== 'undefined' && (
                <Chart options={options} series={series} type="line" width="100%" height="100%" />
             )}
        </div>
    );
};

// ============================================================
// KOMPONEN UTAMA (HOME)
// ============================================================
const Home: React.FC = () => {
    const [sensorData, setSensorData] = useState<SensorData>({ ph: NaN, temperature: NaN, humidity: NaN, voltage: NaN, ldr: false, updatedAt: "--:--" });
    const [phHistory, setPhHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [tempHistory, setTempHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [humidityHistory, setHumidityHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [voltageHistory, setVoltageHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [ldrHistory, setLdrHistory] = useState<HistoricalEntryBoolean[]>([]);
    
    const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const ws = useRef<WebSocket | null>(null);
    const [wsConnected, setWsConnected] = useState<boolean>(false);

    // --- Logic ---
    useEffect(() => {
        if (typeof window !== "undefined") {
            const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
            checkTheme();
            const observer = new MutationObserver(checkTheme);
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
            return () => observer.disconnect();
        }
    }, []);

    useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(t); }, []);

    const handleLogout = useCallback(() => {
         Object.keys(Cookies.get()).forEach((c) => { if (c === 'userAuth') Cookies.remove(c, { path: '/' }); });
         window.location.href = "/auth/signin";
    }, []);

    const connectWebSocket = useCallback(() => {
         if (!WSS_HOST || !WS_SECRET_KEY) { setError("Konfigurasi WebSocket hilang."); setInitialLoading(false); return; }
         const token = Cookies.get("userAuth");
         if (!token) { setError("Sesi habis."); setInitialLoading(false); return; }
         if (ws.current) { ws.current.close(); ws.current = null; }
         
         const wsUrl = `wss://${WSS_HOST}/dataSensor?token=${token}`;
         setInitialLoading(true); setWsConnected(false); setError(null);
         
         try {
             const socket = new WebSocket(wsUrl); ws.current = socket;
             socket.onopen = () => { setWsConnected(true); setError(null); setInitialLoading(false); };
             socket.onmessage = (e) => {
                 if (ws.current !== socket) return;
                 try {
                     const raw = JSON.parse(e.data as string);
                     if (raw?.iv && raw?.content) {
                         const decrypted = decryptData(raw);
                         if (decrypted) {
                             const { latest, history } = decrypted;
                             const newLatest: Partial<SensorData> = {};
                             if (latest) {
                                if (typeof latest.ph === 'number') newLatest.ph = latest.ph;
                                if (typeof latest.temperature === 'number') newLatest.temperature = latest.temperature;
                                if (typeof latest.humidity === 'number') newLatest.humidity = latest.humidity;
                                if (typeof latest.voltage === 'number') newLatest.voltage = latest.voltage;
                                if (typeof latest.ldr === 'boolean') newLatest.ldr = latest.ldr;
                                newLatest.updatedAt = formatTimeHM(latest.updatedAt);
                                setSensorData(prev => ({ ...prev, ...newLatest }));
                             }
                             const parseHist = (h: any, isBool = false) => {
                                 if (!h?.value || !h?.timestamp) return [];
                                 return h.timestamp.map((ts: string, i: number) => ({ time: ts, value: h.value[i] })).filter((x: any) => x.value !== null).slice(-MAX_HISTORY_LENGTH);
                             };
                             setPhHistory(parseHist(history?.ph));
                             setTempHistory(parseHist(history?.temperature));
                             setHumidityHistory(parseHist(history?.humidity));
                             setVoltageHistory(parseHist(history?.voltage));
                             setLdrHistory(parseHist(history?.ldr, true));
                             setInitialLoading(false);
                         }
                     }
                 } catch (err) { console.error(err); }
             };
             socket.onclose = (e) => { if (ws.current === socket) { setWsConnected(false); if (!e.wasClean) setError("Koneksi terputus."); } };
         } catch (err) { setError("Gagal koneksi."); setWsConnected(false); }
    }, [handleLogout]);

    useEffect(() => { connectWebSocket(); return () => { ws.current?.close(); }; }, [connectWebSocket]);

    const getGreeting = () => { const h = currentTime.getHours(); return h < 11 ? "Selamat Pagi" : h < 15 ? "Selamat Siang" : h < 19 ? "Selamat Sore" : "Selamat Malam"; };

    const renderSensorCards = () => {
        const format = (v: number, u: string) => (typeof v === 'number' && isFinite(v)) ? `${v.toFixed(1)}${u}` : '-';
        const sensors = [
            { id: "ph", label: "Air & Daya", value: format(sensorData.ph, ' pH'), sub: `${format(sensorData.voltage, 'V')}`, icon: <FaTint />, color: "text-blue-500", hexColor: "#3b82f6", bg: "from-blue-500/10 to-blue-500/5", border: "group-hover:border-blue-500/50", clickable: true, history: phHistory },
            { id: "temperature", label: "Suhu Udara", value: format(sensorData.temperature, '°C'), sub: "Lingkungan", icon: <FaThermometerHalf />, color: "text-red-500", hexColor: "#ef4444", bg: "from-red-500/10 to-red-500/5", border: "group-hover:border-red-500/50", clickable: true, history: tempHistory },
            { id: "humidity", label: "Kelembaban", value: format(sensorData.humidity, '%'), sub: "RH", icon: <FaCloudSun />, color: "text-green-500", hexColor: "#22c55e", bg: "from-green-500/10 to-green-500/5", border: "group-hover:border-green-500/50", clickable: true, history: humidityHistory },
            { id: "ldr", label: "Cahaya", value: sensorData.ldr ? "Gelap" : "Terang", sub: "Status", icon: sensorData.ldr ? <FaMoon /> : <FaSun />, color: sensorData.ldr ? "text-purple-500" : "text-yellow-500", hexColor: sensorData.ldr ? "#a855f7" : "#eab308", bg: "from-yellow-500/10 to-yellow-500/5", border: "", clickable: false, history: [] },
        ];
        return sensors.map((s) => (
            <motion.div key={s.id} whileHover={s.clickable ? { y: -5 } : {}} whileTap={s.clickable ? { scale: 0.98 } : {}} onClick={() => s.clickable && setSelectedSensor(s.id)} className={`group relative overflow-hidden rounded-[2rem] bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 transition-all hover:shadow-2xl ${s.clickable ? 'cursor-pointer' : ''}`}>
                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${s.bg} blur-2xl transition-all group-hover:scale-150`}></div>
                {s.clickable && s.history && s.history.length > 1 && (<SparklineChart data={s.history} color={s.hexColor} isDarkMode={isDarkMode} />)}
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl bg-white dark:bg-gray-700 shadow-sm ${s.color} text-2xl`}>{s.icon}</div>
                        {s.clickable && <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"><FaEye size={12}/></div>}
                    </div>
                    <div><p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.label}</p><h4 className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-1 tracking-tight">{s.value}</h4><p className="text-xs font-semibold text-gray-400 mt-1">{s.sub}</p></div>
                </div>
            </motion.div>
        ));
    };

    return (
        <div className="min-h-screen w-full relative text-gray-800 dark:text-gray-100 transition-colors duration-500 overflow-x-hidden">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-green-400/20 rounded-full blur-[120px] opacity-60 dark:opacity-20 animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-400/20 rounded-full blur-[120px] opacity-60 dark:opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <AnimatePresence mode="wait">
                    {initialLoading && (
                        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[60vh]">
                            <div className="relative"><div className="h-16 w-16 rounded-full border-4 border-gray-200 dark:border-gray-700"></div><div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div></div>
                            <p className="mt-4 text-lg font-medium text-gray-500 animate-pulse">Menghubungkan ke Kebun...</p>
                        </motion.div>
                    )}

                    {!initialLoading && error && !wsConnected && (
                        <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                            <div className="p-6 rounded-[2rem] bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 shadow-xl max-w-md">
                                <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Koneksi Terputus</h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
                                <button onClick={connectWebSocket} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
                                    Coba Sambungkan Lagi
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {!initialLoading && selectedSensor && (
                        <SensorDetailView key="detail" sensorId={selectedSensor} onBack={() => setSelectedSensor(null)} isDarkMode={isDarkMode} currentValue={sensorData[selectedSensor as keyof SensorData] as number} historicalData={selectedSensor === 'temperature' ? tempHistory : humidityHistory} currentPhValue={sensorData.ph} currentVoltageValue={sensorData.voltage} phHistoricalData={phHistory} voltageHistoricalData={voltageHistory} />
                    )}

                    {!initialLoading && !selectedSensor && !error && (
                        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1 text-green-600 dark:text-green-400 font-bold text-sm uppercase tracking-wider"><FaLeaf /> Live Monitoring</div>
                                    <h1 className="text-4xl md:text-5xl font-black text-gray-800 dark:text-white tracking-tight mb-2">{getGreeting()}</h1>
                                    <p className="text-gray-500 dark:text-gray-400">Pantau kondisi kebun Anda secara real-time.</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {/* Status Connection Button */}
                                    <button onClick={() => !wsConnected && connectWebSocket()} className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm border transition-all active:scale-95 ${wsConnected ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 cursor-default' : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200 cursor-pointer'}`}>
                                        <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                        {wsConnected ? 'Sistem Online' : 'Terputus (Klik untuk Reconnect)'}
                                    </button>
                                    <div className="text-xs text-gray-400 font-mono flex items-center gap-2"><FaRegClock /> {sensorData.updatedAt !== "--:--" ? `Update: ${sensorData.updatedAt}` : "Menunggu data..."}</div>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6 mb-10">
                                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 p-8 shadow-xl text-white">
                                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-4 opacity-90"><FaInfoCircle /> <span className="text-sm font-bold uppercase tracking-wide">Status Kebun</span></div>
                                        <p className="text-2xl font-bold leading-relaxed">{sensorData.ph < 6 ? "Perhatian: pH Rendah." : sensorData.ph > 7 ? "Perhatian: pH Tinggi." : "Semua sistem berjalan normal."}</p>
                                        <p className="mt-2 opacity-80 text-sm">Sensor bekerja optimal.</p>
                                    </div>
                                </div>
                                <div className="relative overflow-hidden rounded-[2rem] bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/50 dark:border-gray-700 p-8 shadow-lg">
                                    <div className="flex items-center gap-2 mb-4 text-yellow-600 dark:text-yellow-400"><FaLightbulb /> <span className="text-sm font-bold uppercase tracking-wide">Smart Tip</span></div>
                                    <p className="text-lg font-medium text-gray-700 dark:text-gray-200">{sensorData.temperature > 30 ? "Suhu cukup tinggi, pastikan ventilasi cukup." : "Kondisi lingkungan ideal untuk pertumbuhan."}</p>
                                </div>
                            </div>
                            <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold text-gray-800 dark:text-white">Metrik Sensor</h3></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{renderSensorCards()}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Home;