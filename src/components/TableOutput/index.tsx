"use client";

import React, {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
  useMemo,
} from "react";
import Cookies from "js-cookie";
import { FiEdit3 } from "react-icons/fi";
import { LuEye } from "react-icons/lu";
import { MdDeleteForever, MdDriveFileRenameOutline } from "react-icons/md";

// --- Konfigurasi API URL ---
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
if (!HTTPSAPIURL) {
    console.error("CRITICAL: NEXT_PUBLIC_HTTPS_API_URL is not defined.");
    // Pertimbangkan untuk menampilkan error atau mencegah render
}
const BASE_API_URL = HTTPSAPIURL ? `https://${HTTPSAPIURL}/api/device` : '';

// --- Tipe Data Disesuaikan dengan API Response ---
// Mengikuti struktur states[0] dari contoh respons baru
interface OutputStateInfoFromApi {
    state: boolean;
    mode: string; // Nilai dari backend (e.g., AUTO_DATETIME)
    turnOnTime: string | null; // Nama field baru dari API
    turnOffTime: string | null; // Nama field baru dari API
    id?: string; // ID state
    createdAt?: string; // createdAt state
}

// Tipe data internal komponen React
interface OutputItem {
  id: string; // ID output
  name: string; // Nama output
  createdAt?: string; // Dari output object (kapan output device dibuat)
  currentState: 'ON' | 'OFF' | 'UNKNOWN'; // State terakhir (internal)
  currentMode: string; // Mode terakhir (nilai backend)
  currentTurnOnTime: string | null; // Waktu ON terakhir (HH:mm)
  currentTurnOffTime: string | null; // Waktu OFF terakhir (HH:mm)
  currentStateId?: string; // ID dari state object terakhir
  currentStateCreatedAt?: string; // createdAt dari state object terakhir
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
    if (!dateTimeString) return "N/A";
    try {
        // Tambahkan 'Z' jika tidak ada untuk memastikan UTC, atau sesuaikan parsing timezone jika perlu
        const dateStr = dateTimeString.endsWith('Z') ? dateTimeString : dateTimeString + 'Z';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "Invalid Date";
        // Format ke waktu lokal Indonesia
        return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
    } catch (e) {
        console.error("Error formatting date:", e);
        return "Invalid Date Format";
     }
};
const formatTime = (timeString: string | null | undefined): string => {
    if (!timeString) return "N/A";
    // Cek format HH:mm
    if (/^\d{2}:\d{2}$/.test(timeString)) {
        return timeString + " WIB"; // Tambah penanda waktu lokal
    }
    // Cek format HH:mm:ss dan potong detik
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
        return timeString.substring(0, 5) + " WIB";
    }
    console.warn(`Invalid time format received for formatting: ${timeString}`);
    return "Invalid Time";
};

