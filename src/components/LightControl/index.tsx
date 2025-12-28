"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import CryptoJS from 'crypto-js';
import { 
  FaLightbulb, FaSpinner // Tetap pakai FA untuk beberapa icon solid
} from "react-icons/fa";
import { 
  LuZap, LuSun, LuClock, LuPower, LuSettings2, LuWifi, LuWifiOff, LuX, LuSave, LuCheckCircle2
} from "react-icons/lu"; // Menggunakan Lucide Icons untuk tampilan lebih modern
import { motion, AnimatePresence } from "framer-motion";

// --- Konfigurasi API & Kunci Enkripsi ---
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const WS_SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET_KEY;

const BASE_API_URL = HTTPSAPIURL ? `https://${HTTPSAPIURL}/api/device` : '';
const WSS_HOST = HTTPSAPIURL || '';

// --- Tipe Data ---
interface OutputItem {
  id: string;
  name: string;
  currentState: 'ON' | 'OFF' | 'UNKNOWN';
  currentMode: string;
  currentTurnOnTime: string | null;
  currentTurnOffTime: string | null;
}

interface TempSettings {
    mode: string;
    turnOnTime: string | null;
    turnOffTime: string | null;
}

// --- Konstanta ---
const OUTPUT_MODES_BACKEND: ReadonlyArray<string> = ['MANUAL', 'AUTO_SUN', 'AUTO_DATETIME'] as const;
const MODE_DISPLAY_MAP: { [key: string]: string } = {
    'MANUAL': 'Manual',
    'AUTO_SUN': 'Sensor Cahaya',
    'AUTO_DATETIME': 'Jadwal'
};

// --- Helper Functions ---
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

