// src/components/GardenLightsControl.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import CryptoJS from 'crypto-js';
import {
  FaLightbulb,
  FaSpinner,
  FaExclamationTriangle,
  FaCog,
  FaSun,
  FaClock,
  FaTimes,
  FaSave,
  FaPowerOff,
  FaCheckCircle,
  FaRegClock
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// --- Konfigurasi API & Kunci Enkripsi ---
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const WS_SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET_KEY;

const BASE_API_URL = HTTPSAPIURL ? `https://${HTTPSAPIURL}/api/device` : '';
const WSS_HOST = HTTPSAPIURL || '';

// --- Tipe Data ---
interface OutputStateInfoFromApi {
    state: boolean;
    mode: string;
    turnOnTime: string | null;
    turnOffTime: string | null;
    id?: string;
    createdAt?: string;
}

interface OutputItem {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  currentState: 'ON' | 'OFF' | 'UNKNOWN';
  currentMode: string;
  currentTurnOnTime: string | null;
  currentTurnOffTime: string | null;
  currentStateId?: string;
  currentStateCreatedAt?: string;
}

interface TempSettings {
    mode: string;
    turnOnTime: string | null;
    turnOffTime: string | null;
}

// --- Konstanta & Helper ---
const OUTPUT_MODES_BACKEND: ReadonlyArray<string> = ['MANUAL', 'AUTO_SUN', 'AUTO_DATETIME'] as const;

const MODE_DISPLAY_MAP: { [key: string]: string } = {
    'MANUAL': 'Manual',
    'AUTO_SUN': 'Sensor Cahaya',
    'AUTO_DATETIME': 'Jadwal Waktu'
};

const mapApiStateToString = (apiState: boolean | undefined | null): 'ON' | 'OFF' | 'UNKNOWN' => {
    if (apiState === true) return 'ON';
    if (apiState === false) return 'OFF';
    return 'UNKNOWN';
};

const mapStringStateToBoolean = (internalState: 'ON' | 'OFF' | 'UNKNOWN'): boolean | undefined => {
    if (internalState === 'ON') return true;
    if (internalState === 'OFF') return false;
    return undefined;
};

const formatTime = (timeString: string | null | undefined): string => {
    if (!timeString) return "--:--";
    if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) return timeString.substring(0, 5);
    return "--:--";
};

const decryptData = (encryptedData: { iv: string; content: string }): any[] | null => {
    if (!WS_SECRET_KEY) return null;
    try {
        const { iv, content } = encryptedData;
        if (!/^[0-9a-fA-F]+$/.test(iv) || !/^[0-9a-fA-F]+$/.test(content)) return null;
        const ivWordArray = CryptoJS.enc.Hex.parse(iv);
        const encryptedWordArray = CryptoJS.enc.Hex.parse(content);
        const encryptedBase64 = CryptoJS.enc.Base64.stringify(encryptedWordArray);
        const key = CryptoJS.enc.Utf8.parse(WS_SECRET_KEY);
        const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, { iv: ivWordArray, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedStr) return null;
        const parsedData = JSON.parse(decryptedStr);
        return Array.isArray(parsedData) ? parsedData : null;
    } catch (error) { return null; }
};

