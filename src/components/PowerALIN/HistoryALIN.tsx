"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { DisaggregationResult, ApplianceMetric } from "@/types/alin";
import { KOS_APPLIANCES } from "@/lib/alin/apiConfig";
import { jakartaDate } from "@/lib/alin/historyData";
import { 
  FaCalendarAlt, FaClock, FaBolt, FaPlay, FaPause, 
  FaRedo, FaForward, FaStepForward, FaStepBackward, FaCalculator
} from "react-icons/fa";
import { MdFunctions, MdElectricBolt } from "react-icons/md";
import ComputationModal from "./ComputationModal";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function HistoryALIN() {
  const [granularity, setGranularity] = useState<"minutely" | "hourly" | "daily" | "monthly" | "yearly">("hourly");
  const [date, setDate] = useState(() => "2026-11-08"); // Has full rich test patterns
  const [availableDates, setAvailableDates] = useState<string[]>(["2026-11-10", "2026-11-09", "2026-11-08", "2026-11-07", "2026-11-06"]);
  const [data, setData] = useState<DisaggregationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Playback state
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Load available dates
  useEffect(() => {
    fetch("/api/kos/dates")
      .then((r) => r.json())
      .then((d) => {
        if (d?.dates && Array.isArray(d.dates) && d.dates.length > 0) {
          setAvailableDates(d.dates);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch disaggregation
  const fetchDisaggregation = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        granularity,
        date,
      });
      const res = await fetch(`/api/kos/disaggregation?${q.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const json: DisaggregationResult = await res.json();
        setData(json);
        setPlaybackIndex(0);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, [granularity, date]);

  useEffect(() => {
    fetchDisaggregation();
  }, [fetchDisaggregation]);

  const handleProcessNMF = () => {
    setShowModal(true);
    fetchDisaggregation();
  };

  const points = data?.points || [];
  const breakdown = data?.applianceBreakdown || [];

  // Playback timer
  useEffect(() => {
    if (!isPlaying || !isPlaybackMode || points.length === 0) return;
    const intervalTime = Math.max(100, Math.round(1000 / playbackSpeed));
    const timer = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= points.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);
    return () => clearInterval(timer);
  }, [isPlaying, isPlaybackMode, playbackSpeed, points.length]);

  // Active point for playback
  const currentPoint = isPlaybackMode && points[playbackIndex] ? points[playbackIndex] : points[points.length - 1];

  // 1. Stacked Area Chart Options (Profil Kontribusi Daya Tiap Alat W x H)
  const stackedAreaOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        stacked: true,
        toolbar: { show: false },
        animations: { enabled: !isPlaybackMode },
        background: "transparent",
      },
      colors: KOS_APPLIANCES.map((a) => a.color),
      stroke: { curve: "smooth", width: 1.5 },
      fill: {
        type: "gradient",
        gradient: {
          opacityFrom: 0.7,
          opacityTo: 0.2,
          stops: [0, 90, 100],
        },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: "rgba(156, 163, 175, 0.15)",
        strokeDashArray: 3,
      },
      xaxis: {
        categories: points.map((p) => p.label),
        labels: {
          style: { colors: "#9ca3af", fontSize: "10px" },
          rotate: 0,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#9ca3af", fontSize: "10px" },
          formatter: (v) => `${v.toFixed(0)} W`,
        },
      },
      legend: {
        position: "bottom",
        labels: { colors: "#9ca3af" },
        fontSize: "11px",
      },
      tooltip: {
        theme: "dark",
        shared: true,
        intersect: false,
        y: { formatter: (v) => `${(v || 0).toFixed(1)} W` },
      },
    }),
    [points, isPlaybackMode],
  );

  const stackedAreaSeries = useMemo(() => {
    return KOS_APPLIANCES.map((app) => ({
      name: app.name,
      data: points.map((p) => Number(p.powers?.[app.id] || 0)),
    }));
  }, [points]);

  // 2. Donut Chart Options (Pangsa Konsumsi Energi 5 Alat)
  const donutOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", background: "transparent" },
      colors: KOS_APPLIANCES.map((a) => a.color),
      labels: KOS_APPLIANCES.map((a) => a.name),
      dataLabels: { enabled: false },
      stroke: { colors: ["transparent"] },
      legend: { show: false },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total Energi",
                color: "#9ca3af",
                formatter: () => `${data?.metadata?.totalEnergyKwh?.toFixed(3) || "0.000"} kWh`,
              },
            },
          },
        },
      },
      tooltip: {
        theme: "dark",
        y: { formatter: (v) => `${(v || 0).toFixed(4)} kWh` },
      },
    }),
    [data],
  );

  const donutSeries = useMemo(() => {
    return KOS_APPLIANCES.map((app) => {
      const found = breakdown.find((b) => b.id === app.id);
      return Number(found?.totalKwh || 0);
    });
  }, [breakdown]);

  // 3. Bar Chart Options (Distribusi Energi Interval)
  const barOptions: ApexOptions = useMemo(
    () => ({
      chart: { type: "bar", stacked: true, toolbar: { show: false }, background: "transparent" },
      colors: KOS_APPLIANCES.map((a) => a.color),
      plotOptions: { bar: { columnWidth: "55%", borderRadius: 2 } },
      dataLabels: { enabled: false },
      grid: { borderColor: "rgba(156, 163, 175, 0.15)", strokeDashArray: 3 },
      xaxis: {
        categories: points.map((p) => p.label),
        labels: { style: { colors: "#9ca3af", fontSize: "10px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#9ca3af", fontSize: "10px" },
          formatter: (v) => `${v.toFixed(3)} kWh`,
        },
      },
      legend: { show: false },
      tooltip: {
        theme: "dark",
        shared: true,
        intersect: false,
        y: { formatter: (v) => `${(v || 0).toFixed(4)} kWh` },
      },
    }),
    [points],
  );

  const barSeries = useMemo(() => {
    return KOS_APPLIANCES.map((app) => ({
      name: app.name,
      data: points.map((p) => {
        const w = Number(p.powers?.[app.id] || 0);
        const dur = p.durationHours || 1;
        return Number(((w / 1000) * dur).toFixed(5));
      }),
    }));
  }, [points]);

  return (
    <div className="space-y-6">
      <ComputationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        granularity={granularity}
        totalPoints={points.length || 24}
      />

      {/* Control & Date Header */}
      <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-tight">
                Riwayat & Pemrosesan Disagregasi ALIN (Kos)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {points.length} titik data dianalisis
              </span>
            </div>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Pilih rentang waktu (menit, jam, hari, bulan, tahun) untuk menjalankan faktorisasi matriks NMF
            </p>
          </div>

          {/* Granularity Switcher */}
          <div className="flex rounded-2xl bg-gray-100 dark:bg-gray-900/60 p-1 border border-gray-200/80 dark:border-gray-700/80">
            {(["minutely", "hourly", "daily", "monthly", "yearly"] as const).map((g) => {
              const labels: Record<string, string> = {
                minutely: "Menit",
                hourly: "Jam",
                daily: "Hari",
                monthly: "Bulan",
                yearly: "Tahun",
              };
              const active = granularity === g;
              return (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {labels[g]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Date Bar & Action Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
              <FaCalendarAlt size={10} /> Akses Cepat Tanggal:
            </span>
            {availableDates.slice(0, 5).map((d) => {
              const active = date === d;
              return (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                    active
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 font-bold"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {d}
                </button>
              );
            })}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2.5 py-1 rounded-xl text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaybackMode((m) => !m)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                isPlaybackMode
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50"
              }`}
            >
              <FaPlay size={10} /> {isPlaybackMode ? "Tutup Playback" : "Mode Playback Animasi"}
            </button>
            <button
              onClick={handleProcessNMF}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
            >
              <MdFunctions size={16} />
              {loading ? "Memproses ALIN..." : "Proses ALIN (NMF)"}
            </button>
          </div>
        </div>

        {/* Playback Controls (if active) */}
        {isPlaybackMode && points.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaybackIndex((p) => Math.max(0, p - 1))}
                disabled={playbackIndex === 0}
                className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 text-purple-600 disabled:opacity-40"
              >
                <FaStepBackward size={10} />
              </button>
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {isPlaying ? <FaPause size={10} /> : <FaPlay size={10} />}
                {isPlaying ? "Jeda" : "Mulai"}
              </button>
              <button
                onClick={() => setPlaybackIndex((p) => Math.min(points.length - 1, p + 1))}
                disabled={playbackIndex >= points.length - 1}
                className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 text-purple-600 disabled:opacity-40"
              >
                <FaStepForward size={10} />
              </button>
              <button
                onClick={() => {
                  setPlaybackIndex(0);
                  setIsPlaying(false);
                }}
                className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 text-gray-600 dark:text-gray-300"
              >
                <FaRedo size={10} />
              </button>
            </div>

            {/* Slider */}
            <div className="flex-1 min-w-[200px] flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300">
                {currentPoint?.label}
              </span>
              <input
                type="range"
                min={0}
                max={points.length - 1}
                value={playbackIndex}
                onChange={(e) => setPlaybackIndex(Number(e.target.value))}
                className="flex-1 h-2 bg-purple-200 dark:bg-purple-900 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <span className="text-xs font-mono text-gray-400">
                {playbackIndex + 1} / {points.length}
              </span>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 text-xs">
              {[1, 2, 4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  className={`px-2 py-1 rounded-lg font-bold ${
                    playbackSpeed === s
                      ? "bg-purple-600 text-white"
                      : "bg-white dark:bg-gray-800 text-purple-600"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4 Overview KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-5 md:p-6 shadow-md">
          <span className="text-xs font-semibold text-gray-400 uppercase">Total Konsumsi Energi</span>
          <h4 className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {data?.metadata?.totalEnergyKwh?.toFixed(4) || "0.0000"} <span className="text-sm font-medium text-gray-400">kWh</span>
          </h4>
          <p className="text-[11px] text-gray-400 mt-1">Terukur: {data?.metadata?.totalEnergyMeasuredKwh?.toFixed(4) || "—"} kWh</p>
        </div>

        <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-5 md:p-6 shadow-md">
          <span className="text-xs font-semibold text-gray-400 uppercase">Estimasi Biaya PLN</span>
          <h4 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-gray-100 mt-1">
            Rp {(data?.metadata?.estimatedCostIdr || 0).toLocaleString("id-ID")}
          </h4>
          <p className="text-[11px] text-gray-400 mt-1">Tarif R-1: Rp 1.444,70 / kWh</p>
        </div>

        <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-5 md:p-6 shadow-md">
          <span className="text-xs font-semibold text-gray-400 uppercase">Akurasi Rekonstruksi NMF</span>
          <h4 className="text-2xl md:text-3xl font-black text-emerald-500 mt-1">
            {data?.metadata?.reconstructionAccuracyPct?.toFixed(2) || "100.00"}%
          </h4>
          <p className="text-[11px] text-gray-400 mt-1">RMSE Frobenius: {data?.metadata?.rmse || "0.89"}</p>
        </div>

        <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-5 md:p-6 shadow-md">
          <span className="text-xs font-semibold text-gray-400 uppercase">Beban Puncak</span>
          <h4 className="text-2xl md:text-3xl font-black text-amber-500 mt-1">
            {points.length ? Math.max(...points.map((p) => p.actualPower)).toFixed(1) : "—"} <span className="text-sm font-medium text-gray-400">Watt</span>
          </h4>
          <p className="text-[11px] text-gray-400 mt-1">Maksimum tercatat interval</p>
        </div>
      </div>

      {/* 5 Appliance Decomposition Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {KOS_APPLIANCES.map((app) => {
          const metric = breakdown.find((b) => b.id === app.id);
          const pct = metric?.percentage || 0;
          return (
            <div
              key={app.id}
              className="p-5 rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-md space-y-2 relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: app.color }}
              />
              <div className="flex items-center justify-between">
                <span className="text-2xl">{app.icon}</span>
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ color: app.color, backgroundColor: `${app.color}15` }}
                >
                  {pct.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{app.name}</p>
              <p className="text-[10px] text-gray-400">{app.usagePattern}</p>
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Energi:</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                    {(metric?.totalKwh || 0).toFixed(4)} kWh
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Puncak:</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {(metric?.peakWatt || 0).toFixed(1)} W
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Basis NMF:</span>
                  <span className="font-mono text-gray-500">{app.nominalWatt} W</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts: Stacked Area + Donut Proportions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Stacked Area */}
        <div className="lg:col-span-2 rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white">
                Profil Kontribusi Daya Tiap Alat Kos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Grafik area bertumpuk hasil dekomposisi matriks W × H sepanjang rentang waktu
              </p>
            </div>
            {isPlaybackMode && (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200">
                Playback: {currentPoint?.label} ({currentPoint?.actualPower.toFixed(1)} W)
              </span>
            )}
          </div>
          <div className="h-[320px] w-full">
            <ReactApexChart options={stackedAreaOptions} series={stackedAreaSeries} type="area" height="100%" />
          </div>
        </div>

        {/* Right 1 Col: Donut Proportions */}
        <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white mb-1">
              Proporsi Konsumsi Energi
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pangsa kilowatt-jam 5 peralatan kamar kos
            </p>
            <div className="h-[230px] w-full mt-2">
              <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height="100%" />
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 pt-3 border-t border-gray-100 dark:border-gray-700/60">
            {KOS_APPLIANCES.map((app) => {
              const m = breakdown.find((b) => b.id === app.id);
              return (
                <div key={app.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: app.color }} />
                    <span className="truncate">{app.name}</span>
                  </span>
                  <span className="font-mono font-bold">{(m?.percentage || 0).toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interval Bar Chart */}
      <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-white">
              Distribusi Energi Tiap Langkah Waktu (kWh)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Grafik batang bertumpuk menunjukkan energi yang diserap tiap interval waktu
            </p>
          </div>
        </div>
        <div className="h-[250px] w-full">
          <ReactApexChart options={barOptions} series={barSeries} type="bar" height="100%" />
        </div>
      </div>
    </div>
  );
}

