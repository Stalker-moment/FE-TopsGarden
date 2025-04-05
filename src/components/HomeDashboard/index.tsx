// Nama file: src/components/SmartGardenDashboard.tsx
// Kode Lengkap Final (per 5 April 2025) - Grafik Detail, Abaikan Volt di Summary, Gabung Chart pH+Volt
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import CryptoJS from 'crypto-js';
import {
    FaTint, FaThermometerHalf, FaCloudSun, FaArrowLeft,
    FaRegCalendarAlt, FaRegClock, FaInfoCircle, FaLightbulb,
    FaSun, FaMoon, FaBolt, FaEye, FaLink, FaUnlink, FaExclamationTriangle, FaSpinner
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
// Impor dinamis ApexCharts untuk Next.js
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
import { ApexOptions } from "apexcharts";

// --- Konfigurasi API & Kunci Enkripsi ---
// Pastikan variabel ini ada di file .env.local Anda
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const WS_SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET_KEY;

if (!HTTPSAPIURL) { console.error("CRITICAL: NEXT_PUBLIC_HTTPS_API_URL is not defined."); }
if (!WS_SECRET_KEY) { console.error("CRITICAL: NEXT_PUBLIC_WS_SECRET_KEY is not defined."); }

// Host untuk WebSocket (tanpa protokol wss://)
const WSS_HOST = HTTPSAPIURL || '';

// --- Tipe Data ---
type HistoricalEntryNumeric = { time: string; value: number }; // time akan berisi "HH:mm:ss"
type HistoricalEntryBoolean = { time: string; value: boolean }; // time akan berisi "HH:mm:ss"

// Tipe data untuk state internal komponen
interface SensorData {
    ph: number | typeof NaN;
    temperature: number | typeof NaN;
    humidity: number | typeof NaN;
    voltage: number | typeof NaN;
    ldr: boolean;
    updatedAt: string; // Hasil format HH:mm untuk tampilan saja
}

// Tipe data mentah yang diharapkan dari WebSocket setelah dekripsi
interface DecryptedSensorData {
    latest?: {
        ph?: number | null; temperature?: number | null; humidity?: number | null;
        voltage?: number | null; ldr?: boolean | null; updatedAt?: string | null; // bisa ISO atau HH:mm:ss
    } | null;
    history?: {
        voltage?: { value?: (number | null)[], timestamp?: (string | null)[] } | null; // timestamp diharapkan "HH:mm:ss"
        ph?: { value?: (number | null)[], timestamp?: (string | null)[] } | null;
        temperature?: { value?: (number | null)[], timestamp?: (string | null)[] } | null;
        humidity?: { value?: (number | null)[], timestamp?: (string | null)[] } | null;
        ldr?: { value?: (boolean | null)[], timestamp?: (string | null)[] } | null;
    } | null;
}

// --- Konstanta & Helper Global ---
const MAX_HISTORY_LENGTH = 30; // Batasi jumlah data historis yang disimpan/ditampilkan

// Fungsi format waktu HANYA untuk TAMPILAN HH:mm (Tidak untuk data chart)
const formatTimeHM = (timeString: string | null | undefined): string => {
    if (!timeString) return "--:--";
    try {
        let date: Date;
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeString)) { date = new Date(timeString.endsWith('Z') ? timeString : timeString + 'Z'); }
        else { if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) return timeString.substring(0, 5); if (/^\d{2}:\d{2}$/.test(timeString)) return timeString; console.warn(`Attempting fallback date parse for time display: ${timeString}`); const today = new Date(); const [hours, minutes, seconds] = timeString.split(':').map(Number); if (isFinite(hours) && isFinite(minutes)) { today.setHours(hours, minutes, seconds || 0, 0); date = today; } else { throw new Error("Cannot parse time string for display."); } }
        if (isNaN(date.getTime())) { console.warn(`Invalid time format for display, cannot parse: ${timeString}`); return "--:--"; }
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    } catch (e) { console.error(`Error formatting time ${timeString} for display:`, e); return "--:--"; }
};

// Fungsi format tanggal dan waktu lengkap ke zona WIB
const formatDateTime = (dateTimeString: string | null | undefined): string => {
     if (!dateTimeString) return "N/A";
     try {
         const date = new Date(dateTimeString);
         if (isNaN(date.getTime())) return "Invalid Date";
         return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
     } catch (e) {
         console.error("Error formatting date:", e);
         return "Invalid Date Format";
     }
};

// --- Fungsi Dekripsi ---
const decryptData = (encryptedData: { iv: string; content: string }): DecryptedSensorData | null => {
    if (!WS_SECRET_KEY) { console.error("Decryption key missing."); return null; }
    try {
        const { iv, content } = encryptedData;
        if (!/^[0-9a-fA-F]{32}$/.test(iv)) { console.error("Invalid IV format."); return null; }
        if (typeof content !== 'string' || content.length === 0 || !/^[0-9a-fA-F]+$/.test(content)) { console.error("Invalid content format."); return null; }
        const ivWordArray = CryptoJS.enc.Hex.parse(iv);
        const encryptedHexToBase64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(content));
        const key = CryptoJS.enc.Utf8.parse(WS_SECRET_KEY);
        const decrypted = CryptoJS.AES.decrypt(encryptedHexToBase64, key, { iv: ivWordArray, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedStr) { console.warn("Decryption resulted in empty string."); return {}; }
        const parsedData = JSON.parse(decryptedStr);
        if (typeof parsedData === 'object' && parsedData !== null) { return parsedData as DecryptedSensorData; }
        else { console.error("Decrypted data is not a valid object."); return null; }
    } catch (error) { console.error("Decryption or JSON parsing failed:", error); return null; }
};


