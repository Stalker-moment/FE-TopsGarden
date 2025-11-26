// src/components/InspiredSmartUIControl.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaLightbulb,
  FaSpinner,
  FaCog,
  FaSun,
  FaClock,
  FaTimes,
  FaSave,
  FaBrain, // Icon for Focus Scene
  FaCoffee, // Icon for Relax Scene
  FaPowerOff // Icon for All Off Scene
} from "react-icons/fa";

// --- Tipe Data & State Awal ---
interface Light {
  id: string;
  name: string;
  currentState: 'ON' | 'OFF';
  currentMode: 'MANUAL' | 'AUTO_SUN' | 'AUTO_DATETIME';
  turnOnTime: string;
  turnOffTime: string;
  isLoading?: boolean;
}

const initialLights: Light[] = [
  { id: 'partial-1', name: 'Lampu Kiri', currentState: 'ON', currentMode: 'MANUAL', turnOnTime: '18:00', turnOffTime: '06:00' },
  { id: 'partial-2', name: 'Lampu Utama', currentState: 'OFF', currentMode: 'AUTO_DATETIME', turnOnTime: '19:00', turnOffTime: '05:30' },
  { id: 'partial-3', name: 'Lampu Kanan', currentState: 'OFF', currentMode: 'MANUAL', turnOnTime: '18:30', turnOffTime: '06:30' },
  { id: 'partial-4', name: 'Ambiance', currentState: 'ON', currentMode: 'MANUAL', turnOnTime: '18:00', turnOffTime: '06:00' },
];

