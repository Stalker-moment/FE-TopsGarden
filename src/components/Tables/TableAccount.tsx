"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import Cookies from "js-cookie";
import CryptoJS from "crypto-js";
import { 
  FiEdit3, 
  FiEye, 
  FiTrash2, 
  FiPlus, 
  FiSearch, 
  FiX, 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiShield, 
  FiMonitor, 
  FiMapPin,
  FiActivity
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// --- CONFIG & TYPES ---
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const WS_SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET_KEY || "";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  noReg: string | null;
  createdAt: string;
  updatedAt: string;
  picture: string | 'https://spkapi.tierkun.my.id/files/img/profile/default.png';
}

export interface Session {
  id: string;
  token: string;
  accountId: string;
  expiredAt: string;
  device: string;
  ip: string;
  region: string;
  city: string;
  loc: string;
  org: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

export interface Account {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
  sessions: Session[];
}

const roles = ["ADMIN", "USER", "DOSEN", "MAHASISWA", "MAGANG"];

// --- HELPER COMPONENTS ---
const RoleBadge = ({ role }: { role: string }) => {
  const styles: { [key: string]: string } = {
    ADMIN: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    USER: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    DOSEN: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    MAHASISWA: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    MAGANG: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    DEFAULT: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[role] || styles.DEFAULT}`}>
      {role}
    </span>
  );
};

// =========================================
// KOMPONEN UTAMA TABLE ACCOUNT
// =========================================
const TableAccount: React.FC = () => {
  // --- STATE ---
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");

  // Modals
  const [modalType, setModalType] = useState<'none' | 'add' | 'edit' | 'delete' | 'detail' | 'sessionDetail'>('none');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Form Data
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "", role: "", noreg: ""
  });
  
  // Delete Confirm
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  // Notification
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // --- HELPERS ---
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const decryptData = (encryptedData: { iv: string; content: string }) => {
    try {
      const key = CryptoJS.enc.Utf8.parse(WS_SECRET_KEY);
      const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
      const decrypted = CryptoJS.AES.decrypt(
        CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(encryptedData.content)),
        key,
        { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
      );
      return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    } catch (e) { return null; }
  };

  const handleLogout = () => {
      Cookies.remove("userAuth");
      window.location.href = "/auth/signin";
  };

  // --- WEBSOCKET ---
  useEffect(() => {
    const token = Cookies.get("userAuth");
    if (!token) return;
    
    const ws = new WebSocket(`wss://${HTTPSAPIURL}/accounts?token=${token}&search=${encodeURIComponent(keyword)}`);
    
    ws.onopen = () => setWsStatus(true);
    ws.onclose = () => setWsStatus(false);
    ws.onerror = () => { setError("Koneksi WS Error"); setWsStatus(false); };
    
    ws.onmessage = (e) => {
        try {
            const raw = JSON.parse(e.data);
            const data = (raw.iv && raw.content) ? decryptData(raw) : raw;
            
            if (Array.isArray(data)) setAccounts(data);
            else if (data?.accounts) setAccounts(data.accounts);
            else if (data?.error) setError(data.error);
            
            setLoading(false);
        } catch (err) { console.error(err); }
    };
    
    return () => ws.close();
  }, [keyword]);

  // --- HANDLERS ---
  const handleSearch = (e: FormEvent) => {
      e.preventDefault();
      setKeyword(searchTerm);
  };

  const openModal = (type: typeof modalType, account: Account | null = null) => {
      setModalType(type);
      setSelectedAccount(account);
      if (type === 'edit' && account) {
          setFormData({
              firstName: account.contact.firstName,
              lastName: account.contact.lastName,
              email: account.contact.email,
              phone: account.contact.phone,
              password: "",
              role: account.role,
              noreg: account.contact.noReg || ""
          });
      } else if (type === 'add') {
          setFormData({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "", noreg: "" });
      }
  };

  const closeModal = () => {
      setModalType('none');
      setSelectedAccount(null);
      setSelectedSession(null);
      setDeleteConfirmInput("");
  };

  const handleAddSubmit = async (e: FormEvent) => {
      e.preventDefault();
      try {
          const res = await fetch(`https://${HTTPSAPIURL}/api/users/register`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${Cookies.get("userAuth")}` },
              body: JSON.stringify(formData)
          });
          if (!res.ok) throw new Error((await res.json()).error);
          showNotification("Akun berhasil ditambahkan", "success");
          closeModal();
      } catch (err: any) { showNotification(err.message, "error"); }
  };

  const handleEditSubmit = async (e: FormEvent) => {
      e.preventDefault();
      try {
          const res = await fetch(`https://${HTTPSAPIURL}/api/users/edit/others`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${Cookies.get("userAuth")}` },
              body: JSON.stringify(formData)
          });
          if (!res.ok) throw new Error((await res.json()).message);
          showNotification("Akun berhasil diperbarui", "success");
          closeModal();
      } catch (err: any) { showNotification(err.message, "error"); }
  };

  const handleDeleteSubmit = async () => {
      if (!selectedAccount || deleteConfirmInput !== selectedAccount.email) return;
      try {
          const res = await fetch(`https://${HTTPSAPIURL}/api/users/edit/delete`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${Cookies.get("userAuth")}` },
              body: JSON.stringify({ email: selectedAccount.email })
          });
          if (!res.ok) throw new Error((await res.json()).message);
          setAccounts(prev => prev.filter(a => a.id !== selectedAccount.id));
          showNotification("Akun dihapus", "success");
          closeModal();
      } catch (err: any) { showNotification(err.message, "error"); }
  };

  const handleRemoteLogout = async (sessionId: string) => {
      try {
          const res = await fetch(`https://${HTTPSAPIURL}/api/users/remote-logout-others`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${Cookies.get("userAuth")}` },
              body: JSON.stringify({ sessionId })
          });
          if (!res.ok) throw new Error((await res.json()).error);
          
          // Optimistic update
          if (selectedAccount) {
              const updatedSessions = selectedAccount.sessions.filter(s => s.id !== sessionId);
              setSelectedAccount({ ...selectedAccount, sessions: updatedSessions });
              setAccounts(prev => prev.map(a => a.id === selectedAccount.id ? { ...a, sessions: updatedSessions } : a));
          }
          setModalType('detail'); // Kembali ke detail akun
          showNotification("Sesi berhasil di-logout", "success");
      } catch (err: any) { showNotification(err.message, "error"); }
  };

  // ================== RENDER UI ==================
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
        
        {/* Notification Toast */}
        <AnimatePresence>
            {notification && (
                <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className={`fixed top-6 right-6 z-[100] px-6 py-3 rounded-xl shadow-lg text-white font-bold flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {notification.message}
                </motion.div>
            )}
        </AnimatePresence>

        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                   <FiUser className="text-blue-500"/> Manajemen Akun
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                   <span className={`w-2 h-2 rounded-full ${wsStatus ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                   {wsStatus ? 'Realtime Active' : 'Disconnected'} • {accounts.length} Total Akun
                </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <form onSubmit={handleSearch} className="relative group flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"/>
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Cari nama atau email..." 
                        className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </form>
                <button onClick={() => openModal('add')} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                    <FiPlus /> Tambah Akun
                </button>
            </div>
        </div>

        {/* Main Table */}
        {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>
        ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                                <th className="px-6 py-4">User Profile</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Kontak</th>
                                <th className="px-6 py-4">Sesi Aktif</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {accounts.map(account => (
                                <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-10 h-10">
                                                <Image src={account.contact.picture || "/default-avatar.png"} alt="Avatar" fill className="rounded-full object-cover border border-gray-200 dark:border-gray-600"/>
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-gray-100">{account.contact.firstName} {account.contact.lastName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{account.contact.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4"><RoleBadge role={account.role} /></td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center gap-2"><FiPhone size={14}/> {account.contact.phone}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${account.sessions.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {account.sessions.length} Sesi
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openModal('detail', account)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600" title="Detail"><FiEye /></button>
                                            <button onClick={() => openModal('edit', account)} className="p-2 rounded-lg hover:bg-orange-50 text-orange-600" title="Edit"><FiEdit3 /></button>
                                            <button onClick={() => openModal('delete', account)} className="p-2 rounded-lg hover:bg-red-50 text-red-600" title="Hapus"><FiTrash2 /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {accounts.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Tidak ada data ditemukan.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- MODALS --- */}
        <AnimatePresence>
            {modalType !== 'none' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeModal}>
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        
                        {/* Modal Header */}
                        <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                {modalType === 'add' && "Tambah Akun Baru"}
                                {modalType === 'edit' && "Edit Data Akun"}
                                {modalType === 'delete' && "Hapus Akun"}
                                {modalType === 'detail' && "Detail Akun"}
                                {modalType === 'sessionDetail' && "Detail Sesi"}
                            </h3>
                            <button onClick={closeModal} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><FiX /></button>
                        </div>

                        {/* Modal Content Scrollable */}
                        <div className="p-8 overflow-y-auto">
                            
                            {/* ADD / EDIT FORM */}
                            {(modalType === 'add' || modalType === 'edit') && (
                                <form onSubmit={modalType === 'add' ? handleAddSubmit : handleEditSubmit} className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nama Depan</label>
                                            <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nama Belakang</label>
                                            <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
                                        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={modalType === 'edit'} className={`w-full p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-600 outline-none ${modalType === 'edit' ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Telepon</label>
                                            <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">No. Registrasi</label>
                                            <input type="text" value={formData.noreg} onChange={e => setFormData({...formData, noreg: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>

                                    {modalType === 'add' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password</label>
                                                <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Role</label>
                                                <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none">
                                                    <option value="">Pilih Role</option>
                                                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {modalType === 'edit' && (
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Password Baru (Opsional)</label>
                                            <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Biarkan kosong jika tidak ingin ganti" className="w-full p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-4">
                                        <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg transition-transform active:scale-95">
                                            {modalType === 'add' ? 'Buat Akun' : 'Simpan Perubahan'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* DELETE CONFIRMATION */}
                            {modalType === 'delete' && selectedAccount && (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><FiTrash2 size={28}/></div>
                                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                                        Ketik <strong>{selectedAccount.email}</strong> untuk konfirmasi penghapusan permanen.
                                    </p>
                                    <input type="text" value={deleteConfirmInput} onChange={e => setDeleteConfirmInput(e.target.value)} className="w-full text-center font-bold p-3 rounded-xl border dark:bg-gray-900 dark:border-gray-600 mb-6 focus:border-red-500 outline-none" placeholder={selectedAccount.email} />
                                    <button onClick={handleDeleteSubmit} disabled={deleteConfirmInput !== selectedAccount.email} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                        Hapus Permanen
                                    </button>
                                </div>
                            )}

                            {/* DETAIL VIEW */}
                            {modalType === 'detail' && selectedAccount && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <Image src={selectedAccount.contact.picture || "/default-avatar.png"} width={64} height={64} alt="Avatar" className="rounded-full object-cover" />
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-800 dark:text-white">{selectedAccount.contact.firstName} {selectedAccount.contact.lastName}</h4>
                                            <div className="flex items-center gap-2 mt-1"><RoleBadge role={selectedAccount.role}/> <span className="text-xs text-gray-500">{selectedAccount.id}</span></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div><span className="text-gray-500 block text-xs">Email</span> <span className="font-medium dark:text-gray-200">{selectedAccount.contact.email}</span></div>
                                        <div><span className="text-gray-500 block text-xs">Telepon</span> <span className="font-medium dark:text-gray-200">{selectedAccount.contact.phone}</span></div>
                                        <div><span className="text-gray-500 block text-xs">No. Reg</span> <span className="font-medium dark:text-gray-200">{selectedAccount.contact.noReg || "-"}</span></div>
                                        <div><span className="text-gray-500 block text-xs">Terdaftar</span> <span className="font-medium dark:text-gray-200">{new Date(selectedAccount.createdAt).toLocaleDateString()}</span></div>
                                    </div>

                                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                                        <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><FiMonitor/> Sesi Aktif ({selectedAccount.sessions.length})</h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {selectedAccount.sessions.length > 0 ? selectedAccount.sessions.map(s => (
                                                <div key={s.id} onClick={() => { setSelectedSession(s); setModalType('sessionDetail'); }} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                                                    <div>
                                                        <p className="font-bold text-xs text-gray-800 dark:text-gray-200">{s.device}</p>
                                                        <p className="text-[10px] text-gray-500">{s.city}, {s.ip}</p>
                                                    </div>
                                                    <span className="text-xs text-blue-600 font-medium">Detail</span>
                                                </div>
                                            )) : <p className="text-sm text-gray-400 italic">Tidak ada sesi aktif.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SESSION DETAIL */}
                            {modalType === 'sessionDetail' && selectedSession && (
                                <div className="space-y-6">
                                    <button onClick={() => setModalType('detail')} className="text-sm text-blue-500 hover:underline mb-2">&larr; Kembali ke Akun</button>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <p className="text-xs font-bold text-gray-400 uppercase">Device</p>
                                            <p className="font-bold text-gray-800 dark:text-white">{selectedSession.device}</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <p className="text-xs font-bold text-gray-400 uppercase">IP Address</p>
                                            <p className="font-mono text-gray-800 dark:text-white">{selectedSession.ip}</p>
                                        </div>
                                    </div>

                                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                                        <li className="flex items-center gap-2"><FiMapPin className="text-red-500"/> {selectedSession.city}, {selectedSession.region}</li>
                                        <li className="flex items-center gap-2"><FiShield className="text-green-500"/> {selectedSession.org}</li>
                                        <li className="flex items-center gap-2"><FiActivity className="text-blue-500"/> Akses: {new Date(selectedSession.lastAccessedAt).toLocaleString()}</li>
                                    </ul>

                                    <button onClick={() => handleRemoteLogout(selectedSession.id)} className="w-full py-3 bg-red-100 text-red-600 font-bold rounded-xl hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors">
                                        Paksa Logout Sesi Ini
                                    </button>
                                </div>
                            )}

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

    </div>
  );
};

export default TableAccount;