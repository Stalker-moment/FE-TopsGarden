// Nama file: src/components/SmartGardenDashboard.tsx
// Kode Lengkap Final (per 4 April 2025) - Reconnect Otomatis Dihapus, Layout Diperbaiki
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
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const WS_SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET_KEY; // Hati-hati ekspos key di client-side

if (!HTTPSAPIURL) { console.error("CRITICAL: NEXT_PUBLIC_HTTPS_API_URL is not defined."); }
if (!WS_SECRET_KEY) { console.error("CRITICAL: NEXT_PUBLIC_WS_SECRET_KEY is not defined."); }

const WSS_HOST = HTTPSAPIURL || '';

// --- Tipe Data ---
type HistoricalEntryNumeric = { time: string; value: number };
type HistoricalEntryBoolean = { time: string; value: boolean };

// Tipe data untuk state internal komponen
interface SensorData {
    ph: number | typeof NaN;
    temperature: number | typeof NaN;
    humidity: number | typeof NaN;
    voltage: number | typeof NaN;
    ldr: boolean;
    updatedAt: string; // Hasil format HH:mm
}

// Tipe data mentah yang diharapkan dari WebSocket setelah dekripsi
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

// --- Konstanta & Helper Global ---
const MAX_HISTORY_LENGTH = 30;

// Fungsi format waktu HH:mm dari string (ISO, HH:mm:ss, atau HH:mm) ke zona WIB
const formatTimeHM = (timeString: string | null | undefined): string => {
    if (!timeString) return "--:--";
    try {
        let date: Date;
        // Prioritaskan parsing ISO jika formatnya cocok
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timeString)) {
            date = new Date(timeString.endsWith('Z') ? timeString : timeString + 'Z'); // Tambah Z jika belum ada
        } else {
            // Coba parsing HH:mm:ss atau HH:mm secara langsung
             if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) return timeString.substring(0, 5); // Ambil HH:mm
             if (/^\d{2}:\d{2}$/.test(timeString)) return timeString; // Sudah HH:mm

            // Fallback: coba buat objek Date (mungkin tidak akurat jika hanya HH:mm:ss tanpa tanggal)
             console.warn(`Attempting fallback date parse for time: ${timeString}`);
            date = new Date(`1970-01-01T${timeString}Z`); // Anggap UTC
        }

        if (isNaN(date.getTime())) {
            console.warn(`Invalid time format, cannot parse: ${timeString}`);
            return "--:--";
        }
        // Format ke HH:mm dalam zona waktu WIB
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    } catch (e) {
        console.error(`Error formatting time ${timeString}:`, e);
        return "--:--";
    }
};

// Fungsi format tanggal dan waktu lengkap ke zona WIB
const formatDateTime = (dateTimeString: string | null | undefined): string => {
    if (!dateTimeString) return "N/A";
    try {
        // Asumsikan string adalah ISO 8601 atau format yang bisa diparse oleh new Date()
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return "Invalid Date";
        // Format ke tanggal dan waktu lokal WIB
        return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
    } catch (e) {
        console.error("Error formatting date:", e);
        return "Invalid Date Format";
    }
};

// --- Fungsi Dekripsi (Global/Utility) ---
const decryptData = (encryptedData: { iv: string; content: string }): DecryptedSensorData | null => {
    if (!WS_SECRET_KEY) {
        console.error("Decryption key (NEXT_PUBLIC_WS_SECRET_KEY) is missing.");
        return null;
    }
    try {
        const { iv, content } = encryptedData;
        // Validasi format hex sederhana (IV=16 bytes=32 hex, content=hex non-empty)
        if (!/^[0-9a-fA-F]{32}$/.test(iv)) { console.error("Invalid IV format (must be 32 hex chars)."); return null; }
        if (typeof content !== 'string' || content.length === 0 || !/^[0-9a-fA-F]+$/.test(content)) { console.error("Invalid content format (must be non-empty hex string)."); return null; }

        const ivWordArray = CryptoJS.enc.Hex.parse(iv);
        const encryptedHexToBase64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(content));
        const key = CryptoJS.enc.Utf8.parse(WS_SECRET_KEY); // Asumsi kunci adalah UTF8

        const decrypted = CryptoJS.AES.decrypt(encryptedHexToBase64, key, {
            iv: ivWordArray,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedStr) {
            // String kosong bisa jadi hasil dekripsi valid jika data asli memang kosong
            console.warn("Decryption resulted in empty string.");
            return {}; // Return objek kosong jika dekripsi berhasil tapi string kosong
        }

        const parsedData = JSON.parse(decryptedStr);

        if (typeof parsedData === 'object' && parsedData !== null) {
            return parsedData as DecryptedSensorData;
        } else {
            console.error("Decrypted data is not a valid object after JSON parse.");
            return null;
        }
    } catch (error) {
        console.error("Decryption or JSON parsing failed:", error);
        return null;
    }
};

