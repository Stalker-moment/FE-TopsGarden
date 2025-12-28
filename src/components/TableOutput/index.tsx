"use client";

import React, { useEffect, useState, FormEvent, useCallback } from "react";
import Cookies from "js-cookie";
import { 
  FiEdit3, FiEye, FiTrash2, FiPlus, FiSearch, 
  FiClock, FiCpu, FiX, FiChevronLeft, FiChevronRight, FiFilter
} from "react-icons/fi";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";

// --- Konfigurasi API URL ---
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const BASE_API_URL = HTTPSAPIURL ? `https://${HTTPSAPIURL}/api/device` : '';

// --- Tipe Data ---
interface OutputItem {
  id: string;
  name: string;
  createdAt?: string;
  currentState: 'ON' | 'OFF' | 'UNKNOWN';
  currentMode: string;
  currentTurnOnTime: string | null;
  currentTurnOffTime: string | null;
}

interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

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

const formatTime = (timeString: string | null | undefined): string => {
    if (!timeString) return "-";
    if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;
    return timeString.substring(0, 5);
};

const OUTPUT_MODES_BACKEND: ReadonlyArray<string> = ['MANUAL', 'AUTO_SUN', 'AUTO_DATETIME'] as const;
const MODE_DISPLAY_MAP: { [key: string]: string } = {
    'MANUAL': 'Manual',
    'AUTO_SUN': 'Auto (Sun)',
    'AUTO_DATETIME': 'Auto (Time)'
};

