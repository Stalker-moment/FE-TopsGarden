"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Cookies from "js-cookie";
import Cropper from "react-easy-crop";
import getCroppedImg from "./utils/cropImage"; 
import Notification from "../Alerts/notification";
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaIdCard, 
  FaBirthdayCake, 
  FaCamera, 
  FaTrash, 
  FaKey, 
  FaDesktop, 
  FaGlobe, 
  FaMapMarkerAlt, 
  FaTimes, 
  FaCheck,
  FaSave,
  FaSignOutAlt
} from "react-icons/fa";
import CryptoJS from "crypto-js";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
export interface UserData {
  contact: {
    firstName: string;
    lastName: string;
    phone: string;
    noreg?: string;
    email: string;
    picture: string;
    banner?: string;
    birthday?: string;
  };
  email: string;
}

interface SettingBoxesProps {
  initialUserData: UserData;
}

interface UserDataEdit {
    firstName: string;
    lastName: string;
    phone: string;
    noreg: string;
    birthday: string;
}

// --- Constants ---
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const WS_SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET_KEY || "";

// =========================================
// KOMPONEN UTAMA
// =========================================
const SettingBoxes = ({ initialUserData }: SettingBoxesProps) => {
  // --- State Data User ---
  const [firstName, setFirstName] = useState(initialUserData.contact.firstName);
  const [lastName, setLastName] = useState(initialUserData.contact.lastName);
  const [phone, setPhone] = useState(initialUserData.contact.phone);
  const [noreg, setnoreg] = useState(initialUserData.contact.noreg || "");
  const [email] = useState(initialUserData.contact.email || initialUserData.email);
  const [birthday, setBirthday] = useState(initialUserData.contact.birthday || "");
  
  const imageDefault = `https://${HTTPSAPIURL}/files/img/profile/default.png`;
  const bannerDefault = `https://${HTTPSAPIURL}/files/img/banner/default.jpg`;
  const [picture, setPicture] = useState(initialUserData.contact.picture || imageDefault);
  const [banner, setBanner] = useState(initialUserData.contact.banner || bannerDefault);

  // --- State UI & Modal ---
  const [photoMode, setPhotoMode] = useState<"profile" | "banner">("profile");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  
  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionNow, setSessionNow] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  
  // Password Change
  const [modalType, setModalType] = useState<'none' | 'deletePhoto' | 'changePassword' | 'newPassword' | 'confirmLogout'>('none');
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [logoutAllSessions, setLogoutAllSessions] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [sessionToLogout, setSessionToLogout] = useState<any>(null);

  // Loading & Notification
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  // --- Helpers ---
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const getSessionStatus = (lastAccessedAt: string) => {
    const diff = (new Date().getTime() - new Date(lastAccessedAt).getTime()) / 1000;
    return diff < 60 ? "Online" : "Offline";
  };

  // --- WebSocket Logic (Simplified for brevity, keeping core logic) ---
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

  useEffect(() => {
    const connect = () => {
        const ws = new WebSocket(`wss://${HTTPSAPIURL}/dataSessionAccount?token=${Cookies.get("userAuth")}`);
        socketRef.current = ws;
        ws.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data);
                const data = (d.iv && d.content) ? decryptData(d) : d;
                if (data?.account?.sessions) {
                    setSessions(data.account.sessions);
                    setSessionNow(data.account.sessionNow);
                }
            } catch (err) { console.error(err); }
        };
        ws.onclose = () => setTimeout(connect, 5000);
    };
    connect();
    return () => socketRef.current?.close();
  }, []);

  // --- Handlers: Profile Update ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const res = await fetch(`https://${HTTPSAPIURL}/api/users/edit`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: Cookies.get("userAuth") || "" },
            body: JSON.stringify({ firstName, lastName, phone, noreg, birthday }),
        });
        const data = await res.json();
        if (res.ok) {
            Cookies.set("userAuth", data.token);
            showNotification("Profil berhasil diperbarui!", "success");
        } else throw new Error(data.message);
    } catch (err: any) { showNotification(err.message, "error"); }
    finally { setLoading(false); }
  };

  // --- Handlers: Photo Upload ---
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          const reader = new FileReader();
          reader.onload = () => { setImageSrc(reader.result as string); setShowCropModal(true); };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleUploadPhoto = async () => {
      if (!imageSrc || !croppedAreaPixels) return;
      try {
          const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
          if (!blob) return;
          const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
          
          const formData = new FormData();
          formData.append("image", file);
          const endpoint = photoMode === "profile" ? "/files/img/profile" : "/files/img/banner";
          
          const res = await fetch(`https://${HTTPSAPIURL}${endpoint}`, {
              method: "POST",
              headers: { Authorization: Cookies.get("userAuth") || "" },
              body: formData
          });
          
          if (res.ok) {
              const data = await res.json();
              if (photoMode === "profile") setPicture(data.data.contact.picture);
              else setBanner(data.data.contact.banner);
              showNotification("Foto berhasil diupdate!", "success");
              setShowCropModal(false);
          } else throw new Error("Gagal upload");
      } catch (e) { showNotification("Gagal mengunggah foto.", "error"); }
  };

  const handleDeletePhoto = async () => {
      try {
          const endpoint = photoMode === "profile" ? "/files/img/profile" : "/files/img/banner";
          const res = await fetch(`https://${HTTPSAPIURL}${endpoint}`, {
              method: "DELETE",
              headers: { Authorization: Cookies.get("userAuth") || "" }
          });
          if (res.ok) {
              if (photoMode === "profile") setPicture(imageDefault);
              else setBanner(bannerDefault);
              showNotification("Foto berhasil dihapus.", "success");
              setModalType('none');
          }
      } catch (e) { showNotification("Gagal menghapus foto.", "error"); }
  };

  // --- Handlers: Password ---
  const handleValidatePassword = async () => {
      setLoading(true);
      try {
          const res = await fetch(`https://${HTTPSAPIURL}/api/users/validate-password`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: Cookies.get("userAuth") || "" },
              body: JSON.stringify({ currentPassword })
          });
          const data = await res.json();
          if (data.valid) setModalType('newPassword');
          else setPasswordError("Password lama salah.");
      } catch (e) { setPasswordError("Terjadi kesalahan server."); }
      finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
      if (newPassword !== confirmNewPassword) return;
      setLoading(true);
      try {
          const res = await fetch(`https://${HTTPSAPIURL}/api/users/change-password`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: Cookies.get("userAuth") || "" },
              body: JSON.stringify({ newPassword, logoutAllSessions })
          });
          if (res.ok) {
              showNotification("Password berhasil diubah.", "success");
              setModalType('none');
              if (logoutAllSessions) window.location.href = "/auth/signin";
          } else throw new Error((await res.json()).message);
      } catch (e: any) { showNotification(e.message, "error"); }
      finally { setLoading(false); }
  };

  // --- Handlers: Session ---
  const handleRemoteLogout = async () => {
      if (!sessionToLogout) return;
      try {
          const res = await fetch(`https://${HTTPSAPIURL}/api/users/remote-logout`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: Cookies.get("userAuth") || "" },
              body: JSON.stringify({ sessionId: sessionToLogout.id })
          });
          if (res.ok) {
              setSessions(prev => prev.filter(s => s.id !== sessionToLogout.id));
              showNotification("Sesi berhasil diakhiri.", "success");
              setModalType('none');
              setShowSessionModal(false);
          }
      } catch (e) { showNotification("Gagal logout sesi.", "error"); }
  };

  // ==========================
  // RENDER UI
  // ==========================
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Toast Notification */}
        <AnimatePresence>
            {notification && (
                <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-bold flex items-center gap-2 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {notification.type === 'success' ? <FaCheck /> : <FaTimes />}
                    {notification.message}
                </motion.div>
            )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- LEFT COLUMN: INFO PRIBADI --- */}
            <div className="lg:col-span-2 space-y-8">
                {/* Personal Info Card */}
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600"><FaUser /></div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Informasi Pribadi</h3>
                    </div>
                    
                    <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nama Depan</label>
                                <div className="relative">
                                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nama Belakang</label>
                                <div className="relative">
                                    <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                                    <input type="email" value={email} disabled className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 border-transparent text-gray-500 cursor-not-allowed" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Telepon</label>
                                <div className="relative">
                                    <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">No. Registrasi</label>
                                <div className="relative">
                                    <FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                                    <input type="text" value={noreg} onChange={e => setnoreg(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tanggal Lahir</label>
                                <div className="relative">
                                    <FaBirthdayCake className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                                    <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button disabled={loading} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-70">
                                {loading ? "Menyimpan..." : <><FaSave /> Simpan Perubahan</>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Active Sessions Card */}
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600"><FaDesktop /></div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Sesi Aktif</h3>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Perangkat</th>
                                    <th className="px-6 py-4">Lokasi</th>
                                    <th className="px-6 py-4">IP Address</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                                {sessions.map(s => (
                                    <tr key={s.id} onClick={() => { setSelectedSession(s); setShowSessionModal(true); }} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-white">{s.device}</td>
                                        <td className="px-6 py-4 text-gray-500">{s.city}, {s.region}</td>
                                        <td className="px-6 py-4 text-gray-500 font-mono">{s.ip}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getSessionStatus(s.lastAccessedAt) === 'Online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {getSessionStatus(s.lastAccessedAt)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-blue-500 hover:text-blue-700 font-bold text-xs">Detail</td>
                                    </tr>
                                ))}
                                {sessions.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Tidak ada sesi aktif.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- RIGHT COLUMN: FOTO & SECURITY --- */}
            <div className="space-y-8">
                {/* Photo Editor Card */}
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden p-6">
                    <div className="text-center mb-6">
                        <div className="relative inline-block group">
                            <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg bg-gray-200">
                                <Image src={photoMode === 'profile' ? picture : banner} alt="User" fill className="object-cover" />
                            </div>
                            <label htmlFor="photoUpload" className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-transform hover:scale-110">
                                <FaCamera size={14} />
                            </label>
                            <input type="file" id="photoUpload" hidden accept="image/*" onChange={onFileSelect} />
                        </div>
                        <div className="mt-4 flex justify-center gap-2">
                            <button onClick={() => setPhotoMode('profile')} className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${photoMode === 'profile' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Profile</button>
                            <button onClick={() => setPhotoMode('banner')} className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${photoMode === 'banner' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Banner</button>
                        </div>
                        <button onClick={() => setModalType('deletePhoto')} className="mt-4 text-xs font-bold text-red-500 hover:text-red-700 flex items-center justify-center gap-1 mx-auto"><FaTrash /> Hapus Foto</button>
                    </div>
                </div>

                {/* Password Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] shadow-xl p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-8 -mt-8"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><FaKey /></div>
                            <h3 className="text-xl font-bold">Keamanan</h3>
                        </div>
                        <p className="text-indigo-100 text-sm mb-6">Ganti password Anda secara berkala untuk menjaga keamanan akun.</p>
                        <button onClick={() => setModalType('changePassword')} className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg">
                            Ganti Password
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* --- MODALS --- */}
        <AnimatePresence>
            
            {/* 1. CROP MODAL */}
            {showCropModal && imageSrc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-xl shadow-2xl">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Sesuaikan Foto</h3>
                        <div className="relative h-80 w-full bg-gray-900 rounded-xl overflow-hidden mb-4">
                            <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={photoMode === 'profile' ? 1 : 3} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(a, b) => setCroppedAreaPixels(b)} />
                        </div>
                        <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full mb-6 accent-blue-600" />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowCropModal(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Batal</button>
                            <button onClick={handleUploadPhoto} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Simpan Foto</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* 2. SESSION DETAIL MODAL */}
            {showSessionModal && selectedSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowSessionModal(false)}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><FaDesktop className="text-blue-500"/> Detail Sesi</h3>
                            <button onClick={() => setShowSessionModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><FaTimes /></button>
                        </div>

                        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 mb-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-xs uppercase text-gray-400 font-bold mb-1">Device</p>
                                    <p className="font-semibold">{selectedSession.device}</p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-xs uppercase text-gray-400 font-bold mb-1">IP Address</p>
                                    <p className="font-mono">{selectedSession.ip}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <FaMapMarkerAlt className="text-red-500"/> {selectedSession.city}, {selectedSession.region}
                            </div>
                            <div className="flex items-center gap-2">
                                <FaGlobe className="text-blue-500"/> {selectedSession.org}
                            </div>
                            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-700">Login: {new Date(selectedSession.createdAt).toLocaleString()}</p>
                        </div>

                        {selectedSession.loc && (
                            <iframe className="w-full h-40 rounded-xl mb-6 border border-gray-200 dark:border-gray-700" src={`https://www.google.com/maps?q=${selectedSession.loc}&output=embed`} loading="lazy"></iframe>
                        )}

                        {selectedSession.id !== sessionNow && (
                            <button onClick={() => { setSessionToLogout(selectedSession); setModalType('confirmLogout'); }} className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 transition-colors flex justify-center items-center gap-2">
                                <FaSignOutAlt /> Akhiri Sesi Ini
                            </button>
                        )}
                    </motion.div>
                </div>
            )}

            {/* 3. GENERIC CONFIRMATION & INPUT MODALS */}
            {modalType !== 'none' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
                        
                        {/* DELETE PHOTO CONFIRM */}
                        {modalType === 'deletePhoto' && (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><FaTrash /></div>
                                <h3 className="text-xl font-bold mb-2 dark:text-white">Hapus Foto?</h3>
                                <p className="text-gray-500 mb-6">Foto {photoMode} akan dihapus permanen.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setModalType('none')} className="flex-1 py-2 rounded-lg border font-bold text-gray-500 hover:bg-gray-50">Batal</button>
                                    <button onClick={handleDeletePhoto} className="flex-1 py-2 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600">Hapus</button>
                                </div>
                            </div>
                        )}

                        {/* LOGOUT SESSION CONFIRM */}
                        {modalType === 'confirmLogout' && (
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-2 dark:text-white">Akhiri Sesi?</h3>
                                <p className="text-gray-500 mb-6">Akses dari perangkat {sessionToLogout?.device} akan dicabut.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setModalType('none')} className="flex-1 py-2 rounded-lg border font-bold text-gray-500 hover:bg-gray-50">Batal</button>
                                    <button onClick={handleRemoteLogout} className="flex-1 py-2 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600">Ya, Akhiri</button>
                                </div>
                            </div>
                        )}

                        {/* CHANGE PASSWORD - STEP 1 */}
                        {modalType === 'changePassword' && (
                            <div>
                                <h3 className="text-xl font-bold mb-4 dark:text-white">Verifikasi Keamanan</h3>
                                <p className="text-gray-500 text-sm mb-4">Masukkan password Anda saat ini.</p>
                                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Password Lama" className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-gray-900 dark:border-gray-600 mb-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                                {passwordError && <p className="text-red-500 text-xs font-bold mb-4">{passwordError}</p>}
                                <div className="flex justify-end gap-3 mt-4">
                                    <button onClick={() => setModalType('none')} className="px-4 py-2 text-gray-500 font-bold">Batal</button>
                                    <button onClick={handleValidatePassword} disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                        {loading ? 'Memproses...' : 'Lanjut'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CHANGE PASSWORD - STEP 2 */}
                        {modalType === 'newPassword' && (
                            <div>
                                <h3 className="text-xl font-bold mb-4 dark:text-white">Password Baru</h3>
                                <div className="space-y-4 mb-6">
                                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Password Baru" className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
                                    
                                    {/* Live Validation */}
                                    <div className="space-y-1 pl-2">
                                        {[
                                            { rule: newPassword.length >= 8, text: "Min. 8 karakter" },
                                            { rule: /[A-Z]/.test(newPassword), text: "Huruf Besar" },
                                            { rule: /[0-9]/.test(newPassword), text: "Angka" },
                                            { rule: /[!@#$%^&*]/.test(newPassword), text: "Simbol (!@#$)" },
                                        ].map((v, i) => (
                                            <p key={i} className={`text-xs flex items-center gap-2 ${v.rule ? 'text-green-500' : 'text-gray-400'}`}>
                                                {v.rule ? <FaCheck /> : <div className="w-3 h-3 rounded-full bg-gray-200"></div>} {v.text}
                                            </p>
                                        ))}
                                    </div>

                                    <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="Konfirmasi Password" className={`w-full p-3 rounded-xl border bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 outline-none ${confirmNewPassword && newPassword !== confirmNewPassword ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`} />
                                </div>

                                <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => setLogoutAllSessions(!logoutAllSessions)}>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${logoutAllSessions ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>
                                        {logoutAllSessions && <FaCheck size={12} />}
                                    </div>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">Logout dari semua perangkat lain</span>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setModalType('none')} className="px-4 py-2 text-gray-500 font-bold">Batal</button>
                                    <button onClick={handleChangePassword} disabled={loading || !newPassword || newPassword !== confirmNewPassword} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                        Simpan Password
                                    </button>
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

export default SettingBoxes;