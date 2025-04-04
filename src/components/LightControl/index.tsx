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
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// --- Konfigurasi API & Kunci Enkripsi ---
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
// Ambil WS_SECRET_KEY dari environment variable - INGAT RISIKO KEAMANAN!
const WS_SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET_KEY;

if (!HTTPSAPIURL) {
    console.error("CRITICAL: NEXT_PUBLIC_HTTPS_API_URL is not defined.");
}
if (!WS_SECRET_KEY) {
    console.error("CRITICAL: NEXT_PUBLIC_WS_SECRET_KEY is not defined.");
}
// Pastikan URL API device ada
const BASE_API_URL = HTTPSAPIURL ? `https://${HTTPSAPIURL}/api/device` : '';
// Dapatkan host untuk WebSocket dari HTTPSAPIURL
const WSS_HOST = HTTPSAPIURL || ''; // Gunakan host yang sama


// --- Tipe Data ---
// Struktur state terbaru dari API (setelah dekripsi atau dari GET)
interface OutputStateInfoFromApi {
    state: boolean;
    mode: string; // e.g., MANUAL, AUTO_SUN, AUTO_DATETIME
    turnOnTime: string | null; // HH:mm
    turnOffTime: string | null; // HH:mm
    id?: string; // ID state
    createdAt?: string; // Timestamp state
}

// Struktur data internal untuk merepresentasikan satu lampu/output di UI
interface OutputItem {
  id: string; // ID output device
  name: string; // Nama output device
  description?: string; // Deskripsi tambahan (opsional)
  createdAt?: string; // Timestamp pembuatan output device
  currentState: 'ON' | 'OFF' | 'UNKNOWN'; // State terakhir yang diketahui
  currentMode: string; // Mode terakhir (backend value)
  currentTurnOnTime: string | null; // Waktu ON terakhir (HH:mm)
  currentTurnOffTime: string | null; // Waktu OFF terakhir (HH:mm)
  currentStateId?: string; // ID state terakhir
  currentStateCreatedAt?: string; // Timestamp state terakhir
}

// Struktur data untuk menyimpan state sementara saat form edit dibuka
interface TempSettings {
    mode: string; // MANUAL, AUTO_SUN, AUTO_DATETIME
    turnOnTime: string | null; // HH:mm
    turnOffTime: string | null; // HH:mm
}

// --- Konstanta & Helper ---
const OUTPUT_MODES_BACKEND: ReadonlyArray<string> = ['MANUAL', 'AUTO_SUN', 'AUTO_DATETIME'] as const;
// Mapping mode backend ke teks display singkat (untuk tombol/badge)
const MODE_DISPLAY_MAP: { [key: string]: string } = {
    'MANUAL': 'Manual',
    'AUTO_SUN': 'Otomatis Matahari',
    'AUTO_DATETIME': 'Otomatis Jadwal'
};
// Mapping mode backend ke teks display lengkap (untuk title/tooltip)
const MODE_DISPLAY_MAP_FULL: { [key: string]: string } = {
    'MANUAL': 'Mode Manual',
    'AUTO_SUN': 'Mode Otomatis (Matahari Terbit/Terbenam)',
    'AUTO_DATETIME': 'Mode Otomatis (Jadwal Waktu)'
};

// Fungsi konversi state boolean API ke string UI
const mapApiStateToString = (apiState: boolean | undefined | null): 'ON' | 'OFF' | 'UNKNOWN' => {
    if (apiState === true) return 'ON';
    if (apiState === false) return 'OFF';
    return 'UNKNOWN';
};
// Fungsi konversi state string UI ke boolean API
const mapStringStateToBoolean = (internalState: 'ON' | 'OFF' | 'UNKNOWN'): boolean | undefined => {
    if (internalState === 'ON') return true;
    if (internalState === 'OFF') return false;
    return undefined;
};
// Fungsi format waktu HH:mm (menambahkan WIB)
const formatTime = (timeString: string | null | undefined): string => {
    if (!timeString) return "N/A";
    if (/^\d{2}:\d{2}$/.test(timeString)) { return timeString + " WIB"; }
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) { return timeString.substring(0, 5) + " WIB"; }
    console.warn(`Invalid time format received for formatting: ${timeString}`);
    return "Invalid Time";
};
// Fungsi format tanggal dan waktu lengkap (opsional, jika perlu)
const formatDateTime = (dateTimeString: string | null | undefined): string => {
    if (!dateTimeString) return "N/A";
    try {
        const dateStr = dateTimeString.endsWith('Z') ? dateTimeString : dateTimeString + 'Z';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "Invalid Date";
        return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
    } catch (e) { console.error("Error formatting date:", e); return "Invalid Date Format"; }
};