// ============================================================
// Komponen untuk Detail Sensor (Bisa Menampilkan Chart Gabungan pH+Volt)
// ============================================================
interface SensorDetailViewProps {
    sensorId: string; // 'ph', 'temperature', 'humidity'
    onBack: () => void;
    isDarkMode: boolean;
    // Props untuk view sensor tunggal (Temp, Humidity)
    currentValue?: number | typeof NaN;
    historicalData?: HistoricalEntryNumeric[];
    // Props KHUSUS untuk view gabungan pH+Voltage (saat sensorId = 'ph')
    currentPhValue?: number | typeof NaN;
    currentVoltageValue?: number | typeof NaN;
    phHistoricalData?: HistoricalEntryNumeric[];
    voltageHistoricalData?: HistoricalEntryNumeric[];
}

const SensorDetailView: React.FC<SensorDetailViewProps> = ({
    sensorId, onBack, isDarkMode,
    currentValue, historicalData,
    currentPhValue, currentVoltageValue, phHistoricalData, voltageHistoricalData
}) => {

    const isCombinedView = sensorId === 'ph'; // Tentukan mode view

    // Detail Sensor Utama (pH atau Temp atau Humidity)
    const primarySensorDetails = useMemo(() => {
        switch (sensorId) {
            case "ph": return { id: "ph", label: "Water pH", unit: "pH", icon: <FaTint />, tailwindColor: "text-blue-500", hexColor: '#3b82f6', optimalRange: { min: 6.0, max: 7.0 }, description: "Mengukur keasaman atau kebasaan air." };
            case "temperature": return { id: "temperature", label: "Temperature", unit: "°C", icon: <FaThermometerHalf />, tailwindColor: "text-red-500", hexColor: '#ef4444', optimalRange: { min: 18, max: 28 }, description: "Suhu udara di sekitar tanaman." };
            case "humidity": return { id: "humidity", label: "Humidity", unit: "%", icon: <FaCloudSun />, tailwindColor: "text-green-500", hexColor: '#22c55e', optimalRange: { min: 45, max: 75 }, description: "Jumlah uap air di udara." };
            default: return { id: "unknown", label: "Unknown Sensor", unit: "", icon: <FaInfoCircle/>, tailwindColor: "text-gray-500", hexColor: '#6b7280', optimalRange: null, description: "Data sensor tidak dikenal." };
        }
    }, [sensorId]);

    // Detail Sensor Sekunder (Voltage - hanya untuk combined view)
    const secondarySensorDetails = useMemo(() => {
        if (!isCombinedView) return null;
        return { id: "voltage", label: "Sensor Voltage", unit: "V", icon: <FaBolt />, tailwindColor: "text-orange-500", hexColor: '#f97316', optimalRange: { min: 3.0, max: 5.0 }, description: "Mengukur tegangan suplai sensor." };
    }, [isCombinedView]);

    // Fungsi Kalkulasi Statistik
    const calculateStats = (data: HistoricalEntryNumeric[] | undefined, currentVal: number | typeof NaN | undefined, range: { min: number; max: number } | null) => {
        const validData = data || [];
        const values = validData.map(d => d.value).filter((v): v is number => typeof v === 'number' && isFinite(v));
        if (values.length === 0) return { min: 'N/A', max: 'N/A', avg: 'N/A', status: 'Unknown' };
        const minVal = Math.min(...values).toFixed(1); const maxVal = Math.max(...values).toFixed(1); const avgVal = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
        let currentStatus = "Optimal"; const currentNumericValue = typeof currentVal === 'number' && isFinite(currentVal) ? currentVal : null;
        if (range && currentNumericValue !== null) { if (currentNumericValue < range.min) currentStatus = "Low"; else if (currentNumericValue > range.max) currentStatus = "High"; }
        else if (!range) { currentStatus = "N/A"; } else { currentStatus = "Unknown"; }
        return { min: minVal, max: maxVal, avg: avgVal, status: currentStatus };
    };

    // Hitung Statistik
    const primaryStats = useMemo(() => calculateStats( isCombinedView ? phHistoricalData : historicalData, isCombinedView ? currentPhValue : currentValue, primarySensorDetails.optimalRange ), [isCombinedView, phHistoricalData, historicalData, currentPhValue, currentValue, primarySensorDetails.optimalRange]);
    const secondaryStats = useMemo(() => { if (!isCombinedView || !secondarySensorDetails) return null; return calculateStats( voltageHistoricalData, currentVoltageValue, secondarySensorDetails.optimalRange ); }, [isCombinedView, secondarySensorDetails, voltageHistoricalData, currentVoltageValue]);

    // Fungsi Warna Status
    const getStatusColor = (status: string): string => {
        switch (status) {
            case "Low": return "text-yellow-500 dark:text-yellow-400";
            case "High": return "text-red-500 dark:text-red-400";
            case "Optimal": return "text-green-500 dark:text-green-400";
            default: return "text-gray-500 dark:text-gray-400";
        }
    };

    // Persiapan Data Chart
    const categories = useMemo(() => (isCombinedView ? phHistoricalData : historicalData)?.map(d => d.time) || [], [isCombinedView, phHistoricalData, historicalData]);

    const chartSeries = useMemo(() => {
        if (isCombinedView && phHistoricalData && voltageHistoricalData && secondarySensorDetails) {
            const phSeriesData = phHistoricalData.map(d => ({ x: d.time, y: (d.value !== undefined && d.value !== null && isFinite(d.value)) ? parseFloat(d.value.toFixed(1)) : null }));
            const voltageSeriesData = voltageHistoricalData.map(d => ({ x: d.time, y: (d.value !== undefined && d.value !== null && isFinite(d.value)) ? parseFloat(d.value.toFixed(1)) : null }));
            return [ { name: primarySensorDetails.label, data: phSeriesData }, { name: secondarySensorDetails.label, data: voltageSeriesData } ];
        } else if (!isCombinedView && historicalData) {
            const seriesData = historicalData.map(d => ({ x: d.time, y: (d.value !== undefined && d.value !== null && isFinite(d.value)) ? parseFloat(d.value.toFixed(1)) : null }));
            return [{ name: primarySensorDetails.label, data: seriesData }];
        } return [];
    }, [isCombinedView, historicalData, phHistoricalData, voltageHistoricalData, primarySensorDetails.label, secondarySensorDetails]);

    const chartOptions: ApexOptions = useMemo(() => {
        const primaryColor = primarySensorDetails.hexColor;
        const secondaryColor = secondarySensorDetails?.hexColor;
        const colors = isCombinedView && secondaryColor ? [primaryColor, secondaryColor] : [primaryColor];

        const createYAxisOptions = ( sensorDetails: typeof primarySensorDetails | typeof secondarySensorDetails | null, isOpposite: boolean = false, data: HistoricalEntryNumeric[] | undefined ): ApexYAxis | undefined => {
            if (!sensorDetails) return undefined; const range = sensorDetails.optimalRange; const unit = sensorDetails.unit; const validData = data || []; const values = validData.map(d => d.value).filter((v): v is number => typeof v === 'number' && isFinite(v));
            let yMin, yMax;
            if (values.length > 0) { const dataMin = Math.min(...values); const dataMax = Math.max(...values); yMin = Math.floor(Math.min(dataMin, range?.min ?? dataMin)) - (unit === 'pH' || unit === 'V' ? 0.5 : 1); yMax = Math.ceil(Math.max(dataMax, range?.max ?? dataMax)) + (unit === 'pH' || unit === 'V' ? 0.5 : 1); }
            else { yMin = Math.floor(range?.min ?? 0) - 1; yMax = Math.ceil(range?.max ?? (unit === 'pH' ? 14 : (unit === 'V' ? 6 : 50))) + 1; }
            if (unit !== '°C' && yMin < 0 && values.every(v => v >= 0)) { yMin = 0; } if (yMin >= yMax) { yMax = yMin + (unit === 'pH' ? 2 : (unit === 'V' ? 1 : 5)); }
            return { opposite: isOpposite, title: { text: `${sensorDetails.label} (${unit})`, style: { color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 500, fontSize: '12px' } }, labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }, formatter: (value) => typeof value === 'number' ? `${value.toFixed(1)}` : '' }, min: yMin, max: yMax, axisBorder: { show: true, color: sensorDetails.hexColor }, axisTicks: { show: true, color: sensorDetails.hexColor } };
        };

        const yAxisConfig = isCombinedView
            ? [ createYAxisOptions(primarySensorDetails, false, phHistoricalData), createYAxisOptions(secondarySensorDetails, true, voltageHistoricalData) ].filter(axis => axis !== undefined) as ApexYAxis[]
            : [ createYAxisOptions(primarySensorDetails, false, historicalData) ].filter(axis => axis !== undefined) as ApexYAxis[];

        return {
            chart: { height: '100%', type: 'line', animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 500 } }, toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: true } }, background: 'transparent' },
            colors: colors, dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 2.5 }, grid: { borderColor: isDarkMode ? '#4b5563' : '#e5e7eb', row: { colors: ['transparent', 'transparent'], opacity: 0.5 } },
            xaxis: { type: 'category', categories: categories, tickPlacement: 'on', labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '11px' }, trim: true, hideOverlappingLabels: true, rotate: -45, datetimeUTC: false }, axisBorder: { show: false }, axisTicks: { show: true }, tooltip: { enabled: false } },
            yaxis: yAxisConfig,
            tooltip: { theme: isDarkMode ? "dark" : "light", shared: true, intersect: false, x: { formatter: (val, opts) => `Time: ${opts?.w?.config?.xaxis?.categories?.[opts?.dataPointIndex ?? 0] || val}` }, y: { formatter: (value, { seriesIndex, w }) => { const seriesName = w.config.series[seriesIndex].name; const unit = seriesName === secondarySensorDetails?.label ? secondarySensorDetails?.unit : primarySensorDetails.unit; return typeof value === 'number' ? `${value.toFixed(1)} ${unit}` : 'N/A'; } } },
            markers: { size: 3, hover: { size: 5 }, strokeWidth: 0 }, legend: { show: isCombinedView }
        };
    }, [isCombinedView, categories, primarySensorDetails, secondarySensorDetails, isDarkMode, historicalData, phHistoricalData, voltageHistoricalData]);

    // Data untuk Tampilan Header
    const displayCurrentValue1 = isCombinedView ? currentPhValue : currentValue;
    const displayCurrentValue2 = isCombinedView ? currentVoltageValue : undefined;
    const displayLabel1 = primarySensorDetails.label;
    const displayLabel2 = secondarySensorDetails?.label;
    const displayUnit1 = primarySensorDetails.unit;
    const displayUnit2 = secondarySensorDetails?.unit;
    const displayStats1 = primaryStats;
    const displayStats2 = secondaryStats;
    const displayIcon = primarySensorDetails.icon;
    const displayColor = primarySensorDetails.tailwindColor;
    const displayDescription = isCombinedView ? `Data ${displayLabel1} dan ${displayLabel2}` : primarySensorDetails.description;

     // JSX Render Detail View
     return (
         <motion.div
             key={`sensor-detail-${sensorId}`}
             initial={{ x: "100%", opacity: 0 }} animate={{ x: "0%", opacity: 1 }} exit={{ x: "-100%", opacity: 0 }}
             transition={{ duration: 0.4, ease: "easeInOut" }}
             className="w-full max-w-4xl p-6 md:p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-left relative overflow-hidden"
         >
             <motion.button onClick={onBack} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="absolute top-4 left-4 z-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg shadow hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center text-sm" aria-label="Kembali ke dashboard">
                 <FaArrowLeft className="mr-2" /> Kembali
             </motion.button>

             <div className="mt-10 md:mt-12">
                 {/* Header Detail */}
                 <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                     <div>
                         <h3 className={`text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center ${displayColor}`}>
                             <span className="mr-3">{displayIcon}</span> Detail {isCombinedView ? 'Air pH & Voltage' : displayLabel1}
                         </h3>
                         <p className="text-gray-500 dark:text-gray-400 text-sm">{displayDescription}</p>
                     </div>
                     {/* Nilai Saat Ini */}
                     <div className="mt-4 md:mt-0 text-left md:text-right">
                         <div className="mb-2">
                             <p className="text-gray-500 dark:text-gray-400 text-xs">{displayLabel1}</p>
                             <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                                 {typeof displayCurrentValue1 === 'number' && isFinite(displayCurrentValue1) ? `${displayCurrentValue1.toFixed(1)}${displayUnit1}` : 'N/A'}
                             </p>
                             <p className={`text-sm font-medium ${getStatusColor(displayStats1.status)}`}>
                                Status: {displayStats1.status} {primarySensorDetails.optimalRange ? `(Ideal: ${primarySensorDetails.optimalRange.min}-${primarySensorDetails.optimalRange.max}${displayUnit1})` : ''}
                             </p>
                         </div>
                         {isCombinedView && secondarySensorDetails && displayStats2 && (
                             <div className="mt-3">
                                 <p className="text-gray-500 dark:text-gray-400 text-xs">{displayLabel2}</p>
                                 <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                                     {typeof displayCurrentValue2 === 'number' && isFinite(displayCurrentValue2) ? `${displayCurrentValue2.toFixed(1)}${displayUnit2}` : 'N/A'}
                                 </p>
                                 <p className={`text-sm font-medium ${getStatusColor(displayStats2.status)}`}>
                                    Status: {displayStats2.status} {secondarySensorDetails.optimalRange ? `(Ideal: ${secondarySensorDetails.optimalRange.min}-${secondarySensorDetails.optimalRange.max}${displayUnit2})` : ''}
                                 </p>
                             </div>
                         )}
                     </div>
                 </div>

                 {/* Chart */}
                 <div className="mb-6 h-72 md:h-80 relative">
                     {chartSeries.length > 0 && categories.length > 1 && typeof window !== 'undefined' ? (
                         <Chart
                             key={`chart-${sensorId}-${categories.length}-${isDarkMode}`}
                             options={chartOptions}
                             series={chartSeries}
                             type="line"
                             height="100%"
                             width="100%"
                         />
                     ) : ( <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400"> {categories.length === 0 ? "Menunggu data historis..." : "Membutuhkan >1 data point."} </div> )}
                 </div>

                 {/* Statistik Min/Max/Avg */}
                 <div className="space-y-4">
                      <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Statistik Riwayat {displayLabel1}:</p>
                          <div className="grid grid-cols-3 gap-4 text-center">
                              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm"> <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Min</p> <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{displayStats1.min}{displayUnit1}</p> </div>
                              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm"> <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Rata-rata</p> <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{displayStats1.avg}{displayUnit1}</p> </div>
                              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm"> <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Max</p> <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{displayStats1.max}{displayUnit1}</p> </div>
                          </div>
                     </div>
                     {isCombinedView && secondarySensorDetails && displayStats2 && (
                         <div>
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Statistik Riwayat {displayLabel2}:</p>
                              <div className="grid grid-cols-3 gap-4 text-center">
                                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm"> <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Min</p> <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{displayStats2.min}{displayUnit2}</p> </div>
                                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm"> <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Rata-rata</p> <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{displayStats2.avg}{displayUnit2}</p> </div>
                                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm"> <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Max</p> <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{displayStats2.max}{displayUnit2}</p> </div>
                             </div>
                         </div>
                     )}
                 </div>
             </div>
         </motion.div>
     );
 };


// ============================================================
// Komponen Utama (Home / Dashboard)
// ============================================================
const Home: React.FC = () => {
    // --- State ---
    const [sensorData, setSensorData] = useState<SensorData>({ ph: NaN, temperature: NaN, humidity: NaN, voltage: NaN, ldr: false, updatedAt: "--:--" });
    const [phHistory, setPhHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [tempHistory, setTempHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [humidityHistory, setHumidityHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [voltageHistory, setVoltageHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [ldrHistory, setLdrHistory] = useState<HistoricalEntryBoolean[]>([]);
    const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false); // Default ke false, bisa diubah di useEffect
    const [currentTime, setCurrentTime] = useState(new Date());
    const ws = useRef<WebSocket | null>(null);
    const [wsConnected, setWsConnected] = useState<boolean>(false);

    // --- Fungsi Logout ---
    const handleLogout = useCallback(() => {
         console.error("Logging out due to token issue or manual request...");
         // Ganti 'userAuth' dengan nama cookie Anda
         Object.keys(Cookies.get()).forEach((cookieName) => { if (cookieName === 'userAuth') { Cookies.remove(cookieName, { path: '/' }); }});
         // Ganti '/auth/signin' dengan rute login Anda
         window.location.href = "/auth/signin";
    }, []);

    // --- Koneksi WebSocket ---
    const connectWebSocket = useCallback(() => {
         if (!WSS_HOST || !WS_SECRET_KEY) { setError("Konfigurasi WebSocket tidak lengkap."); setInitialLoading(false); setWsConnected(false); return; }
         const token = Cookies.get("userAuth"); // Ganti 'userAuth' dengan nama cookie Anda
         if (!token) { setError("Token otentikasi tidak ditemukan. Login kembali."); setInitialLoading(false); setWsConnected(false); return; }
         if (ws.current && ws.current.readyState !== WebSocket.CLOSED && ws.current.readyState !== WebSocket.CLOSING) { console.log("Closing previous WebSocket..."); ws.current.onclose=null; ws.current.onerror=null; ws.current.onmessage=null; ws.current.onopen=null; ws.current.close(1000, "New connection"); ws.current=null; }
         const wsUrl = `wss://${WSS_HOST}/dataSensor?token=${token}`; console.log(`Attempting WS connection to ${wsUrl}`); setError(null); setInitialLoading(true); setWsConnected(false);
         try {
             const websocket = new WebSocket(wsUrl); ws.current = websocket;
             websocket.onopen = () => { console.log("WS Connected"); if (ws.current === websocket) { setWsConnected(true); setError(null); setInitialLoading(false); } };
             websocket.onmessage = (event) => {
                 if (ws.current !== websocket) return;
                 try {
                     let rawData: any; try { rawData = JSON.parse(event.data as string); } catch (e) { console.error("Invalid JSON:", e, event.data); return; }
                     if (typeof rawData === 'object' && rawData !== null && 'iv' in rawData && 'content' in rawData) {
                         const decryptedData = decryptData(rawData);
                         if (decryptedData) {
                             const latest=decryptedData.latest; const history=decryptedData.history; const newLatest: Partial<SensorData> = {};
                             newLatest.voltage = (typeof latest?.voltage === 'number' && isFinite(latest.voltage)) ? latest.voltage : NaN; newLatest.ph = (typeof latest?.ph === 'number' && isFinite(latest.ph)) ? latest.ph : NaN; newLatest.temperature = (typeof latest?.temperature === 'number' && isFinite(latest.temperature)) ? latest.temperature : NaN; newLatest.humidity = (typeof latest?.humidity === 'number' && isFinite(latest.humidity)) ? latest.humidity : NaN; newLatest.ldr = typeof latest?.ldr === 'boolean' ? latest.ldr : false; newLatest.updatedAt = formatTimeHM(latest?.updatedAt);
                             setSensorData(prev => ({ ...prev, ...newLatest }));
                             const transformHistory = (histData?: { value?: (any | null)[], timestamp?: (string | null)[] } | null, isBoolean: boolean = false): any[] => {
                                 if (!histData || !Array.isArray(histData.value) || !Array.isArray(histData.timestamp) || histData.value.length !== histData.timestamp.length) return [];
                                 return histData.timestamp.map((ts, index) => { const val = histData.value?.[index]; const time = ts; if (typeof time !== 'string' || time.trim() === '') return null; const isValidValue = (isBoolean && typeof val === 'boolean') || (!isBoolean && typeof val === 'number' && isFinite(val)); if (isValidValue) { return { time: time, value: val }; } return null; }).filter((entry): entry is HistoricalEntryNumeric | HistoricalEntryBoolean => entry !== null).slice(-MAX_HISTORY_LENGTH);
                             };
                             setVoltageHistory(transformHistory(history?.voltage) as HistoricalEntryNumeric[]); setPhHistory(transformHistory(history?.ph) as HistoricalEntryNumeric[]); setTempHistory(transformHistory(history?.temperature) as HistoricalEntryNumeric[]); setHumidityHistory(transformHistory(history?.humidity) as HistoricalEntryNumeric[]); setLdrHistory(transformHistory(history?.ldr, true) as HistoricalEntryBoolean[]);
                             if (initialLoading) { setInitialLoading(false); } setError(null);
                         } else { console.warn("Decrypted data is null."); }
                     } else { console.warn("Invalid WS data format:", rawData); }
                 } catch (error) { console.error("Error processing WS message:", error); }
             };
             websocket.onerror = (event) => { console.error("WS Error:", event); };
             websocket.onclose = (event) => { console.log(`WS Disconnected: Code=${event.code}, Clean=${event.wasClean}`); if (ws.current === websocket) { setWsConnected(false); ws.current = null; const failed = !event.wasClean && event.code !== 1000; if (failed && !initialLoading) { setError(`Koneksi sensor terputus (Code: ${event.code}). Coba sambungkan manual.`); } else if (failed && initialLoading) { setError(`Gagal terhubung (Code: ${event.code}). Periksa token/konfig.`); /* if (event.code === 4001) { handleLogout(); } */ } setInitialLoading(false); } else { console.log("Closed event for outdated WS."); } };
         } catch (error) { console.error("Failed to create WS instance:", error); setError("Gagal membuat koneksi WS."); setInitialLoading(false); setWsConnected(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [WSS_HOST, WS_SECRET_KEY, handleLogout]);

    // --- useEffect untuk Setup & Cleanup ---
    useEffect(() => { connectWebSocket(); return () => { if (ws.current) { ws.current.onopen=null; ws.current.onmessage=null; ws.current.onerror=null; ws.current.onclose=null; ws.current.close(1000, "Unmount"); ws.current=null; }}; }, [connectWebSocket]);

    // --- useEffect untuk Waktu ---
    useEffect(() => {

        // Update Waktu Setiap Menit
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []); // Hanya dijalankan sekali saat mount

    // --- Helper Waktu & Greeting ---
    const getGreeting = () => { const hour = currentTime.getHours(); if (hour < 11) return "Selamat Pagi"; if (hour < 15) return "Selamat Siang"; if (hour < 19) return "Selamat Sore"; return "Selamat Malam"; };
    const formatDate = (date: Date) => date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formatTimeDisplay = (date: Date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    // --- Logika Status & Tips (Voltage Sudah Dihapus dari Cek Status) ---
    const { overallStatus, statusColor, advice } = useMemo(() => {
        let statusMessages: string[] = []; let tips: string[] = [];
        let currentStatusColor = "text-green-600 dark:text-green-400";
        const { ph, temperature, humidity, ldr } = sensorData; // Voltage tidak perlu dicek di sini
        const isPhValid = typeof ph === 'number' && isFinite(ph); const isTempValid = typeof temperature === 'number' && isFinite(temperature); const isHumValid = typeof humidity === 'number' && isFinite(humidity);
        const isCoreDataValid = isPhValid && isTempValid && isHumValid;

        if (sensorData.updatedAt === "--:--") return { overallStatus: "Menunggu data sensor...", statusColor: "text-gray-500", advice: "Pastikan perangkat terhubung." };
        if (!isCoreDataValid) return { overallStatus: "Data sensor inti tidak lengkap.", statusColor: "text-yellow-600", advice: "Periksa koneksi sensor pH/Suhu/Kelembaban." };

        const ranges = { ph: { min: 6.0, max: 7.0 }, temperature: { min: 18, max: 28 }, humidity: { min: 45, max: 75 }};

        if (ph < ranges.ph.min) { statusMessages.push("pH rendah"); tips.push("Larutan pH Up."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; } else if (ph > ranges.ph.max) { statusMessages.push("pH tinggi"); tips.push("Larutan pH Down."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; } else tips.push("pH air ideal.");
        if (temperature < ranges.temperature.min) { statusMessages.push("Suhu dingin"); tips.push("Pertimbangkan pemanas."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; } else if (temperature > ranges.temperature.max) { statusMessages.push("Suhu panas"); tips.push("Cek ventilasi."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; } else tips.push("Suhu optimal.");
        if (humidity < ranges.humidity.min) { statusMessages.push("Udara kering"); tips.push("Gunakan humidifier."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; } else if (humidity > ranges.humidity.max) { statusMessages.push("Udara lembab"); tips.push("Tingkatkan ventilasi."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; } else tips.push("Kelembaban baik.");
        if (ldr) tips.push("Cahaya gelap."); else tips.push("Cahaya terang.");

        if (statusMessages.length === 0) return { overallStatus: "Sensor inti (pH, Suhu, Kelembaban) optimal.", statusColor: "text-green-600 dark:text-green-400", advice: tips[Math.floor(Math.random() * tips.length)] || "Jaga kondisi kebun." };
        else {
            const mainStatus = statusMessages[0]; let relevantTip = "Periksa sensor terkait.";
            if (mainStatus.includes("pH")) relevantTip = tips.find(t => t.includes("pH")) || relevantTip;
            else if (mainStatus.includes("Suhu")) relevantTip = tips.find(t => t.includes("Suhu")) || relevantTip;
            else if (mainStatus.includes("lembab") || mainStatus.includes("kering")) relevantTip = tips.find(t => t.includes("lembab") || t.includes("kering")) || relevantTip;
            return { overallStatus: `${mainStatus}${statusMessages.length > 1 ? ` (+${statusMessages.length - 1} lainnya)` : ''}.`, statusColor: currentStatusColor, advice: relevantTip };
         }
    }, [sensorData]);

    // ---- Fungsi Render Sensor Cards ---
    const renderSensorCards = () => {
        const formatValue = (val: number | typeof NaN, unit: string, precision: number = 1) => (typeof val === 'number' && isFinite(val)) ? `${val.toFixed(precision)}${unit}` : 'N/A';
        const ldrStatus = sensorData.ldr ? "Gelap" : "Terang"; const ldrColor = sensorData.ldr ? "text-gray-500 dark:text-gray-300" : "text-yellow-500 dark:text-yellow-400"; const ldrIcon = sensorData.ldr ? <FaMoon /> : <FaSun />;
        const sensorCardData = [
             { id: "ph", icon: <FaTint />, label: "Air pH & Voltage", value: formatValue(sensorData.ph, ' pH'), secondaryValue: formatValue(sensorData.voltage, ' V'), color: "text-blue-500", bgColor: "hover:bg-blue-50 dark:hover:bg-blue-900/30", clickable: true },
             { id: "temperature", icon: <FaThermometerHalf />, label: "Suhu Udara", value: formatValue(sensorData.temperature, '°C'), secondaryValue: null, color: "text-red-500", bgColor: "hover:bg-red-50 dark:hover:bg-red-900/30", clickable: true },
             { id: "humidity", icon: <FaCloudSun />, label: "Kelembaban", value: formatValue(sensorData.humidity, '%'), secondaryValue: null, color: "text-green-500", bgColor: "hover:bg-green-50 dark:hover:bg-green-900/30", clickable: true },
             { id: "ldr", icon: ldrIcon, label: "Intensitas Cahaya", value: ldrStatus, secondaryValue: null, color: ldrColor, bgColor: "hover:bg-yellow-50 dark:hover:bg-gray-700/20", clickable: false },
         ];
        return sensorCardData.map((sensor) => (
            <motion.div key={sensor.id} layoutId={`sensor-card-${sensor.id}`} whileHover={sensor.clickable ? { scale: 1.05, y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" } : {}} whileTap={sensor.clickable ? { scale: 0.98 } : {}} className={`relative flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-md dark:bg-gray-800 transition-all duration-200 ease-out ${sensor.bgColor} dark:shadow-lg ${sensor.clickable ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => { if (sensor.clickable) { setSelectedSensor(sensor.id); } }}>
                 <motion.div className={`text-4xl ${sensor.color} mb-3`}>{sensor.icon}</motion.div>
                 <p className="text-base text-gray-500 dark:text-gray-400 font-medium mb-1 text-center">{sensor.label}</p>
                 <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{sensor.value}</p>
                 {sensor.secondaryValue && ( <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sensor.secondaryValue}</p> )}
                 {(selectedSensor === sensor.id || (selectedSensor === 'ph' && sensor.id === 'ph')) && <FaEye className="text-indigo-500 absolute top-2 right-2" aria-hidden="true" />}
             </motion.div>
         ));
    }

    // === JSX Render Komponen Home ===
    return (
        <div className="min-h-screen flex flex-col items-center pt-8 md:pt-10 pb-10 from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-850 dark:to-black">

            <div className="w-full flex-grow flex items-start justify-center px-2 pt-4 md:pt-6">
                <AnimatePresence mode="wait">
                    {initialLoading && sensorData.updatedAt === "--:--" && !error ? (
                        <motion.div key="loading-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 mt-24">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 border-solid mb-4"></div>
                            <p className="text-lg font-medium">Menyambungkan ke server...</p>
                        </motion.div>
                    ) : error && !wsConnected && sensorData.updatedAt === "--:--" ? (
                         <motion.div key="error-state" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-md p-6 bg-red-100 dark:bg-red-800/30 border border-red-300 dark:border-red-700 rounded-lg text-center mt-16">
                              <div className="flex items-center justify-center space-x-2 mb-3"><FaExclamationTriangle className="text-red-600 dark:text-red-400 text-xl" /><p className="font-semibold text-red-700 dark:text-red-300 text-lg">Oops! Gagal Terhubung</p></div>
                              <p className="text-red-600 dark:text-red-400 mb-4 text-sm">{error}</p>
                              {!error.toLowerCase().includes("konfigurasi") && !error.toLowerCase().includes("token") && (<button onClick={connectWebSocket} className="text-sm text-blue-600 hover:underline dark:text-blue-400 disabled:text-gray-400 disabled:no-underline" disabled={initialLoading}>Coba Sambungkan Lagi</button>)}
                               {error.toLowerCase().includes("token") && (<a href="/auth/signin" className="text-sm text-blue-600 hover:underline dark:text-blue-400 ml-2">Pergi ke Halaman Login</a>)}
                          </motion.div>
                    ) : selectedSensor === "ph" ? ( // Tampilkan Detail Gabungan pH + Voltage
                          <SensorDetailView key="ph-voltage-detail" sensorId="ph" currentPhValue={sensorData.ph} phHistoricalData={phHistory} currentVoltageValue={sensorData.voltage} voltageHistoricalData={voltageHistory} onBack={() => setSelectedSensor(null)} isDarkMode={isDarkMode} />
                    ) : selectedSensor && selectedSensor !== "ldr" ? ( // Tampilkan Detail Sensor Tunggal (Temp/Humidity)
                          <SensorDetailView key={selectedSensor} sensorId={selectedSensor} currentValue={sensorData[selectedSensor as keyof Pick<SensorData, 'temperature' | 'humidity'>]} historicalData={selectedSensor === 'temperature' ? tempHistory : humidityHistory} onBack={() => setSelectedSensor(null)} isDarkMode={isDarkMode} />
                    ) : ( // Tampilkan Dashboard Utama
                          <motion.div key="dashboard-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-5xl px-2">
                              {/* Header */}
                              <div className="mb-6 md:mb-8 text-center md:text-left">
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-1">
                                      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100"> {getGreeting()}! 👋 </h1>
                                      <div className={`mt-1 md:mt-0 flex items-center justify-center md:justify-end text-xs font-medium transition-colors duration-300 ${ wsConnected ? 'text-green-600 dark:text-green-400' : (initialLoading ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400') }`} title={wsConnected ? 'Realtime aktif' : (initialLoading ? 'Menyambungkan...' : (error ? error : 'Koneksi terputus'))}>
                                          {wsConnected ? <FaLink className="mr-1.5"/> : (initialLoading ? <FaSpinner className="mr-1.5 animate-spin"/> : <FaUnlink className="mr-1.5"/>)} {wsConnected ? 'Realtime Aktif' : (initialLoading ? 'Menyambungkan...' : 'Koneksi Terputus')}
                                      </div>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-center md:justify-start text-sm text-gray-500 dark:text-gray-400 gap-x-3 gap-y-1">
                                      <div className="flex items-center"><FaRegCalendarAlt className="mr-1.5"/><span>{formatDate(currentTime)}</span></div>
                                      <div className="flex items-center"><FaRegClock className="mr-1.5"/><span>{formatTimeDisplay(currentTime)}</span></div>
                                      {sensorData.updatedAt && sensorData.updatedAt !== "--:--" && <div className="flex items-center" title="Waktu update data terakhir"><FaInfoCircle className="mr-1.5"/><span>Update: {sensorData.updatedAt} WIB</span></div>}
                                  </div>
                              </div>
                              {/* Status & Tips */}
                              <div className="mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-blue-500 dark:border-blue-400"><h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center"><FaInfoCircle className="mr-2 text-blue-500 dark:text-blue-400"/> Ringkasan Status Kebun</h3><p className={`text-sm ${statusColor}`}>{overallStatus}</p></motion.div>
                                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-yellow-500 dark:border-yellow-400"><h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center"><FaLightbulb className="mr-2 text-yellow-500 dark:text-yellow-400"/> Tips Hari Ini</h3><p className="text-sm text-gray-600 dark:text-gray-300">{advice}</p></motion.div>
                              </div>
                              {/* Sensor Readings */}
                              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4"> Pembacaan Sensor </h2>
                              {error && !wsConnected && sensorData.updatedAt !== "--:--" && !error.toLowerCase().includes("konfigurasi") && !error.toLowerCase().includes("token") && ( <div className="mb-4 flex items-center justify-center space-x-2 rounded-lg border border-red-300 bg-red-50 p-3 text-center dark:border-red-700 dark:bg-red-900/40"> <FaExclamationTriangle className="text-red-600 dark:text-red-400" /> <p className="text-xs text-red-700 dark:text-red-300">{error}</p> <button onClick={connectWebSocket} className="ml-3 text-xs text-blue-600 hover:underline dark:text-blue-400 disabled:text-gray-400 disabled:no-underline" disabled={initialLoading}> Coba Lagi </button> </div> )}
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"> {renderSensorCards()} </div>
                          </motion.div>
                     )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Home;