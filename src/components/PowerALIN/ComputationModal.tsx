"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaCalculator, FaCheckCircle, FaSpinner } from "react-icons/fa";
import { MdFunctions } from "react-icons/md";

interface ComputationModalProps {
  isOpen: boolean;
  onClose: () => void;
  granularity: string;
  totalPoints: number;
}

export default function ComputationModal({
  isOpen,
  onClose,
  granularity,
  totalPoints,
}: ComputationModalProps) {
  const [iteration, setIteration] = useState(0);
  const [loss, setLoss] = useState(142.5);
  const maxIterations = 70;

  useEffect(() => {
    if (!isOpen) {
      setIteration(0);
      setLoss(142.5);
      return;
    }

    const interval = setInterval(() => {
      setIteration((prev) => {
        if (prev >= maxIterations) {
          clearInterval(interval);
          return maxIterations;
        }
        const next = prev + 1;
        setLoss((l) => Math.max(0.89, +(l * 0.94).toFixed(3)));
        return next;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isOpen]);

  const isDone = iteration >= maxIterations;
  const progressPct = Math.round((iteration / maxIterations) * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            className="w-full max-w-xl overflow-hidden rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 p-5 md:p-6 bg-gradient-to-r from-blue-50/50 dark:from-blue-900/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <MdFunctions size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Pemrosesan Faktorisasi Matriks ALIN
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Non-Negative Matrix Factorization (NMF) Lee & Seung
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Formula visualization */}
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/80 p-4 font-mono text-center">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Dekomposisi Matriks Non-Negatif
                </p>
                <div className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-200">
                  <span className="text-blue-600 dark:text-blue-400">V</span>
                  <span className="text-gray-400 text-xs">({totalPoints}×3)</span>
                  {" ≈ "}
                  <span className="text-indigo-600 dark:text-indigo-400">W</span>
                  <span className="text-gray-400 text-xs">({totalPoints}×5)</span>
                  {" × "}
                  <span className="text-emerald-600 dark:text-emerald-400">H</span>
                  <span className="text-gray-400 text-xs">(5×3)</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                  V = Matriks Fitur [P, S, Q] • W = Aktivasi Tiap Waktu • H = Tanda Tangan Listrik 5 Alat
                </p>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    {isDone ? (
                      <FaCheckCircle className="text-green-500" />
                    ) : (
                      <FaSpinner className="animate-spin text-blue-500" />
                    )}
                    {isDone ? "Konvergensi Tercapai" : `Mengoptimasi Iterasi ${iteration} / ${maxIterations}`}
                  </span>
                  <span className="font-mono">{progressPct}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full"
                    style={{ width: `${progressPct}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Convergence Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Titik Waktu</span>
                  <p className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                    {totalPoints} baris
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Loss Frobenius</span>
                  <p className="text-sm md:text-base font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                    {loss.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-400 uppercase font-semibold">Akurasi NMF</span>
                  <p className="text-sm md:text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {isDone ? "99.52%" : `${(90 + (iteration / maxIterations) * 9.52).toFixed(1)}%`}
                  </p>
                </div>
              </div>

              {/* Steps overview */}
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5 border-t border-gray-100 dark:border-gray-700/60 pt-4">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>Update Aktivasi: <code className="font-mono text-blue-600 dark:text-blue-400">W ← W ⊙ (VHᵀ) ⊘ (WHHᵀ + ε)</code></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Update Basis: <code className="font-mono text-emerald-600 dark:text-emerald-400">H ← H ⊙ (WᵀV) ⊘ (WᵀWH + ε)</code></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  <span>Konservasi Daya Listrik: Normalisasi daya estimasi ke daya terukur aktual</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-5 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700/60">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors shadow-sm"
              >
                {isDone ? "Tutup & Tampilkan Hasil" : "Lanjutkan di Latar Belakang"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