const decryptData = (encryptedData: { iv: string; content: string }): any[] | null => {
    if (!WS_SECRET_KEY) return null;
    try {
        const { iv, content } = encryptedData;
        const ivWordArray = CryptoJS.enc.Hex.parse(iv);
        const encryptedWordArray = CryptoJS.enc.Hex.parse(content);
        const encryptedBase64 = CryptoJS.enc.Base64.stringify(encryptedWordArray);
        const key = CryptoJS.enc.Utf8.parse(WS_SECRET_KEY);
        const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, { iv: ivWordArray, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
        return decryptedStr ? JSON.parse(decryptedStr) : null;
    } catch { return null; }
};

// ==========================================
// KOMPONEN UTAMA
// ==========================================
const GardenLightsControl: React.FC = () => {
  const [lights, setLights] = useState<OutputItem[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  
  // Modal State
  const [selectedLight, setSelectedLight] = useState<OutputItem | null>(null);
  const [tempSettings, setTempSettings] = useState<TempSettings | null>(null);
  
  // WebSocket State
  const ws = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // --- WebSocket Setup ---
  useEffect(() => {
    if (!WSS_HOST || !WS_SECRET_KEY) { setInitialLoading(false); return; }
    const token = Cookies.get("userAuth");
    if (!token) { setInitialLoading(false); return; }

    const connectWs = () => {
        const wsUrl = `wss://${WSS_HOST}/dataOutput?token=${token}`;
        const websocket = new WebSocket(wsUrl);
        ws.current = websocket;

        websocket.onopen = () => { setWsConnected(true); };
        websocket.onmessage = (event) => {
            try {
                const encryptedData = JSON.parse(event.data as string);
                if (encryptedData?.iv && encryptedData?.content) {
                    const decryptedDataArray = decryptData(encryptedData);
                    if (decryptedDataArray && Array.isArray(decryptedDataArray)) {
                        const processedData: OutputItem[] = decryptedDataArray.map((output: any) => {
                             const latest = output.states?.[0];
                             return {
                                 id: output.id, name: output.name,
                                 currentState: mapApiStateToString(latest?.state), 
                                 currentMode: OUTPUT_MODES_BACKEND.includes(latest?.mode) ? latest.mode : 'MANUAL',
                                 currentTurnOnTime: latest?.turnOnTime ?? null, currentTurnOffTime: latest?.turnOffTime ?? null,
                             };
                        });
                        setLights(processedData);
                        setInitialLoading(false);
                    }
                }
            } catch (e) { console.error(e); }
        };
        websocket.onclose = () => { setWsConnected(false); };
    };

    connectWs();
    // Reconnect interval could be added here
    return () => { ws.current?.close(); };
  }, []);

  // --- Actions ---
  const handleToggleLight = useCallback(async (e: React.MouseEvent, light: OutputItem) => {
      e.stopPropagation();
      if (light.currentMode !== 'MANUAL' || loadingStates[light.id]) return;

      const newStateBoolean = light.currentState === 'ON' ? false : true;
      setLoadingStates(prev => ({ ...prev, [light.id]: true }));
      
      // Optimistic Update
      setLights(prev => prev.map(l => l.id === light.id ? { ...l, currentState: newStateBoolean ? 'ON' : 'OFF' } : l));

      try {
          const token = Cookies.get("userAuth");
          await fetch(`${BASE_API_URL}/output/${light.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                state: newStateBoolean,
                mode: light.currentMode,
                turnOnTime: light.currentTurnOnTime,
                turnOffTime: light.currentTurnOffTime,
            }),
          });
      } catch { 
          // Revert on fail
          setLights(prev => prev.map(l => l.id === light.id ? { ...l, currentState: !newStateBoolean ? 'ON' : 'OFF' } : l));
      } finally { 
          setLoadingStates(prev => ({ ...prev, [light.id]: false })); 
      }
  }, [loadingStates]);

  const openSettings = (light: OutputItem) => {
      setSelectedLight(light);
      setTempSettings({
          mode: light.currentMode,
          turnOnTime: light.currentTurnOnTime || "18:00",
          turnOffTime: light.currentTurnOffTime || "06:00",
      });
  };

  const handleSaveSettings = async () => {
      if (!selectedLight || !tempSettings) return;
      setIsSaving(true);
      try {
          const token = Cookies.get("userAuth");
          await fetch(`${BASE_API_URL}/output/${selectedLight.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                state: mapStringStateToBoolean(selectedLight.currentState),
                mode: tempSettings.mode,
                turnOnTime: tempSettings.mode === 'AUTO_DATETIME' ? tempSettings.turnOnTime : null,
                turnOffTime: tempSettings.mode === 'AUTO_DATETIME' ? tempSettings.turnOffTime : null,
            }),
          });
          // Local update
          setLights(prev => prev.map(l => l.id === selectedLight.id ? {
              ...l,
              currentMode: tempSettings.mode,
              currentTurnOnTime: tempSettings.mode === 'AUTO_DATETIME' ? tempSettings.turnOnTime : null,
              currentTurnOffTime: tempSettings.mode === 'AUTO_DATETIME' ? tempSettings.turnOffTime : null,
          } : l));
          setSelectedLight(null);
      } catch (err) { console.error(err); } 
      finally { setIsSaving(false); }
  };

  // ================== RENDER UI ==================
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
      
      {/* Header Modern */}
      <div className="flex items-center justify-between mb-8">
          <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                  <span className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/30">
                    <LuZap size={24} fill="currentColor" />
                  </span>
                  Smart Garden
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium ml-1">
                  {lights.length} Perangkat Terhubung
              </p>
          </div>
          
          <div className={`
            px-4 py-2 rounded-full text-xs font-bold border flex items-center gap-2 transition-all duration-300
            ${wsConnected 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' 
                : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20'}
          `}>
                {wsConnected ? <LuWifi size={14}/> : <LuWifiOff size={14}/>}
                {wsConnected ? 'SYSTEM ONLINE' : 'DISCONNECTED'}
          </div>
      </div>

      {/* Grid Dashboard */}
      {initialLoading ? (
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
             {[...Array(8)].map((_, i) => (
                 <div key={i} className="aspect-[4/3.5] bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse"></div>
             ))}
         </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
          {lights.map((light) => {
            const isOn = light.currentState === 'ON';
            const isManual = light.currentMode === 'MANUAL';
            const isLoading = loadingStates[light.id];
            
            return (
              <motion.div
                key={light.id}
                layout
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openSettings(light)}
                className={`
                    group relative overflow-hidden rounded-[1.5rem] p-5 flex flex-col justify-between aspect-[4/3.5] cursor-pointer transition-all duration-300
                    ${isOn 
                        ? 'bg-gradient-to-br from-amber-300 via-orange-400 to-amber-500 shadow-[0_15px_30px_-10px_rgba(251,191,36,0.6)] text-white' 
                        : 'bg-white dark:bg-[#1e1e24] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-gray-700'
                    }
                `}
              >
                 {/* Background Glow Effect for OFF state hover */}
                 {!isOn && <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity dark:from-indigo-900/10 dark:to-purple-900/10" />}

                 {/* Top Row: Icon & Mode */}
                 <div className="relative z-10 flex justify-between items-start">
                    <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-lg backdrop-blur-sm transition-colors
                        ${isOn ? 'bg-white/20 text-white shadow-inner' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}
                    `}>
                        {light.currentMode === 'AUTO_SUN' ? <LuSun size={18} /> : 
                         light.currentMode === 'AUTO_DATETIME' ? <LuClock size={18} /> : 
                         <FaLightbulb size={16} className={isOn ? "fill-white" : ""} />}
                    </div>

                    {/* Mode Indicator Dot */}
                    {!isManual && (
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${isOn ? 'bg-black/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                            Auto
                        </div>
                    )}
                 </div>

                 {/* Bottom Row: Info & Toggle */}
                 <div className="relative z-10">
                    <h4 className={`font-bold text-base leading-tight mb-3 line-clamp-2 ${isOn ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                        {light.name}
                    </h4>

                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-medium ${isOn ? 'text-white/80' : 'text-gray-400'}`}>
                            {isOn ? 'Menyala' : 'Mati'}
                        </span>

                        {/* Custom Toggle Switch */}
                        <button
                            onClick={(e) => handleToggleLight(e, light)}
                            disabled={!isManual || isLoading}
                            className={`
                                w-10 h-6 rounded-full flex items-center p-1 transition-all duration-300
                                ${!isManual ? 'opacity-0 scale-75 pointer-events-none' : ''}
                                ${isOn ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-700'}
                            `}
                        >
                            <div className={`
                                w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 flex items-center justify-center
                                ${isOn ? 'translate-x-4 bg-white' : 'translate-x-0 bg-white dark:bg-gray-500'}
                            `}>
                                {isLoading && <FaSpinner className="animate-spin text-[8px] text-orange-500"/>}
                            </div>
                        </button>
                    </div>
                 </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* --- SETTINGS MODAL (Modern Glass) --- */}
      <AnimatePresence>
          {selectedLight && tempSettings && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  {/* Backdrop Blur */}
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                    onClick={() => setSelectedLight(null)} 
                    className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" 
                  />
                  
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 10 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    exit={{ scale: 0.95, opacity: 0, y: 10 }} 
                    className="relative w-full max-w-sm bg-white dark:bg-[#1a1a20] rounded-[2rem] shadow-2xl p-1 overflow-hidden border border-white/20 dark:border-gray-700"
                  >
                      {/* Modal Content Wrapper */}
                      <div className="px-6 py-6">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                                    <LuSettings2 size={20}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-none">{selectedLight.name}</h3>
                                    <p className="text-xs text-gray-400 mt-1">Konfigurasi Perangkat</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedLight(null)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                                <LuX size={20}/>
                            </button>
                        </div>

                        {/* Mode Selector Tabs */}
                        <div className="bg-gray-100 dark:bg-black/20 p-1.5 rounded-2xl flex gap-1 mb-6">
                            {OUTPUT_MODES_BACKEND.map((m) => {
                                const isActive = tempSettings.mode === m;
                                return (
                                    <button
                                        key={m}
                                        onClick={() => setTempSettings({...tempSettings, mode: m})}
                                        className={`
                                            flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center gap-1
                                            ${isActive 
                                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm' 
                                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}
                                        `}
                                    >
                                        {m === 'MANUAL' ? <LuPower size={14}/> : m === 'AUTO_SUN' ? <LuSun size={14}/> : <LuClock size={14}/>}
                                        {MODE_DISPLAY_MAP[m]}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Time Settings (Conditional) */}
                        <AnimatePresence mode="wait">
                            {tempSettings.mode === 'AUTO_DATETIME' ? (
                                <motion.div 
                                    key="time"
                                    initial={{ opacity: 0, height: 0 }} 
                                    animate={{ opacity: 1, height: 'auto' }} 
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800 mb-6"
                                >
                                    <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold mb-3">
                                        <LuClock /> Atur Jadwal
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Mulai</label>
                                            <input type="time" value={tempSettings.turnOnTime || "18:00"} onChange={(e) => setTempSettings({...tempSettings, turnOnTime: e.target.value})} className="w-full bg-white dark:bg-gray-800 rounded-xl p-2.5 text-center font-bold text-gray-800 dark:text-white border-none focus:ring-2 focus:ring-indigo-500"/>
                                        </div>
                                        <div className="flex items-center text-gray-300 pt-4">➜</div>
                                        <div className="flex-1">
                                            <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Berhenti</label>
                                            <input type="time" value={tempSettings.turnOffTime || "06:00"} onChange={(e) => setTempSettings({...tempSettings, turnOffTime: e.target.value})} className="w-full bg-white dark:bg-gray-800 rounded-xl p-2.5 text-center font-bold text-gray-800 dark:text-white border-none focus:ring-2 focus:ring-indigo-500"/>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="info"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="text-center py-4 px-4 text-sm text-gray-500 mb-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700"
                                >
                                    {tempSettings.mode === 'MANUAL' ? "Anda memegang kendali penuh. Hidupkan/matikan lampu secara manual." : "Lampu akan otomatis menyala saat sensor mendeteksi lingkungan gelap."}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Save Button */}
                        <button 
                            onClick={handleSaveSettings} 
                            disabled={isSaving}
                            className="w-full py-4 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 rounded-2xl font-bold text-sm shadow-lg shadow-gray-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <FaSpinner className="animate-spin"/> : <LuSave size={18} />}
                            Simpan Perubahan
                        </button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default GardenLightsControl;