// --- Komponen Kartu Lampu Individual ---
const LightCard: React.FC<{
  light: Light;
  onToggle: (id: string) => void;
  onSettings: (light: Light) => void;
}> = ({ light, onToggle, onSettings }) => {
  const isOn = light.currentState === 'ON';
  const isAutoMode = light.currentMode !== 'MANUAL';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
      className={`
        p-5 rounded-2xl flex flex-col justify-between transition-all duration-300 h-44
        ${isOn
          ? 'bg-amber-400 text-slate-800 shadow-xl shadow-amber-500/20'
          : 'bg-slate-200/50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-lg shadow-slate-900/10 dark:shadow-black/20'
        }
      `}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <FaLightbulb className={`text-3xl mb-2 transition-colors ${isOn ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
          <span className="font-bold text-lg">{light.name}</span>
          <span className={`text-xs font-semibold ${isOn ? 'text-slate-700' : 'text-slate-500'}`}>
            {isAutoMode ? light.currentMode.replace('_', ' ') : 'Manual'}
          </span>
        </div>
        <button onClick={() => onSettings(light)} className={`p-2 rounded-full transition-colors ${isOn ? 'hover:bg-white/20' : 'text-slate-500 hover:bg-slate-300/50 dark:hover:bg-slate-700'}`}><FaCog /></button>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="font-semibold text-sm">{isOn ? 'Nyala' : 'Mati'}</span>
        {/* Toggle Switch */}
        <button
          onClick={() => !isAutoMode && !light.isLoading && onToggle(light.id)}
          disabled={isAutoMode || light.isLoading}
          className={`relative flex items-center h-7 w-12 rounded-full p-1 transition-colors duration-300 ${isAutoMode ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' : isOn ? 'bg-white/40' : 'bg-slate-300 dark:bg-slate-700'} cursor-pointer`}
        >
          {light.isLoading && <FaSpinner className="animate-spin text-slate-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />}
          <motion.div layout transition={{ type: 'spring', stiffness: 700, damping: 30 }} className={`h-5 w-5 rounded-full ${isOn ? 'bg-white' : 'bg-white dark:bg-slate-500'}`} style={{ x: isOn ? '20px' : '0px' }} />
        </button>
      </div>
    </motion.div>
  );
};

// --- Komponen Modal Pengaturan ---
const SettingsModal: React.FC<{
    light: Light | null;
    onClose: () => void;
    onSave: (settings: Light) => void;
}> = ({ light, onClose, onSave }) => {
    const [tempSettings, setTempSettings] = useState<Light | null>(light);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { setTempSettings(light) }, [light]);

    if (!tempSettings) return null;

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => { // Simulate API call
            onSave(tempSettings);
            setIsSaving(false);
        }, 1000);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">Pengaturan: {tempSettings.name}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"><FaTimes /></button>
                </div>
                {/* Form Content Here (similar to previous version) */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} disabled={isSaving} className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition">Batal</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition w-32">
                        {isSaving ? <FaSpinner className="animate-spin mx-auto" /> : 'Simpan'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};


// --- Komponen Utama ---
const InspiredSmartUIControl: React.FC = () => {
    const [lights, setLights] = useState<Light[]>(initialLights);
    const [editingLight, setEditingLight] = useState<Light | null>(null);

    const handleToggle = (id: string) => {
        setLights(lights.map(l => l.id === id ? { ...l, isLoading: true } : l));
        setTimeout(() => {
            setLights(lights.map(l => l.id === id ? { ...l, currentState: l.currentState === 'ON' ? 'OFF' : 'ON', isLoading: false } : l));
        }, 500);
    };

    const handleSaveSettings = (settings: Light) => {
        setLights(lights.map(l => l.id === settings.id ? { ...settings, isLoading: false } : l));
        setEditingLight(null);
    };

    const handleSetScene = (scene: 'focus' | 'relax' | 'off') => {
        setLights(currentLights => currentLights.map(light => {
            if (light.currentMode !== 'MANUAL') return light; // Only affect manual lights
            
            let newState: 'ON' | 'OFF' = light.currentState;
            if (scene === 'focus') {
                newState = (light.id === 'partial-2' || light.id === 'partial-3') ? 'ON' : 'OFF';
            } else if (scene === 'relax') {
                newState = (light.id === 'partial-1' || light.id === 'partial-4') ? 'ON' : 'OFF';
            } else if (scene === 'off') {
                newState = 'OFF';
            }
            return { ...light, currentState: newState };
        }));
    };

    return (
        <div className="min-h-screen w-full bg-slate-200 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl p-6 bg-slate-100 dark:bg-slate-800/50 rounded-3xl shadow-2xl space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Kontrol Lampu Meja</h1>
                    <p className="text-slate-500">Pilih scene atau atur lampu secara individual.</p>
                </div>

                {/* Scene Controls */}
                <div className="space-y-3">
                    <h2 className="font-bold text-slate-700 dark:text-slate-300">Scenes</h2>
                    <div className="flex space-x-3">
                        <button onClick={() => handleSetScene('focus')} className="flex-1 p-3 bg-white dark:bg-slate-700 rounded-xl shadow hover:shadow-lg transition flex items-center justify-center space-x-2"><FaBrain className="text-blue-500" /> <span className="font-semibold text-sm">Fokus Kerja</span></button>
                        <button onClick={() => handleSetScene('relax')} className="flex-1 p-3 bg-white dark:bg-slate-700 rounded-xl shadow hover:shadow-lg transition flex items-center justify-center space-x-2"><FaCoffee className="text-amber-600" /> <span className="font-semibold text-sm">Santai</span></button>
                        <button onClick={() => handleSetScene('off')} className="flex-1 p-3 bg-white dark:bg-slate-700 rounded-xl shadow hover:shadow-lg transition flex items-center justify-center space-x-2"><FaPowerOff className="text-red-500" /> <span className="font-semibold text-sm">Mati Semua</span></button>
                    </div>
                </div>

                {/* Individual Light Controls */}
                <div className="space-y-3">
                    <h2 className="font-bold text-slate-700 dark:text-slate-300">Lampu Individual</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        <AnimatePresence>
                            {lights.map(light => (
                                <LightCard key={light.id} light={light} onToggle={handleToggle} onSettings={() => setEditingLight(light)} />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {editingLight && <SettingsModal light={editingLight} onClose={() => setEditingLight(null)} onSave={handleSaveSettings} />}
            </AnimatePresence>
        </div>
    );
};

export default InspiredSmartUIControl;