// ============================
// === Komponen TableOutput ===
// ============================
const TableOutput: React.FC = () => {
  // --- State Data & Pagination ---
  const [outputData, setOutputData] = useState<OutputItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  
  // --- State UI & Loading ---
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // --- Modal States ---
  const [activeModal, setActiveModal] = useState<'add' | 'delete' | 'detail' | 'edit' | 'editName' | null>(null);
  const [selectedItem, setSelectedItem] = useState<OutputItem | null>(null);
  
  // --- Form Inputs ---
  const [newItemName, setNewItemName] = useState<string>("");
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>("");
  const [editNameValue, setEditNameValue] = useState<string>("");
  const [editItemValues, setEditItemValues] = useState<{
    state: 'ON' | 'OFF' | 'UNKNOWN';
    mode: string;
    turnOnTime: string | null;
    turnOffTime: string | null;
  }>({ state: 'UNKNOWN', mode: 'MANUAL', turnOnTime: null, turnOffTime: null });

  // --- Notification ---
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error"; } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // --- Show Notification Helper ---
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const closeModal = () => {
      setActiveModal(null);
      setSelectedItem(null);
      setModalError(null);
      setNewItemName("");
      setDeleteConfirmInput("");
  };

  // --- Fetch Data (Server Side Pagination & Search) ---
  const fetchData = useCallback(async (page: number = 1, search: string = "") => {
    if (!BASE_API_URL) return;
    setLoading(true); setError(null);
    const token = Cookies.get("userAuth");
    
    try {
      // Construct Query Params
      const params = new URLSearchParams({
          page: page.toString(),
          limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search); // Asumsi backend support query ?search=...

      const response = await fetch(`${BASE_API_URL}/outputs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      
      const result = await response.json();
      
      // Parsing Data sesuai format baru: { data: { items: [], pagination: {} } }
      const items = result.data?.items || [];
      const meta = result.data?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

      const processed = items.map((output: any) => {
          const latest = output.states?.[0]; // Ambil state terbaru
          return {
              id: output.id,
              name: output.name,
              createdAt: output.createdAt,
              currentState: mapApiStateToString(latest?.state),
              currentMode: OUTPUT_MODES_BACKEND.includes(latest?.mode) ? latest.mode : 'MANUAL',
              currentTurnOnTime: latest?.turnOnTime ?? null,
              currentTurnOffTime: latest?.turnOffTime ?? null,
          };
      });

      setOutputData(processed);
      setPagination(meta);
    } catch (err: any) {
      console.error(err);
      setError("Gagal memuat data. Periksa koneksi atau token.");
    } finally {
      setLoading(false);
    }
  }, [pagination.limit]);

  // --- Debounce Search ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
        fetchData(1, searchTerm); // Reset ke page 1 saat search berubah
    }, 500); // Tunggu 500ms setelah user berhenti mengetik

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchData]);

  // --- Handlers for Actions ---
  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= pagination.totalPages) {
          fetchData(newPage, searchTerm);
      }
  };

  const handleAdd = async (e: FormEvent) => {
     e.preventDefault();
     const token = Cookies.get("userAuth");
     try {
       await fetch(`${BASE_API_URL}/output`, {
         method: "POST",
         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
         body: JSON.stringify({ name: newItemName }),
       });
       showNotification("Perangkat berhasil ditambahkan", "success");
       closeModal();
       fetchData(1, searchTerm); // Refresh ke halaman 1
     } catch (err) { setModalError("Gagal menambah perangkat."); }
  };

  const handleDelete = async () => {
      if (!selectedItem || deleteConfirmInput !== selectedItem.name) return;
      const token = Cookies.get("userAuth");
      try {
        await fetch(`${BASE_API_URL}/output/${selectedItem.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        showNotification("Perangkat berhasil dihapus", "success");
        closeModal();
        fetchData(pagination.page, searchTerm); // Refresh halaman saat ini
      } catch (err) { setModalError("Gagal menghapus."); }
  };

  const handleEditName = async (e: FormEvent) => {
      e.preventDefault();
      if (!selectedItem) return;
      const token = Cookies.get("userAuth");
      try {
          await fetch(`${BASE_API_URL}/output/${selectedItem.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ name: editNameValue }),
          });
          showNotification("Nama perangkat diperbarui", "success");
          closeModal();
          fetchData(pagination.page, searchTerm);
      } catch (err) { setModalError("Gagal update nama."); }
  };

  const handleEditSettings = async (e: FormEvent) => {
     e.preventDefault();
     if (!selectedItem) return;
     const token = Cookies.get("userAuth");
     const isAutoTime = editItemValues.mode === 'AUTO_DATETIME';
     const bodyPayload = {
         state: mapStringStateToBoolean(editItemValues.state) ?? false,
         mode: editItemValues.mode,
         turnOnTime: isAutoTime ? editItemValues.turnOnTime : null,
         turnOffTime: isAutoTime ? editItemValues.turnOffTime : null
     };

     try {
       await fetch(`${BASE_API_URL}/output/${selectedItem.id}`, {
         method: "PUT",
         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
         body: JSON.stringify(bodyPayload),
       });
       showNotification("Konfigurasi disimpan", "success");
       closeModal();
       fetchData(pagination.page, searchTerm);
     } catch (err) { setModalError("Gagal menyimpan konfigurasi."); }
  };

  const openEditSettingsModal = (item: OutputItem) => {
      setSelectedItem(item);
      setEditItemValues({
          state: item.currentState,
          mode: item.currentMode,
          turnOnTime: item.currentTurnOnTime,
          turnOffTime: item.currentTurnOffTime
      });
      setActiveModal('edit');
  };

  // ================== RENDER UI ==================
  return (
    <div className="w-full max-w-7xl mx-auto px-2 space-y-6">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
            <motion.div initial={{ opacity: 0, y: -20, x: 20 }} animate={{ opacity: 1, y: 0, x: 0 }} exit={{ opacity: 0, x: 20 }} className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white font-medium text-sm backdrop-blur-md ${notification.type === 'success' ? 'bg-green-600/90' : 'bg-red-600/90'}`}>
                {notification.message}
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- Header Section --- */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FiCpu className="text-indigo-600 dark:text-indigo-400"/> Manajemen Output
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Kontrol perangkat, atur jadwal otomatis, dan pantau status.
              </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative group w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FiSearch />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari perangkat..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
              </div>
              {/* Add Button */}
              <button
                onClick={() => setActiveModal('add')}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                <FiPlus size={18} /> <span className="hidden sm:inline">Tambah Perangkat</span> <span className="sm:hidden">Baru</span>
              </button>
          </div>
      </div>

      {/* --- Table Content --- */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col min-h-[400px]">
         {loading ? (
             <div className="flex-1 p-6 space-y-4">
                 {[...Array(5)].map((_, i) => (
                     <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-xl animate-pulse"></div>
                 ))}
             </div>
         ) : error ? (
             <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                 <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full text-red-500 mb-3"><FiX size={24}/></div>
                 <p className="text-gray-800 dark:text-gray-200 font-medium">{error}</p>
                 <button onClick={() => fetchData(pagination.page, searchTerm)} className="mt-4 text-indigo-600 hover:underline text-sm font-semibold">Coba Muat Ulang</button>
             </div>
         ) : outputData.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-gray-400">
                 <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-full mb-3"><FiFilter size={24}/></div>
                 <p>Tidak ada data ditemukan.</p>
             </div>
         ) : (
             <>
             <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                     <thead>
                         <tr className="bg-gray-50/80 dark:bg-gray-700/30 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                             <th className="px-6 py-4">Nama Perangkat</th>
                             <th className="px-6 py-4">Status</th>
                             <th className="px-6 py-4">Mode</th>
                             <th className="px-6 py-4">Jadwal (Start - End)</th>
                             <th className="px-6 py-4 text-right">Aksi</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                         {outputData.map((item) => (
                             <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors group">
                                 <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                         <div className={`w-1.5 h-10 rounded-full transition-colors ${item.currentState === 'ON' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                         <div>
                                             <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{item.name}</p>
                                             <p className="text-[10px] text-gray-400 font-mono mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">#{item.id.split('-')[0]}...</p>
                                         </div>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                                         item.currentState === 'ON' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' :
                                         item.currentState === 'OFF' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                                         'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                     }`}>
                                         {item.currentState}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4">
                                     <span className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                         {MODE_DISPLAY_MAP[item.currentMode] || item.currentMode}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                     <div className="flex items-center gap-2">
                                         <FiClock size={14} className="text-gray-400"/>
                                         <span>
                                             {formatTime(item.currentTurnOnTime)} <span className="mx-1 text-gray-300">➜</span> {formatTime(item.currentTurnOffTime)}
                                         </span>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <div className="flex items-center justify-end gap-1">
                                         <button onClick={() => { setSelectedItem(item); setActiveModal('detail'); }} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 dark:hover:bg-blue-900/20 transition-colors" title="Detail">
                                             <FiEye size={18} />
                                         </button>
                                         <button onClick={() => { setSelectedItem(item); setEditNameValue(item.name); setActiveModal('editName'); }} className="p-2 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 dark:hover:bg-purple-900/20 transition-colors" title="Edit Nama">
                                             <MdDriveFileRenameOutline size={18}/>
                                         </button>
                                         <button onClick={() => openEditSettingsModal(item)} className="p-2 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-600 dark:hover:bg-orange-900/20 transition-colors" title="Settings">
                                             <FiEdit3 size={18}/>
                                         </button>
                                         <button onClick={() => { setSelectedItem(item); setActiveModal('delete'); }} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors" title="Hapus">
                                             <FiTrash2 size={18}/>
                                         </button>
                                     </div>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>

             {/* --- Pagination Footer --- */}
             <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="text-sm text-gray-500 dark:text-gray-400">
                     Menampilkan <span className="font-bold text-gray-900 dark:text-white">{(pagination.page - 1) * pagination.limit + 1}</span> sampai <span className="font-bold text-gray-900 dark:text-white">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> dari <span className="font-bold text-gray-900 dark:text-white">{pagination.total}</span> data
                 </div>
                 
                 <div className="flex items-center gap-2">
                     <button 
                        disabled={pagination.page === 1}
                        onClick={() => handlePageChange(pagination.page - 1)}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     >
                        <FiChevronLeft />
                     </button>
                     
                     <div className="flex items-center gap-1">
                         {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                             // Logika simple untuk menampilkan page numbers di sekitar current page
                             let pNum = i + 1;
                             if (pagination.totalPages > 5) {
                                 if (pagination.page > 3) pNum = pagination.page - 2 + i;
                                 if (pNum > pagination.totalPages) pNum = pagination.totalPages - (4 - i);
                             }
                             
                             return (
                                 <button
                                     key={pNum}
                                     onClick={() => handlePageChange(pNum)}
                                     className={`w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${
                                         pagination.page === pNum 
                                         ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' 
                                         : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                     }`}
                                 >
                                     {pNum}
                                 </button>
                             );
                         })}
                     </div>

                     <button 
                        disabled={pagination.page === pagination.totalPages}
                        onClick={() => handlePageChange(pagination.page + 1)}
                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     >
                        <FiChevronRight />
                     </button>
                 </div>
             </div>
             </>
         )}
      </div>

      {/* --- MODAL WRAPPER --- */}
      <AnimatePresence>
        {activeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden">
                    
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {activeModal === 'add' && "Tambah Perangkat"}
                            {activeModal === 'edit' && "Pengaturan Perangkat"}
                            {activeModal === 'editName' && "Ganti Nama"}
                            {activeModal === 'delete' && "Konfirmasi Hapus"}
                            {activeModal === 'detail' && "Informasi Detail"}
                        </h3>
                        <button onClick={closeModal} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"><FiX size={20}/></button>
                    </div>

                    {modalError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{modalError}</div>}

                    {/* Form Add */}
                    {activeModal === 'add' && (
                        <form onSubmit={handleAdd}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nama Perangkat</label>
                                    <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Contoh: Lampu Teras" autoFocus />
                                </div>
                                <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">Simpan Data</button>
                            </div>
                        </form>
                    )}

                    {/* Form Edit Name */}
                    {activeModal === 'editName' && (
                        <form onSubmit={handleEditName}>
                            <input type="text" value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-6 font-medium" />
                            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Update Nama</button>
                        </form>
                    )}

                    {/* Delete Confirmation */}
                    {activeModal === 'delete' && selectedItem && (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiTrash2 size={32} />
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                                Ketik <strong>{selectedItem.name}</strong> untuk menghapus permanen. Tindakan ini tidak dapat dibatalkan.
                            </p>
                            <input type="text" value={deleteConfirmInput} onChange={(e) => setDeleteConfirmInput(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center font-bold mb-6 focus:border-red-500 outline-none placeholder:font-normal" placeholder={`Ketik "${selectedItem.name}"`} />
                            <button onClick={handleDelete} disabled={deleteConfirmInput !== selectedItem.name} className="w-full py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20">Hapus Permanen</button>
                        </div>
                    )}

                    {/* Form Edit Settings */}
                    {activeModal === 'edit' && (
                        <form onSubmit={handleEditSettings} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-2">Mode Operasi</label>
                                    <select value={editItemValues.mode} onChange={(e) => setEditItemValues({...editItemValues, mode: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                        {OUTPUT_MODES_BACKEND.map(m => <option key={m} value={m}>{MODE_DISPLAY_MAP[m]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-2">Manual Switch</label>
                                    <select value={editItemValues.state as string} onChange={(e) => setEditItemValues({...editItemValues, state: e.target.value as any})} disabled={editItemValues.mode !== 'MANUAL'} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm disabled:opacity-50 disabled:bg-gray-100">
                                        <option value="ON">ON (Nyala)</option>
                                        <option value="OFF">OFF (Mati)</option>
                                    </select>
                                </div>
                            </div>

                            <AnimatePresence>
                            {editItemValues.mode === 'AUTO_DATETIME' && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                                        <p className="text-xs font-bold text-indigo-600 mb-4 flex items-center gap-1.5"><FiClock/> JADWAL OTOMATIS</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Jam Mulai</label>
                                                <input type="time" value={editItemValues.turnOnTime || ""} onChange={(e) => setEditItemValues({...editItemValues, turnOnTime: e.target.value})} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-sm outline-none focus:border-indigo-500" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Jam Berhenti</label>
                                                <input type="time" value={editItemValues.turnOffTime || ""} onChange={(e) => setEditItemValues({...editItemValues, turnOffTime: e.target.value})} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-sm outline-none focus:border-indigo-500" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            </AnimatePresence>

                            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all">Simpan Konfigurasi</button>
                        </form>
                    )}

                     {/* Detail View */}
                     {activeModal === 'detail' && selectedItem && (
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informasi Umum</h4>
                                <div className="grid grid-cols-2 gap-y-4 text-sm">
                                    <div>
                                        <p className="text-gray-500 text-xs">ID System</p>
                                        <p className="font-mono text-gray-800 dark:text-gray-200 truncate pr-2" title={selectedItem.id}>{selectedItem.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Nama</p>
                                        <p className="font-bold text-gray-800 dark:text-gray-200">{selectedItem.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Status Saat Ini</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${selectedItem.currentState === 'ON' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{selectedItem.currentState}</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Mode Operasi</p>
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{MODE_DISPLAY_MAP[selectedItem.currentMode]}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TableOutput;