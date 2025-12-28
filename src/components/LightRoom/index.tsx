// src/components/ModernLightControl.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaLightbulb, FaDesktop, FaGamepad, FaMoon, FaSun, 
  FaFan, FaPlug, FaWifi, FaMusic, FaBed, FaBook
} from "react-icons/fa";
import { HiOutlineLightningBolt } from "react-icons/hi";
import { MdOutlineMeetingRoom, MdDashboard } from "react-icons/md";

// --- Tipe Data Mockup ---
type LightGroup = "Meja Belajar" | "Siluet & Ambiance" | "Kamar Utama" | "Dekorasi";

interface LightSwitch {
  id: string;
  name: string;
  group: LightGroup;
  icon: React.ReactNode;
  isOn: boolean;
  color: string; // Warna glow saat nyala
}

// --- 16 Switch Data Dummy ---
const INITIAL_SWITCHES: LightSwitch[] = [
  // GROUP 1: MEJA BELAJAR
  { id: "1", name: "Lampu Utama Meja", group: "Meja Belajar", icon: <FaBook />, isOn: true, color: "bg-yellow-400" },
  { id: "2", name: "Monitor Lightbar", group: "Meja Belajar", icon: <FaDesktop />, isOn: true, color: "bg-blue-400" },
  { id: "3", name: "Backlight Monitor", group: "Meja Belajar", icon: <FaGamepad />, isOn: false, color: "bg-purple-500" },
  { id: "4", name: "Charger Station", group: "Meja Belajar", icon: <FaPlug />, isOn: true, color: "bg-green-400" },

  // GROUP 2: SILUET & AMBIANCE (Kamar Siluet)
  { id: "5", name: "LED Strip Plafon", group: "Siluet & Ambiance", icon: <FaMoon />, isOn: true, color: "bg-indigo-500" },
  { id: "6", name: "Under Bed Glow", group: "Siluet & Ambiance", icon: <FaBed />, isOn: false, color: "bg-pink-500" },
  { id: "7", name: "Lampu Sudut", group: "Siluet & Ambiance", icon: <FaLightbulb />, isOn: false, color: "bg-orange-400" },
  { id: "8", name: "Wall Panel RGB", group: "Siluet & Ambiance", icon: <MdDashboard />, isOn: true, color: "bg-cyan-400" },

  // GROUP 3: KAMAR UTAMA
  { id: "9", name: "Lampu Langit Utama", group: "Kamar Utama", icon: <FaSun />, isOn: false, color: "bg-yellow-200" },
  { id: "10", name: "Exhaust/Fan", group: "Kamar Utama", icon: <FaFan />, isOn: true, color: "bg-teal-400" },
  { id: "11", name: "Lampu Pintu Masuk", group: "Kamar Utama", icon: <MdOutlineMeetingRoom />, isOn: false, color: "bg-white" },
  { id: "12", name: "AC Controller", group: "Kamar Utama", icon: <FaWifi />, isOn: true, color: "bg-blue-300" },

  // GROUP 4: DEKORASI / LAINNYA
  { id: "13", name: "Rak Buku 1", group: "Dekorasi", icon: <HiOutlineLightningBolt />, isOn: false, color: "bg-amber-500" },
  { id: "14", name: "Rak Buku 2", group: "Dekorasi", icon: <HiOutlineLightningBolt />, isOn: false, color: "bg-amber-500" },
  { id: "15", name: "Poster Lightbox", group: "Dekorasi", icon: <FaMusic />, isOn: true, color: "bg-red-500" },
  { id: "16", name: "Night Lamp", group: "Dekorasi", icon: <FaMoon />, isOn: false, color: "bg-violet-400" },
];

const ModernLightControl = () => {
  const [switches, setSwitches] = useState<LightSwitch[]>(INITIAL_SWITCHES);

  // Fungsi Toggle Lokal
  const toggleSwitch = (id: string) => {
    setSwitches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isOn: !s.isOn } : s))
    );
  };

  // Grouping Data
  const groupedSwitches = switches.reduce((acc, curr) => {
    if (!acc[curr.group]) acc[curr.group] = [];
    acc[curr.group].push(curr);
    return acc;
  }, {} as Record<LightGroup, LightSwitch[]>);

  return (
    <div className="min-h-screen bg-[#0f1115] text-white p-6 md:p-10 font-sans selection:bg-yellow-500/30">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              My Room Control
            </h1>
            <p className="text-gray-400 mt-2 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              16 Devices Connected • Local Mode
            </p>
          </div>
          
          <div className="bg-white/5 px-4 py-2 rounded-2xl border border-white/5 backdrop-blur-sm">
             <span className="text-xs font-mono text-gray-400">STATUS</span>
             <div className="font-bold text-lg text-yellow-400">
                {switches.filter(s => s.isOn).length} <span className="text-white text-sm font-normal">Active</span>
             </div>
          </div>
        </header>

        {/* Content Grid per Group */}
        <div className="space-y-10">
          {(Object.keys(groupedSwitches) as LightGroup[]).map((group) => (
            <section key={group} className="animate-in fade-in zoom-in duration-500">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-gray-600"></span>
                {group}
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {groupedSwitches[group].map((item) => (
                  <SwitchCard 
                    key={item.id} 
                    data={item} 
                    onToggle={() => toggleSwitch(item.id)} 
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

      </div>
    </div>
  );
};

// --- Komponen Kartu Switch (Modern Tile) ---
const SwitchCard = ({ data, onToggle }: { data: LightSwitch; onToggle: () => void }) => {
  return (
    <motion.button
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={`
        relative overflow-hidden rounded-[1.5rem] p-4 h-36 md:h-40 w-full text-left transition-all duration-300
        flex flex-col justify-between group border
        ${data.isOn 
          ? "bg-white text-gray-900 border-transparent shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
          : "bg-[#1c1e26] text-gray-400 border-white/5 hover:border-white/10 hover:bg-[#252830]"}
      `}
    >
      {/* Background Glow Effect saat ON */}
      {data.isOn && (
        <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[50px] opacity-40 ${data.color}`}></div>
      )}

      {/* Header Card: Icon & Status */}
      <div className="flex justify-between items-start z-10">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors duration-300
          ${data.isOn ? `${data.color} text-white shadow-md` : "bg-white/5 text-gray-500"}
        `}>
          {data.icon}
        </div>
        
        {/* Toggle Indicator UI */}
        <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-all ${data.isOn ? 'bg-gray-900' : 'bg-gray-700'}`}>
            <motion.div 
                layout 
                className={`w-3 h-3 rounded-full bg-white shadow-sm`}
                animate={{ x: data.isOn ? 16 : 0 }}
            />
        </div>
      </div>

      {/* Footer Card: Name */}
      <div className="z-10 mt-2">
        <h3 className={`font-bold text-sm md:text-base leading-tight ${data.isOn ? 'text-gray-900' : 'text-gray-200'}`}>
          {data.name}
        </h3>
        <span className={`text-[10px] font-medium tracking-wide ${data.isOn ? 'text-gray-600' : 'text-gray-500'}`}>
          {data.isOn ? 'ON' : 'OFF'}
        </span>
      </div>
    </motion.button>
  );
};

export default ModernLightControl;