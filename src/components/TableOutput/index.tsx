"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent, useMemo } from "react";
import Cookies from "js-cookie";
import { 
  FiEdit3, 
  FiEye, 
  FiTrash2, 
  FiPlus, 
  FiSearch, 
  FiMoreVertical, 
  FiClock, 
  FiActivity, 
  FiCpu,
  FiX
} from "react-icons/fi";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";

// --- Konfigurasi API URL ---
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const BASE_API_URL = HTTPSAPIURL ? `https://${HTTPSAPIURL}/api/device` : '';

// --- Tipe Data ---
interface OutputStateInfoFromApi {
    state: boolean;
    mode: string;
    turnOnTime: string | null;
    turnOffTime: string | null;
    id?: string;
    createdAt?: string;
}

interface OutputItem {
  id: string;
  name: string;
  createdAt?: string;
  currentState: 'ON' | 'OFF' | 'UNKNOWN';
  currentMode: string;
  currentTurnOnTime: string | null;
  currentTurnOffTime: string | null;
  currentStateId?: string;
  currentStateCreatedAt?: string;
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

const formatDateTime = (dateTimeString: string | null | undefined): string => {
    if (!dateTimeString) return "-";
    try {
        const dateStr = dateTimeString.endsWith('Z') ? dateTimeString : dateTimeString + 'Z';
        return new Date(dateStr).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
    } catch { return "Invalid Date"; }
};

const formatTime = (timeString: string | null | undefined): string => {
    if (!timeString) return "-";
    if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) return timeString.substring(0, 5);
    return timeString;
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
  // --- State ---
  const [outputData, setOutputData] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Modal states
  const [activeModal, setActiveModal] = useState<'add' | 'delete' | 'detail' | 'edit' | 'editName' | null>(null);
  const [selectedItem, setSelectedItem] = useState<OutputItem | null>(null);
  
  // Form inputs
  const [newItemName, setNewItemName] = useState<string>("");
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>("");
  const [editNameValue, setEditNameValue] = useState<string>("");
  const [editItemValues, setEditItemValues] = useState<{
    state: 'ON' | 'OFF' | 'UNKNOWN';
    mode: string;
    turnOnTime: string | null;
    turnOffTime: string | null;
  }>({ state: 'UNKNOWN', mode: OUTPUT_MODES_BACKEND[0], turnOnTime: null, turnOffTime: null });

  // Error/Notif
  const [modalError, setModalError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error"; } | null>(null);

  // --- Handlers ---
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
      setEditNameValue("");
  };

  const handleLogout = () => {
      Object.keys(Cookies.get()).forEach((c) => { if (c === 'userAuth') Cookies.remove(c, { path: '/' }); });
      window.location.href = "/auth/signin";
  };

  const fetchData = async () => {
    if (!BASE_API_URL) { setError("API Config Error"); setLoading(false); return; }
    setLoading(true); setError(null);
    const token = Cookies.get("userAuth");
    if (!token) { setError("No Token"); setLoading(false); return; }

    try {
      const response = await fetch(`${BASE_API_URL}/outputs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      
      const data = await response.json();
      const processed = data.outputs.map((output: any) => {
          const latest = output.states?.[0];
          return {
              id: output.id,
              name: output.name,
              createdAt: output.createdAt,
              currentState: mapApiStateToString(latest?.state),
              currentMode: OUTPUT_MODES_BACKEND.includes(latest?.mode) ? latest.mode : 'MANUAL',
              currentTurnOnTime: latest?.turnOnTime ?? null,
              currentTurnOffTime: latest?.turnOffTime ?? null,
              currentStateId: latest?.id,
              currentStateCreatedAt: latest?.createdAt,
          };
      });
      setOutputData(processed);
    } catch (err: any) {
      console.error(err);
      setError("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return outputData;
    const lowerSearch = searchTerm.toLowerCase();
    return outputData.filter(item =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.currentState.toLowerCase().includes(lowerSearch) ||
        item.currentMode.toLowerCase().includes(lowerSearch)
    );
  }, [outputData, searchTerm]);

  // --- Action Handlers ---
  const handleAdd = async (e: FormEvent) => {
     e.preventDefault();
     const token = Cookies.get("userAuth");
     if (!token || !newItemName.trim()) return;

     try {
       await fetch(`${BASE_API_URL}/output`, {
         method: "POST",
         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
         body: JSON.stringify({ name: newItemName }),
       });
       showNotification("Item ditambahkan", "success");
       closeModal();
       fetchData();
     } catch (err) { setModalError("Gagal menambah item"); }
  };

  const handleDelete = async () => {
      if (!selectedItem || deleteConfirmInput !== selectedItem.name) {
          setModalError("Nama konfirmasi tidak cocok"); return;
      }
      const token = Cookies.get("userAuth");
      try {
        await fetch(`${BASE_API_URL}/output/${selectedItem.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setOutputData(prev => prev.filter(i => i.id !== selectedItem.id));
        showNotification("Item dihapus", "success");
        closeModal();
      } catch (err) { setModalError("Gagal menghapus"); }
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
          setOutputData(prev => prev.map(i => i.id === selectedItem.id ? { ...i, name: editNameValue } : i));
          showNotification("Nama diperbarui", "success");
          closeModal();
      } catch (err) { setModalError("Gagal update nama"); }
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
       const res = await fetch(`${BASE_API_URL}/output/${selectedItem.id}`, {
         method: "PUT",
         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
         body: JSON.stringify(bodyPayload),
       });
       
       const result = await res.json();
       // Optimistic update or refetch
       fetchData(); 
       showNotification("Pengaturan disimpan", "success");
       closeModal();
     } catch (err) { setModalError("Gagal menyimpan pengaturan"); }
  };

