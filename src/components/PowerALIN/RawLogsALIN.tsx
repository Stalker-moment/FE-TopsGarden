"use client";

import React, { useState, useEffect, useMemo } from "react";
import { RawLogItem, RawLogsResponse } from "@/types/alin";
import { 
  FaClock, FaLayerGroup, FaFileCode, FaCopy, FaDownload, 
  FaSyncAlt, FaChevronLeft, FaChevronRight, FaServer, FaSearch, FaCheck
} from "react-icons/fa";
import { MdElectricBolt, MdOutlineMemory } from "react-icons/md";
import { jakartaDate, formatWibTime } from "@/lib/alin/historyData";

export default function RawLogsALIN() {
  const [date, setDate] = useState(() => jakartaDate());
  const [hour, setHour] = useState(() => {
    try {
      const nowWib = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
      return new Date(nowWib).getHours();
    } catch {
      return 9;
    }
  });
  const [scope, setScope] = useState<"hour" | "live">("hour");
  const [logsData, setLogsData] = useState<RawLogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterTerm, setFilterTerm] = useState("");
  const [page, setPage] = useState(0);
  const [jsonView, setJsonView] = useState(false);
  const [copied, setCopied] = useState(false);
  const pageSize = 50;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        date,
        hour: String(hour),
        limit: scope === "hour" ? "5000" : "1000",
      });

      const res = await fetch(`/api/kos/raw-logs?${queryParams.toString()}`, {
        headers: {
          "x-kos-date": date,
          "x-kos-hour": String(hour),
          "x-kos-limit": scope === "hour" ? "5000" : "1000",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const json: RawLogsResponse = await res.json();
        setLogsData(json);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [date, hour, scope]);

  const rawPoints = logsData?.points || [];

  // Filtered
  const filteredPoints = useMemo(() => {
    if (!filterTerm.trim()) return rawPoints;
    const q = filterTerm.toLowerCase();
    return rawPoints.filter((p) => {
      const t = formatWibTime(p.createdAt).toLowerCase();
      const pow = String(p.power ?? "");
      const volt = String(p.voltage ?? "");
      const curr = String(p.current ?? "");
      return t.includes(q) || pow.includes(q) || volt.includes(q) || curr.includes(q);
    });
  }, [rawPoints, filterTerm]);

  // Statistics
  const stats = useMemo(() => {
    if (!rawPoints.length) return null;
    const powers = rawPoints.map((p) => Number(p.power) || 0);
    const voltages = rawPoints.map((p) => Number(p.voltage) || 0);
    const currents = rawPoints.map((p) => Number(p.current) || 0);
    const apparents = rawPoints.map((p) => Math.hypot(Number(p.power) || 0, (Number(p.voltage) || 0) * (Number(p.current) || 0)));

    return {
      count: rawPoints.length,
      avgPower: powers.reduce((a, b) => a + b, 0) / (powers.length || 1),
      maxPower: Math.max(0, ...powers),
      avgVoltage: voltages.reduce((a, b) => a + b, 0) / (voltages.length || 1),
      avgCurrent: currents.reduce((a, b) => a + b, 0) / (currents.length || 1),
      avgApparent: apparents.reduce((a, b) => a + b, 0) / (apparents.length || 1),
    };
  }, [rawPoints]);

  const totalPages = Math.max(1, Math.ceil(filteredPoints.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = page * pageSize;
    return filteredPoints.slice(start, start + pageSize);
  }, [filteredPoints, page]);

  function copyJson() {
    navigator.clipboard.writeText(JSON.stringify(rawPoints, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadJson() {
    const filename = `topsgarden-kos-logs-${date}-jam${String(hour).padStart(2, "0")}.json`;
    const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
              Audit Telemetri Per Detik
            </span>
            <h3 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white tracking-tight mt-0.5">
              Inspeksi Log Mentah Sensor PZEM & Validasi ALIN
            </h3>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Verifikasi keaslian telemetri kelistrikan AC langsung dari pembacaan mikrokontroler sensor di kamar kos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-400 block mb-1">Jam WIB</label>
              <select
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, "0")}:00 – {String(i).padStart(2, "0")}:59 WIB
                  </option>
                ))}
              </select>
            </div>

            <div className="self-end">
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <FaSyncAlt size={11} className={loading ? "animate-spin" : ""} />
                Segarkan
              </button>
            </div>
          </div>
        </div>

        {/* Scope Selector */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/60">
          <button
            onClick={() => setScope("hour")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              scope === "hour"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <FaLayerGroup size={11} /> Seluruh Jam {String(hour).padStart(2, "0")}:00–{String(hour).padStart(2, "0")}:59
          </button>
          <button
            onClick={() => setScope("live")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              scope === "live"
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            }`}
          >
            <MdElectricBolt size={13} /> Log Realtime Terbaru ({rawPoints.length} log)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-sm">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Total Sampel</span>
            <h5 className="text-xl font-black text-gray-800 dark:text-gray-100 mt-1">{stats.count}</h5>
            <p className="text-[10px] text-gray-400">record log sensor</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-sm">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Daya Rata-rata</span>
            <h5 className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.avgPower.toFixed(1)} W</h5>
            <p className="text-[10px] text-gray-400">daya aktif</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-sm">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Daya Puncak</span>
            <h5 className="text-xl font-black text-amber-500 mt-1">{stats.maxPower.toFixed(1)} W</h5>
            <p className="text-[10px] text-gray-400">beban maksimum</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-sm">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Tegangan Rata-rata</span>
            <h5 className="text-xl font-black text-gray-800 dark:text-gray-100 mt-1">{stats.avgVoltage.toFixed(1)} V</h5>
            <p className="text-[10px] text-gray-400">tegangan grid RMS</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-sm">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Arus Rata-rata</span>
            <h5 className="text-xl font-black text-emerald-500 mt-1">{stats.avgCurrent.toFixed(3)} A</h5>
            <p className="text-[10px] text-gray-400">arus beban AC</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 shadow-sm">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Daya Semu</span>
            <h5 className="text-xl font-black text-indigo-500 mt-1">{stats.avgApparent.toFixed(1)} VA</h5>
            <p className="text-[10px] text-gray-400">V × I semu</p>
          </div>
        </div>
      )}

      {/* Action Tools & Table */}
      <div className="rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 p-6 md:p-8 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setJsonView((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <FaFileCode size={11} /> {jsonView ? "Tabel Log" : "Lihat JSON"}
            </button>
            <button
              onClick={copyJson}
              disabled={!rawPoints.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {copied ? <FaCheck className="text-green-500" size={11} /> : <FaCopy size={11} />}
              {copied ? "Tersalin!" : "Salin JSON"}
            </button>
            <button
              onClick={downloadJson}
              disabled={!rawPoints.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <FaDownload size={11} /> Unduh JSON
            </button>
          </div>

          <div className="relative">
            <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
            <input
              type="search"
              placeholder="Cari detik / daya..."
              value={filterTerm}
              onChange={(e) => {
                setFilterTerm(e.target.value);
                setPage(0);
              }}
              className="pl-8 pr-3 py-1.5 rounded-xl text-xs border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content Table or JSON */}
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            <FaSyncAlt className="animate-spin inline-block mr-2" /> Memuat data log mentah sensor...
          </div>
        ) : jsonView ? (
          <div className="p-4 rounded-2xl bg-gray-900 text-gray-200 font-mono text-xs overflow-x-auto max-h-[450px]">
            <pre>{JSON.stringify(rawPoints, null, 2)}</pre>
          </div>
        ) : !rawPoints.length ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400 space-y-3">
            <p className="text-sm font-semibold">Tidak ada log sensor pada rentang jam ini.</p>
            <p className="text-xs max-w-md mx-auto">
              Sensor PZEM mungkin sedang offline pada jam tersebut atau buffer telemetri berada di jam terkini.
            </p>
            <button
              onClick={() => setScope("live")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white"
            >
              <MdElectricBolt size={14} /> Tampilkan Log Sensor Realtime Terkini
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-semibold">
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3">Waktu WIB</th>
                    <th className="py-2.5 px-3 text-right">Daya (W)</th>
                    <th className="py-2.5 px-3 text-right">Tegangan (V)</th>
                    <th className="py-2.5 px-3 text-right">Arus (A)</th>
                    <th className="py-2.5 px-3 text-right">PF</th>
                    <th className="py-2.5 px-3 text-right">Frekuensi (Hz)</th>
                    <th className="py-2.5 px-3 text-right">Daya Semu (VA)</th>
                    <th className="py-2.5 px-3 text-right">Meter kWh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300 font-mono">
                  {paginatedLogs.map((p, i) => {
                    const idx = page * pageSize + i + 1;
                    const apparent = (Number(p.voltage) || 0) * (Number(p.current) || 0);
                    return (
                      <tr key={p.id || i} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                        <td className="py-2 px-3 text-gray-400 text-[10px]">{idx}</td>
                        <td className="py-2 px-3 font-sans font-medium text-gray-900 dark:text-gray-100">
                          {formatWibTime(p.createdAt)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                          {Number(p.power || 0).toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300">
                          {Number(p.voltage || 0).toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                          {Number(p.current || 0).toFixed(3)}
                        </td>
                        <td className="py-2 px-3 text-right">{Number(p.pf || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">{Number(p.frequency || 50).toFixed(1)}</td>
                        <td className="py-2 px-3 text-right text-indigo-500 font-medium">
                          {apparent > 0 ? apparent.toFixed(1) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-400">
                          {Number(p.energy || 0).toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/60 text-xs text-gray-500">
                <span>
                  Menampilkan {page * pageSize + 1}–
                  {Math.min((page + 1) * pageSize, filteredPoints.length)} dari {filteredPoints.length} log
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                  >
                    <FaChevronLeft size={10} />
                  </button>
                  <span className="font-semibold px-2">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                  >
                    <FaChevronRight size={10} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

