"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  FaBolt, FaHistory, FaBookOpen, FaSearch, FaArrowLeft, FaCheckCircle
} from "react-icons/fa";
import { MdElectricBolt, MdFunctions } from "react-icons/md";
import RealtimeALIN from "./RealtimeALIN";
import HistoryALIN from "./HistoryALIN";
import TeoriALIN from "./TeoriALIN";
import RawLogsALIN from "./RawLogsALIN";

export default function PowerALIN() {
  const [activeTab, setActiveTab] = useState<"realtime" | "history" | "teori" | "raw">("history");

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-10 pointer-events-none">
          <MdFunctions size={240} />
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/power"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md transition-colors"
              >
                <FaArrowLeft size={10} /> Kembali ke Power Monitor
              </Link>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Device: Kos (35e824b5)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <MdElectricBolt className="text-amber-300" /> Power-ALIN: Disagregasi Beban Listrik Kos
            </h1>
            <p className="text-xs md:text-sm text-blue-100 max-w-2xl leading-relaxed">
              Platform Aljabar Linear untuk memisahkan konsumsi 5 peralatan kamar kos (Kipas, Laptop, HP, Pompa Galon, Setrika) dari sensor tunggal PZEM-004T menggunakan Non-Negative Matrix Factorization (NMF).
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex flex-wrap rounded-2xl bg-black/25 backdrop-blur-xl p-1.5 border border-white/20">
            <button
              onClick={() => setActiveTab("realtime")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "realtime"
                  ? "bg-white text-blue-700 shadow-lg"
                  : "text-blue-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <FaBolt size={12} /> Realtime
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "history"
                  ? "bg-white text-blue-700 shadow-lg"
                  : "text-blue-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <FaHistory size={12} /> Riwayat & ALIN
            </button>
            <button
              onClick={() => setActiveTab("teori")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "teori"
                  ? "bg-white text-blue-700 shadow-lg"
                  : "text-blue-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <FaBookOpen size={12} /> Teori KaTeX
            </button>
            <button
              onClick={() => setActiveTab("raw")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "raw"
                  ? "bg-white text-blue-700 shadow-lg"
                  : "text-blue-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <FaSearch size={12} /> Audit Log Mentah
            </button>
          </div>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "realtime" && <RealtimeALIN />}
      {activeTab === "history" && <HistoryALIN />}
      {activeTab === "teori" && <TeoriALIN />}
      {activeTab === "raw" && <RawLogsALIN />}
    </div>
  );
}