// --- Fungsi Dekripsi ---
const decryptData = (encryptedData: { iv: string; content: string }): any[] | null => { // Return type diubah ke array
    if (!WS_SECRET_KEY) { console.error("Decryption key is missing."); return null; }
    try {
        const { iv, content } = encryptedData;
        if (!/^[0-9a-fA-F]+$/.test(iv) || !/^[0-9a-fA-F]+$/.test(content)) { console.error("Invalid IV or content format (not hex)."); return null; }
        const ivWordArray = CryptoJS.enc.Hex.parse(iv);
        const encryptedWordArray = CryptoJS.enc.Hex.parse(content);
        const encryptedBase64 = CryptoJS.enc.Base64.stringify(encryptedWordArray);
        const key = CryptoJS.enc.Utf8.parse(WS_SECRET_KEY);
        const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, { iv: ivWordArray, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedStr) { console.error("Decryption resulted in empty string. Check key or padding."); return null; }
        // Langsung parse JSON, diharapkan hasilnya adalah array
        const parsedData = JSON.parse(decryptedStr);
        // Validasi tambahan bahwa hasilnya memang array
        if (Array.isArray(parsedData)) {
            return parsedData;
        } else {
            console.error("Decrypted data is not an array:", parsedData);
            return null;
        }
    } catch (error) { console.error("Decryption or JSON parsing failed:", error); return null; }
};