// --- Konstanta untuk Opsi Mode ---
const OUTPUT_MODES_BACKEND: ReadonlyArray<string> = ['MANUAL', 'AUTO_SUN', 'AUTO_DATETIME'] as const;
// Mapping dari nilai backend ke teks display yang user-friendly
const MODE_DISPLAY_MAP: { [key: string]: string } = {
    'MANUAL': 'Manual',
    'AUTO_SUN': 'Otomatis Matahari',
    'AUTO_DATETIME': 'Otomatis Jadwal Waktu'
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
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newItemName, setNewItemName] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<OutputItem | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [itemDetails, setItemDetails] = useState<OutputItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<OutputItem | null>(null);
  const [editValueError, setEditValueError] = useState<string | null>(null);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState<boolean>(false);
  const [itemToEditName, setItemToEditName] = useState<OutputItem | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>("");
  const [editNameError, setEditNameError] = useState<string | null>(null);
  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error"; } | null>(null);

  // State untuk form edit
  const [editItemValues, setEditItemValues] = useState<{
    state: 'ON' | 'OFF' | 'UNKNOWN';
    mode: string;
    turnOnTime: string | null; // Nama field baru
    turnOffTime: string | null; // Nama field baru
  }>({ state: 'UNKNOWN', mode: OUTPUT_MODES_BACKEND[0], turnOnTime: null, turnOffTime: null });


  // --- Handlers ---
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000); // Notifikasi hilang setelah 5 detik
  };

  const handleLogout = async () => {
    const token = Cookies.get("userAuth");
    try {
      if (token && BASE_API_URL) {
          // Ganti dengan endpoint logout Anda jika berbeda
          await fetch(`${BASE_API_URL.replace('/device', '')}/api/users/logout`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ token }), // Sesuaikan body jika API Anda perlu info lain
          });
      }
    } catch (err) { console.error("Logout API call failed:", err); }
    finally {
        // Hapus cookie penting
        Object.keys(Cookies.get()).forEach((cookieName) => {
             // Lebih spesifik menghapus cookie yang relevan
             if (cookieName === 'userAuth' /* || cookieName.startsWith('session') */) {
                 Cookies.remove(cookieName, { path: '/' });
             }
        });
        // Arahkan ke halaman login
        window.location.href = "/auth/signin";
    }
  };

  // Fetch Data Utama (GET /outputs)
  const fetchData = async () => {
    if (!BASE_API_URL) { setError("Konfigurasi URL API hilang."); setLoading(false); return; }
    setLoading(true); setError(null);
    const token = Cookies.get("userAuth");
    if (!token) { setError("Token tidak ditemukan. Silakan login kembali."); setLoading(false); handleLogout(); return; }

    try {
      const response = await fetch(`${BASE_API_URL}/outputs`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) { // Unauthorized atau Forbidden
          showNotification("Sesi tidak valid atau hak akses ditolak. Silakan login kembali.", "error");
          handleLogout();
          return;
      }
      if (!response.ok) {
        let errorMsg = `Gagal mengambil data (Status: ${response.status})`;
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch (e) { /* ignore json parse error */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (!data || !Array.isArray(data.outputs)) { throw new Error("Format data server tidak sesuai (expected outputs array)."); }

      // Transformasi data dari API ke format state internal (OutputItem)
      const processedData: OutputItem[] = data.outputs.map((output: any): OutputItem | null => {
          // Validasi data output dasar
          if (!output || typeof output.id !== 'string' || typeof output.name !== 'string') {
              console.warn("Skipping invalid output data:", output);
              return null;
          }
          // Ambil state terbaru (asumsi array states diurutkan descending by createdAt atau hanya ada 1)
          const latestState: OutputStateInfoFromApi | undefined = output.states?.[0];

          // Validasi dan default untuk mode
          const currentModeBackend = latestState?.mode ?? OUTPUT_MODES_BACKEND[0]; // Default ke MANUAL jika null/undefined
          const validatedMode = OUTPUT_MODES_BACKEND.includes(currentModeBackend)
                                ? currentModeBackend
                                : OUTPUT_MODES_BACKEND[0]; // Pastikan mode valid, jika tidak default ke MANUAL

          // Buat objek OutputItem
          return {
              id: output.id,
              name: output.name,
              createdAt: output.createdAt, // Kapan output device dibuat
              currentState: mapApiStateToString(latestState?.state), // State terakhir
              currentMode: validatedMode, // Mode terakhir (backend value)
              currentTurnOnTime: latestState?.turnOnTime ?? null, // Waktu ON terakhir
              currentTurnOffTime: latestState?.turnOffTime ?? null, // Waktu OFF terakhir
              currentStateId: latestState?.id, // ID state terakhir
              currentStateCreatedAt: latestState?.createdAt, // Kapan state terakhir dibuat
          };
      }).filter((item: OutputItem | null): item is OutputItem => item !== null); // Filter item yang tidak valid (null)

      setOutputData(processedData); // Update state dengan data yang sudah diproses
    } catch (err: any) {
      console.error("Fetch data error:", err);
      const errorMsg = err.message || "Terjadi kesalahan saat mengambil data.";
      setError(errorMsg);
      // Hanya tampilkan notifikasi jika bukan error sesi/token
      if (!errorMsg.toLowerCase().includes("token") && !errorMsg.toLowerCase().includes("sesi")) {
          showNotification(errorMsg, "error");
      }
    } finally {
      setLoading(false); // Set loading selesai
    }
  };

  // Fetch data saat komponen pertama kali dimuat
  useEffect(() => {
      fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependensi kosong agar hanya jalan sekali saat mount

  // --- Client-side Filtering ---
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return outputData; // Tampilkan semua jika search kosong
    const lowerSearch = searchTerm.toLowerCase();
    return outputData.filter(item =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.currentState.toLowerCase().includes(lowerSearch) ||
        // Cari berdasarkan teks display mode ATAU nilai backend mode
        (MODE_DISPLAY_MAP[item.currentMode]?.toLowerCase() ?? item.currentMode.toLowerCase()).includes(lowerSearch) ||
        item.currentMode.toLowerCase().includes(lowerSearch) ||
        // Mungkin juga cari berdasarkan waktu? (jika user mengetik format waktu)
        (item.currentTurnOnTime && item.currentTurnOnTime.includes(lowerSearch)) ||
        (item.currentTurnOffTime && item.currentTurnOffTime.includes(lowerSearch))
    );
  }, [outputData, searchTerm]);

  const handleSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);

  // --- Handlers Modal Add Item (POST /output) ---
  const openAddModal = () => setIsAddModalOpen(true);
  const closeAddModal = () => { setIsAddModalOpen(false); setNewItemName(""); };
  const handleAddItemInputChange = (e: ChangeEvent<HTMLInputElement>) => setNewItemName(e.target.value);
  const handleAddItemSubmit = async (e: FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     if (!BASE_API_URL) { showNotification("Konfigurasi API hilang.", "error"); return; }
     const token = Cookies.get("userAuth");
     if (!token) { handleLogout(); return; }
     if (!newItemName.trim()) { showNotification("Nama item tidak boleh kosong.", "error"); return; }

     try {
       const response = await fetch(`${BASE_API_URL}/output`, { // Endpoint POST /output
         method: "POST",
         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
         body: JSON.stringify({ name: newItemName }),
       });
       if (response.status === 401 || response.status === 403) { handleLogout(); return; }
       if (!response.ok) {
         const errorData = await response.json().catch(() => ({ message: `Gagal menambah item (Status: ${response.status})` }));
         throw new Error(errorData.message || `Gagal menambah item (Status: ${response.status})`);
       }
       const result = await response.json();
       showNotification(result.message || `Item "${newItemName}" berhasil ditambahkan.`, "success");
       closeAddModal();
       fetchData(); // Muat ulang data setelah berhasil menambah
     } catch (err: any) {
       console.error("Add item error:", err);
       showNotification(err.message || "Gagal menambah item.", "error");
     }
  };

  // --- Handlers Modal Delete Item (DELETE /output/:id) ---
  const openDeleteModal = (item: OutputItem) => { setItemToDelete(item); setDeleteConfirmationInput(""); setDeleteError(null); setIsDeleteModalOpen(true); };
  const closeDeleteModal = () => { setIsDeleteModalOpen(false); setItemToDelete(null); setDeleteConfirmationInput(""); setDeleteError(null); };
  const handleDeleteConfirmationInputChange = (e: ChangeEvent<HTMLInputElement>) => setDeleteConfirmationInput(e.target.value);
  const handleDeleteItem = async () => {
      if (!itemToDelete) return;
      if (!BASE_API_URL) { showNotification("Konfigurasi API hilang.", "error"); return; }
      // Validasi konfirmasi nama
      if (deleteConfirmationInput !== itemToDelete.name) {
          setDeleteError(`Untuk konfirmasi, ketik ulang nama item: "${itemToDelete.name}".`);
          return;
      }
      const token = Cookies.get("userAuth");
      if (!token) { handleLogout(); return; }
      setDeleteError(null); // Hapus error jika validasi lolos

      try {
        const response = await fetch(`${BASE_API_URL}/output/${itemToDelete.id}`, { // Endpoint DELETE /output/:id
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401 || response.status === 403) { handleLogout(); return; }
        // Status 200 OK atau 204 No Content dianggap sukses
        if (!response.ok && response.status !== 204) {
          let errorMsg = `Gagal menghapus item (Status: ${response.status})`;
          try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch (e) { /* ignore json parse error on delete */ }
          throw new Error(errorMsg);
        }
        // Update state lokal untuk menghapus item
        setOutputData((prev) => prev.filter((item) => item.id !== itemToDelete.id));
        showNotification(`Item "${itemToDelete.name}" berhasil dihapus.`, "success");
        closeDeleteModal();
      } catch (err: any) {
        console.error("Delete item error:", err);
        // Tampilkan error di modal delete
        setDeleteError(err.message || "Gagal menghapus item.");
      }
  };

  // --- Handlers Modal Detail Item ---
  const openDetailModal = (item: OutputItem) => { setItemDetails(item); setIsDetailModalOpen(true); };
  const closeDetailModal = () => { setIsDetailModalOpen(false); setItemDetails(null); };

  // --- Handlers Modal Edit Name (PATCH /output/:id) ---
  const openEditNameModal = (item: OutputItem) => { setItemToEditName(item); setEditNameValue(item.name); setEditNameError(null); setIsEditNameModalOpen(true); };
  const closeEditNameModal = () => { setIsEditNameModalOpen(false); setItemToEditName(null); setEditNameValue(""); setEditNameError(null); };
  const handleEditNameInputChange = (e: ChangeEvent<HTMLInputElement>) => setEditNameValue(e.target.value);
  const handleEditNameSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!itemToEditName) return;
      if (!BASE_API_URL) { showNotification("Konfigurasi API hilang.", "error"); return; }
      setEditNameError(null);
      const newName = editNameValue.trim();
      if (!newName) { setEditNameError("Nama item tidak boleh kosong."); return; }
      if (newName === itemToEditName.name) { closeEditNameModal(); return; } // Tidak ada perubahan
      const token = Cookies.get("userAuth");
      if (!token) { handleLogout(); return; }

      try {
          const response = await fetch(`${BASE_API_URL}/output/${itemToEditName.id}`, { // Endpoint PATCH /output/:id
              method: "PATCH", // Gunakan PATCH untuk update parsial (hanya nama)
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ name: newName }), // Kirim hanya field yang diubah
          });
          if (response.status === 401 || response.status === 403) { handleLogout(); return; }
          if (!response.ok) {
              const errorData = await response.json().catch(() => ({ message: `Gagal mengubah nama (Status: ${response.status})` }));
              throw new Error(errorData.message || `Gagal mengubah nama (Status: ${response.status})`);
          }
          const result = await response.json(); // Asumsi API return { message, output: {id, name} }
          // Update state lokal dengan nama baru
          setOutputData((prev) => prev.map((item) =>
              item.id === itemToEditName.id ? { ...item, name: result.output.name } : item
          ));
          showNotification(result.message || `Nama item diubah menjadi "${result.output.name}".`, "success");
          closeEditNameModal();
      } catch (err: any) {
          console.error("Edit name error:", err);
          setEditNameError(err.message || "Gagal mengubah nama."); // Tampilkan error di modal edit nama
      }
  };

  // --- Handlers Modal Edit Values (State, Mode, Time) ---
  const openEditModal = (item: OutputItem) => {
    setItemToEdit(item);
    setEditValueError(null);
    const initialMode = OUTPUT_MODES_BACKEND.includes(item.currentMode)
                        ? item.currentMode
                        : OUTPUT_MODES_BACKEND[0];

    setEditItemValues({
      state: item.currentState,
      mode: initialMode,
      turnOnTime: item.currentTurnOnTime, // Nama field baru
      turnOffTime: item.currentTurnOffTime, // Nama field baru
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => { setIsEditModalOpen(false); setItemToEdit(null); setEditValueError(null); };

  // Handler untuk semua input di modal edit
  const handleEditValueInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target; // 'name' akan 'state', 'mode', 'turnOnTime', 'turnOffTime'

    setEditItemValues((prev) => {
      const newState = { ...prev, [name]: value === '' ? null : value };

      // Jika input yang berubah adalah 'mode'
      if (name === 'mode') {
        // Jika mode baru BUKAN AUTO_DATETIME, reset waktu ON/OFF
        if (value !== 'AUTO_DATETIME') {
          newState.turnOnTime = null; // Reset field waktu yang baru
          newState.turnOffTime = null; // Reset field waktu yang baru
        }
      }
      return newState;
    });
  };

  // Handler saat form edit disubmit
  const handleEditValueSubmit = async (e: FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     if (!itemToEdit) return;
     if (!BASE_API_URL) { showNotification("Konfigurasi API hilang.", "error"); return; }
     setEditValueError(null);
     const token = Cookies.get("userAuth");
     if (!token) { handleLogout(); return; }

     const booleanState = mapStringStateToBoolean(editItemValues.state);
     // Validasi state hanya jika mode MANUAL
     if (editItemValues.mode === 'MANUAL' && booleanState === undefined) {
         setEditValueError("State harus dipilih (ON atau OFF) untuk mode Manual.");
         return;
     }

     const timeRegex = /^\d{2}:\d{2}$/;
     const isAutoDateTimeMode = editItemValues.mode === 'AUTO_DATETIME';

     // Validasi input waktu HH:mm hanya jika mode AUTO_DATETIME
     if (isAutoDateTimeMode) {
         if ((editItemValues.turnOnTime && !timeRegex.test(editItemValues.turnOnTime)) ||
             (editItemValues.turnOffTime && !timeRegex.test(editItemValues.turnOffTime))) {
             setEditValueError("Format waktu harus HH:mm (contoh: 09:30).");
             return;
         }
         // Opsional: Tambah validasi jika waktu wajib diisi
         // if (!editItemValues.turnOnTime || !editItemValues.turnOffTime) { ... }
     }

     // Siapkan payload dengan nama field waktu yang baru
     const bodyPayload = {
         state: booleanState ?? false, // Kirim state dari form
         mode: editItemValues.mode, // Kirim nilai backend mode
         turnOnTime: isAutoDateTimeMode ? editItemValues.turnOnTime : null, // Kirim turnOnTime
         turnOffTime: isAutoDateTimeMode ? editItemValues.turnOffTime : null // Kirim turnOffTime
     };

     try {
       const response = await fetch(`${BASE_API_URL}/output/${itemToEdit.id}`, {
         method: "PUT",
         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
         body: JSON.stringify(bodyPayload),
       });
       if (response.status === 401 || response.status === 403) { handleLogout(); return; }
       if (!response.ok) {
         const errorData = await response.json().catch(() => ({ message: `Gagal menyimpan perubahan (Status: ${response.status})` }));
         throw new Error(errorData.message || `Gagal menyimpan perubahan (Status: ${response.status})`);
       }

       const result = await response.json();
       // Coba ambil state terbaru dari respons, mungkin struktur berbeda dari GET
       const updatedApiOutputState = result.output?.states?.[0] ?? result.output; // Sesuaikan jika perlu

       if (!updatedApiOutputState || typeof updatedApiOutputState.state === 'undefined' || !updatedApiOutputState.mode) {
            // Jika respons tidak valid atau tidak berisi state/mode, fetch ulang saja
            console.warn("Update successful but response structure might be incomplete, refetching data.");
            showNotification(result.message || `Output "${itemToEdit.name}" berhasil diupdate.`, "success");
            fetchData(); // Fetch ulang untuk data terbaru
       } else {
           // Jika respons valid, update state lokal langsung
           const updatedModeBackend = OUTPUT_MODES_BACKEND.includes(updatedApiOutputState.mode)
                                    ? updatedApiOutputState.mode
                                    : OUTPUT_MODES_BACKEND[0];

           const updatedItemLocally: OutputItem = {
                ...itemToEdit, // Ambil ID, nama, createdAt output
                currentState: mapApiStateToString(updatedApiOutputState.state),
                currentMode: updatedModeBackend,
                currentTurnOnTime: updatedApiOutputState.turnOnTime, // Nama field baru
                currentTurnOffTime: updatedApiOutputState.turnOffTime, // Nama field baru
                currentStateId: updatedApiOutputState.id, // Ambil ID state jika ada
                currentStateCreatedAt: updatedApiOutputState.createdAt, // Ambil createdAt state jika ada
           };
           setOutputData((prev) => prev.map((item) => item.id === itemToEdit.id ? updatedItemLocally : item));
           showNotification(result.message || `Output "${itemToEdit.name}" berhasil diupdate.`, "success");
       }
       closeEditModal(); // Tutup modal setelah sukses

     } catch (err: any) {
       console.error("Edit value error:", err);
       setEditValueError(err.message || "Gagal menyimpan perubahan."); // Tampilkan error di modal
     }
  };

  // ==================
  // === Render JSX ===
  // ==================
  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">

      {/* Tempat untuk Notifikasi Global */}
      {notification && (
        <div className={`fixed top-5 right-5 z-[9999] mb-4 w-auto max-w-sm rounded border p-3 text-white shadow-lg transition-opacity duration-300 ease-in-out ${
            notification.type === 'success' ? 'border-green-600 bg-green-500' : 'border-red-600 bg-red-500'
          }`}
          role="alert"
        >
          {notification.message}
        </div>
      )}

      {/* Baris Search dan Tombol Tambah Item */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Input Search */}
          <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchInputChange}
                placeholder="Cari nama, state (ON/OFF), atau mode..."
                className="w-full rounded-md border border-stroke bg-transparent py-2 pl-10 pr-4 text-gray-800 outline-none focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                aria-label="Cari item output"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
              </span>
          </div>
          {/* Tombol Tambah */}
          <button
            onClick={openAddModal}
            className="w-full rounded-md bg-green-500 px-5 py-2 text-base font-medium text-white transition duration-150 ease-in-out hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 dark:bg-green-600 dark:hover:bg-green-700 sm:w-auto sm:flex-shrink-0"
          >
            Tambah Item
          </button>
      </div>

      {/* --- Render Semua Modal --- */}

      {/* Modal Add Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeAddModal} aria-modal="true" role="dialog">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Tambah Item Output Baru</h2>
                <form onSubmit={handleAddItemSubmit}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="add-item-name">Nama Item</label>
                        <input
                          type="text"
                          id="add-item-name"
                          name="name"
                          value={newItemName}
                          onChange={handleAddItemInputChange}
                          required
                          className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-gray-800 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                          placeholder="Contoh: Lampu Taman Depan"
                        />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={closeAddModal} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Batal</button>
                        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none">Tambah</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Modal Edit Values (State, Mode, Time) */}
      {isEditModalOpen && itemToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeEditModal} aria-modal="true" role="dialog">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Edit Output: <span className="font-bold">{itemToEdit.name}</span></h2>
            {editValueError && (
              <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-200" role="alert">
                {editValueError}
              </div>
            )}
            <form onSubmit={handleEditValueSubmit}>
              {/* Input State (ON/OFF) */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="edit-state">
                    State
                    {editItemValues.mode !== 'MANUAL' && (
                      <span className="ml-2 text-xs italic text-gray-500 dark:text-gray-400">
                        (Diatur otomatis oleh mode)
                      </span>
                    )}
                </label>
                <select
                  id="edit-state"
                  name="state"
                  value={editItemValues.state}
                  onChange={handleEditValueInputChange}
                  required
                  disabled={editItemValues.mode !== 'MANUAL'}
                  className={`w-full rounded-md border border-stroke px-3 py-2 text-gray-800 outline-none focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary transition-opacity duration-150 ${
                    editItemValues.mode !== 'MANUAL'
                      ? 'bg-gray-100 dark:bg-dark-3 cursor-not-allowed opacity-60' // Style disabled
                      : 'bg-transparent dark:bg-dark-2' // Style normal
                  }`}
                  aria-disabled={editItemValues.mode !== 'MANUAL'}
                >
                  <option value="ON">ON</option>
                  <option value="OFF">OFF</option>
                </select>
              </div>

              {/* Input Mode */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="edit-mode">Mode</label>
                <select
                  id="edit-mode"
                  name="mode"
                  value={editItemValues.mode} // Backend value
                  onChange={handleEditValueInputChange}
                  required
                  className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-gray-800 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                >
                  {OUTPUT_MODES_BACKEND.map((modeOptionBackend) => (
                    <option key={modeOptionBackend} value={modeOptionBackend}>
                      {MODE_DISPLAY_MAP[modeOptionBackend] ?? modeOptionBackend}
                    </option>
                  ))}
                </select>
              </div>

              {/* Wrapper untuk Input Waktu (ON/OFF Time) */}
              <div className={`transition-opacity duration-300 ${
                    editItemValues.mode === 'AUTO_DATETIME' ? 'opacity-100' : 'opacity-50 pointer-events-none'
                }`}
              >
                  {/* Input Waktu ON */}
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="edit-turnOnTime">
                      Waktu ON (HH:mm)
                      {editItemValues.mode !== 'AUTO_DATETIME' &&
                        <span className="ml-1 text-xs italic text-gray-500 dark:text-gray-400">(Hanya untuk Otomatis Jadwal Waktu)</span>}
                    </label>
                    <input
                      type="time"
                      id="edit-turnOnTime" // ID baru
                      name="turnOnTime" // Name baru
                      value={editItemValues.turnOnTime ?? ""} // Value baru
                      onChange={handleEditValueInputChange}
                      disabled={editItemValues.mode !== 'AUTO_DATETIME'}
                      className={`w-full rounded-md border border-stroke px-3 py-2 text-gray-800 outline-none focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary ${
                        editItemValues.mode !== 'AUTO_DATETIME' ? 'bg-gray-100 dark:bg-dark-3 cursor-not-allowed' : 'bg-transparent dark:bg-dark-2'
                      }`}
                      aria-disabled={editItemValues.mode !== 'AUTO_DATETIME'}
                    />
                  </div>

                  {/* Input Waktu OFF */}
                  <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="edit-turnOffTime">
                       Waktu OFF (HH:mm)
                       {editItemValues.mode !== 'AUTO_DATETIME' &&
                        <span className="ml-1 text-xs italic text-gray-500 dark:text-gray-400">(Hanya untuk Otomatis Jadwal Waktu)</span>}
                    </label>
                    <input
                      type="time"
                      id="edit-turnOffTime" // ID baru
                      name="turnOffTime" // Name baru
                      value={editItemValues.turnOffTime ?? ""} // Value baru
                      onChange={handleEditValueInputChange}
                      disabled={editItemValues.mode !== 'AUTO_DATETIME'}
                      className={`w-full rounded-md border border-stroke px-3 py-2 text-gray-800 outline-none focus:border-primary dark:border-dark-3 dark:text-white dark:focus:border-primary ${
                        editItemValues.mode !== 'AUTO_DATETIME' ? 'bg-gray-100 dark:bg-dark-3 cursor-not-allowed' : 'bg-transparent dark:bg-dark-2'
                      }`}
                      aria-disabled={editItemValues.mode !== 'AUTO_DATETIME'}
                    />
                  </div>
              </div>

              {/* Tombol Aksi Modal Edit */}
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={closeEditModal} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Batal</button>
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Name */}
      {isEditNameModalOpen && itemToEditName && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeEditNameModal} aria-modal="true" role="dialog">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Edit Nama Item</h2>
                {editNameError && (
                  <div className="mb-4 rounded border border-red-400 bg-red-100 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-200" role="alert">
                    {editNameError}
                  </div>
                )}
                <form onSubmit={handleEditNameSubmit}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="edit-item-new-name">Nama Item Baru</label>
                        <input
                          type="text"
                          id="edit-item-new-name"
                          name="name"
                          value={editNameValue}
                          onChange={handleEditNameInputChange}
                          required
                          className="w-full rounded-md border border-stroke bg-transparent px-3 py-2 text-gray-800 outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
                          placeholder="Masukkan nama baru"
                        />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={closeEditNameModal} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Batal</button>
                        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none">Simpan Nama</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {isDeleteModalOpen && itemToDelete && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeDeleteModal} aria-modal="true" role="dialog">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Konfirmasi Penghapusan</h2>
                <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                  Apakah Anda yakin ingin menghapus item <strong>{itemToDelete.name}</strong>? Tindakan ini tidak dapat diurungkan.
                  <br/>
                  Untuk konfirmasi, ketik ulang nama item di bawah ini.
                </p>
                <input
                  type="text"
                  value={deleteConfirmationInput}
                  onChange={handleDeleteConfirmationInputChange}
                  placeholder={`Ketik ulang "${itemToDelete.name}"`}
                  className={`mb-2 w-full rounded-md border px-3 py-2 text-gray-800 outline-none focus:ring-2 ${
                    deleteError ? 'border-red-500 ring-red-300' : 'border-stroke focus:border-primary focus:ring-primary/30'
                  } bg-transparent dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary`}
                  aria-label={`Konfirmasi penghapusan dengan mengetik ${itemToDelete.name}`}
                  aria-invalid={!!deleteError}
                  aria-describedby={deleteError ? "delete-error-message" : undefined}
                />
                {deleteError && (
                  <div id="delete-error-message" className="mt-1 mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
                    {deleteError}
                  </div>
                )}
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={closeDeleteModal} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Batal</button>
                    <button
                      type="button"
                      onClick={handleDeleteItem}
                      disabled={deleteConfirmationInput !== itemToDelete.name}
                      className={`rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${
                        deleteConfirmationInput === itemToDelete.name
                        ? "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600" // Style aktif
                        : "cursor-not-allowed bg-red-400 dark:bg-red-700 opacity-70" // Style disabled
                      }`}
                      aria-disabled={deleteConfirmationInput !== itemToDelete.name}
                    >
                      Hapus Permanen
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Modal Detail Item */}
      {isDetailModalOpen && itemDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeDetailModal} aria-modal="true" role="dialog">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                <h2 className="mb-5 text-xl font-semibold text-gray-800 dark:text-gray-200">
                  Detail Item: <span className="font-bold">{itemDetails.name}</span>
                </h2>
                <div className="space-y-2.5 border-t border-stroke pt-4 text-sm text-gray-800 dark:border-dark-3 dark:text-gray-300">
                    <p><strong>ID Output:</strong> <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-dark-2">{itemDetails.id}</code></p>
                    {itemDetails.currentStateId && <p><strong>ID State Terkini:</strong> <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-dark-2">{itemDetails.currentStateId}</code></p>}
                    <p><strong>Nama:</strong> {itemDetails.name}</p>
                    <p><strong>State Saat Ini:</strong> {itemDetails.currentState}</p>
                    <p><strong>Mode Saat Ini:</strong> {MODE_DISPLAY_MAP[itemDetails.currentMode] ?? itemDetails.currentMode}</p>
                    <p><strong>Waktu ON terjadwal:</strong> {formatTime(itemDetails.currentTurnOnTime)}</p>
                    <p><strong>Waktu OFF terjadwal:</strong> {formatTime(itemDetails.currentTurnOffTime)}</p>
                    {itemDetails.createdAt && <p><strong>Output Dibuat:</strong> {formatDateTime(itemDetails.createdAt)}</p>}
                    {itemDetails.currentStateCreatedAt && <p><strong>State Terakhir Diupdate:</strong> {formatDateTime(itemDetails.currentStateCreatedAt)}</p>}
                </div>
                <div className="mt-6 flex justify-end border-t border-stroke pt-4 dark:border-dark-3">
                    <button onClick={closeDetailModal} className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Tutup</button>
                </div>
            </div>
        </div>
      )}

      {/* --- Kondisi Loading & Error Fetch Awal --- */}
      {loading && (
        <div className="flex h-60 items-center justify-center p-10" aria-live="polite">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" role="status" aria-label="Memuat data..."></div>
          <p className="ml-3 text-base text-gray-500 dark:text-gray-300">Memuat data output...</p>
        </div>
      )}
      {!loading && error && (
        <div className="my-6 rounded border border-red-400 bg-red-100 p-6 text-center text-red-700 dark:border-red-700 dark:bg-red-900 dark:text-red-200" role="alert">
          <h3 className="mb-2 text-lg font-semibold">Gagal Memuat Data</h3>
          <p className="mb-4 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-red-900"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* --- Tabel Output --- */}
      {!loading && !error && (
          <div className="max-w-full overflow-x-auto rounded-md border border-stroke dark:border-dark-3">
              <table className="w-full table-auto">
                  <thead className="border-b border-stroke dark:border-dark-3">
                      <tr className="bg-gray-100 text-left text-sm font-semibold uppercase text-gray-600 dark:bg-dark-2 dark:text-gray-300">
                          <th className="min-w-[150px] px-4 py-3 xl:pl-6">Nama</th>
                          <th className="min-w-[100px] px-4 py-3">State</th>
                          <th className="min-w-[180px] px-4 py-3">Mode</th>
                          <th className="min-w-[130px] px-4 py-3">Waktu ON</th>
                          <th className="min-w-[130px] px-4 py-3">Waktu OFF</th>
                          <th className="min-w-[130px] px-4 py-3 text-right xl:pr-6">Aksi</th>
                      </tr>
                  </thead>
                  <tbody className="text-sm">
                      {filteredData.length > 0 ? (
                          filteredData.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-dark-2/50">
                                  {/* Kolom Nama */}
                                  <td className="border-b border-stroke px-4 py-3 dark:border-dark-3 xl:pl-6">
                                    <p className="font-medium text-gray-800 dark:text-white">{item.name}</p>
                                  </td>
                                  {/* Kolom State */}
                                  <td className="border-b border-stroke px-4 py-3 dark:border-dark-3">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-tight ${
                                        item.currentState === 'ON' ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300' :
                                        item.currentState === 'OFF' ? 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300' :
                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                      }`}
                                    >
                                      {item.currentState === 'ON' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current animate-pulse"></span>}
                                      {item.currentState === 'OFF' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current"></span>}
                                      {item.currentState === 'UNKNOWN' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-gray-400"></span>}
                                      {item.currentState}
                                    </span>
                                  </td>
                                  {/* Kolom Mode */}
                                  <td className="border-b border-stroke px-4 py-3 dark:border-dark-3">
                                    <p className="text-gray-700 dark:text-gray-300">{MODE_DISPLAY_MAP[item.currentMode] ?? item.currentMode}</p>
                                  </td>
                                  {/* Kolom Waktu ON */}
                                  <td className="border-b border-stroke px-4 py-3 dark:border-dark-3">
                                    <p className="text-gray-700 dark:text-gray-300">{formatTime(item.currentTurnOnTime)}</p>
                                  </td>
                                  {/* Kolom Waktu OFF */}
                                  <td className="border-b border-stroke px-4 py-3 dark:border-dark-3">
                                    <p className="text-gray-700 dark:text-gray-300">{formatTime(item.currentTurnOffTime)}</p>
                                  </td>
                                  {/* Kolom Aksi */}
                                  <td className="border-b border-stroke px-4 py-3 dark:border-dark-3 xl:pr-6">
                                    <div className="flex items-center justify-end space-x-2.5">
                                        <button onClick={() => openDetailModal(item)} className="text-blue-600 transition-colors duration-150 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300" title="Lihat Detail"> <LuEye size={18} /> </button>
                                        <button onClick={() => openEditNameModal(item)} className="text-purple-600 transition-colors duration-150 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300" title="Edit Nama"> <MdDriveFileRenameOutline size={18}/> </button>
                                        <button onClick={() => openEditModal(item)} className="text-yellow-600 transition-colors duration-150 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300" title="Edit State/Mode/Waktu"> <FiEdit3 size={18} /> </button>
                                        <button onClick={() => openDeleteModal(item)} className="text-red-600 transition-colors duration-150 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300" title="Hapus Item"> <MdDeleteForever size={18} /> </button>
                                    </div>
                                  </td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                            <td colSpan={6} className="border-b border-stroke px-4 py-10 text-center dark:border-dark-3">
                              <p className="text-base text-gray-500 dark:text-gray-400">
                                {outputData.length === 0 ? "Belum ada data output." : `Tidak ada data yang cocok dengan pencarian "${searchTerm}".`}
                              </p>
                              {outputData.length > 0 && searchTerm && (
                                <button onClick={() => setSearchTerm("")} className="mt-2 text-sm text-primary hover:underline">
                                  Hapus filter pencarian
                                </button>
                              )}
                            </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      )}
    </div> // Akhir wrapper utama komponen
  );
};

export default TableOutput;