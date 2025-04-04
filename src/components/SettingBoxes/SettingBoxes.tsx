"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Cookies from "js-cookie";
import Cropper from "react-easy-crop";
import getCroppedImg from "./utils/cropImage"; // Sesuaikan jalur impor sesuai proyek Anda
import Notification from "../Alerts/notification";
import { CgProfile } from "react-icons/cg";
import CryptoJS from "crypto-js"; // Impor CryptoJS
import { AiOutlineCheck, AiOutlineClose } from "react-icons/ai"; // Ikon untuk validasi

// Interface untuk data user yang diterima dari server wrapper
export interface UserData {
  contact: {
    firstName: string;
    lastName: string;
    phone: string;
    noreg?: string;
    email: string;
    picture: string;
    banner?: string; // Tambahkan banner
    birthday?: string; // Ganti birthDay menjadi birthday
  };
  email: string;
}

interface SettingBoxesProps {
  initialUserData: UserData;
}

const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const WS_SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET_KEY || ""; // Pastikan variabel ini terdefinisi dan berupa key yang valid
const HTTPAPIURL = process.env.NEXT_PUBLIC_HTTP_API_URL;

const SettingBoxes = ({ initialUserData }: SettingBoxesProps) => {
  // State-data user
  const [firstName, setFirstName] = useState(initialUserData.contact.firstName);
  const [lastName, setLastName] = useState(initialUserData.contact.lastName);
  const [phone, setPhone] = useState(initialUserData.contact.phone);
  const [noreg, setnoreg] = useState(initialUserData.contact.noreg || "");
  const [email, setEmail] = useState(
    initialUserData.contact.email || initialUserData.email,
  );
  const [birthday, setBirthday] = useState(
    initialUserData.contact.birthday || "",
  ); // Ganti birthDay menjadi birthday
  const imageDefault = `https://${HTTPSAPIURL}/files/img/profile/default.png`;
  const bannerDefault = `https://${HTTPSAPIURL}/files/img/banner/default.jpg`; // Tambahkan default banner
  const [picture, setPicture] = useState(
    initialUserData.contact.picture || imageDefault,
  );
  const [banner, setBanner] = useState(
    initialUserData.contact.banner || bannerDefault, // Tambahkan state banner
  );

  // State untuk memilih mode foto
  const [photoMode, setPhotoMode] = useState<"profile" | "banner">("profile");

  // State untuk file upload dan crop
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // State untuk sesi dan WebSocket
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionNow, setSessionNow] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // State untuk konfirmasi logout sesi
  const [showConfirmLogoutModal, setShowConfirmLogoutModal] = useState(false);
  const [sessionToLogout, setSessionToLogout] = useState<any>(null);

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
  };

  // Refs untuk WebSocket dan timeout ID
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fungsi untuk menentukan status sesi berdasarkan lastAccessedAt
  const getSessionStatus = (lastAccessedAt: string) => {
    const now = new Date();
    const lastAccessed = new Date(lastAccessedAt);
    const diffInSeconds = (now.getTime() - lastAccessed.getTime()) / 1000;
    return diffInSeconds < 60 ? "Online" : "Offline";
  };

  // Fungsi dekripsi data WebSocket menggunakan CryptoJS
  const decryptData = (encryptedData: { iv: string; content: string }) => {
    const { iv, content } = encryptedData;
    // Konversi IV dari hex ke WordArray
    const ivWordArray = CryptoJS.enc.Hex.parse(iv);
    // Konversi ciphertext dari hex ke WordArray lalu ke Base64
    const encryptedWordArray = CryptoJS.enc.Hex.parse(content);
    const encryptedBase64 = CryptoJS.enc.Base64.stringify(encryptedWordArray);

    const keyStr = WS_SECRET_KEY;
    const decrypted = CryptoJS.AES.decrypt(
      encryptedBase64,
      CryptoJS.enc.Utf8.parse(keyStr),
      {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      },
    );
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedStr);
  };

  // Fungsi untuk menghubungkan WebSocket dengan reconnect otomatis
  const connectWebSocket = useCallback(() => {
    const authToken = Cookies.get("userAuth") || "";
    const socketUrl = `wss://${HTTPSAPIURL}/dataSessionAccount?token=${authToken}`;
    //console.log("Menghubungkan ke WebSocket di:", socketUrl);

    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      //console.log("WebSocket message received:", event.data);
      try {
        const data = JSON.parse(event.data);
        // Jika server mengirim pesan terenkripsi
        if (data.iv && data.content) {
          const decryptedData = decryptData(data);
          //console.log("Decrypted session data:", decryptedData);
          // Misalnya, jika decryptedData memiliki properti sessions dan sessionNow:
          if (
            decryptedData &&
            decryptedData.account &&
            Array.isArray(decryptedData.account.sessions) &&
            decryptedData.account.sessionNow
          ) {
            setSessions(decryptedData.account.sessions);
            setSessionNow(decryptedData.account.sessionNow);
            //console.log("Sessions diperbarui:", decryptedData.account.sessions);
          } else {
            //console.log("Data tidak sesuai format yang diharapkan setelah dekripsi:", decryptedData);
          }
        } else {
          // Jika data tidak terenkripsi, proses secara normal
          if (
            data &&
            data.account &&
            Array.isArray(data.account.sessions) &&
            data.account.sessionNow
          ) {
            setSessions(data.account.sessions);
            setSessionNow(data.account.sessionNow);
            console.log("Sessions diperbarui:", data.account.sessions);
          } else {
            console.log("Pesan WebSocket tidak dikenali:", data);
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    const handleCloseOrError = (event: CloseEvent | Event) => {
      console.log(
        "WebSocket connection closed atau terjadi error. Mencoba reconnect...",
      );
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    };

    socket.onclose = handleCloseOrError;
    socket.onerror = handleCloseOrError;
  }, []);

  // Hubungkan WebSocket saat komponen dimuat
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connectWebSocket]);

  // Tangani pengiriman formulir untuk memperbarui data pengguna
  interface UserDataEdit {
    firstName: string;
    lastName: string;
    phone: string;
    noreg: string;
    birthday: string; // Ganti birthDay menjadi birthday
  }
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const authHeader = Cookies.get("userAuth") || "";
      const body: UserDataEdit = {
        firstName,
        lastName,
        phone,
        noreg,
        birthday,
      }; // Sertakan birthday
      const response = await fetch(`https://${HTTPSAPIURL}/api/users/edit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const responseData = await response.json();
        const newCookie = responseData.token;
        Cookies.set("userAuth", newCookie);
        showNotification("Data pengguna berhasil diperbarui.", "success");
        // window.location.reload(); // Tidak perlu reload, cukup perbarui state jika diperlukan
      } else {
        console.error("Gagal memperbarui data pengguna");
        const errorData = await response.json();
        showNotification(
          `Gagal memperbarui data: ${errorData.message}`,
          "error",
        );
      }
    } catch (error: any) {
      console.error("Error:", error);
      showNotification(`Error: ${error.message}`, "error");
    }
  };

  // Tangani pemilihan file untuk pengunggahan gambar
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Jika modal crop atau modal delete aktif, jangan proses file select
    if (showCropModal || showDeleteModal) return;

    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        setShowCropModal(true);
      });
      reader.readAsDataURL(file);
    }
  };

  // State untuk drag & drop
  const [isDragging, setIsDragging] = useState(false);

  // Untuk menonaktifkan interaksi drag & drop, kita terapkan style pointerEvents
  const dragDropStyle: React.CSSProperties =
    showCropModal || showDeleteModal
      ? { pointerEvents: "none", opacity: 0.5 }
      : {};

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    // Jika modal crop atau modal delete aktif, jangan proses drop
    if (showCropModal || showDeleteModal) return;

    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        setShowCropModal(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (showCropModal || showDeleteModal) return;
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (showCropModal || showDeleteModal) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (showCropModal || showDeleteModal) return;
    e.preventDefault();
    setIsDragging(false);
  };

  // Tangani crop gambar
  const onCropComplete = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleCropConfirm = async () => {
    try {
      if (imageSrc && croppedAreaPixels) {
        const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
        if (croppedBlob) {
          const croppedFile = new File(
            [croppedBlob],
            selectedFileName || "cropped_image.jpeg",
            { type: "image/jpeg" },
          );
          setSelectedFile(croppedFile);
          const croppedImageUrl = URL.createObjectURL(croppedBlob);
          if (photoMode === "profile") {
            setPicture(croppedImageUrl);
          } else {
            setBanner(croppedImageUrl);
          }
          setShowCropModal(false);
        }
      }
    } catch (e) {
      console.error(e);
      showNotification("Gagal melakukan crop gambar.", "error");
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setSelectedFile(null);
    setImageSrc(null);
    setSelectedFileName("");
  };

  // Upload foto setelah file ter-crop
  useEffect(() => {
    if (selectedFile) {
      uploadPhoto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  const uploadPhoto = async () => {
    if (!selectedFile) return;
    try {
      const authHeader = Cookies.get("userAuth") || "";
      const formData = new FormData();
      formData.append("image", selectedFile);
      const endpoint =
        photoMode === "profile" ? "/files/img/profile" : "/files/img/banner";
      const response = await fetch(`https://${HTTPSAPIURL}${endpoint}`, {
        method: "POST",
        headers: { Authorization: authHeader },
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        if (photoMode === "profile") {
          setPicture(data.data.contact.picture || "/images/user/user-03.png");
          showNotification("Foto profil berhasil diperbarui.", "success");
        } else {
          setBanner(data.data.contact.banner || bannerDefault);
          showNotification("Foto banner berhasil diperbarui.", "success");
        }
        console.log(
          `${photoMode === "profile" ? "Foto profil" : "Foto banner"} berhasil diperbarui`,
        );
        // window.location.reload(); // Tidak perlu reload, cukup perbarui state jika diperlukan
      } else {
        console.error(
          `Gagal memperbarui ${photoMode === "profile" ? "foto profil" : "foto banner"}`,
        );
        const errorData = await response.json();
        showNotification(
          `Gagal memperbarui ${photoMode === "profile" ? "foto profil" : "foto banner"}: ${errorData.message}`,
          "error",
        );
      }
    } catch (error: any) {
      console.error("Error:", error);
      showNotification(`Error: ${error.message}`, "error");
    }
  };

  // Tangani hapus foto
  const confirmDelete = async () => {
    try {
      const authHeader = Cookies.get("userAuth") || "";
      const endpoint =
        photoMode === "profile" ? "/files/img/profile" : "/files/img/banner";
      const response = await fetch(`https://${HTTPSAPIURL}${endpoint}`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });
      if (response.ok) {
        if (photoMode === "profile") {
          setPicture("/images/user/user-03.png");
          showNotification("Foto profil berhasil dihapus.", "success");
        } else {
          setBanner(bannerDefault);
          showNotification("Foto banner berhasil dihapus.", "success");
        }
        console.log(
          `${photoMode === "profile" ? "Foto profil" : "Foto banner"} berhasil dihapus`,
        );
      } else {
        console.error(
          `Gagal menghapus ${photoMode === "profile" ? "foto profil" : "foto banner"}`,
        );
        const errorData = await response.json();
        showNotification(
          `Gagal menghapus ${photoMode === "profile" ? "foto profil" : "foto banner"}: ${errorData.message}`,
          "error",
        );
      }
    } catch (error: any) {
      console.error("Error:", error);
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleModalCancel = () => {
    setShowDeleteModal(false);
  };

  // Handler untuk logout sesi remote (hapus sesi)
  const handleRemoteLogout = (session: any) => {
    if (session.id === sessionNow) {
      showNotification("Anda tidak dapat menghapus sesi saat ini", "error");
      return;
    }
    setSessionToLogout(session);
    setShowConfirmLogoutModal(true);
  };

  const confirmRemoteLogout = async () => {
    if (!sessionToLogout) return;
    try {
      const authHeader = Cookies.get("userAuth") || "";
      const response = await fetch(
        `https://${HTTPSAPIURL}/api/users/remote-logout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ sessionId: sessionToLogout.id }),
        },
      );
      if (response.ok) {
        setSessions((prevSessions) =>
          prevSessions.filter((session) => session.id !== sessionToLogout.id),
        );
        setShowSessionModal(false);
        setShowConfirmLogoutModal(false);
        setSessionToLogout(null);
        showNotification("Sesi berhasil dihapus", "success");
      } else {
        const errorData = await response.json();
        console.error("Gagal menghapus sesi:", errorData.message);
        showNotification(`Gagal menghapus sesi: ${errorData.error}`, "error");
      }
    } catch (error: any) {
      console.error("Error:", error);
      showNotification("Terjadi kesalahan saat menghapus sesi", "error");
    }
  };

  const cancelRemoteLogout = () => {
    setShowConfirmLogoutModal(false);
    setSessionToLogout(null);
  };

  // =======================
  // Fitur Change Password
  // =======================

  // State untuk modal Change Password
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [currentPasswordError, setCurrentPasswordError] = useState<
    string | null
  >(null);
  const [isValidatingCurrentPassword, setIsValidatingCurrentPassword] =
    useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [newPasswordErrors, setNewPasswordErrors] = useState<string[]>([]);
  const [confirmNewPasswordError, setConfirmNewPasswordError] = useState<
    string | null
  >(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [logoutAllSessions, setLogoutAllSessions] = useState(false);

  // Fungsi untuk membuka modal Change Password
  const handleOpenChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  // Fungsi untuk menutup semua modal terkait Change Password
  const handleCloseChangePassword = () => {
    setShowChangePasswordModal(false);
    setCurrentPassword("");
    setCurrentPasswordError(null);
    setNewPassword("");
    setConfirmNewPassword("");
    setNewPasswordErrors([]);
    setConfirmNewPasswordError(null);
    setLogoutAllSessions(false);
  };

  // Fungsi untuk memvalidasi password lama
  const handleValidateCurrentPassword = async () => {
    if (!currentPassword) {
      setCurrentPasswordError("Password lama diperlukan.");
      return;
    }
    setIsValidatingCurrentPassword(true);
    setCurrentPasswordError(null);
    try {
      const authHeader = Cookies.get("userAuth") || "";
      const response = await fetch(
        `https://${HTTPSAPIURL}/api/users/validate-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ currentPassword }),
        },
      );
      const data = await response.json();
      if (data.valid === true) {
        // Validasi berhasil, lanjut ke modal password baru
        setShowChangePasswordModal(false);
        setCurrentPassword("");
        setShowNewPasswordModal(true);
      } else {
        setCurrentPasswordError("Password lama salah.");
      }
    } catch (error: any) {
      console.error("Error:", error);
      setCurrentPasswordError("Terjadi kesalahan saat memvalidasi password.");
    } finally {
      setIsValidatingCurrentPassword(false);
    }
  };

  // State untuk modal memasukkan password baru
  const [showNewPasswordModal, setShowNewPasswordModal] = useState(false);

  // Fungsi untuk membuka modal memasukkan password baru
  const handleOpenNewPasswordModal = () => {
    setShowNewPasswordModal(true);
  };

  // Fungsi untuk menutup modal memasukkan password baru
  const handleCloseNewPasswordModal = () => {
    setShowNewPasswordModal(false);
    setNewPassword("");
    setConfirmNewPassword("");
    setNewPasswordErrors([]);
    setConfirmNewPasswordError(null);
    setLogoutAllSessions(false);
  };

  // Validasi real-time untuk password baru
  useEffect(() => {
    const errors: string[] = [];
    if (newPassword.length > 0 && newPassword.length < 8) {
      errors.push("Minimal 8 karakter.");
    }
    if (newPassword.length >= 8 && !/[A-Z]/.test(newPassword)) {
      errors.push("Minimal 1 huruf besar.");
    }
    if (newPassword.length >= 8 && !/[a-z]/.test(newPassword)) {
      errors.push("Minimal 1 huruf kecil.");
    }
    if (newPassword.length >= 8 && !/[0-9]/.test(newPassword)) {
      errors.push("Minimal 1 angka.");
    }
    if (
      newPassword.length >= 8 &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
    ) {
      errors.push("Minimal 1 simbol.");
    }
    setNewPasswordErrors(errors);

    if (confirmNewPassword && confirmNewPassword !== newPassword) {
      setConfirmNewPasswordError("Password tidak cocok.");
    } else {
      setConfirmNewPasswordError(null);
    }
  }, [newPassword, confirmNewPassword]);

  // Fungsi untuk memperbarui password baru
  const handleUpdatePassword = async () => {
    if (newPasswordErrors.length > 0 || confirmNewPasswordError) {
      showNotification("Silakan perbaiki kesalahan pada formulir.", "error");
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      showNotification("Silakan lengkapi semua bidang.", "error");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const authHeader = Cookies.get("userAuth") || "";
      const response = await fetch(
        `https://${HTTPSAPIURL}/api/users/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({
            newPassword,
            logoutAllSessions,
          }),
        },
      );
      if (response.ok) {
        showNotification("Password berhasil diperbarui.", "success");
        handleCloseNewPasswordModal();
        // Jika logoutAllSessions diaktifkan, redirect ke login
        if (logoutAllSessions) {
          Cookies.remove("userAuth");
          window.location.href = "/auth/signin";
        }
      } else {
        const errorData = await response.json();
        showNotification(
          `Gagal memperbarui password: ${errorData.message}`,
          "error",
        );
      }
    } catch (error: any) {
      console.error("Error:", error);
      showNotification("Terjadi kesalahan saat memperbarui password.", "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <>
      {/* Grid Utama untuk Informasi Pribadi dan Foto Pengguna */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Kartu Informasi Pribadi */}
          <div className="space-y-8">
            {notification && (
              <Notification
                message={notification.message}
                type={notification.type}
                onClose={() => {
                  console.log("Notification onClose dipanggil");
                  setNotification(null);
                }}
              />
            )}
            <div className="transform rounded-xl border border-gray-200 bg-white shadow-lg transition-transform hover:scale-105 dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Informasi Pribadi
                </h3>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmit}>
                  {/* Nama Depan & Nama Belakang */}
                  <div className="mb-6 flex flex-col gap-6 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <label
                        htmlFor="firstName"
                        className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        Nama Depan
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        placeholder="Nama Depan"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                      />
                    </div>
                    <div className="w-full sm:w-1/2">
                      <label
                        htmlFor="lastName"
                        className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
                      >
                        Nama Belakang
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        placeholder="Nama Belakang"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                      />
                    </div>
                  </div>
                  {/* Nomor Telepon */}
                  <div className="mb-6">
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Nomor Telepon
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      placeholder="Nomor Telepon"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                    />
                  </div>
                  {/* Nomor Registrasi */}
                  <div className="mb-6">
                    <label
                      htmlFor="noreg"
                      className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Nomor Registrasi
                    </label>
                    <input
                      id="noreg"
                      name="noreg"
                      placeholder="Nomor Registrasi"
                      type="text"
                      value={noreg}
                      onChange={(e) => setnoreg(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                    />
                  </div>
                  {/* Tanggal Lahir */}
                  <div className="mb-6">
                    <label
                      htmlFor="birthday"
                      className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Tanggal Lahir
                    </label>
                    <input
                      id="birthday"
                      name="birthday"
                      placeholder="Tanggal Lahir"
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                    />
                  </div>
                  {/* Email (read-only) */}
                  <div className="mb-6">
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
                    >
                      Alamat Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      placeholder="Alamat Email"
                      type="email"
                      value={email}
                      readOnly
                      className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    />
                  </div>
                  {/* Tombol Submit dan Batal */}
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      onClick={handleCloseChangePassword} // Tambahkan aksi jika diperlukan
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Kartu Foto Pengguna */}
          <div className="space-y-8">
            <div className="transform rounded-xl border border-gray-200 bg-white shadow-lg transition-transform hover:scale-105 dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Foto Anda
                </h3>
              </div>
              <div className="p-6">
                {/* Modal Konfirmasi Hapus */}
                {showDeleteModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-700">
                      <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-white">
                        Konfirmasi Penghapusan
                      </h2>
                      <p className="mb-6 text-gray-600 dark:text-gray-300">
                        Apakah Anda yakin ingin menghapus{" "}
                        {photoMode === "profile"
                          ? "foto profil"
                          : "foto banner"}{" "}
                        Anda?
                      </p>
                      <div className="flex justify-end gap-4">
                        <button
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                          onClick={handleModalCancel}
                        >
                          Batal
                        </button>
                        <button
                          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-500 dark:hover:bg-red-600"
                          onClick={confirmDelete}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal Crop */}
                {showCropModal && imageSrc && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
                    <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg dark:bg-gray-700">
                      <div className="relative h-96 w-full">
                        <Cropper
                          image={imageSrc}
                          crop={crop}
                          zoom={zoom}
                          aspect={photoMode === "profile" ? 1 : 2.73} // Sesuaikan aspek rasio
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={onCropComplete}
                        />
                      </div>
                      <div className="mt-4">
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.1}
                          value={zoom}
                          onChange={(e) => setZoom(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div className="mt-6 flex justify-end gap-4">
                        <button
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                          onClick={handleCropCancel}
                        >
                          Batal
                        </button>
                        <button
                          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
                          onClick={handleCropConfirm}
                        >
                          Crop
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Toggle Mode */}
                <div className="mb-6 flex justify-center gap-4">
                  <button
                    className={`rounded-full px-6 py-2 font-medium transition-colors duration-300 ${
                      photoMode === "profile"
                        ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    }`}
                    onClick={() => setPhotoMode("profile")}
                  >
                    Foto Profil
                  </button>
                  <button
                    className={`rounded-full px-6 py-2 font-medium transition-colors duration-300 ${
                      photoMode === "banner"
                        ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    }`}
                    onClick={() => setPhotoMode("banner")}
                  >
                    Foto Banner
                  </button>
                </div>

                {/* Display Foto dan Teks */}
                <div
                  className={`flex flex-col ${
                    photoMode === "profile"
                      ? "sm:flex-row sm:items-center flex-col items-center"
                      : "flex-col items-center"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 ${photoMode === "profile" ? "h-24 w-24" : "h-48 w-full"}`}
                  >
                    <Image
                      src={photoMode === "profile" ? picture : banner}
                      width={photoMode === "profile" ? 128 : 1920}
                      height={photoMode === "profile" ? 128 : 515}
                      alt="User"
                      className={`rounded-full object-cover ${photoMode === "banner" ? "rounded-lg" : ""} shadow-md`}
                    />
                  </div>
                  <div
                    className={`mt-4 sm:mt-0 ${
                      photoMode === "profile"
                        ? "text-center sm:ml-6 sm:text-left"
                        : "mt-4 text-center"
                    }`}
                  >
                    <h4 className="mt text-lg font-medium text-gray-800 dark:text-white">
                      {photoMode === "profile"
                        ? "Edit Foto Profil Anda"
                        : "Edit Foto Banner Anda"}
                    </h4>
                    <div className="mt-1 flex justify-center gap-4 sm:justify-start">
                      <button
                        className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                        onClick={handleDeleteClick}
                      >
                        Hapus
                      </button>
                      <label
                        htmlFor="profilePhoto"
                        className="cursor-pointer text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Perbarui
                      </label>
                    </div>
                  </div>
                </div>

                {/* Area Drag & Drop Untuk Upload Gambar */}
                <div
                  id="FileUpload"
                  style={dragDropStyle}
                  className={`relative mt-4 mb-6 block w-full cursor-pointer rounded-lg border-2 border-dashed ${
                    isDragging
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 bg-gray-100 hover:border-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  } transition-colors duration-300`}
                  onDrop={handleFileDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    type="file"
                    name="profilePhoto"
                    id="profilePhoto"
                    accept="image/png, image/jpg, image/jpeg"
                    className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                    onChange={handleFileSelect}
                  />
                  <div className="flex flex-col items-center justify-center px-4 py-8">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700">
                      <CgProfile
                        style={{ fontSize: "24px", color: "#4B5563" }}
                      />
                    </span>
                    <p className="mt-4 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="text-blue-600 dark:text-blue-400">
                        Klik untuk mengunggah
                      </span>{" "}
                      atau seret dan jatuhkan
                    </p>
                    <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                      SVG, PNG, JPG atau GIF (maks,{" "}
                      {photoMode === "profile" ? "800 X 800px" : "1920 X 515px"}
                      )
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Kartu Ganti Password */}
            <div className="space-y-8">
              <div className="transform rounded-xl border border-gray-200 bg-white shadow-lg transition-transform hover:scale-105 dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Ganti Password
                  </h3>
                </div>
                <div className="p-6">
                  <button
                    type="button"
                    onClick={handleOpenChangePassword}
                    className="w-full rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    Ganti Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Kartu Daftar Sesi Aktif */}
        <div className="mt-12">
          <div className="transform rounded-xl border border-gray-200 bg-white shadow-lg transition-transform hover:scale-105 dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                Daftar Sesi Aktif
              </h3>
            </div>
            <div className="overflow-x-auto p-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Perangkat
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      IP
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Wilayah
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Kota
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <tr
                        key={session.id}
                        onClick={() => {
                          setSelectedSession(session);
                          setShowSessionModal(true);
                        }}
                        className="cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {session.device}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {session.ip}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {session.region}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {session.city}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              getSessionStatus(session.lastAccessedAt) ===
                              "Online"
                                ? "bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-200"
                            }`}
                          >
                            {getSessionStatus(session.lastAccessedAt)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        Tidak ada sesi aktif.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Detail Sesi */}
        {showSessionModal && selectedSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
            <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg dark:bg-gray-700">
              <h2 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-white">
                Detail Sesi
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-200">
                  <strong>Perangkat:</strong> {selectedSession.device}
                </p>
                <p className="text-gray-700 dark:text-gray-200">
                  <strong>IP:</strong> {selectedSession.ip}
                </p>
                <p className="text-gray-700 dark:text-gray-200">
                  <strong>Wilayah:</strong> {selectedSession.region}
                </p>
                <p className="text-gray-700 dark:text-gray-200">
                  <strong>Kota:</strong> {selectedSession.city}
                </p>
                <p className="text-gray-700 dark:text-gray-200">
                  <strong>Provider:</strong> {selectedSession.org}
                </p>
                <p className="text-gray-700 dark:text-gray-200">
                  <strong>Zona Waktu:</strong> {selectedSession.timezone}
                </p>
                <p className="text-gray-700 dark:text-gray-200">
                  <strong>Login Pada:</strong>{" "}
                  {new Date(selectedSession.createdAt).toLocaleString()}
                </p>
                {/* <p className="text-gray-700 dark:text-gray-200">
                  <strong>Kedaluwarsa Pada:</strong>{" "}
                  {new Date(selectedSession.expiredAt).toLocaleString()}
                </p> */}
                <p className="flex items-center text-gray-700 dark:text-gray-200">
                  <strong>Terakhir Diakses:</strong>{" "}
                  {new Date(selectedSession.lastAccessedAt).toLocaleString()}
                  <span
                    className={`ml-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      getSessionStatus(selectedSession.lastAccessedAt) ===
                      "Online"
                        ? "bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-600 dark:text-red-200"
                    }`}
                  >
                    {getSessionStatus(selectedSession.lastAccessedAt)}
                  </span>
                </p>
                {/* Menampilkan Tanggal Lahir
                {initialUserData.contact.birthday && (
                  <p className="text-gray-700 dark:text-gray-200">
                    <strong>Tanggal Lahir:</strong>{" "}
                    {new Date(
                      initialUserData.contact.birthday,
                    ).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                )}*/}
              </div>
              {selectedSession.loc && (
                <div className="mt-6">
                  <iframe
                    width="100%"
                    height="300"
                    frameBorder="0"
                    className="rounded-lg shadow-lg"
                    src={`https://www.google.com/maps?q=${selectedSession.loc}&output=embed`}
                    allowFullScreen
                  ></iframe>
                </div>
              )}
              <div className="mt-6 flex justify-between">
                <button
                  className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
                  onClick={() => setShowSessionModal(false)}
                >
                  Tutup
                </button>
                {selectedSession.id !== sessionNow && (
                  <button
                    className="rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-500 dark:hover:bg-red-600"
                    onClick={() => handleRemoteLogout(selectedSession)}
                  >
                    Logout Sesi
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Logout Sesi */}
        {showConfirmLogoutModal && sessionToLogout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-700">
              <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-white">
                Konfirmasi Logout Sesi
              </h2>
              <p className="mb-6 text-gray-600 dark:text-gray-300">
                Apakah Anda yakin ingin logout dari sesi{" "}
                <strong>{sessionToLogout.device}</strong>?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  onClick={cancelRemoteLogout}
                >
                  Batal
                </button>
                <button
                  className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-500 dark:hover:bg-red-600"
                  onClick={confirmRemoteLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================
            Modals untuk Change Password
            ============================ */}

        {/* Modal Memasukkan Password Lama */}
        {showChangePasswordModal && !showNewPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-700">
              <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-white">
                Ganti Password
              </h2>
              <p className="mb-6 text-gray-600 dark:text-gray-300">
                Masukkan password lama Anda untuk memulai proses penggantian
                password.
              </p>
              <div className="mb-6">
                <label
                  htmlFor="currentPassword"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Password Lama
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                  placeholder="Masukkan password lama"
                />
                {currentPasswordError && (
                  <p className="mt-2 text-sm text-red-500">
                    {currentPasswordError}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-4">
                <button
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  onClick={handleCloseChangePassword}
                  disabled={isValidatingCurrentPassword}
                >
                  Batal
                </button>
                <button
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
                  onClick={handleValidateCurrentPassword}
                  disabled={isValidatingCurrentPassword}
                >
                  {isValidatingCurrentPassword ? "Memvalidasi..." : "Lanjut"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Memasukkan Password Baru */}
        {showNewPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-700">
              <h2 className="mb-4 text-2xl font-semibold text-gray-800 dark:text-white">
                Masukkan Password Baru
              </h2>
              <div className="mb-6">
                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Password Baru
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-3 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500 ${
                    newPasswordErrors.length > 0
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  placeholder="Masukkan password baru"
                />
                {/* Validasi Password */}
                <div className="mt-4">
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      {newPassword.length >= 8 ? (
                        <AiOutlineCheck className="mr-2 text-green-500" />
                      ) : (
                        <AiOutlineClose className="mr-2 text-red-500" />
                      )}
                      <span>Minimal 8 karakter</span>
                    </li>
                    <li className="flex items-center">
                      {/[A-Z]/.test(newPassword) ? (
                        <AiOutlineCheck className="mr-2 text-green-500" />
                      ) : (
                        <AiOutlineClose className="mr-2 text-red-500" />
                      )}
                      <span>Minimal 1 huruf besar</span>
                    </li>
                    <li className="flex items-center">
                      {/[a-z]/.test(newPassword) ? (
                        <AiOutlineCheck className="mr-2 text-green-500" />
                      ) : (
                        <AiOutlineClose className="mr-2 text-red-500" />
                      )}
                      <span>Minimal 1 huruf kecil</span>
                    </li>
                    <li className="flex items-center">
                      {/[0-9]/.test(newPassword) ? (
                        <AiOutlineCheck className="mr-2 text-green-500" />
                      ) : (
                        <AiOutlineClose className="mr-2 text-red-500" />
                      )}
                      <span>Minimal 1 angka</span>
                    </li>
                    <li className="flex items-center">
                      {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? (
                        <AiOutlineCheck className="mr-2 text-green-500" />
                      ) : (
                        <AiOutlineClose className="mr-2 text-red-500" />
                      )}
                      <span>Minimal 1 simbol</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-6">
                <label
                  htmlFor="confirmNewPassword"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={`w-full rounded-lg border px-4 py-3 text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500 ${
                    confirmNewPasswordError
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  placeholder="Konfirmasi password baru"
                />
                {confirmNewPasswordError && (
                  <p className="mt-2 text-sm text-red-500">
                    {confirmNewPasswordError}
                  </p>
                )}
              </div>
              <div className="mb-6 flex items-center">
                <input
                  type="checkbox"
                  id="logoutAllSessions"
                  checked={logoutAllSessions}
                  onChange={(e) => setLogoutAllSessions(e.target.checked)}
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-blue-600"
                />
                <label
                  htmlFor="logoutAllSessions"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Keluar dari seluruh sesi
                </label>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  onClick={handleCloseNewPasswordModal}
                  disabled={isUpdatingPassword}
                >
                  Batal
                </button>
                <button
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
                  onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? "Memperbarui..." : "Perbarui Password"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================
            Akhir Fitur Change Password
            ============================ */}
      </div>
    </>
  );
};

export default SettingBoxes;
