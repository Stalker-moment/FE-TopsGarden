"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ApexOptions } from "apexcharts";
import { RealtimeAnalysis } from "@/types/alin";
import { 
  FaBolt, FaTachometerAlt, FaPlug, FaPause, FaPlay, FaSyncAlt, 
  FaCheckCircle, FaTimesCircle, FaClock
} from "react-icons/fa";
import { MdElectricBolt, MdOutlineMemory } from "react-icons/md";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function RealtimeALIN() {
  const [data, setData] = useState<RealtimeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [intervalSec, setIntervalSec] = useState(2);
  const [historyPoints, setHistoryPoints] = useState<Array<{ time: string; power: number }>>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/kos/realtime", { cache: "no-store" });
      if (res.ok) {
        const json: RealtimeAnalysis = await res.json();
        setData(json);
        if (json?.telemetry) {
          const nowTime = new Date().toLocaleTimeString("id-ID", {
            timeZone: "Asia/Jakarta",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          setHistoryPoints((prev) => {
            const next = [...prev, { time: nowTime, power: json.telemetry.powerWatt }];
            return next.slice(-30);
          });
        }
      }
    } catch {
      // Ignore network abort
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (isPaused) return;
    const timer = setInterval(fetchData, intervalSec * 1000);
    return () => clearInterval(timer);
  }, [fetchData, isPaused, intervalSec]);

  const telemetry = data?.telemetry;
  const appliances = data?.estimatedAppliances || [];

  // ApexCharts Wave Options
  const chartOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        animations: {
          enabled: true,
          easing: "linear",
          dynamicAnimation: { speed: 800 },
        },
        background: "transparent",
      },
      colors: ["#06b6d4"],
      stroke: { curve: "smooth", width: 2.5 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 95, 100],
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: "rgba(156, 163, 175, 0.15)",
        strokeDashArray: 3,
      },
      xaxis: {
        categories: historyPoints.map((p) => p.time),
        labels: {
          style: { colors: "#9ca3af", fontSize: "10px" },
          rotate: 0,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        labels: {
          style: { colors: "#9ca3af", fontSize: "10px" },
          formatter: (v) => `${v.toFixed(1)} W`,
        },
      },
      tooltip: {
        theme: "dark",
        y: { formatter: (v) => `${v.toFixed(1)} Watt` },
      },
    }),
    [historyPoints],
  );

  const chartSeries = useMemo(
    () => [{ name: "Daya Terukur", data: historyPoints.map((p) => p.power) }],
    [historyPoints],
  );

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-4 md:p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FaBolt size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white">
                Telemetri Beban Realtime Kamar Kos
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live PZEM-004T
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pembacaan parameter kelistrikan AC dan dekomposisi otomatis status peralatan kos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300 transition-colors"
          >
            {isPaused ? <FaPlay size={10} className="text-green-500" /> : <FaPause size={10} className="text-amber-500" />}
            {isPaused ? "Lanjutkan" : "Jeda"}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            <FaSyncAlt size={10} className={loading ? "animate-spin" : ""} />
            Segarkan
          </button>
          <select
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <option value={1}>1 Detik</option>
            <option value={2}>2 Detik</option>
            <option value={5}>5 Detik</option>
          </select>
        </div>
      </div>

      {/* 4 Telemetry KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl md:rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-4 md:p-6 shadow-md">
          <p className="text-xs font-medium text-gray-400">Daya Nyata (Active Power)</p>
          <h4 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-gray-100 mt-1">
            {telemetry ? telemetry.powerWatt.toFixed(1) : "—"} <span className="text-sm font-medium text-gray-400">Watt</span>
          </h4>
          <p className="text-[11px] text-gray-400 mt-1">
            Daya Semu (S): {telemetry ? telemetry.apparentPowerVA.toFixed(1) : "—"} VA
          </p>
        </div>

        <div className="rounded-2xl md:rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-4 md:p-6 shadow-md">
          <p className="text-xs font-medium text-gray-400">Tegangan AC & Frekuensi</p>
          <h4 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-gray-100 mt-1">
            {telemetry ? telemetry.voltageVolt.toFixed(1) : "—"} <span className="text-sm font-medium text-gray-400">Volt</span>
          </h4>
          <p className="text-[11px] text-gray-400 mt-1">
            Frekuensi Grid: {telemetry ? telemetry.frequencyHz.toFixed(1) : "—"} Hz
          </p>
        </div>

        <div className="rounded-2xl md:rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-4 md:p-6 shadow-md">
          <p className="text-xs font-medium text-gray-400">Arus Beban Listrik</p>
          <h4 className="text-2xl md:text-3xl font-black text-amber-500 mt-1">
            {telemetry ? telemetry.currentAmpere.toFixed(2) : "—"} <span className="text-sm font-medium text-gray-400">Ampere</span>
          </h4>
          <p className="text-[11px] text-gray-400 mt-1">
            Power Factor (cos φ): {telemetry ? telemetry.powerFactor.toFixed(2) : "—"}
          </p>
        </div>

        <div className="rounded-2xl md:rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-4 md:p-6 shadow-md">
          <p className="text-xs font-medium text-gray-400">Daya Reaktif & Kualitas</p>
          <h4 className="text-2xl md:text-3xl font-black text-indigo-500 mt-1">
            {telemetry ? telemetry.reactivePowerVAR.toFixed(1) : "—"} <span className="text-sm font-medium text-gray-400">VAR</span>
          </h4>
          <p className="text-[11px] text-gray-400 mt-1">
            Karakteristik: Beban Res-Induktif
          </p>
        </div>
      </div>

      {/* Appliance States Section */}
      <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white">
              Dekomposisi Beban Seketika (ALIN Realtime)
            </h3>
          </div>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <FaClock size={11} /> Terakhir: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString("id-ID") : "—"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {appliances.map((app) => (
            <div
              key={app.id}
              className={`p-4 rounded-2xl border transition-all ${
                app.isActive
                  ? "bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/20 dark:to-gray-800/80 border-blue-300 dark:border-blue-800 shadow-sm"
                  : "bg-gray-50/50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/80 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{app.icon}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    app.isActive
                      ? "bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-800"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {app.isActive ? "AKTIF" : "OFF / STANDBY"}
                </span>
              </div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{app.name}</p>
              <h5 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                {app.estimatedWatt.toFixed(1)} <span className="text-xs font-normal text-gray-400">W</span>
              </h5>
              <div className="mt-2.5">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>Keyakinan</span>
                  <span className="font-semibold">{Math.round(app.confidence * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(app.confidence * 100)}%`,
                      backgroundColor: app.color,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Realtime Wave Chart */}
      <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h3 className="text-base font-bold text-gray-800 dark:text-white">
              Grafik Gelombang Daya Realtime (30 Titik Terakhir)
            </h3>
          </div>
          <span className="text-xs text-gray-400">
            Daya Saat Ini: <strong className="text-cyan-500">{telemetry ? telemetry.powerWatt.toFixed(1) : 0} W</strong>
          </span>
        </div>

        <div className="h-[250px] w-full">
          <ReactApexChart options={chartOptions} series={chartSeries} type="area" height="100%" />
        </div>
      </div>
    </div>
  );
}