// Komponen Utama
const GardenLightsControl: React.FC<{}> = () => {
  const [lights, setLights] = useState<OutputItem[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [settingsLoadingStates, setSettingsLoadingStates] = useState<Record<string, boolean>>({});
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSettingsId, setEditingSettingsId] = useState<string | null>(null);
  const [tempSettings, setTempSettings] = useState<TempSettings | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // --- Notifikasi & Logout ---
  const showNotification = (message: string, type: "success" | "error") => {
    console.log(`[${type}] ${message}`);
    if (type === 'error') { 
        setError(message); 
        setTimeout(() => setError(null), 5000);
    }
  };

  const handleLogout = () => {
      Object.keys(Cookies.get()).forEach((c) => { if (c === 'userAuth') Cookies.remove(c, { path: '/' }); });
      window.location.href = "/auth/signin";
  };

  // --- WebSocket ---
  useEffect(() => {
    if (!WSS_HOST || !WS_SECRET_KEY) { setError("Konfigurasi WS Salah."); setInitialLoading(false); return; }
    const token = Cookies.get("userAuth");
    if (!token) { setError("Token Hilang."); setInitialLoading(false); return; }

    const wsUrl = `wss://${WSS_HOST}/dataOutput?token=${token}`;
    setInitialLoading(true);
    
    const websocket = new WebSocket(wsUrl);
    ws.current = websocket;

    websocket.onopen = () => { setWsConnected(true); setError(null); };
    websocket.onmessage = (event) => {
        try {
            const encryptedData = JSON.parse(event.data as string);
            if (encryptedData?.iv && encryptedData?.content) {
                const decryptedDataArray = decryptData(encryptedData);
                if (decryptedDataArray) {
                    const processedData: OutputItem[] = decryptedDataArray.map((output: any): OutputItem | null => {
                         if (!output?.id || !output?.name) return null;
                         const latest = output.states?.[0];
                         return {
                             id: output.id, name: output.name, description: output.description, createdAt: output.createdAt,
                             currentState: mapApiStateToString(latest?.state), 
                             currentMode: OUTPUT_MODES_BACKEND.includes(latest?.mode) ? latest.mode : 'MANUAL',
                             currentTurnOnTime: latest?.turnOnTime ?? null, currentTurnOffTime: latest?.turnOffTime ?? null,
                             currentStateId: latest?.id, currentStateCreatedAt: latest?.createdAt,
                         };
                    }).filter((item): item is OutputItem => item !== null);
                    setLights(processedData);
                    if(initialLoading) setInitialLoading(false);
                }
            }
        } catch (e) { console.error(e); }
    };
    websocket.onerror = () => { setError("Koneksi WS Error."); setWsConnected(false); setInitialLoading(false); };
    websocket.onclose = () => { setWsConnected(false); if(initialLoading) setInitialLoading(false); };

    return () => { ws.current?.close(); };
  }, []);

  // --- Actions ---
  const handleToggleLight = useCallback(async (lightId: string) => {
      const light = lights.find(l => l.id === lightId);
      if (!light || light.currentMode !== 'MANUAL' || loadingStates[lightId]) return;

      const newStateBoolean = light.currentState === 'ON' ? false : true;
      setLoadingStates(prev => ({ ...prev, [lightId]: true }));

      try {
          const token = Cookies.get("userAuth");
          if (!token) throw new Error("No Token");
          
          await fetch(`${BASE_API_URL}/output/${lightId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                state: newStateBoolean,
                mode: light.currentMode,
                turnOnTime: light.currentTurnOnTime,
                turnOffTime: light.currentTurnOffTime,
            }),
          });

          // [FIX] Optimistic Update (Update UI langsung tanpa menunggu WS)
          setLights(prev => prev.map(l => 
             l.id === lightId ? { ...l, currentState: newStateBoolean ? 'ON' : 'OFF' } : l
          ));

      } catch (err) { 
          showNotification("Gagal mengubah status.", "error"); 
          // Revert state jika gagal (opsional, tapi bagus untuk UX)
      } finally { 
          setLoadingStates(prev => ({ ...prev, [lightId]: false })); 
      }
  }, [lights, loadingStates]);

  const handleEditSettings = (lightId: string) => {
    const light = lights.find(l => l.id === lightId);
    if (!light) return;
    setTempSettings({
      mode: light.currentMode,
      turnOnTime: light.currentTurnOnTime || "18:00",
      turnOffTime: light.currentTurnOffTime || "06:00",
    });
    setEditingSettingsId(lightId);
  };

  const handleSaveSettings = useCallback(async (lightId: string) => {
    const light = lights.find(l => l.id === lightId);
    if (!tempSettings || !light || settingsLoadingStates[lightId]) return;

    setSettingsLoadingStates(prev => ({ ...prev, [lightId]: true }));
    
    try {
        const token = Cookies.get("userAuth");
        if (!token) throw new Error("No Token");
        
        // Kirim payload ke API
        const response = await fetch(`${BASE_API_URL}/output/${lightId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
              state: mapStringStateToBoolean(light.currentState),
              mode: tempSettings.mode,
              turnOnTime: tempSettings.mode === 'AUTO_DATETIME' ? tempSettings.turnOnTime : null,
              turnOffTime: tempSettings.mode === 'AUTO_DATETIME' ? tempSettings.turnOffTime : null,
          }),
        });

        if (!response.ok) throw new Error("Gagal update API");

        // [FIX] Update State Lokal Langsung (Supaya tidak perlu refresh)
        setLights(prev => prev.map(l => {
            if (l.id === lightId) {
                return {
                    ...l,
                    currentMode: tempSettings.mode,
                    currentTurnOnTime: tempSettings.mode === 'AUTO_DATETIME' ? tempSettings.turnOnTime : null,
                    currentTurnOffTime: tempSettings.mode === 'AUTO_DATETIME' ? tempSettings.turnOffTime : null,
                };
            }
            return l;
        }));

        showNotification("Pengaturan disimpan.", "success");
        setEditingSettingsId(null);
        setTempSettings(null);

    } catch (err) { 
        showNotification("Gagal menyimpan.", "error"); 
    } finally { 
        setSettingsLoadingStates(prev => ({ ...prev, [lightId]: false })); 
    }
  }, [tempSettings, lights, settingsLoadingStates]);


  // ================== RENDER ==================
  return (
    <div className="w-full max-w-5xl mx-auto px-2">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <FaLightbulb className="text-yellow-500" /> Kontrol Perangkat
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Kelola otomatisasi lampu taman Anda.</p>
          </div>
          
          <div className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm border ${wsConnected ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-red-100 text-red-700 border-red-200'}`}>
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                {wsConnected ? 'Sistem Online' : 'Terputus'}
          </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center gap-3 shadow-sm">
            <FaExclamationTriangle />
            <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Content Grid */}
      {initialLoading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {[1,2].map(i => (
                 <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse"></div>
             ))}
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {lights.map((light) => {
            const isOn = light.currentState === 'ON';
            const isEditing = editingSettingsId === light.id;
            const isSaving = settingsLoadingStates[light.id];
            const isManual = light.currentMode === 'MANUAL';
            const isLoading = loadingStates[light.id];

            return (
              <motion.div
                key={light.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-[2rem] border transition-all duration-300
                  ${isEditing ? "z-20 bg-white dark:bg-gray-800 ring-2 ring-green-500 shadow-2xl" : "bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-lg hover:shadow-xl border-white/50 dark:border-gray-700/50"}
                `}
              >
                <AnimatePresence mode="wait">
                  {isEditing && tempSettings ? (
                    // --- MODE EDIT ---
                    <motion.div
                        key="edit"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="p-6"
                    >
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                            <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FaCog className="text-green-500"/> Pengaturan {light.name}
                            </h4>
                            <button onClick={() => setEditingSettingsId(null)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors">
                                <FaTimes />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Mode Operasi</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {OUTPUT_MODES_BACKEND.map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setTempSettings({...tempSettings, mode: m})}
                                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${tempSettings.mode === m 
                                                ? "bg-green-600 text-white shadow-lg shadow-green-500/30 scale-105" 
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
                                        >
                                            {MODE_DISPLAY_MAP[m]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conditional Time Input */}
                            <AnimatePresence>
                                {tempSettings.mode === 'AUTO_DATETIME' && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }} 
                                        animate={{ height: 'auto', opacity: 1 }} 
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 mt-2">
                                            <div className="flex items-center gap-2 text-green-600 mb-3 text-sm font-bold">
                                                <FaClock /> Jadwal Waktu
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs text-gray-500 mb-1 block">Waktu Nyala</label>
                                                    <input type="time" value={tempSettings.turnOnTime || "18:00"} 
                                                        onChange={(e) => setTempSettings({...tempSettings, turnOnTime: e.target.value})}
                                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 mb-1 block">Waktu Mati</label>
                                                    <input type="time" value={tempSettings.turnOffTime || "06:00"} 
                                                        onChange={(e) => setTempSettings({...tempSettings, turnOffTime: e.target.value})}
                                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={() => setEditingSettingsId(null)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Batal</button>
                            <button onClick={() => handleSaveSettings(light.id)} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50">
                                {isSaving ? <FaSpinner className="animate-spin"/> : <FaSave />} Simpan
                            </button>
                        </div>
                    </motion.div>
                  ) : (
                    // --- MODE TAMPILAN ---
                    <motion.div
                        key="view"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="p-6 md:p-8 h-full flex flex-col"
                    >
                        {/* Background Decoration */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${isOn ? 'from-yellow-400/20 to-orange-500/20' : 'from-gray-400/10 to-gray-500/10'} rounded-bl-full -mr-8 -mt-8 transition-all duration-500`}></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner transition-all duration-500 ${isOn ? 'bg-yellow-100 text-yellow-500 dark:bg-yellow-900/30' : 'bg-gray-100 text-gray-400 dark:bg-gray-700/50'}`}>
                                    <FaLightbulb className={isOn ? "drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]" : ""} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-gray-800 dark:text-white">{light.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isOn ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                            {isOn ? 'Aktif' : 'Mati'}
                                        </span>
                                        <span className="text-xs text-gray-400">• {MODE_DISPLAY_MAP[light.currentMode]}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleEditSettings(light.id)} 
                                className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-400 hover:text-green-600 transition-all"
                            >
                                <FaCog />
                            </button>
                        </div>

                        {/* Mode Indicator / Info */}
                        <div className="flex-grow">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/50">
                                <div className="text-green-500">
                                    {light.currentMode === 'AUTO_SUN' ? <FaSun /> : light.currentMode === 'AUTO_DATETIME' ? <FaClock /> : <FaPowerOff />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Mode Saat Ini</p>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        {light.currentMode === 'AUTO_DATETIME' 
                                            ? `${formatTime(light.currentTurnOnTime)} - ${formatTime(light.currentTurnOffTime)}` 
                                            : MODE_DISPLAY_MAP[light.currentMode]}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Toggle Switch */}
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Status Manual</span>
                            
                            <button
                                onClick={() => isManual && !isLoading && handleToggleLight(light.id)}
                                disabled={!isManual || isLoading}
                                className={`relative w-16 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out focus:outline-none ${
                                    !isManual ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50' : 
                                    isOn ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                                    isOn ? 'translate-x-8' : 'translate-x-0'
                                }`}>
                                    {isLoading ? <FaSpinner className="animate-spin text-green-500 text-xs"/> : (isOn ? <FaCheckCircle className="text-green-500 text-xs"/> : <FaPowerOff className="text-gray-400 text-xs"/>)}
                                </div>
                            </button>
                        </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GardenLightsControl;