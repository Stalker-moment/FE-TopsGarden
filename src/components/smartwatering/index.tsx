// src/components/PlantWateringUI.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    FaPlay,
    FaStop,
    FaSeedling,
    FaTint,
    FaSpinner,
    FaCheckCircle,
    FaClock,
    FaInfoCircle, // <-- Ikon untuk info/statistik
    FaThermometerHalf, // <-- Ikon Suhu
    FaWater,           // <-- Ikon Kelembapan (alternatif FaTint)
    FaVial,            // <-- Ikon pH (kimia)
    FaTimes,           // <-- Ikon close modal
    FaPlus,            // <-- Ikon tambah (jika perlu)
    FaMinus,           // <-- Ikon kurang (jika perlu)
    FaSprayCan,        // <-- Ikon untuk siram manual
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// --- Konstanta Simulasi ---
const TOTAL_PLANTS = 10;
const BATCH_WATERING_DURATION_MS = 2000; // Durasi "penyiraman" batch per tanaman (ms)
const DEFAULT_MANUAL_WATER_DURATION_S = 3; // Durasi default siram manual (detik)

// --- Tipe Data ---
type PlantStatus = 'idle' | 'watering_batch' | 'watering_manual' | 'watered' | 'pending';

// Data Statistik Tanaman (Simulasi)
interface PlantStats {
    soilPh: number;
    soilMoisture: number; // Persentase
    soilTemperature: number; // Derajat Celsius
    type: string; // Jenis Tanaman (e.g., "Mawar", "Tomat")
    lastWatered: Date | null;
}

interface Plant extends PlantStats {
    id: number;
    name: string;
    status: PlantStatus;
}

// --- Helper Functions ---
/**
 * Menghasilkan nilai acak dalam rentang tertentu.
 * @param min Nilai minimum
 * @param max Nilai maksimum
 * @param decimals Jumlah angka desimal (default 1)
 * @returns Angka acak
 */
const getRandomValue = (min: number, max: number, decimals: number = 1): number => {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
};

/**
 * Mengubah milidetik menjadi string format detik yang mudah dibaca.
 * @param ms Milidetik
 * @returns String format durasi (e.g., "2 detik", "1.5 detik")
 */