// Komponen Utama
const GardenLightsControl: React.FC<{}> = () => {
  // --- State ---
  const [lights, setLights] = useState<OutputItem[]>([]); // Data lampu dari WS
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({}); // Loading toggle manual
  const [settingsLoadingStates, setSettingsLoadingStates] = useState<Record<string, boolean>>({}); // Loading simpan settings
  const [initialLoading, setInitialLoading] = useState<boolean>(true); // Loading data awal WS
  const [error, setError] = useState<string | null>(null); // Error message
  const [editingSettingsId, setEditingSettingsId] = useState<string | null>(null); // ID lampu yg diedit
  const [tempSettings, setTempSettings] = useState<TempSettings | null>(null); // State form edit
  const ws = useRef<WebSocket | null>(null); // Ref WebSocket instance
  const [wsConnected, setWsConnected] = useState<boolean>(false); // Status koneksi WS


  // --- Fungsi Notifikasi & Logout ---
  const showNotification = (message: string, type: "success" | "error") => {
    console.log(`[${type.toUpperCase()}] Notification: ${message}`);
    // Ganti dengan implementasi UI notifikasi Anda (misal: react-toastify)
    if (type === 'error') { setError(message); } else { setError(null); } // Set error internal
    // Auto-hide error message after a delay (except for initial loading errors shown until data arrives)
    if (type === 'error' && !initialLoading) { setTimeout(() => { if(error === message) setError(null); }, 6000); }
  };

  const handleLogout = () => {
      console.error("User needs to log out - token/session invalid!");
      Object.keys(Cookies.get()).forEach((cookieName) => {
          if (cookieName === 'userAuth') { Cookies.remove(cookieName, { path: '/' }); }
      });
      window.location.href = "/auth/signin"; // Redirect ke login
  };


  // --- Logika Koneksi WebSocket ---
  useEffect(() => {
    if (!WSS_HOST || !WS_SECRET_KEY) {
        setError("Konfigurasi WebSocket tidak lengkap.");
        setInitialLoading(false);
        return;
    }
    const token = Cookies.get("userAuth");
    if (!token) { setError("Token otentikasi tidak ditemukan."); setInitialLoading(false); return; }

    const wsUrl = `wss://${WSS_HOST}/dataOutput?token=${token}`;
    console.log("Connecting to WebSocket:", wsUrl);
    setError(null);
    setInitialLoading(true);
    setWsConnected(false);

    const websocket = new WebSocket(wsUrl);
    ws.current = websocket;

    websocket.onopen = () => {
      console.log("WebSocket Connected");
      setWsConnected(true);
      setError(null); // Clear error on successful connection
    };

    websocket.onmessage = (event) => {
        try {
            const encryptedData = JSON.parse(event.data as string);
            if (typeof encryptedData === 'object' && encryptedData !== null && 'iv' in encryptedData && 'content' in encryptedData) {
                const decryptedDataArray = decryptData(encryptedData); // Hasil dekripsi sekarang diharapkan array

                // Cek apakah hasil dekripsi adalah array yang valid
                if (decryptedDataArray) { // decryptData return null on error/invalid array
                    console.log(`Decrypted data array received (${decryptedDataArray.length} items)`);

                    // Proses array hasil dekripsi
                    const processedData: OutputItem[] = decryptedDataArray.map((output: any): OutputItem | null => {
                         if (!output || typeof output.id !== 'string' || typeof output.name !== 'string') {
                              console.warn("Skipping invalid item in WS data:", output);
                              return null;
                         }
                         const latestState: OutputStateInfoFromApi | undefined = output.states?.[0];
                         const currentModeBackend = latestState?.mode ?? OUTPUT_MODES_BACKEND[0];
                         const validatedMode = OUTPUT_MODES_BACKEND.includes(currentModeBackend) ? currentModeBackend : OUTPUT_MODES_BACKEND[0];
                         const description = output.description || `Pengaturan untuk ${output.name}`;
                         return {
                             id: output.id, name: output.name, description: description, createdAt: output.createdAt,
                             currentState: mapApiStateToString(latestState?.state), currentMode: validatedMode,
                             currentTurnOnTime: latestState?.turnOnTime ?? null, currentTurnOffTime: latestState?.turnOffTime ?? null,
                             currentStateId: latestState?.id, currentStateCreatedAt: latestState?.createdAt,
                         };
                    }).filter((item: OutputItem | null): item is OutputItem => item !== null);

                    setLights(processedData); // Update state utama
                    setError(null); // Clear any previous error
                    if(initialLoading) { setInitialLoading(false); console.log("Initial data processed via WebSocket."); } // Loading selesai

                } else {
                    // Jika decryptData mengembalikan null (error dekripsi/format)
                    console.warn("Failed to decrypt or parse data from WebSocket.");
                    // Pertimbangkan untuk menampilkan error ke user jika ini terjadi berulang kali
                    // setError("Gagal memproses data real-time.");
                }
            } else {
                 console.warn("Received invalid encrypted data format via WebSocket:", encryptedData);
                 // setError("Format data terenkripsi dari server tidak sesuai.");
            }
        } catch (error) {
            console.error("Failed to process WebSocket message:", error);
            setError("Gagal memproses data real-time.");
        }
    };

    websocket.onerror = (event) => {
      console.error("WebSocket Error:", event);
      setError("Koneksi real-time bermasalah.");
      setWsConnected(false);
      setInitialLoading(false); // Stop loading on error
    };

    websocket.onclose = (event) => {
      console.log("WebSocket Disconnected:", event.code, event.reason);
      setWsConnected(false);
      // Set error only if connection was never established or uncleanly closed and no data exists
      if (!event.wasClean && lights.length === 0) {
          setError("Koneksi real-time terputus.");
          setInitialLoading(false); // Stop loading if closed before data received
      } else if (!event.wasClean) {
          console.warn("WebSocket connection closed uncleanly.");
          // Optionally show a less intrusive "disconnected" message if needed
      }
      // Reconnect logic could be implemented here based on event.code/reason
    };

    // Cleanup Function: Close WebSocket on component unmount
    return () => {
      if (ws.current) {
        console.log("Closing WebSocket connection...");
        ws.current.onclose = null; ws.current.onerror = null;
        ws.current.onmessage = null; ws.current.onopen = null;
        ws.current.close();
        ws.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [WS_SECRET_KEY, WSS_HOST]); // Re-run only if config changes


  // --- Handler Aksi Pengguna (Toggle & Save Settings) ---

  const handleToggleLight = useCallback(async (lightId: string) => {
      const light = lights.find(l => l.id === lightId);
      if (!light || light.currentMode !== 'MANUAL' || loadingStates[lightId]) return;

      const newStateString: 'ON' | 'OFF' = light.currentState === 'ON' ? 'OFF' : 'ON';
      const newStateBoolean = mapStringStateToBoolean(newStateString);
      if (newStateBoolean === undefined) return;

      setLoadingStates((prev) => ({ ...prev, [lightId]: true }));
      setError(null); // Clear previous error on new action

      const bodyPayload = {
          state: newStateBoolean,
          mode: light.currentMode,
          turnOnTime: light.currentTurnOnTime,
          turnOffTime: light.currentTurnOffTime,
      };

      try {
          const token = Cookies.get("userAuth");
          if (!token || !BASE_API_URL) throw new Error("Auth/Config Error.");

          console.log(`(API Call) Manual Toggle ${lightId} -> ${newStateString}`);
          const response = await fetch(`${BASE_API_URL}/output/${lightId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(bodyPayload),
          });

          if (response.status === 401 || response.status === 403) { handleLogout(); return; }
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Gagal toggle (Status: ${response.status})` }));
            throw new Error(errorData.message || `Gagal toggle (Status: ${response.status})`);
          }

          // TIDAK update state 'lights' lokal, tunggu update dari WebSocket
          const result = await response.json();
          console.log("Toggle request successful:", result.message);

      } catch (err: any) {
        console.error(`Gagal manual toggle ${lightId}:`, err);
        showNotification(err.message || `Gagal mengubah status ${light.name}.`, "error");
      } finally {
        setLoadingStates((prev) => ({ ...prev, [lightId]: false }));
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lights, loadingStates]);


  const handleEditSettings = (lightId: string) => {
    const light = lights.find(l => l.id === lightId);
    if (!light) return;
    const currentSetting: TempSettings = {
      mode: light.currentMode,
      turnOnTime: light.currentTurnOnTime || "18:00", // Default time if null
      turnOffTime: light.currentTurnOffTime || "06:00", // Default time if null
    };
    setTempSettings(currentSetting);
    setEditingSettingsId(lightId);
  };

  const handleTempSettingChange = (field: keyof TempSettings, value: string) => {
    if (!tempSettings) return; // Should not happen if editing
    const newTempSettings = { ...tempSettings, [field]: value };
    // Auto-populate default time if switching to AUTO_DATETIME and time is null/empty
    if (field === "mode" && value === 'AUTO_DATETIME') {
      newTempSettings.turnOnTime = newTempSettings.turnOnTime || "18:00";
      newTempSettings.turnOffTime = newTempSettings.turnOffTime || "06:00";
    }
    setTempSettings(newTempSettings);
  };

  const handleCancelSettings = useCallback(() => {
      setEditingSettingsId(null);
      setTempSettings(null);
  }, []);

  const handleSaveSettings = useCallback(async (lightId: string) => {
    const light = lights.find(l => l.id === lightId);
    if (!tempSettings || !light || settingsLoadingStates[lightId]) return;

    setSettingsLoadingStates((prev) => ({ ...prev, [lightId]: true }));
    setError(null); // Clear previous error

    const isAutoDateTimeMode = tempSettings.mode === 'AUTO_DATETIME';
    // Validate time format only if mode is AUTO_DATETIME
    if (isAutoDateTimeMode) {
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!tempSettings.turnOnTime || !tempSettings.turnOffTime ||
            !timeRegex.test(tempSettings.turnOnTime) || !timeRegex.test(tempSettings.turnOffTime))
        {
            showNotification("Format Waktu ON dan OFF harus valid (HH:MM) untuk mode Otomatis Jadwal.", "error");
            setSettingsLoadingStates((prev) => ({ ...prev, [lightId]: false }));
            return; // Stop submission
        }
    }

    // Prepare payload, use last known state from 'lights' data
    const bodyPayload = {
        state: mapStringStateToBoolean(light.currentState),
        mode: tempSettings.mode,
        turnOnTime: isAutoDateTimeMode ? tempSettings.turnOnTime : null,
        turnOffTime: isAutoDateTimeMode ? tempSettings.turnOffTime : null,
    };

    try {
        const token = Cookies.get("userAuth");
        if (!token || !BASE_API_URL) throw new Error("Auth/Config Error.");

        console.log(`(API Call) Simpan pengaturan ${lightId}:`, bodyPayload);
        const response = await fetch(`${BASE_API_URL}/output/${lightId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(bodyPayload),
        });

        if (response.status === 401 || response.status === 403) { handleLogout(); return; }
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Gagal simpan (Status: ${response.status})` }));
          throw new Error(errorData.message || `Gagal simpan (Status: ${response.status})`);
        }

        // TIDAK update state 'lights' lokal, tunggu update dari WebSocket
        const result = await response.json();
        showNotification(result.message || "Pengaturan berhasil disimpan.", "success");
        setEditingSettingsId(null); // Close editor on success
        setTempSettings(null); // Clear temporary settings

    } catch (err: any) {
      console.error(`Gagal simpan pengaturan ${lightId}:`, err);
      showNotification(err.message || `Gagal menyimpan pengaturan.`, "error");
    } finally {
      setSettingsLoadingStates((prev) => ({ ...prev, [lightId]: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempSettings, lights, settingsLoadingStates]);


  // ==================
  // === Render JSX ===
  // ==================
  return (
    <div className="w-full">
      {/* Header & Indikator Koneksi WS */}
      <div className="mb-4 flex items-center justify-between px-1">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Kontrol & Otomatisasi Lampu
          </h3>
          <div className={`flex items-center text-xs transition-colors duration-300 ${wsConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <span className={`mr-1.5 h-2 w-2 rounded-full ${wsConnected ? 'animate-pulse bg-green-500' : 'bg-red-500'}`}></span>
              {wsConnected ? 'Realtime Aktif' : (initialLoading ? 'Menyambungkan...' : 'Koneksi Terputus')}
          </div>
      </div>

      {/* Tampilan Loading Awal */}
      {initialLoading && lights.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
          <FaSpinner className="mr-3 animate-spin text-xl" /> Menerima data awal...
        </div>
      /* Tampilan Error Fetch Awal (jika WS gagal konek & data kosong) */
      ) : error && lights.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-2 rounded-lg border border-red-300 bg-red-100 p-4 text-center dark:border-red-700 dark:bg-red-900/40">
           <div className="flex items-center space-x-2">
                <FaExclamationTriangle className="text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
           </div>
           {/* <button onClick={() => window.location.reload()} className="text-xs text-blue-600 hover:underline dark:text-blue-400">Muat Ulang Halaman</button> */}
        </div>
      ) : (
        // Grid Lampu (Tampil jika tidak loading awal atau ada error tapi data sudah ada)
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5">
          {/* Tampilkan error non-fatal di atas grid jika ada */}
           {error && lights.length > 0 && (
               <div className="sm:col-span-2 flex items-center justify-center space-x-2 rounded-lg border border-red-300 bg-red-100 p-3 text-center dark:border-red-700 dark:bg-red-900/40">
                 <FaExclamationTriangle className="text-red-600 dark:text-red-400" />
                 <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
               </div>
           )}
          {/* Jika tidak ada lampu sama sekali */}
          {!initialLoading && lights.length === 0 && !error && (
                <div className="sm:col-span-2 flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                    Tidak ada data lampu yang ditemukan.
                </div>
          )}
          {/* Loop melalui data lampu dari state 'lights' */}
          {lights.map((light) => {
            const isOn = light.currentState === 'ON';
            const isManualLoading = loadingStates[light.id] ?? false;
            const isAutoMode = light.currentMode !== 'MANUAL';
            const isEditing = editingSettingsId === light.id;
            const isSavingSettings = settingsLoadingStates[light.id] ?? false;
            const currentTempSettings = isEditing ? tempSettings : null;

            // Fallback jika tempSettings null saat editing
            if (isEditing && !currentTempSettings) {
                 console.warn(`[Render Warning] Editing ${light.id} but tempSettings is null.`);
                 return (
                     <div key={light.id} className="flex items-center justify-center rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                         <FaSpinner className="animate-spin mr-2" /> Memuat editor...
                     </div>
                 );
            }

            // --- Render Kartu Lampu ---
            return (
              <motion.div
                key={light.id}
                layout
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={!isEditing ? { scale: 1.02, transition: { duration: 0.15 } } : {}}
                className={`relative overflow-hidden rounded-xl border transition-shadow duration-300 ease-in-out
                  ${isEditing ? "z-10 shadow-2xl ring-2 ring-indigo-500 dark:ring-indigo-400 bg-white dark:bg-gray-800" : "shadow-sm"}
                  ${!isEditing && isOn ? "border-yellow-300 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 shadow-yellow-200/30 dark:border-yellow-600/70 dark:from-gray-800 dark:via-yellow-900/30 dark:to-gray-800 dark:shadow-yellow-900/40" : ""}
                  ${!isEditing && !isOn ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/60" : ""}
                  `}
              >
                <AnimatePresence initial={false} mode="wait">
                  {/* Tampilkan Editor jika isEditing dan tempSettings ada */}
                  {isEditing && currentTempSettings ? (
                    <motion.div
                      key={`settings-editor-${light.id}`}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-full flex-col"
                    >
                      {/* Header Editor */}
                      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-300 p-4 dark:border-gray-600">
                        <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100"> Pengaturan: {light.name} </h4>
                        <button onClick={handleCancelSettings} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 dark:text-gray-500 dark:hover:bg-gray-700" title="Tutup" aria-label="Tutup Pengaturan"> <FaTimes size={16} /> </button>
                      </div>
                      {/* Form Pengaturan */}
                      <div className="flex-grow space-y-4 overflow-y-auto p-4">
                        {/* Pilihan Mode */}
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5"> Mode Operasi </label>
                          <div className="flex flex-wrap gap-2">
                            {OUTPUT_MODES_BACKEND.map((mode) => (
                              <button key={mode} type="button" onClick={() => handleTempSettingChange("mode", mode)}
                                className={`rounded-md border px-3 py-1.5 text-sm transition-all duration-200 ${currentTempSettings.mode === mode ? "border-indigo-700 bg-indigo-600 font-semibold text-white shadow-sm" : "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"}`}
                              > {MODE_DISPLAY_MAP[mode] ?? mode} </button>
                            ))}
                          </div>
                           <div className="mt-2"> <p className="text-xs text-gray-500 dark:text-gray-400"> {currentTempSettings.mode === 'AUTO_SUN' ? 'Lampu menyala otomatis saat gelap.' : currentTempSettings.mode === 'AUTO_DATETIME' ? 'Lampu menyala sesuai jadwal di bawah.' : 'Nyalakan/matikan lampu secara manual.'} </p> </div>
                        </div>
                        {/* Input Waktu (conditional) */}
                        <AnimatePresence>
                          {currentTempSettings?.mode === 'AUTO_DATETIME' && (
                            <motion.div key="time-inputs" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{duration: 0.3}} className="overflow-hidden">
                              <div className="mt-2 space-y-3 rounded-md border border-gray-300 bg-gray-50 p-3 pt-2 dark:border-gray-600 dark:bg-gray-700/50">
                                <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-300"> <FaClock /> Atur Jadwal </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div>
                                    <label htmlFor={`turnOnTime-${light.id}`} className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"> Waktu Nyala </label>
                                    <input id={`turnOnTime-${light.id}`} type="time" name="turnOnTime" value={currentTempSettings.turnOnTime || ""} onChange={(e) => handleTempSettingChange("turnOnTime", e.target.value)}
                                      className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100" />
                                  </div>
                                  <div>
                                    <label htmlFor={`turnOffTime-${light.id}`} className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300"> Waktu Mati </label>
                                    <input id={`turnOffTime-${light.id}`} type="time" name="turnOffTime" value={currentTempSettings.turnOffTime || ""} onChange={(e) => handleTempSettingChange("turnOffTime", e.target.value)}
                                      className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100" />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {/* Tombol Aksi Bawah Editor */}
                      <div className="flex flex-shrink-0 justify-end space-x-2 border-t border-gray-200 p-4 dark:border-gray-700">
                        <button type="button" onClick={handleCancelSettings} disabled={isSavingSettings} className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"> Batal </button>
                        <button type="button" onClick={() => handleSaveSettings(light.id)} disabled={isSavingSettings || !currentTempSettings}
                          className="flex min-w-[80px] items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800">
                          {isSavingSettings ? ( <> <FaSpinner className="-ml-1 mr-2 h-4 w-4 animate-spin" /> Menyimpan... </> ) : ( <> <FaSave className="-ml-1 mr-2 h-4 w-4" /> Simpan </> )}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    // === Konten Utama Kartu (Saat tidak editing) ===
                    <motion.div key={`main-content-${light.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-4">
                      <div className="mb-2 flex items-start justify-between">
                        {/* Info Lampu */}
                        <div className="mr-2 flex-grow">
                          <div className="mb-1 flex items-center">
                            <FaLightbulb className={`mr-2 flex-shrink-0 text-xl transition-all duration-300 ${isOn ? "text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)] filter" : "text-gray-400 dark:text-gray-500"}`} />
                            <span className="font-semibold text-gray-800 dark:text-gray-100"> {light.name} </span>
                          </div>
                          {light.description && ( <p className="mb-2 text-xs text-gray-500 dark:text-gray-400"> {light.description} </p> )}
                          <div className="flex items-center space-x-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${isOn ? "bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-200" : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200"}`}>
                              {isManualLoading ? "..." : isOn ? "Nyala" : "Mati"}
                            </span>
                            {light.currentMode === 'AUTO_SUN' && ( <FaSun title={MODE_DISPLAY_MAP_FULL[light.currentMode]} className="text-orange-500 dark:text-orange-400" size={14}/> )}
                            {light.currentMode === 'AUTO_DATETIME' && ( <FaClock title={`${MODE_DISPLAY_MAP_FULL[light.currentMode]} (${formatTime(light.currentTurnOnTime).replace(' WIB','')} - ${formatTime(light.currentTurnOffTime).replace(' WIB','')})`} className="text-blue-500 dark:text-blue-400" size={14} /> )}
                          </div>
                        </div>
                        {/* Tombol Toggle & Settings */}
                        <div className="flex flex-shrink-0 flex-col items-end space-y-2">
                          <div className={`relative flex h-7 w-14 items-center rounded-full p-1 transition-colors duration-300 ease-in-out ${isAutoMode || isManualLoading ? "cursor-not-allowed bg-gray-300 dark:bg-gray-600 opacity-70" : ""} ${!isAutoMode && !isManualLoading && isOn ? "cursor-pointer bg-green-500 dark:bg-green-600" : ""} ${!isAutoMode && !isManualLoading && !isOn ? "cursor-pointer bg-gray-300 dark:bg-gray-500" : ""}`}
                             onClick={() => !isAutoMode && !isManualLoading && handleToggleLight(light.id)}
                             title={ isManualLoading ? "Memproses..." : isAutoMode ? `${MODE_DISPLAY_MAP_FULL[light.currentMode]} Aktif` : `Toggle ${light.name}`}
                             role="switch" aria-checked={isOn} aria-disabled={isAutoMode || isManualLoading} tabIndex={isAutoMode || isManualLoading ? -1 : 0}>
                            <motion.div className="relative z-10 h-5 w-5 rounded-full bg-white shadow-md" layout transition={{ type: "spring", stiffness: 700, damping: 30 }} initial={false} animate={{ x: isOn ? "1.75rem" : "0rem" }}>
                             {isManualLoading && ( <div className="absolute inset-0 flex items-center justify-center"> <FaSpinner className="h-3 w-3 animate-spin text-gray-500" /> </div> )}
                            </motion.div>
                           </div>
                          <button onClick={() => handleEditSettings(light.id)} disabled={isSavingSettings} className={`rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 dark:text-gray-400 dark:hover:bg-gray-700 ${isSavingSettings ? 'cursor-not-allowed opacity-50' : ''} `}
                            title={`Pengaturan ${light.name}`} aria-label={`Pengaturan ${light.name}`}> <FaCog size={16} /> </button>
                        </div>
                      </div>
                      {/* Indikator Status Bawah */}
                      <motion.div className="absolute bottom-0 left-0 h-1 rounded-bl-xl" initial={false} animate={{ width: isOn ? "100%" : "0%", background: isOn ? "rgba(52, 211, 153, 0.7)" : "transparent" }} transition={{ duration: 0.4, ease: "easeOut" }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
            // --- Akhir Render Kartu Lampu ---
          })}
        </div>
      )}
    </div> // Akhir wrapper utama komponen
  );
};

export default GardenLightsControl;