// ============================================================
// Komponen untuk Detail Sensor (Menggunakan ApexCharts)
// ============================================================
const SensorDetailView: React.FC<{
     sensorId: string; currentValue: number | typeof NaN; historicalData: HistoricalEntryNumeric[]; onBack: () => void; isDarkMode: boolean;
}> = ({ sensorId, currentValue, historicalData, onBack, isDarkMode }) => {

    const { label, unit, icon, tailwindColor, hexColor, optimalRange, description } = useMemo(() => {
        switch (sensorId) {
            case "ph": return { label: "Water pH", unit: "pH", icon: <FaTint />, tailwindColor: "text-blue-500", hexColor: '#3b82f6', optimalRange: { min: 6.0, max: 7.0 }, description: "Mengukur keasaman atau kebasaan air." };
            case "voltage": return { label: "Sensor Voltage", unit: "V", icon: <FaBolt />, tailwindColor: "text-orange-500", hexColor: '#f97316', optimalRange: { min: 3.0, max: 5.0 }, description: "Mengukur tegangan suplai sensor." };
            case "temperature": return { label: "Temperature", unit: "°C", icon: <FaThermometerHalf />, tailwindColor: "text-red-500", hexColor: '#ef4444', optimalRange: { min: 18, max: 28 }, description: "Suhu udara di sekitar tanaman." };
            case "humidity": return { label: "Humidity", unit: "%", icon: <FaCloudSun />, tailwindColor: "text-green-500", hexColor: '#22c55e', optimalRange: { min: 45, max: 75 }, description: "Jumlah uap air di udara." };
            default: return { label: "Unknown Sensor", unit: "", icon: <FaInfoCircle/>, tailwindColor: "text-gray-500", hexColor: '#6b7280', optimalRange: null, description: "Data sensor tidak dikenal." };
        }
    }, [sensorId]);

    const { min, max, avg, status } = useMemo(() => {
        const values = historicalData.map(d => d.value).filter((v): v is number => typeof v === 'number' && isFinite(v));
        if (values.length === 0) return { min: 'N/A', max: 'N/A', avg: 'N/A', status: 'Unknown' };

        const minVal = Math.min(...values).toFixed(1);
        const maxVal = Math.max(...values).toFixed(1);
        const avgVal = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);

        let currentStatus = "Optimal";
        const currentNumericValue = typeof currentValue === 'number' && isFinite(currentValue) ? currentValue : null;

        if (optimalRange && currentNumericValue !== null) {
            if (currentNumericValue < optimalRange.min) currentStatus = "Low";
            else if (currentNumericValue > optimalRange.max) currentStatus = "High";
        } else if (!optimalRange) {
             currentStatus = "N/A";
        } else {
            currentStatus = "Unknown";
        }
        return { min: `${minVal}${unit}`, max: `${maxVal}${unit}`, avg: `${avgVal}${unit}`, status: currentStatus };
    }, [historicalData, currentValue, unit, optimalRange]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Low": return "text-yellow-500 dark:text-yellow-400";
            case "High": return "text-red-500 dark:text-red-400";
            case "Optimal": return "text-green-500 dark:text-green-400";
            default: return "text-gray-500 dark:text-gray-400";
        }
    };

    const categories = useMemo(() => historicalData.map(d => d.time), [historicalData]); // Time sudah HH:mm

    const chartOptions: ApexOptions = useMemo(() => ({
         chart: { height: '100%', type: 'line', animations: { enabled: true, easing: 'easeinout', dynamicAnimation: { speed: 600 } }, toolbar: { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: true } }, background: 'transparent' },
         colors: [hexColor], dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 2.5 },
         grid: { borderColor: isDarkMode ? '#4b5563' : '#e5e7eb', row: { colors: ['transparent', 'transparent'], opacity: 0.5 } },
         xaxis: {
              type: 'category', categories: categories, tickPlacement: 'on',
              labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '11px' }, trim: false, hideOverlappingLabels: true, rotate: 0, datetimeUTC: false },
              axisBorder: { show: false }, axisTicks: { show: true }, tooltip: { enabled: false }
         },
         yaxis: {
              title: { text: `Value (${unit})`, style: { color: isDarkMode ? '#9ca3af' : '#6b7280', fontWeight: 500, fontSize: '12px' } },
              labels: { style: { colors: isDarkMode ? '#9ca3af' : '#6b7280', fontSize: '12px' }, formatter: (value) => typeof value === 'number' ? `${value.toFixed(1)}` : '' },
             min: (minDefault) => {
                const vals = historicalData.map(d=>d.value).filter((v): v is number => typeof v==='number' && isFinite(v));
                const dataMin = vals.length > 0 ? Math.min(...vals) : (optimalRange?.min ?? 0);
                return Math.floor(Math.min(dataMin, optimalRange?.min ?? dataMin)) - 1;
             },
             max: (maxDefault) => {
                const vals = historicalData.map(d=>d.value).filter((v): v is number => typeof v==='number' && isFinite(v));
                const dataMax = vals.length > 0 ? Math.max(...vals) : (optimalRange?.max ?? 10);
                return Math.ceil(Math.max(dataMax, optimalRange?.max ?? dataMax)) + 1;
            }
         },
         tooltip: { theme: isDarkMode ? "dark" : "light", x: { formatter: (val, opts) => `Time: ${opts?.w?.config?.xaxis?.categories?.[opts?.dataPointIndex ?? 0] || val}` }, y: { formatter: (value) => typeof value === 'number' ? `${value.toFixed(1)} ${unit}` : 'N/A', title: { formatter: (seriesName) => label } } },
         fill: { type: "gradient", gradient: { shade: isDarkMode ? "dark" : "light", type: "vertical", shadeIntensity: 0.5, gradientToColors: undefined, inverseColors: false, opacityFrom: 0.6, opacityTo: 0.1, stops: [0, 100] } },
         markers: { size: 3, hover: { size: 5 }, strokeWidth: 0 }
    }), [categories, hexColor, unit, label, isDarkMode, historicalData, optimalRange]);

    const chartSeries = useMemo(() => {
        const seriesData = historicalData.map(d => ({
            x: d.time,
            y: (d.value !== undefined && d.value !== null && isFinite(d.value)) ? parseFloat(d.value.toFixed(1)) : null
        }));
        return [{ name: label, data: seriesData }];
    }, [historicalData, label]);

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
                <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                    <div>
                        <h3 className={`text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center ${tailwindColor}`}>
                            <span className="mr-3">{icon}</span> Detail {label}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{description}</p>
                    </div>
                    <div className="mt-4 md:mt-0 text-left md:text-right">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Nilai Saat Ini</p>
                        <p className="text-4xl font-semibold text-gray-900 dark:text-gray-100">
                           {typeof currentValue === 'number' && isFinite(currentValue) ? `${currentValue.toFixed(1)}${unit}` : 'N/A'}
                        </p>
                        <p className={`text-lg font-medium ${getStatusColor(status)} mt-1`}>
                           Status: {status} {optimalRange ? `(Ideal: ${optimalRange.min}-${optimalRange.max}${unit})` : ''}
                        </p>
                    </div>
                </div>
                <div className="mb-6 h-72 md:h-80 relative">
                    {historicalData.length > 1 && typeof window !== 'undefined' ? (
                        <Chart
                            key={`chart-${sensorId}-${historicalData.length}-${isDarkMode}`}
                            options={chartOptions}
                            series={chartSeries}
                            type="line"
                            height="100%"
                            width="100%"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            {historicalData.length === 0 ? "Menunggu data historis..." : "Membutuhkan >1 data point untuk menampilkan chart."}
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm"> <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Min (Riwayat)</p> <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">{min}</p> </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm"> <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Rata-rata (Riwayat)</p> <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">{avg}</p> </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm"> <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Max (Riwayat)</p> <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">{max}</p> </div>
                </div>
            </div>
        </motion.div>
    );
};