const formatDuration = (ms: number): string => {
    if (ms <= 0) return "0 detik";
    if (ms < 1000) {
        return `${ms} ms`;
    }
    const seconds = ms / 1000;
    return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)} detik`;
};

/**
 * Memformat tanggal menjadi string yang mudah dibaca.
 * @param date Objek Date atau null
 * @returns String tanggal atau "Belum pernah"
 */
const formatDate = (date: Date | null): string => {
    if (!date) return "Belum pernah";
    return date.toLocaleString("id-ID", {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Daftar Jenis Tanaman (Contoh)
const plantTypes = ["Mawar", "Anggrek", "Tomat", "Cabai", "Melati", "Kaktus", "Lavender", "Mint", "Basil", "Sukulen"];

// --- Komponen Utama ---
const PlantWateringUI: React.FC<{}> = () => {
    // --- State ---
    const [plants, setPlants] = useState<Plant[]>(() =>
        Array.from({ length: TOTAL_PLANTS }, (_, i) => ({
            id: i + 1,
            name: `Tanaman ${i + 1}`,
            status: 'idle',
            // Data Statistik Awal (Simulasi)
            type: plantTypes[i % plantTypes.length] || "Tanaman Hias",
            soilPh: getRandomValue(5.5, 7.5),
            soilMoisture: getRandomValue(30, 80, 0),
            soilTemperature: getRandomValue(18, 30),
            lastWatered: null, // Awalnya belum disiram
        }))
    );
    const [isBatchWateringActive, setIsBatchWateringActive] = useState<boolean>(false);
    const [currentBatchWateringIndex, setCurrentBatchWateringIndex] = useState<number>(-1);
    const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // State untuk Siram Manual
    const [manualWateringTargetId, setManualWateringTargetId] = useState<number | null>(null);
    const [manualWateringDurationS, setManualWateringDurationS] = useState<number>(DEFAULT_MANUAL_WATER_DURATION_S); // Durasi dalam detik
    const [manualWateringTimer, setManualWateringTimer] = useState<number | null>(null); // Sisa waktu manual (ms)
    const manualTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const manualIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // State untuk Modal Statistik
    const [selectedPlantStats, setSelectedPlantStats] = useState<Plant | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);


    // --- Format Durasi Batch (hitung sekali) ---
    const formattedBatchWateringDuration = formatDuration(BATCH_WATERING_DURATION_MS);

    // --- Logika Efek Samping untuk Proses Penyiraman Batch ---
    useEffect(() => {
        // Hentikan jika tidak aktif, index di luar batas, atau sedang siram manual
        if (!isBatchWateringActive || currentBatchWateringIndex < 0 || currentBatchWateringIndex >= TOTAL_PLANTS || manualWateringTargetId !== null) {
            if (!isBatchWateringActive && currentBatchWateringIndex === -1) {
                // Pastikan semua status 'watering_batch' atau 'pending' kembali ke 'idle' saat dihentikan
                 setPlants(prevPlants => prevPlants.map(p =>
                    p.status === 'watering_batch' || p.status === 'pending' ? {...p, status: 'idle'} : p
                ));
            }
            return;
        }

        // Tandai tanaman saat ini sebagai 'watering_batch'
        setPlants(prevPlants =>
            prevPlants.map((plant, index) =>
                index === currentBatchWateringIndex ? { ...plant, status: 'watering_batch' } : plant
            )
        );

        // Set Timeout untuk menyelesaikan penyiraman tanaman ini
        batchTimeoutRef.current = setTimeout(() => {
            const finishedPlantId = plants[currentBatchWateringIndex]?.id; // Dapatkan ID sebelum state berubah

            setPlants(prevPlants =>
                prevPlants.map((plant, index) =>
                    index === currentBatchWateringIndex
                        ? { ...plant, status: 'watered', lastWatered: new Date() } // Tandai selesai & catat waktu
                        : plant
                )
            );

            const nextIndex = currentBatchWateringIndex + 1;
            if (nextIndex < TOTAL_PLANTS) {
                // Tandai tanaman berikutnya sebagai 'pending'
                 setPlants(prevPlants =>
                    prevPlants.map((plant, index) =>
                        index === nextIndex ? { ...plant, status: 'pending' } : plant
                    )
                );
                // Beri jeda singkat sebelum memulai tanaman berikutnya
                setTimeout(() => setCurrentBatchWateringIndex(nextIndex), 150);
            } else {
                // Selesai semua
                setIsBatchWateringActive(false);
                setCurrentBatchWateringIndex(-1);
                console.log("Penyiraman Batch Selesai!");
                 // Opsi: Kembalikan semua ke idle setelah beberapa saat? Atau biarkan 'watered'? Biarkan saja.
            }
        }, BATCH_WATERING_DURATION_MS);

        // Cleanup function
        return () => {
            if (batchTimeoutRef.current) {
                clearTimeout(batchTimeoutRef.current);
                batchTimeoutRef.current = null;
            }
        };
    }, [isBatchWateringActive, currentBatchWateringIndex, plants, manualWateringTargetId]); // Tambahkan plants & manualWateringTargetId ke dependency

    // --- Logika Efek Samping untuk Siram Manual ---
    useEffect(() => {
        if (manualWateringTargetId === null || manualWateringTimer === null) {
            return; // Tidak ada proses siram manual aktif
        }

        // Timer utama untuk mengakhiri penyiraman manual
        manualTimeoutRef.current = setTimeout(() => {
            setPlants(prevPlants =>
                prevPlants.map(p =>
                    p.id === manualWateringTargetId
                        ? { ...p, status: 'watered', lastWatered: new Date() }
                        : p
                )
            );
            setManualWateringTargetId(null);
            setManualWateringTimer(null);
            if (manualIntervalRef.current) clearInterval(manualIntervalRef.current);
            manualIntervalRef.current = null;
            console.log(`Penyiraman Manual Tanaman ${manualWateringTargetId} Selesai!`);
        }, manualWateringTimer);

        // Interval untuk countdown timer tampilan
        const startTime = Date.now();
        manualIntervalRef.current = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const remainingTime = manualWateringTimer - elapsedTime;
            setManualWateringTimer(Math.max(0, remainingTime));
            if (remainingTime <= 0) {
                 if (manualIntervalRef.current) clearInterval(manualIntervalRef.current);
                 manualIntervalRef.current = null;
            }
        }, 100); // Update setiap 100ms

        // Cleanup function
        return () => {
            if (manualTimeoutRef.current) clearTimeout(manualTimeoutRef.current);
            if (manualIntervalRef.current) clearInterval(manualIntervalRef.current);
            manualTimeoutRef.current = null;
            manualIntervalRef.current = null;
             // Jika dihentikan paksa, kembalikan status ke idle
             setPlants(prevPlants =>
                 prevPlants.map(p =>
                     p.id === manualWateringTargetId && p.status === 'watering_manual'
                         ? { ...p, status: 'idle' }
                         : p
                 )
             );
        };
    }, [manualWateringTargetId, manualWateringTimer]); // Hanya bergantung pada ID target dan timer awal

    // --- Handler Tombol ---
    const handleStartBatchWatering = useCallback(() => {
        if (isBatchWateringActive || manualWateringTargetId !== null) return; // Jangan mulai jika batch sudah jalan atau ada siram manual
        console.log("Memulai Penyiraman Batch...");
        setPlants(prevPlants =>
            prevPlants.map(plant => ({ ...plant, status: 'idle' })) // Reset semua status dulu
        );
        setCurrentBatchWateringIndex(0); // Mulai dari tanaman pertama
        setIsBatchWateringActive(true);
    }, [isBatchWateringActive, manualWateringTargetId]);

    const handleStopBatchWatering = useCallback(() => {
        if (!isBatchWateringActive) return;
        console.log("Menghentikan Penyiraman Batch...");
        setIsBatchWateringActive(false);
        setCurrentBatchWateringIndex(-1); // Reset index
        if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
            batchTimeoutRef.current = null;
        }
        // Status 'watering_batch' dan 'pending' akan direset ke 'idle' oleh useEffect cleanup
    }, [isBatchWateringActive]);

    const handleStartManualWatering = useCallback((plantId: number, durationSeconds: number) => {
        if (isBatchWateringActive || manualWateringTargetId !== null) {
             console.warn("Tidak bisa memulai siram manual saat proses lain berjalan.");
             return; // Jangan mulai jika ada proses lain
        }
        if (durationSeconds <= 0) {
            console.warn("Durasi siram manual harus positif.");
            return;
        }

        const durationMs = durationSeconds * 1000;
        console.log(`Memulai Penyiraman Manual Tanaman ${plantId} selama ${durationSeconds} detik...`);

        setPlants(prevPlants =>
            prevPlants.map(p => p.id === plantId ? { ...p, status: 'watering_manual' } : p)
        );
        setManualWateringTargetId(plantId);
        setManualWateringTimer(durationMs); // Set sisa waktu awal

        // Timer & Interval diatur oleh useEffect [manualWateringTargetId, manualWateringTimer]

    }, [isBatchWateringActive, manualWateringTargetId]);

    const handleStopManualWatering = useCallback(() => {
        if (manualWateringTargetId === null) return;
         console.log(`Menghentikan Penyiraman Manual Tanaman ${manualWateringTargetId}...`);
        if (manualTimeoutRef.current) clearTimeout(manualTimeoutRef.current);
        if (manualIntervalRef.current) clearInterval(manualIntervalRef.current);
        manualTimeoutRef.current = null;
        manualIntervalRef.current = null;

        // Kembalikan status ke idle secara manual karena useEffect cleanup mungkin belum jalan
         setPlants(prevPlants =>
             prevPlants.map(p =>
                 p.id === manualWateringTargetId ? { ...p, status: 'idle' } : p
             )
         );

        setManualWateringTargetId(null);
        setManualWateringTimer(null);
    }, [manualWateringTargetId]);


    // Handler untuk menampilkan modal statistik
    const handleShowStats = (plant: Plant) => {
        setSelectedPlantStats(plant);
        setIsModalOpen(true);
    };

    // Handler untuk menutup modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        // Beri sedikit jeda agar animasi fade-out selesai sebelum data hilang
        setTimeout(() => setSelectedPlantStats(null), 300);
    };

    // Hitungan Progress Batch
    const wateredCountBatch = plants.filter(p => p.status === 'watered').length; // Bisa dihitung ulang jika perlu
    const progressBatch = TOTAL_PLANTS > 0 ? (wateredCountBatch / TOTAL_PLANTS) * 100 : 0;
    const currentPlantBeingBatchWatered = plants.find(p=> p.status === 'watering_batch');

    // ==================
    // === Render JSX ===
    // ==================
    return (
        <div className="w-full p-4 md:p-6 bg-gradient-to-br from-green-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 min-h-[500px] rounded-lg shadow-xl relative overflow-hidden">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-2xl lg:text-3xl font-bold text-green-700 dark:text-green-300 text-center sm:text-left flex items-center">
                    <FaSeedling className="inline-block mr-2 mb-1 text-3xl" />
                    Kontrol Penyiraman Tanaman
                </h3>
                <motion.button
                    onClick={isBatchWateringActive ? handleStopBatchWatering : handleStartBatchWatering}
                    disabled={manualWateringTargetId !== null} // Disable jika sedang siram manual
                    className={`flex items-center justify-center rounded-lg px-5 py-2 text-base font-semibold shadow-md transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                        isBatchWateringActive
                            ? "bg-red-500 hover:bg-red-600 text-white focus:ring-red-400"
                            : "bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400"
                    } ${manualWateringTargetId !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                    whileHover={{ scale: manualWateringTargetId === null ? 1.05 : 1 }}
                    whileTap={{ scale: manualWateringTargetId === null ? 0.95 : 1 }}
                >
                    {isBatchWateringActive ? (
                        <>
                            <FaSpinner className="animate-spin mr-2" /> Hentikan Batch
                        </>
                    ) : (
                        <>
                            <FaPlay className="mr-2" /> Mulai Siram Semua ({TOTAL_PLANTS})
                        </>
                    )}
                </motion.button>
            </div>

             {/* Progress Bar dan Status Batch */}
            <div className="mb-6">
                 <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Progress Penyiraman Batch</label>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative border border-gray-300 dark:border-gray-600">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-600 dark:to-cyan-600 transition-all duration-500 ease-out"
                        initial={{ width: '0%' }}
                        animate={{ width: `${progressBatch}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center px-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                             {isBatchWateringActive && currentPlantBeingBatchWatered
                                ? `Batch: Menyiram ${currentPlantBeingBatchWatered.name}... (${wateredCountBatch}/${TOTAL_PLANTS})`
                                : manualWateringTargetId !== null
                                ? `Manual: Menyiram Tanaman ${manualWateringTargetId}...`
                                : progressBatch === 100 && plants.some(p => p.lastWatered) // Cek jika sudah pernah ada yg disiram
                                ? `Batch Selesai (${wateredCountBatch}/${TOTAL_PLANTS})`
                                : `Siap (${wateredCountBatch}/${TOTAL_PLANTS})`}
                        </span>
                    </div>
                </div>
            </div>


            {/* Grid Tanaman */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                {plants.map((plant) => {
                    const isWateringBatchThis = plant.status === 'watering_batch';
                    const isWateringManualThis = plant.status === 'watering_manual';
                    const isWateredThis = plant.status === 'watered';
                    const isPendingThis = plant.status === 'pending';
                    const isIdle = plant.status === 'idle';
                    const isCurrentlyManualTarget = manualWateringTargetId === plant.id;
                    // Bisa siram manual jika idle DAN tidak ada proses batch/manual lain yg aktif
                    const canManuallyWater = isIdle && !isBatchWateringActive && manualWateringTargetId === null;

                    return (
                        <motion.div
                            key={plant.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: 1,
                                scale: isWateringBatchThis || isWateringManualThis ? 1.08 : 1,
                                transition: { type: "spring", stiffness: 300, damping: 20 }
                            }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={`relative flex flex-col items-center justify-between p-3 rounded-xl border-2 text-center shadow-lg transition-all duration-300 ease-in-out min-h-[220px] overflow-hidden group
                                ${isWateringBatchThis ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50 ring-2 ring-blue-300 dark:ring-blue-600 transform scale-105 z-10' : ''}
                                ${isWateringManualThis ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/50 ring-2 ring-purple-300 dark:ring-purple-600 transform scale-105 z-10' : ''}
                                ${isWateredThis ? 'border-green-400 bg-green-50 dark:bg-green-900/40 opacity-90' : ''}
                                ${isPendingThis ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/40' : ''}
                                ${isIdle ? 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700/80 hover:shadow-md' : ''}
                            `}
                        >
                            {/* Bagian Atas: Ikon dan Nama */}
                            <div className="flex flex-col items-center w-full cursor-pointer" onClick={() => handleShowStats(plant)} title="Klik untuk lihat detail">
                                <motion.div
                                    animate={{ rotate: isWateringBatchThis || isWateringManualThis ? [0, -5, 5, -5, 0] : 0 }}
                                    transition={{ duration: 0.5, repeat: isWateringBatchThis || isWateringManualThis ? Infinity : 0, repeatType: "loop" }}
                                >
                                <FaSeedling
                                    className={`text-4xl mb-2 transition-colors duration-300
                                        ${isWateringBatchThis ? 'text-blue-600 dark:text-blue-400' : ''}
                                        ${isWateringManualThis ? 'text-purple-600 dark:text-purple-400' : ''}
                                        ${isWateredThis ? 'text-green-500 dark:text-green-400' : ''}
                                        ${isPendingThis ? 'text-yellow-500 dark:text-yellow-400' : ''}
                                        ${isIdle ? 'text-gray-500 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400' : ''}
                                    `}
                                    />
                                </motion.div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1 truncate w-full px-1" title={plant.name}>
                                    {plant.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{plant.type}</p>
                            </div>

                             {/* Bagian Tengah: Status */}
                             <div className="h-6 flex items-center justify-center text-xs font-medium mb-2">
                                <AnimatePresence mode="wait">
                                    {isWateringBatchThis && (
                                        <motion.div key="w_batch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center text-blue-600 dark:text-blue-400">
                                            <FaTint className="mr-1 animate-pulse" /> Batch ({formattedBatchWateringDuration})
                                        </motion.div>
                                    )}
                                    {isWateringManualThis && manualWateringTimer !== null && (
                                        <motion.div key="w_manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center text-purple-600 dark:text-purple-400">
                                            <FaSprayCan className="mr-1 animate-pulse" /> Manual ({formatDuration(manualWateringTimer)})
                                        </motion.div>
                                    )}
                                    {isWateredThis && (
                                        <motion.div key="watered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center text-green-600 dark:text-green-400">
                                            <FaCheckCircle className="mr-1" /> Disiram
                                        </motion.div>
                                    )}
                                    {isPendingThis && (
                                        <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center text-yellow-600 dark:text-yellow-400">
                                            <FaSpinner className="animate-spin mr-1"/> Menunggu Batch..
                                        </motion.div>
                                    )}
                                    {isIdle && !isBatchWateringActive && manualWateringTargetId === null && (
                                        <motion.div key="idle_ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-gray-500 dark:text-gray-400">
                                            Siap Disiram
                                        </motion.div>
                                    )}
                                    {isIdle && (isBatchWateringActive || manualWateringTargetId !== null) && (
                                        <motion.div key="idle_wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-gray-500 dark:text-gray-400">
                                            Menunggu Giliran
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Bagian Bawah: Aksi Manual */}
                            <div className="w-full mt-auto pt-2 border-t border-gray-200 dark:border-gray-600/50">
                                {isCurrentlyManualTarget && !isWateringManualThis && ( // Tombol Stop Manual jika diperlukan
                                     <button
                                        onClick={handleStopManualWatering}
                                        className="w-full flex items-center justify-center gap-1 text-xs bg-red-500 text-white py-1 px-2 rounded hover:bg-red-600 transition-colors duration-200"
                                    >
                                        <FaStop /> Stop Manual
                                    </button>
                                )}
                                {!isCurrentlyManualTarget && ( // Tampilkan input & tombol siram jika bisa
                                    <div className="flex items-center justify-center gap-2">
                                         <input
                                            type="number"
                                            min="1"
                                            max="60" // Batasi maks durasi (misal 60 detik)
                                            value={manualWateringDurationS}
                                            onChange={(e) => setManualWateringDurationS(parseInt(e.target.value) || 1)}
                                            disabled={!canManuallyWater}
                                            title="Durasi siram manual (detik)"
                                            className={`w-10 text-xs p-1 text-center border rounded bg-gray-50 dark:bg-gray-600 dark:text-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 ${!canManuallyWater ? 'border-gray-300 dark:border-gray-500 opacity-50 cursor-not-allowed' : 'border-gray-300 dark:border-gray-500'}`}
                                        />
                                        <button
                                            onClick={() => handleStartManualWatering(plant.id, manualWateringDurationS)}
                                            disabled={!canManuallyWater}
                                            title={canManuallyWater ? `Siram ${plant.name} manual selama ${manualWateringDurationS} detik` : "Tidak bisa menyiram manual saat ini"}
                                            className={`flex-1 flex items-center justify-center gap-1 text-xs py-1 px-2 rounded transition-colors duration-200 ${
                                                canManuallyWater
                                                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                                                    : 'bg-gray-300 dark:bg-gray-500 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            <FaSprayCan /> Siram
                                        </button>
                                    </div>
                                )}
                            </div>


                            {/* Progress bar kecil di dalam kartu saat watering */}
                             {(isWateringBatchThis || isWateringManualThis) && (
                                <motion.div
                                    className={`absolute bottom-0 left-0 h-1 ${isWateringManualThis ? 'bg-purple-500' : 'bg-blue-500'} rounded-b-xl`}
                                    initial={{ width: '0%' }}
                                    animate={{ width: '100%'}}
                                    transition={{
                                        duration: (isWateringManualThis && manualWateringTimer ? manualWateringTimer : BATCH_WATERING_DURATION_MS) / 1000,
                                        ease: 'linear'
                                    }}
                                />
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Modal Statistik Tanaman */}
            <AnimatePresence>
                {isModalOpen && selectedPlantStats && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 dark:bg-black/70 flex items-center justify-center z-50 p-4"
                        onClick={handleCloseModal} // Tutup jika klik di luar modal
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 relative"
                            onClick={(e) => e.stopPropagation()} // Jangan tutup jika klik di dalam modal
                        >
                            <button
                                onClick={handleCloseModal}
                                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
                                aria-label="Tutup modal"
                            >
                                <FaTimes size={20} />
                            </button>

                            <div className="flex items-center mb-5">
                                <FaSeedling className="text-3xl text-green-600 dark:text-green-400 mr-3" />
                                <div>
                                    <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">{selectedPlantStats.name}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedPlantStats.type}</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                                    <span className="flex items-center text-gray-600 dark:text-gray-300">
                                        <FaVial className="mr-2 text-red-500" /> pH Tanah
                                    </span>
                                    <span className="font-medium text-gray-800 dark:text-gray-100">{selectedPlantStats.soilPh.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                                    <span className="flex items-center text-gray-600 dark:text-gray-300">
                                        <FaWater className="mr-2 text-blue-500" /> Kelembapan Tanah
                                    </span>
                                    <span className="font-medium text-gray-800 dark:text-gray-100">{selectedPlantStats.soilMoisture}%</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
                                     <span className="flex items-center text-gray-600 dark:text-gray-300">
                                        <FaThermometerHalf className="mr-2 text-orange-500" /> Suhu Tanah
                                    </span>
                                    <span className="font-medium text-gray-800 dark:text-gray-100">{selectedPlantStats.soilTemperature}°C</span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                     <span className="flex items-center text-gray-600 dark:text-gray-300">
                                        <FaClock className="mr-2 text-gray-500" /> Terakhir Disiram
                                    </span>
                                    <span className="font-medium text-gray-800 dark:text-gray-100">{formatDate(selectedPlantStats.lastWatered)}</span>
                                </div>
                            </div>

                            {/* Tombol Aksi Tambahan di Modal (Opsional) */}
                             <div className="mt-6 flex justify-end gap-3">
                                {selectedPlantStats.status === 'idle' && !isBatchWateringActive && manualWateringTargetId === null && (
                                    <button
                                        onClick={() => {
                                            handleStartManualWatering(selectedPlantStats.id, manualWateringDurationS);
                                            handleCloseModal(); // Tutup modal setelah aksi
                                        }}
                                        className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-md transition duration-200"
                                    >
                                        <FaSprayCan /> Siram Manual ({manualWateringDurationS} dtk)
                                    </button>
                                )}
                                <button
                                    onClick={handleCloseModal}
                                    className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 text-sm font-semibold px-4 py-2 rounded-lg transition duration-200"
                                >
                                    Tutup
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PlantWateringUI;