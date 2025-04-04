"use client";

import React, {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
} from "react";
import Image from "next/image";
import Cookies from "js-cookie";
import CryptoJS from "crypto-js"; // Untuk dekripsi pesan WebSocket
import { FiEdit3 } from "react-icons/fi";
import { LuEye } from "react-icons/lu";
import { MdDeleteForever } from "react-icons/md";

const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const WS_SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET_KEY || "";
const HTTPAPIURL = process.env.NEXT_PUBLIC_HTTP_API_URL;

// Tipe data
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
  loc: string; // Format: "lat,lon"
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

const TableAccount: React.FC = () => {
  // State utama
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");

  // State modal Add Account
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newAccount, setNewAccount] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: string;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    role: "",
  });

  // State modal Delete Account
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // State modal Detail Account
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [accountDetails, setAccountDetails] = useState<Account | null>(null);

  // State modal Edit Account
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [editAccount, setEditAccount] = useState<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    noreg: string | null;
  }>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    noreg: "",
  });

  // State modal Sessions & Session Detail
  const [showSessions, setShowSessions] = useState<boolean>(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isSessionDetailModalOpen, setIsSessionDetailModalOpen] = useState<boolean>(false);

  // State remote logout
  const [remoteLogoutLoading, setRemoteLogoutLoading] = useState<boolean>(false);
  const [remoteLogoutError, setRemoteLogoutError] = useState<string | null>(null);

  // Notifikasi dan state reconnect WebSocket
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [shouldReconnect, setShouldReconnect] = useState<boolean>(true);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);

  // Handler notifikasi
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
  };

  // Handler logout (jika session tidak valid)
  const handleLogout = async () => {
    const token = Cookies.get("userAuth");
    if (!token) {
      window.location.href = "/auth/signin";
      return;
    }
    try {
      const response = await fetch(`https://${HTTPSAPIURL}/api/users/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        throw new Error(`Logout failed with status: ${response.status}`);
      }
      Object.keys(Cookies.get()).forEach((cookieName) => {
        Cookies.remove(cookieName);
      });
      window.location.href = "/auth/signin";
    } catch (err: any) {
      console.error("Logout failed:", err);
      setError(err.message || "Logout failed");
    }
  };

  // Fungsi dekripsi data WebSocket menggunakan CryptoJS
  const decryptData = (encryptedData: { iv: string; content: string }) => {
    const { iv, content } = encryptedData;
    const ivWordArray = CryptoJS.enc.Hex.parse(iv);
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
      }
    );
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedStr);
  };

  // WebSocket connection untuk update data akun secara real-time
  useEffect(() => {
    const token = Cookies.get("userAuth");
    if (!token) {
      setError("Token autentikasi tidak ditemukan.");
      setLoading(false);
      return;
    }
    const wsUrl = `wss://${HTTPSAPIURL}/accounts?token=${token}&search=${encodeURIComponent(keyword)}`;
    console.log(`Menghubungkan ke WebSocket di URL: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    const timeoutId = setTimeout(() => {
      if (loading) {
        setError("Timeout: Tidak ada data yang diterima dari WebSocket.");
        setLoading(false);
        ws.close();
      }
    }, 30000);

    ws.onopen = () => {
      console.log("WebSocket connection opened.");
      setWsStatus("Terhubung");
    };

    ws.onmessage = (event) => {
      console.log("Menerima data dari WebSocket:", event.data);
      try {
        const parsedData = JSON.parse(event.data);
        // Cek apakah data terenkripsi
        if (parsedData.iv && parsedData.content) {
          const decryptedData = decryptData(parsedData);
          console.log("Data terdekripsi:", decryptedData);
          if (Array.isArray(decryptedData)) {
            setAccounts(decryptedData as Account[]);
            setLoading(false);
            clearTimeout(timeoutId);
          } else if (decryptedData.accounts && Array.isArray(decryptedData.accounts)) {
            setAccounts(decryptedData.accounts as Account[]);
            setLoading(false);
            clearTimeout(timeoutId);
          } else if (decryptedData.error) {
            console.error("Kesalahan dari server:", decryptedData.error);
            setError(decryptedData.error);
            setLoading(false);
            clearTimeout(timeoutId);
          } else {
            console.warn("Format data terenkripsi yang diterima tidak dikenali:", decryptedData);
          }
        } else if (parsedData.error && parsedData.error.includes("Invalid")) {
          // Jika terdapat error yang mengandung kata "Invalid" (misal: "Invalid session")
          setShouldReconnect(false);
          showNotification("Session Expired, please login again", "error");
          handleLogout();
        } else if (Array.isArray(parsedData)) {
          setAccounts(parsedData as Account[]);
          setLoading(false);
          clearTimeout(timeoutId);
        } else if (parsedData.accounts && Array.isArray(parsedData.accounts)) {
          setAccounts(parsedData.accounts as Account[]);
          setLoading(false);
          clearTimeout(timeoutId);
        } else if (parsedData.error) {
          console.error("Kesalahan dari server:", parsedData.error);
          setError(parsedData.error);
          setLoading(false);
          clearTimeout(timeoutId);
        } else {
          console.warn("Format data yang diterima tidak dikenali:", parsedData);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
        setError("Gagal memuat data.");
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("Menutup koneksi WebSocket.");
      ws.close();
      clearTimeout(timeoutId);
    };

    return () => {
      console.log("Membersihkan koneksi WebSocket.");
      ws.close();
      clearTimeout(timeoutId);
    };
  }, [keyword, loading]);

  // Handler pencarian
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setKeyword(searchTerm);
  };

  // --- Handler Modal Add Account ---
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const handleAddAccountSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Untuk menyembunyikan request API dari network browser, pertimbangkan untuk melakukan request ini di server side
      const token = Cookies.get("userAuth");
      if (!token) {
        setError("Token autentikasi tidak ditemukan.");
        return;
      }
      const response = await fetch(`https://${HTTPSAPIURL}/api/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAccount),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menambahkan akun.");
      }
      const addedAccount = await response.json();
      setAccounts((prev) => [...prev, addedAccount]);
      closeModal();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal menambahkan akun.");
    }
  };

  // --- Handler Modal Delete Account ---
  const openDeleteModal = (account: Account) => {
    setAccountToDelete(account);
    setDeleteConfirmationInput("");
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setAccountToDelete(null);
    setDeleteConfirmationInput("");
    setDeleteError(null);
  };
  const handleDeleteConfirmationInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDeleteConfirmationInput(e.target.value);
  };
  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    if (deleteConfirmationInput !== accountToDelete.email) {
      setDeleteError(`Konfirmasi tidak sesuai. Ketik ulang ${accountToDelete.email} untuk menghapus akun.`);
      return;
    }
    try {
      const token = Cookies.get("userAuth");
      if (!token) {
        setDeleteError("Token autentikasi tidak ditemukan.");
        return;
      }
      const response = await fetch(`https://${HTTPSAPIURL}/api/users/edit/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: accountToDelete.email }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menghapus akun.");
      }
      setAccounts((prev) =>
        prev.filter((acc) => acc.id !== accountToDelete.id)
      );
      closeDeleteModal();
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.message || "Gagal menghapus akun.");
    }
  };

  // --- Handler Modal Detail Account ---
  const openDetailModal = (account: Account) => {
    setAccountDetails(account);
    setIsDetailModalOpen(true);
  };
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setAccountDetails(null);
  };

  // --- Handler Modal Edit Account ---
  const openEditModal = (account: Account) => {
    setAccountToEdit(account);
    setEditAccount({
      email: account.email,
      password: "",
      firstName: account.contact.firstName,
      lastName: account.contact.lastName,
      phone: account.contact.phone,
      noreg: account.contact.noReg || "",
    });
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setAccountToEdit(null);
    setEditAccount({ email: "", password: "", firstName: "", lastName: "", phone: "", noreg: "" });
  };
  const handleEditModalInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditAccount((prev) => ({ ...prev, [name]: value }));
  };
  const handleEditAccountSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const token = Cookies.get("userAuth");
      if (!token) {
        setError("Token autentikasi tidak ditemukan.");
        return;
      }
      const response = await fetch(`https://${HTTPSAPIURL}/api/users/edit/others`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: editAccount.email,
          password: editAccount.password,
          firstName: editAccount.firstName,
          lastName: editAccount.lastName,
          phone: editAccount.phone,
          noreg: editAccount.noreg,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal mengedit akun.");
      }
      const updatedAccount = await response.json();
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === updatedAccount.id ? updatedAccount : acc
        )
      );
      closeEditModal();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal mengedit akun.");
    }
  };

  // --- Handler Modal Sessions & Session Detail ---
  const openSessions = () => setShowSessions(true);
  const closeSessions = () => setShowSessions(false);
  const openSessionDetailModal = (session: Session) => {
    setSelectedSession(session);
    setIsSessionDetailModalOpen(true);
  };
  const closeSessionDetailModal = () => {
    setIsSessionDetailModalOpen(false);
    setSelectedSession(null);
    setRemoteLogoutError(null);
  };

  // --- Handler Remote Logout Session ---
  const handleRemoteLogout = async (sessionId: string) => {
    setRemoteLogoutLoading(true);
    setRemoteLogoutError(null);
    try {
      const token = Cookies.get("userAuth");
      if (!token) {
        throw new Error("Token autentikasi tidak ditemukan.");
      }
      const response = await fetch(`https://${HTTPSAPIURL}/api/users/remote-logout-others`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal melakukan logout.");
      }
      // Update state akun: hapus session yang sudah logout
      setAccounts((prevAccounts) =>
        prevAccounts.map((account) => {
          if (account.id === accountDetails?.id) {
            return {
              ...account,
              sessions: account.sessions.filter(
                (session) => session.id !== sessionId
              ),
            };
          }
          return account;
        })
      );
      if (accountDetails) {
        setAccountDetails({
          ...accountDetails,
          sessions: accountDetails.sessions.filter(
            (session) => session.id !== sessionId
          ),
        });
      }
      closeSessionDetailModal();
    } catch (err: any) {
      console.error(err);
      setRemoteLogoutError(err.message || "Gagal melakukan logout.");
      setTimeout(() => setRemoteLogoutError(null), 3000);
    } finally {
      setRemoteLogoutLoading(false);
    }
  };

  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
      {/* Search Bar dan Add Account Button */}
      <div className="mb-4 flex items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            placeholder="Cari akun..."
            className="flex-1 rounded-l-md border border-stroke px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:placeholder-gray-400"
          />
          <button
            type="submit"
            className="hover:bg-primary-dark rounded-r-md bg-primary px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Cari
          </button>
        </form>
        <button
          onClick={openModal}
          className="ml-4 rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700"
        >
          Add
        </button>
      </div>

      {/* Modal Add Account */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Tambah Akun Baru
            </h2>
            <form onSubmit={handleAddAccountSubmit}>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={newAccount.firstName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNewAccount((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={newAccount.lastName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNewAccount((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={newAccount.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNewAccount((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={newAccount.phone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNewAccount((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={newAccount.password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNewAccount((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  Role
                </label>
                <select
                  name="role"
                  value={newAccount.role}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setNewAccount((prev) => ({ ...prev, role: e.target.value }))
                  }
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value="">Pilih Role</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="mr-2 rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary dark:bg-primary dark:focus:ring-primary"
                >
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Account */}
      {isEditModalOpen && accountToEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Edit Akun
            </h2>
            <form onSubmit={handleEditAccountSubmit}>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  Email (tidak bisa diedit)
                </label>
                <input
                  type="email"
                  name="email"
                  value={editAccount.email}
                  readOnly
                  className="w-full cursor-not-allowed rounded-md border px-3 py-2 bg-gray-200 text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  Password (biarkan kosong jika tidak ingin mengganti)
                </label>
                <input
                  type="password"
                  name="password"
                  value={editAccount.password}
                  onChange={handleEditModalInputChange}
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={editAccount.firstName}
                  onChange={handleEditModalInputChange}
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={editAccount.lastName}
                  onChange={handleEditModalInputChange}
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={editAccount.phone}
                  onChange={handleEditModalInputChange}
                  required
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-gray-700 dark:text-gray-300">
                  No Registrasi
                </label>
                <input
                  type="text"
                  name="noreg"
                  value={editAccount.noreg ?? ""}
                  onChange={handleEditModalInputChange}
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="mr-2 rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary dark:bg-primary dark:focus:ring-primary"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Account */}
      {isDeleteModalOpen && accountToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Konfirmasi Penghapusan Akun
            </h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Apakah Anda yakin ingin menghapus akun{" "}
              <strong>{accountToDelete.email}</strong>? Untuk mengonfirmasi,
              ketik ulang <strong>{accountToDelete.email}</strong> di bawah ini.
            </p>
            <input
              type="text"
              value={deleteConfirmationInput}
              onChange={handleDeleteConfirmationInputChange}
              placeholder={`Ketik ulang ${accountToDelete.email}`}
              className="mb-4 w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
            {deleteError && (
              <div className="mb-4 text-red-500">{deleteError}</div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="mr-2 rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationInput !== accountToDelete.email}
                className={`rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  deleteConfirmationInput === accountToDelete.email
                    ? "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                    : "cursor-not-allowed bg-red-300 dark:bg-red-300"
                }`}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Account */}
      {isDetailModalOpen && accountDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={closeDetailModal}
        >
          <div
            className="max-h-full w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Detail Akun
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Image
                  src={accountDetails.contact.picture ? accountDetails.contact.picture : "https://spkapi.tierkun.my.id/files/img/profile/default.png"}
                  alt={`${accountDetails.contact.firstName} ${accountDetails.contact.lastName}`}
                  width={80}
                  height={80}
                  className="rounded-full object-cover"
                />
                <div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                    {accountDetails.contact.firstName} {accountDetails.contact.lastName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {accountDetails.contact.email}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {accountDetails.contact.phone}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300">
                  Informasi Akun
                </h4>
                <div className="mt-2 space-y-2">
                  <p><strong>ID:</strong> {accountDetails.id}</p>
                  <p><strong>Email:</strong> {accountDetails.email}</p>
                  <p><strong>Role:</strong> {accountDetails.role}</p>
                  <p><strong>Nomor Registrasi:</strong> {accountDetails.contact.noReg || "N/A"}</p>
                  <p><strong>Dibuat Pada:</strong> {new Date(accountDetails.createdAt).toLocaleString()}</p>
                  <p><strong>Terakhir Diperbarui:</strong> {new Date(accountDetails.updatedAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={openSessions}
                  className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Lihat Sessions
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeDetailModal}
                className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sessions */}
      {showSessions && accountDetails && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-50"
          onClick={closeSessions}
        >
          <div
            className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Active Sessions
            </h2>
            <div className="max-w-full overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-[#F7F9FC] text-left dark:bg-dark-2">
                    <th className="min-w-[150px] px-4 py-4 font-medium text-dark dark:text-white">
                      Device
                    </th>
                    <th className="min-w-[100px] px-4 py-4 font-medium text-dark dark:text-white">
                      IP
                    </th>
                    <th className="min-w-[150px] px-4 py-4 font-medium text-dark dark:text-white">
                      City
                    </th>
                    <th className="min-w-[150px] px-4 py-4 font-medium text-dark dark:text-white">
                      Last Accessed
                    </th>
                    <th className="px-4 py-4 text-right font-medium text-dark dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accountDetails.sessions.map((session) => (
                    <tr key={session.id}>
                      <td className="border-b border-[#eee] px-4 py-4 dark:border-dark-3">
                        {session.device}
                      </td>
                      <td className="border-b border-[#eee] px-4 py-4 dark:border-dark-3">
                        {session.ip}
                      </td>
                      <td className="border-b border-[#eee] px-4 py-4 dark:border-dark-3">
                        {session.city}, {session.region}
                      </td>
                      <td className="border-b border-[#eee] px-4 py-4 dark:border-dark-3">
                        {new Date(session.lastAccessedAt).toLocaleString()}
                      </td>
                      <td className="border-b border-[#eee] px-4 py-4 text-right dark:border-dark-3">
                        <button
                          onClick={() => openSessionDetailModal(session)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                  {accountDetails.sessions.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="border-b border-[#eee] px-4 py-4 text-center dark:border-dark-3"
                      >
                        <p className="text-gray-500 dark:text-gray-300">
                          Tidak ada sesi yang aktif.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeSessions}
                className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Session */}
      {isSessionDetailModalOpen && selectedSession && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50"
          onClick={closeSessionDetailModal}
        >
          <div
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Detail Session
            </h2>
            <div className="space-y-4">
              <p><strong>ID:</strong> {selectedSession.id}</p>
              <p><strong>Device:</strong> {selectedSession.device}</p>
              <p><strong>IP:</strong> {selectedSession.ip}</p>
              <p><strong>Region:</strong> {selectedSession.region}</p>
              <p><strong>City:</strong> {selectedSession.city}</p>
              <p><strong>Organization:</strong> {selectedSession.org}</p>
              <p><strong>Timezone:</strong> {selectedSession.timezone}</p>
              <p><strong>Created At:</strong> {new Date(selectedSession.createdAt).toLocaleString()}</p>
              <p><strong>Last Accessed At:</strong> {new Date(selectedSession.lastAccessedAt).toLocaleString()}</p>
              <div className="mt-4">
                <h3 className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">
                  Lokasi Session
                </h3>
                <iframe
                  width="100%"
                  height="300"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps?q=${selectedSession.loc}&output=embed`}
                  allowFullScreen
                  title="Google Maps"
                ></iframe>
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={closeSessionDetailModal}
                className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Tutup
              </button>
              <button
                onClick={() => handleRemoteLogout(selectedSession.id)}
                disabled={remoteLogoutLoading}
                className={`rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  remoteLogoutLoading
                    ? "bg-red-300 cursor-not-allowed dark:bg-red-300"
                    : "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                }`}
              >
                {remoteLogoutLoading ? "Logging out..." : "Logout"}
              </button>
            </div>
            {remoteLogoutError && (
              <div className="mt-4 text-red-500">{remoteLogoutError}</div>
            )}
          </div>
        </div>
      )}

      {/* Kondisi Loading */}
      {loading && (
        <div className="flex items-center justify-center p-4">
          <p className="text-gray-500 dark:text-gray-300">Memuat data...</p>
        </div>
      )}

      {/* Kondisi Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center p-4">
          <p className="mb-2 text-red-500">{error}</p>
          <p className="text-gray-500 dark:text-gray-300">
            Status WebSocket: {wsStatus}
          </p>
        </div>
      )}

      {/* Tabel Akun */}
      {!loading && !error && (
        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-[#F7F9FC] text-left dark:bg-dark-2">
                <th className="min-w-[220px] px-4 py-4 font-medium text-dark dark:text-white xl:pl-7.5">
                  Profile
                </th>
                <th className="min-w-[150px] px-4 py-4 font-medium text-dark dark:text-white">
                  Name
                </th>
                <th className="min-w-[120px] px-4 py-4 font-medium text-dark dark:text-white">
                  Roles
                </th>
                <th className="px-4 py-4 text-right font-medium text-dark dark:text-white xl:pr-7.5">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="border-b border-[#eee] px-4 py-4 dark:border-dark-3 xl:pl-7.5">
                    <div className="flex items-center">
                      <Image
                        src={account.contact.picture ? account.contact.picture : "https://spkapi.tierkun.my.id/files/img/profile/default.png"}
                        alt={`${account.contact.firstName} ${account.contact.lastName}`}
                        width={40}
                        height={40}
                        className="mr-4 rounded-full object-cover"
                      />
                      <div>
                        <h5 className="text-dark dark:text-white">
                          {account.contact.firstName} {account.contact.lastName}
                        </h5>
                        <p className="mt-[3px] text-body-sm font-medium dark:text-gray-300">
                          {account.contact.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-4 dark:border-dark-3">
                    <p className="text-dark dark:text-white">
                      {account.contact.firstName} {account.contact.lastName}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-4 dark:border-dark-3">
                    <p
                      className={`inline-flex rounded-full px-3.5 py-1 text-body-sm font-medium ${
                      account.role === "ADMIN"
                        ? "bg-[#219653]/[0.08] text-[#219653]"
                        : account.role === "USER"
                        ? "bg-[#D34053]/[0.08] text-[#D34053]"
                        : account.role === "DOSEN"
                        ? "bg-[#FFA70B]/[0.08] text-[#FFA70B]"
                        : account.role === "MAHASISWA"
                        ? "bg-[#2D9CDB]/[0.08] text-[#2D9CDB]"
                        : account.role === "MAGANG"
                        ? "bg-[#9B51E0]/[0.08] text-[#9B51E0]"
                        : "bg-[#E0E0E0]/[0.08] text-[#828282]"
                      }`}
                    >
                      {account.role}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-4 dark:border-dark-3 xl:pr-7.5">
                    <div className="flex items-center justify-end space-x-3.5">
                      <button
                        onClick={() => openDetailModal(account)}
                        className="hover:text-primary"
                        title="Details"
                      >
                        <LuEye />
                      </button>
                      <button
                        onClick={() => openEditModal(account)}
                        className="hover:text-primary"
                        title="Edit"
                      >
                        <FiEdit3 />
                      </button>
                      <button
                        onClick={() => openDeleteModal(account)}
                        className="hover:text-primary"
                        title="Delete"
                      >
                        <MdDeleteForever />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="border-[#eee] px-4 py-4 text-center dark:border-dark-3"
                  >
                    <p className="text-gray-500 dark:text-gray-300">
                      Tidak ada data yang ditemukan.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TableAccount;