  // --- Prepare Modal Data ---
  const openEditSettingsModal = (item: OutputItem) => {
      setSelectedItem(item);
      setEditItemValues({
          state: item.currentState,
          mode: OUTPUT_MODES_BACKEND.includes(item.currentMode) ? item.currentMode : 'MANUAL',
          turnOnTime: item.currentTurnOnTime,
          turnOffTime: item.currentTurnOffTime
      });
      setActiveModal('edit');
  };

  // ================== RENDER ==================
  return (
    <div className="w-full max-w-7xl mx-auto px-2">
      
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`fixed top-6 right-6 z-[100] px-6 py-3 rounded-xl shadow-lg text-white font-medium text-sm ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {notification.message}
            </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <FiCpu className="text-indigo-500"/> Manajemen Output
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola perangkat output dan jadwal otomatisasi.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FiSearch />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari perangkat..."
                    className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
              </div>
              <button
                onClick={() => setActiveModal('add')}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                <FiPlus size={18} /> Tambah Baru
              </button>
          </div>
      </div>

      {/* Main Content */}
      {loading ? (
         <div className="flex flex-col items-center justify-center py-20 text-gray-400">
             <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p>Memuat data...</p>
         </div>
      ) : error ? (
         <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center text-red-600 dark:text-red-400">
             <p>{error}</p>
             <button onClick={fetchData} className="mt-3 text-sm font-bold underline hover:text-red-700">Coba Lagi</button>
         </div>
      ) : (
         <div className="bg-white dark:bg-gray-800 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
             <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                     <thead>
                         <tr className="bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                             <th className="px-6 py-4">Nama Perangkat</th>
                             <th className="px-6 py-4">Status</th>
                             <th className="px-6 py-4">Mode Operasi</th>
                             <th className="px-6 py-4">Jadwal (ON - OFF)</th>
                             <th className="px-6 py-4 text-right">Aksi</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                         {filteredData.length > 0 ? filteredData.map((item) => (
                             <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                 <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                         <div className={`w-2 h-10 rounded-full ${item.currentState === 'ON' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                         <div>
                                             <p className="font-bold text-gray-800 dark:text-gray-100">{item.name}</p>
                                             <p className="text-xs text-gray-400 font-mono">ID: {item.id}</p>
                                         </div>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4">
                                     <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                         item.currentState === 'ON' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                         item.currentState === 'OFF' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                         'bg-gray-100 text-gray-600'
                                     }`}>
                                         <span className={`w-1.5 h-1.5 rounded-full mr-2 ${item.currentState === 'ON' ? 'bg-green-500 animate-pulse' : 'bg-current'}`}></span>
                                         {item.currentState}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4">
                                     <span className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg">
                                         {MODE_DISPLAY_MAP[item.currentMode] || item.currentMode}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                     <div className="flex items-center gap-2">
                                         <FiClock size={14} />
                                         <span>
                                             {formatTime(item.currentTurnOnTime)} - {formatTime(item.currentTurnOffTime)}
                                         </span>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                     <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={() => { setSelectedItem(item); setActiveModal('detail'); }} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/20 dark:text-blue-400" title="Detail">
                                             <FiEye />
                                         </button>
                                         <button onClick={() => { setSelectedItem(item); setEditNameValue(item.name); setActiveModal('editName'); }} className="p-2 rounded-lg hover:bg-purple-50 text-purple-600 dark:hover:bg-purple-900/20 dark:text-purple-400" title="Edit Nama">
                                             <MdDriveFileRenameOutline />
                                         </button>
                                         <button onClick={() => openEditSettingsModal(item)} className="p-2 rounded-lg hover:bg-orange-50 text-orange-600 dark:hover:bg-orange-900/20 dark:text-orange-400" title="Settings">
                                             <FiEdit3 />
                                         </button>
                                         <button onClick={() => { setSelectedItem(item); setActiveModal('delete'); }} className="p-2 rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-900/20 dark:text-red-400" title="Hapus">
                                             <FiTrash2 />
                                         </button>
                                     </div>
                                 </td>
                             </tr>
                         )) : (
                             <tr>
                                 <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                     Tidak ada data ditemukan.
                                 </td>
                             </tr>
                         )}
                     </tbody>
                 </table>
             </div>
         </div>
      )}

      {/* --- MODALS --- */}
      <AnimatePresence>
        {activeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden">
                    
                    {/* Header Modal */}
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {activeModal === 'add' && "Tambah Perangkat"}
                            {activeModal === 'edit' && "Edit Pengaturan"}
                            {activeModal === 'editName' && "Ubah Nama"}
                            {activeModal === 'delete' && "Hapus Perangkat"}
                            {activeModal === 'detail' && "Detail Perangkat"}
                        </h3>
                        <button onClick={closeModal} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"><FiX size={20}/></button>
                    </div>

                    {modalError && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{modalError}</div>
                    )}

                    {/* Content Modal Add */}
                    {activeModal === 'add' && (
                        <form onSubmit={handleAdd}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nama Baru</label>
                                    <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Lampu Teras..." autoFocus />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-500 font-medium hover:bg-gray-100 rounded-lg transition-colors">Batal</button>
                                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">Simpan</button>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Content Modal Delete */}
                    {activeModal === 'delete' && selectedItem && (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiTrash2 size={28} />
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                                Ketik <strong>{selectedItem.name}</strong> untuk konfirmasi penghapusan permanen.
                            </p>
                            <input type="text" value={deleteConfirmInput} onChange={(e) => setDeleteConfirmInput(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center font-bold mb-6 focus:border-red-500 outline-none" placeholder={selectedItem.name} />
                            <div className="flex gap-3">
                                <button onClick={closeModal} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-gray-50">Batal</button>
                                <button onClick={handleDelete} disabled={deleteConfirmInput !== selectedItem.name} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20">Hapus</button>
                            </div>
                        </div>
                    )}

                    {/* Content Modal Edit Name */}
                    {activeModal === 'editName' && (
                        <form onSubmit={handleEditName}>
                            <input type="text" value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-6 font-medium" />
                            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Update Nama</button>
                        </form>
                    )}

                    {/* Content Modal Detail */}
                    {activeModal === 'detail' && selectedItem && (
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-gray-500">ID Perangkat</span>
                                <span className="font-mono text-gray-800 dark:text-gray-200">{selectedItem.id}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Status Terkini</span>
                                <span className={`font-bold ${selectedItem.currentState === 'ON' ? 'text-green-600' : 'text-red-600'}`}>{selectedItem.currentState}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span className="text-gray-500">Mode</span>
                                <span>{MODE_DISPLAY_MAP[selectedItem.currentMode]}</span>
                            </div>
                            <div className="flex justify-between pb-2">
                                <span className="text-gray-500">Dibuat Pada</span>
                                <span>{formatDateTime(selectedItem.createdAt)}</span>
                            </div>
                        </div>
                    )}

                    {/* Content Modal Edit Settings */}
                    {activeModal === 'edit' && (
                        <form onSubmit={handleEditSettings} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-2">State Manual</label>
                                    <select value={editItemValues.state} onChange={(e) => setEditItemValues({...editItemValues, state: e.target.value as any})} disabled={editItemValues.mode !== 'MANUAL'} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm disabled:opacity-50">
                                        <option value="ON">ON</option>
                                        <option value="OFF">OFF</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 block mb-2">Mode</label>
                                    <select value={editItemValues.mode} onChange={(e) => setEditItemValues({...editItemValues, mode: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm">
                                        {OUTPUT_MODES_BACKEND.map(m => <option key={m} value={m}>{MODE_DISPLAY_MAP[m]}</option>)}
                                    </select>
                                </div>
                            </div>

                            {editItemValues.mode === 'AUTO_DATETIME' && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <p className="text-xs font-bold text-indigo-600 mb-3 flex items-center gap-1"><FiClock/> Jadwal Otomatis</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">Jam Nyala</label>
                                            <input type="time" value={editItemValues.turnOnTime || ""} onChange={(e) => setEditItemValues({...editItemValues, turnOnTime: e.target.value})} className="w-full rounded-lg border-gray-200 p-2 text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">Jam Mati</label>
                                            <input type="time" value={editItemValues.turnOffTime || ""} onChange={(e) => setEditItemValues({...editItemValues, turnOffTime: e.target.value})} className="w-full rounded-lg border-gray-200 p-2 text-sm" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg">Simpan Konfigurasi</button>
                        </form>
                    )}

                </motion.div>
            </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default TableOutput;