// ============================================================
// Komponen Utama (Home / Dashboard)
// ============================================================
const Home: React.FC = () => {
    // --- State Sensor ---
    const [sensorData, setSensorData] = useState<SensorData>({ ph: NaN, temperature: NaN, humidity: NaN, voltage: NaN, ldr: false, updatedAt: "--:--" });
    // --- State History ---
    const [phHistory, setPhHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [tempHistory, setTempHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [humidityHistory, setHumidityHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [voltageHistory, setVoltageHistory] = useState<HistoricalEntryNumeric[]>([]);
    const [ldrHistory, setLdrHistory] = useState<HistoricalEntryBoolean[]>([]);
    // --- State UI & WebSocket ---
    const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const ws = useRef<WebSocket | null>(null);
    const [wsConnected, setWsConnected] = useState<boolean>(false);

    // --- Fungsi Notifikasi & Logout ---
    const showNotification = (message: string, type: "success" | "error") => { console.log(`[${type.toUpperCase()}] ${message}`); setError(message); };
    const handleLogout = useCallback(() => {
        console.error("Logging out due to token issue or manual request...");
        Object.keys(Cookies.get()).forEach((cookieName) => { if (cookieName === 'userAuth') { Cookies.remove(cookieName, { path: '/' }); }});
        window.location.href = "/auth/signin"; // Ganti dengan rute login Anda
    }, []);

    // --- Logika Koneksi WebSocket untuk Sensor (Tanpa Reconnect Otomatis) ---
    const connectWebSocket = useCallback(() => {
        if (!WSS_HOST || !WS_SECRET_KEY) {
            setError("Konfigurasi WebSocket tidak lengkap (URL/Key).");
            setInitialLoading(false); setWsConnected(false); return;
        }
        const token = Cookies.get("userAuth");
        if (!token) {
            setError("Token otentikasi tidak ditemukan. Silakan login kembali.");
            setInitialLoading(false); setWsConnected(false);
            // Anda mungkin ingin logout otomatis jika token tidak ada
            // handleLogout();
            return;
        }

        // Tutup koneksi lama jika ada dan belum ditutup
        if (ws.current && ws.current.readyState !== WebSocket.CLOSED && ws.current.readyState !== WebSocket.CLOSING) {
            console.log("Closing previous WebSocket connection...");
            ws.current.onclose = null; ws.current.onerror = null; ws.current.onmessage = null; ws.current.onopen = null;
            ws.current.close(1000, "Initiating new connection");
            ws.current = null;
        }

        const wsUrl = `wss://${WSS_HOST}/dataSensor?token=${token}`;
        console.log(`Attempting Sensor WebSocket connection to ${wsUrl}`);
        setError(null);
        setInitialLoading(true); // Set loading true untuk percobaan koneksi ini
        setWsConnected(false);

        try {
            const websocket = new WebSocket(wsUrl);
            ws.current = websocket; // Simpan referensi koneksi saat ini

            websocket.onopen = () => {
                console.log("Sensor WebSocket Connected");
                if (ws.current === websocket) { // Pastikan ini masih koneksi yang relevan
                     setWsConnected(true);
                     setError(null);
                     setInitialLoading(false);
                 }
            };

            websocket.onmessage = (event) => {
                 // Pastikan ini masih koneksi yang relevan sebelum update state
                if (ws.current !== websocket) return;

                 try {
                    let rawData: any;
                    try { rawData = JSON.parse(event.data as string); } catch (e) { console.error("Invalid JSON received:", e, event.data); return; }

                    if (typeof rawData === 'object' && rawData !== null && 'iv' in rawData && 'content' in rawData) {
                        const decryptedData = decryptData(rawData);
                        if (decryptedData) {
                            const latest = decryptedData.latest;
                            const history = decryptedData.history;
                            const newLatest: Partial<SensorData> = {};
                             newLatest.voltage = (typeof latest?.voltage === 'number' && isFinite(latest.voltage)) ? latest.voltage : NaN;
                             newLatest.ph = (typeof latest?.ph === 'number' && isFinite(latest.ph)) ? latest.ph : NaN;
                             newLatest.temperature = (typeof latest?.temperature === 'number' && isFinite(latest.temperature)) ? latest.temperature : NaN;
                             newLatest.humidity = (typeof latest?.humidity === 'number' && isFinite(latest.humidity)) ? latest.humidity : NaN;
                             newLatest.ldr = typeof latest?.ldr === 'boolean' ? latest.ldr : false;
                             newLatest.updatedAt = formatTimeHM(latest?.updatedAt); // Format waktu di sini
                            setSensorData(prev => ({ ...prev, ...newLatest }));

                            const transformHistory = (histData?: { value?: (any | null)[], timestamp?: (string | null)[] } | null, isBoolean: boolean = false): any[] => {
                                if (!histData || !Array.isArray(histData.value) || !Array.isArray(histData.timestamp) || histData.value.length !== histData.timestamp.length) return [];
                                return histData.timestamp
                                    .map((ts, index) => {
                                        const val = histData.value?.[index]; const time = formatTimeHM(ts); if (time === "--:--") return null;
                                        const isValid = (isBoolean && typeof val === 'boolean') || (!isBoolean && typeof val === 'number' && isFinite(val));
                                        if (isValid) { return { time, value: val }; } return null;
                                    })
                                    .filter((entry): entry is HistoricalEntryNumeric | HistoricalEntryBoolean => entry !== null)
                                    .slice(-MAX_HISTORY_LENGTH);
                            };
                            setVoltageHistory(transformHistory(history?.voltage) as HistoricalEntryNumeric[]);
                            setPhHistory(transformHistory(history?.ph) as HistoricalEntryNumeric[]);
                            setTempHistory(transformHistory(history?.temperature) as HistoricalEntryNumeric[]);
                            setHumidityHistory(transformHistory(history?.humidity) as HistoricalEntryNumeric[]);
                            setLdrHistory(transformHistory(history?.ldr, true) as HistoricalEntryBoolean[]);

                            if (initialLoading) { setInitialLoading(false); }
                            setError(null); // Hapus error jika data masuk
                        } else { console.warn("Decrypted data is null."); }
                    } else { console.warn("Invalid WebSocket data format (missing iv/content):", rawData); }
                } catch (error) { console.error("Error processing WebSocket message:", error); }
            };

            websocket.onerror = (event) => {
                console.error("Sensor WebSocket Error Event:", event);
                 // Tidak set state error di sini, biarkan onclose yang menentukan status akhir
            };

            websocket.onclose = (event) => {
                console.log(`Sensor WebSocket Disconnected: Code=${event.code}, Reason=${event.reason}, Clean=${event.wasClean}`);
                // Hanya proses jika ini adalah koneksi yang ditutup saat ini
                if (ws.current === websocket) {
                    setWsConnected(false);
                    ws.current = null; // Hapus referensi setelah ditutup
                    const connectionFailed = !event.wasClean && event.code !== 1000;

                    if (connectionFailed && !initialLoading) { // Gagal setelah pernah terkoneksi
                         setError(`Koneksi sensor terputus (Code: ${event.code}). Coba sambungkan manual.`);
                    } else if (connectionFailed && initialLoading) { // Gagal saat koneksi pertama
                         setError(`Gagal terhubung ke server (Code: ${event.code}). Periksa token/konfigurasi.`);
                         // Contoh: jika kode 4001 = token tidak valid
                         // if (event.code === 4001) { handleLogout(); }
                    }
                    // Jika koneksi ditutup (sukses atau gagal), loading selesai
                    setInitialLoading(false);
                } else {
                    // Ini adalah penutupan koneksi lama yang mungkin sudah diganti
                     console.log("Closed event received for an outdated WebSocket connection.");
                 }
            };
        } catch (error) {
            console.error("Failed to create WebSocket instance:", error);
            setError("Gagal membuat koneksi WebSocket. Periksa URL atau jaringan.");
            setInitialLoading(false);
            setWsConnected(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [WSS_HOST, WS_SECRET_KEY, handleLogout]); // Hapus initialLoading dari dependensi


    // --- useEffect untuk setup dan cleanup koneksi ---
    useEffect(() => {
        connectWebSocket(); // Panggil saat komponen dimuat

        // Fungsi cleanup saat komponen dibongkar (unmount)
        return () => {
            if (ws.current) {
                console.log("Closing WebSocket connection on component unmount...");
                // Penting: Hapus listener sebelum menutup untuk mencegah state update pada komponen yg sudah unmount
                ws.current.onopen = null;
                ws.current.onmessage = null;
                ws.current.onerror = null;
                ws.current.onclose = null;
                ws.current.close(1000, "Component unmounting"); // Tutup dengan kode normal
                ws.current = null;
            }
        };
    }, [connectWebSocket]); // Bergantung pada connectWebSocket yang sudah di-memoize

    // --- Fungsi Tema & Waktu ---
    // useEffect(() => { // Inisialisasi Tema
    //     const storedTheme = localStorage.getItem('color-theme');
    //     const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    //     const initialTheme = storedTheme === "dark" || (!storedTheme && prefersDark) ? "dark" : "light";
    //     setIsDarkMode(initialTheme === "dark");
    //     document.documentElement.classList.toggle("dark", initialTheme === "dark");
    // }, []);

    const toggleTheme = useCallback(() => { // Toggle Tema
        const newTheme = !isDarkMode ? "dark" : "light";
        setIsDarkMode(!isDarkMode);
        localStorage.setItem('color-theme', newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
    }, [isDarkMode]);

    useEffect(() => { // Update Waktu Setiap Menit
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // --- Helper Functions Internal Komponen Home ---
    const getCurrentHistoricalData = useCallback((): HistoricalEntryNumeric[] => {
        if (selectedSensor === "ph") return phHistory;
        if (selectedSensor === "temperature") return tempHistory;
        if (selectedSensor === "humidity") return humidityHistory;
        if (selectedSensor === "voltage") return voltageHistory;
        return [];
    }, [selectedSensor, phHistory, tempHistory, humidityHistory, voltageHistory]);

    const getCurrentSensorValue = useCallback((): number | typeof NaN => {
         if (!selectedSensor || selectedSensor === 'ldr') return NaN;
         const validKeys: (keyof Omit<SensorData, 'ldr' | 'updatedAt'>)[] = ['ph', 'temperature', 'humidity', 'voltage'];
         if (validKeys.includes(selectedSensor as any)) {
             const value = sensorData[selectedSensor as keyof Omit<SensorData, 'ldr' | 'updatedAt'>];
            return typeof value === 'number' && isFinite(value) ? value : NaN;
         }
         return NaN;
    }, [selectedSensor, sensorData]);

    const getGreeting = () => {
         const hour = currentTime.getHours();
         if (hour < 11) return "Selamat Pagi";
         if (hour < 15) return "Selamat Siang";
         if (hour < 19) return "Selamat Sore";
         return "Selamat Malam";
     };
    const formatDate = (date: Date) => date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formatTimeDisplay = (date: Date) => date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });


    // --- Logika Status & Tips ---
    const { overallStatus, statusColor, advice } = useMemo(() => {
        let statusMessages: string[] = [];
        let tips: string[] = [];
        let currentStatusColor = "text-green-600 dark:text-green-400";
        const { ph, temperature, humidity, voltage, ldr } = sensorData;

        const isPhValid = typeof ph === 'number' && isFinite(ph);
        const isTempValid = typeof temperature === 'number' && isFinite(temperature);
        const isHumValid = typeof humidity === 'number' && isFinite(humidity);
        const isVoltValid = typeof voltage === 'number' && isFinite(voltage);
        const isDataValid = isPhValid && isTempValid && isHumValid && isVoltValid;

        if (sensorData.updatedAt === "--:--:") {
             return { overallStatus: "Menunggu data sensor awal...", statusColor: "text-gray-500 dark:text-gray-400", advice: "Pastikan perangkat terhubung." };
         }
        if (!isDataValid) {
             return { overallStatus: "Data sensor tidak lengkap/valid.", statusColor: "text-yellow-600 dark:text-yellow-400", advice: "Beberapa nilai sensor mungkin hilang." };
        }

        const ranges = {
            ph: { min: 6.0, max: 7.0 }, temperature: { min: 18, max: 28 },
            humidity: { min: 45, max: 75 }, voltage: { min: 3.0, max: 5.0 },
        };

        if (ph < ranges.ph.min) { statusMessages.push("pH air rendah"); tips.push("Tambahkan larutan pH Up."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; }
        else if (ph > ranges.ph.max) { statusMessages.push("pH air tinggi"); tips.push("Tambahkan larutan pH Down."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; }
        else { tips.push("Kondisi pH air ideal."); }

        if (voltage < ranges.voltage.min) { statusMessages.push("Voltage sensor rendah"); tips.push("Periksa sumber daya sensor."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; }
        else if (voltage > ranges.voltage.max) { statusMessages.push("Voltage sensor tinggi"); tips.push("Periksa regulator tegangan."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; }
        else { tips.push("Voltage sensor stabil."); }

        if (temperature < ranges.temperature.min) { statusMessages.push("Suhu dingin"); tips.push("Pertimbangkan pemanas jika perlu."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; }
        else if (temperature > ranges.temperature.max) { statusMessages.push("Suhu panas"); tips.push("Pastikan ventilasi baik."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; }
        else { tips.push("Suhu udara optimal."); }

        if (humidity < ranges.humidity.min) { statusMessages.push("Udara kering"); tips.push("Gunakan humidifier jika perlu."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; }
        else if (humidity > ranges.humidity.max) { statusMessages.push("Udara terlalu lembab"); tips.push("Tingkatkan ventilasi udara."); currentStatusColor = "text-yellow-600 dark:text-yellow-400"; }
        else { tips.push("Kelembaban udara baik."); }

        if (ldr === true) { tips.push("Kondisi pencahayaan gelap terdeteksi."); }
        else { tips.push("Kondisi pencahayaan terang terdeteksi."); }

        if (statusMessages.length === 0) {
            return { overallStatus: "Semua sensor dalam kondisi optimal.", statusColor: "text-green-600 dark:text-green-400", advice: tips[Math.floor(Math.random() * tips.length)] || "Jaga kondisi kebun tetap baik." };
        } else {
             const mainStatus = statusMessages[0];
             let relevantTip = "Periksa kondisi sensor terkait.";
             if (mainStatus.includes("pH")) relevantTip = tips.find(t => t.includes("pH")) || relevantTip;
             else if (mainStatus.includes("Voltage")) relevantTip = tips.find(t => t.includes("Voltage")) || relevantTip;
             else if (mainStatus.includes("Suhu")) relevantTip = tips.find(t => t.includes("Suhu") || t.includes("panas") || t.includes("dingin")) || relevantTip;
             else if (mainStatus.includes("lembab") || mainStatus.includes("kering")) relevantTip = tips.find(t => t.includes("lembab") || t.includes("kering") || t.includes("ventilasi")) || relevantTip;
             else if (mainStatus.includes("cahaya")) relevantTip = tips.find(t => t.includes("cahaya")) || relevantTip;
            return { overallStatus: `${mainStatus}${statusMessages.length > 1 ? ` (${statusMessages.length - 1} lainnya butuh perhatian)` : ''}.`, statusColor: currentStatusColor, advice: relevantTip };
        }
    }, [sensorData]);


    // ---- Fungsi Render Sensor Cards ----
    const renderSensorCards = () => {
        const formatValue = (val: number | typeof NaN, unit: string, precision: number = 1) =>
            (typeof val === 'number' && isFinite(val)) ? `${val.toFixed(precision)}${unit}` : 'N/A';

        const ldrStatus = sensorData.ldr ? "Gelap" : "Terang";
        const ldrColor = sensorData.ldr ? "text-gray-500 dark:text-gray-300" : "text-yellow-500 dark:text-yellow-400";
        const ldrIcon = sensorData.ldr ? <FaMoon /> : <FaSun />;

        const sensorCardData = [
             { id: "ph", icon: <FaTint />, label: "Air pH & Voltage", value: formatValue(sensorData.ph, ' pH'), secondaryValue: formatValue(sensorData.voltage, ' V'), color: "text-blue-500", bgColor: "hover:bg-blue-50 dark:hover:bg-blue-900/30", clickable: true },
             { id: "temperature", icon: <FaThermometerHalf />, label: "Suhu Udara", value: formatValue(sensorData.temperature, '°C'), secondaryValue: null, color: "text-red-500", bgColor: "hover:bg-red-50 dark:hover:bg-red-900/30", clickable: true },
             { id: "humidity", icon: <FaCloudSun />, label: "Kelembaban", value: formatValue(sensorData.humidity, '%'), secondaryValue: null, color: "text-green-500", bgColor: "hover:bg-green-50 dark:hover:bg-green-900/30", clickable: true },
             { id: "ldr", icon: ldrIcon, label: "Intensitas Cahaya", value: ldrStatus, secondaryValue: null, color: ldrColor, bgColor: "hover:bg-yellow-50 dark:hover:bg-gray-700/20", clickable: false },
        ];

        return sensorCardData.map((sensor) => (
            <motion.div
                key={sensor.id}
                layoutId={`sensor-card-${sensor.id}`}
                whileHover={sensor.clickable ? { scale: 1.05, y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" } : {}}
                whileTap={sensor.clickable ? { scale: 0.98 } : {}}
                className={`relative flex flex-col items-center justify-center rounded-xl bg-white p-5 shadow-md dark:bg-gray-800 transition-all duration-200 ease-out ${sensor.bgColor} dark:shadow-lg ${sensor.clickable ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => { if (sensor.clickable) { setSelectedSensor(sensor.id); } }}
            >
                <motion.div className={`text-4xl ${sensor.color} mb-3`}>{sensor.icon}</motion.div>
                <p className="text-base text-gray-500 dark:text-gray-400 font-medium mb-1 text-center">{sensor.label}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{sensor.value}</p>
                {sensor.secondaryValue && ( <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sensor.secondaryValue}</p> )}
                {selectedSensor === sensor.id && <FaEye className="text-indigo-500 absolute top-2 right-2" aria-hidden="true" />}
            </motion.div>
        ));
    }


    // ====================================
    // === JSX Render Komponen Home/Dashboard ===
    // ====================================
    return (
        <div className="from-blue-50 via-white to-green-50 min-h-screen dark:from-gray-900 dark:via-gray-850 dark:to-black flex flex-col items-center pt-8 md:pt-10 pb-10">

             {/* Tombol Toggle Tema
              <div className="w-full max-w-5xl px-4 flex justify-end mb-[-24px] md:mb-[-30px] relative z-20">
                  <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 shadow backdrop-blur-sm" aria-label="Toggle theme" title="Ganti Tema">
                      {isDarkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
                  </button>
              </div> */}

            {/* Container Utama Konten (Rata Atas, Tengah Horizontal) */}
            <div className="w-full flex-grow flex items-start justify-center px-2 pt-4 md:pt-6">
                <AnimatePresence mode="wait">
                    {/* State Loading Awal */}
                    {initialLoading && sensorData.updatedAt === "--:--" && !error ? (
                        <motion.div key="loading-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 mt-24">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 border-solid mb-4"></div>
                            <p className="text-lg font-medium">Menyambungkan ke server...</p>
                        </motion.div>
                    )
                    /* State Error Awal / Koneksi Gagal Total */
                    : error && !wsConnected && sensorData.updatedAt === "--:--" ? (
                         <motion.div key="error-state" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-md p-6 bg-red-100 dark:bg-red-800/30 border border-red-300 dark:border-red-700 rounded-lg text-center mt-16">
                            <div className="flex items-center justify-center space-x-2 mb-3">
                                <FaExclamationTriangle className="text-red-600 dark:text-red-400 text-xl" />
                                <p className="font-semibold text-red-700 dark:text-red-300 text-lg">Oops! Gagal Terhubung</p>
                            </div>
                            <p className="text-red-600 dark:text-red-400 mb-4 text-sm">{error}</p>
                            {/* Tombol coba lagi hanya jika bukan error config/token */}
                            {!error.toLowerCase().includes("konfigurasi") && !error.toLowerCase().includes("token") && (
                               <button onClick={connectWebSocket} className="text-sm text-blue-600 hover:underline dark:text-blue-400 disabled:text-gray-400 disabled:no-underline" disabled={initialLoading}>
                                  Coba Sambungkan Lagi
                               </button>
                            )}
                            {/* Link login jika error token */}
                             {error.toLowerCase().includes("token") && (
                                 <a href="/auth/signin" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                                    Pergi ke Halaman Login
                                 </a>
                            )}
                        </motion.div>
                    )
                    /* State Detail Sensor Terpilih */
                    : selectedSensor ? (
                         <SensorDetailView
                            key={selectedSensor} // Penting untuk AnimatePresence trigger
                            sensorId={selectedSensor}
                            currentValue={getCurrentSensorValue()}
                            historicalData={getCurrentHistoricalData()}
                            onBack={() => setSelectedSensor(null)}
                            isDarkMode={isDarkMode}
                        />
                    )
                    /* State Dashboard Utama */
                    : (
                        <motion.div key="dashboard-view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-5xl px-2">
                            {/* Header: Salam, Tanggal, Waktu, Status WS */}
                            <div className="mb-6 md:mb-8 text-center md:text-left">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-1">
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100"> {getGreeting()}! 👋 </h1>
                                     {/* Indikator Status Koneksi */}
                                     <div className={`mt-1 md:mt-0 flex items-center justify-center md:justify-end text-xs font-medium transition-colors duration-300 ${ wsConnected ? 'text-green-600 dark:text-green-400' : (initialLoading ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400') }`} title={wsConnected ? 'Koneksi realtime aktif' : (initialLoading ? 'Sedang mencoba menyambungkan...' : (error ? error : 'Koneksi realtime terputus'))}>
                                         {wsConnected ? <FaLink className="mr-1.5"/> : (initialLoading ? <FaSpinner className="mr-1.5 animate-spin"/> : <FaUnlink className="mr-1.5"/>)}
                                         {wsConnected ? 'Realtime Aktif' : (initialLoading ? 'Menyambungkan...' : 'Koneksi Terputus')}
                                     </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start text-sm text-gray-500 dark:text-gray-400 gap-x-3 gap-y-1">
                                    <div className="flex items-center"><FaRegCalendarAlt className="mr-1.5"/><span>{formatDate(currentTime)}</span></div>
                                    <div className="flex items-center"><FaRegClock className="mr-1.5"/><span>{formatTimeDisplay(currentTime)}</span></div>
                                    {sensorData.updatedAt && sensorData.updatedAt !== "--:--" && <div className="flex items-center" title="Waktu update data terakhir"><FaInfoCircle className="mr-1.5"/><span>Update: {sensorData.updatedAt} WIB</span></div>}
                                </div>
                            </div>

                            {/* Panel: Ringkasan Status & Tips */}
                            <div className="mb-6 md:mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-blue-500 dark:border-blue-400">
                                    <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center"><FaInfoCircle className="mr-2 text-blue-500 dark:text-blue-400"/> Ringkasan Status Kebun</h3>
                                    <p className={`text-sm ${statusColor}`}>{overallStatus}</p>
                                </motion.div>
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-yellow-500 dark:border-yellow-400">
                                    <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center"><FaLightbulb className="mr-2 text-yellow-500 dark:text-yellow-400"/> Tips Hari Ini</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{advice}</p>
                                </motion.div>
                            </div>

                            {/* Judul: Sensor Readings */}
                            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4"> Pembacaan Sensor </h2>

                             {/* Tampilkan error koneksi (jika ada) DI ATAS grid SETELAH data pernah ada */}
                             {error && !wsConnected && sensorData.updatedAt !== "--:--" && !error.toLowerCase().includes("konfigurasi") && !error.toLowerCase().includes("token") && (
                                 <div className="mb-4 flex items-center justify-center space-x-2 rounded-lg border border-red-300 bg-red-50 p-3 text-center dark:border-red-700 dark:bg-red-900/40">
                                     <FaExclamationTriangle className="text-red-600 dark:text-red-400" />
                                     <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                                      {/* Tombol coba lagi */}
                                      <button onClick={connectWebSocket} className="ml-3 text-xs text-blue-600 hover:underline dark:text-blue-400 disabled:text-gray-400 disabled:no-underline" disabled={initialLoading}>
                                         Coba Lagi
                                      </button>
                                 </div>
                             )}

                            {/* Grid: Kartu Sensor */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {renderSensorCards()}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Home;