"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import { FiEdit3 } from "react-icons/fi";
import { LuEye } from "react-icons/lu";
import { MdDeleteForever } from "react-icons/md";
import { v4 as uuidv4 } from "uuid"; // Untuk menghasilkan ID unik
import { Transition } from "@headlessui/react"; // Untuk animasi transisi

// Tipe data
interface User {
  id: string;
  firstName: string;
  lastName: string;
  picture: string; // URL foto pengguna
}

interface HistoryEntry {
  id: string;
  action: "Borrowed" | "Returned";
  user: User;
  time: string; // ISO string
}

interface Tool {
  id: string;
  name: string;
  image: string; // URL foto tool
  status: "Available" | "In Use";
  currentUser: User | null;
  usageHoursToday: number;
  storageCabinet: "Lemari Tools 1" | "Lemari Tools 2"; // Asal lemari
  history: HistoryEntry[]; // History peminjaman/pengembalian
}

// Data Dummy
const dummyTools: Tool[] = [
  {
    id: uuidv4(),
    name: "Obeng Listrik",
    image: "https://spkapi.tierkun.my.id/files/img/tools/obeng.jpg",
    status: "In Use",
    currentUser: {
      id: uuidv4(),
      firstName: "Andi",
      lastName: "Pratama",
      picture: "https://spkapi.tierkun.my.id/files/img/profile/default.png",
    },
    usageHoursToday: 4,
    storageCabinet: "Lemari Tools 1",
    history: [
      {
        id: uuidv4(),
        action: "Borrowed",
        user: {
          id: uuidv4(),
          firstName: "Andi",
          lastName: "Pratama",
          picture: "https://spkapi.tierkun.my.id/files/img/profile/default.png",
        },
        time: new Date().toISOString(),
      },
    ],
  },
  {
    id: uuidv4(),
    name: "Gunting",
    image: "https://spkapi.tierkun.my.id/files/img/tools/gunting.jpeg",
    status: "Available",
    currentUser: null,
    usageHoursToday: 0,
    storageCabinet: "Lemari Tools 2",
    history: [],
  },
  {
    id: uuidv4(),
    name: "Bor Tangan",
    image: "https://spkapi.tierkun.my.id/files/img/tools/bor-tangan.jpeg",
    status: "In Use",
    currentUser: {
      id: uuidv4(),
      firstName: "Dewi",
      lastName: "Lestari",
      picture: "https://spkapi.tierkun.my.id/files/img/profile/default.png",
    },
    usageHoursToday: 2,
    storageCabinet: "Lemari Tools 1",
    history: [
      {
        id: uuidv4(),
        action: "Borrowed",
        user: {
          id: uuidv4(),
          firstName: "Dewi",
          lastName: "Lestari",
          picture: "https://spkapi.tierkun.my.id/files/img/profile/default.png",
        },
        time: new Date().toISOString(),
      },
    ],
  },
  // Tambahkan lebih banyak data dummy sesuai kebutuhan
];

const ToolDashboard: React.FC = () => {
  // State utama
  const [tools, setTools] = useState<Tool[]>(dummyTools);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // State modal Add Tool
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newToolName, setNewToolName] = useState<string>("");
  const [newToolImage, setNewToolImage] = useState<string>("");
  const [newToolStorageCabinet, setNewToolStorageCabinet] = useState<"Lemari Tools 1" | "Lemari Tools 2">("Lemari Tools 1");

  // State modal Delete Tool
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [toolToDelete, setToolToDelete] = useState<Tool | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // State modal Detail Tool
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [toolDetails, setToolDetails] = useState<Tool | null>(null);

  // State modal Edit Tool
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [toolToEdit, setToolToEdit] = useState<Tool | null>(null);
  const [editToolName, setEditToolName] = useState<string>("");
  const [editToolImage, setEditToolImage] = useState<string>("");
  const [editToolStorageCabinet, setEditToolStorageCabinet] = useState<"Lemari Tools 1" | "Lemari Tools 2">("Lemari Tools 1");

  // State modal Borrow Tool
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState<boolean>(false);
  const [toolToBorrow, setToolToBorrow] = useState<Tool | null>(null);
  const [borrowUser, setBorrowUser] = useState<User | null>(null);
  const [borrowStorageCabinet, setBorrowStorageCabinet] = useState<"Lemari Tools 1" | "Lemari Tools 2">("Lemari Tools 1");

  // State modal Return Tool
  const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
  const [toolToReturn, setToolToReturn] = useState<Tool | null>(null);

  // **State modal History Tool (baru)**
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [historyTool, setHistoryTool] = useState<Tool | null>(null);

  // Handler pencarian
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredTools = tools.filter((tool) =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Handler Modal Add Tool ---
  const openAddModal = () => setIsAddModalOpen(true);
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setNewToolName("");
    setNewToolImage("");
    setNewToolStorageCabinet("Lemari Tools 1");
  };
  const handleAddToolSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newToolName.trim() === "") return;
    const newTool: Tool = {
      id: uuidv4(),
      name: newToolName.trim(),
      image: newToolImage.trim() || "https://via.placeholder.com/300x200.png?text=Tool+Baru",
      status: "Available",
      currentUser: null,
      usageHoursToday: 0,
      storageCabinet: newToolStorageCabinet,
      history: [],
    };
    setTools((prev) => [newTool, ...prev]);
    closeAddModal();
  };

  // --- Handler Modal Delete Tool ---
  const openDeleteModal = (tool: Tool) => {
    setToolToDelete(tool);
    setDeleteConfirmationInput("");
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setToolToDelete(null);
    setDeleteConfirmationInput("");
    setDeleteError(null);
  };
  const handleDeleteConfirmationChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDeleteConfirmationInput(e.target.value);
  };
  const handleDeleteTool = () => {
    if (!toolToDelete) return;
    if (deleteConfirmationInput !== toolToDelete.name) {
      setDeleteError(`Konfirmasi tidak sesuai. Ketik ulang nama tool "${toolToDelete.name}" untuk menghapus tool.`);
      return;
    }
    setTools((prev) => prev.filter((tl) => tl.id !== toolToDelete.id));
    closeDeleteModal();
  };

  // --- Handler Modal Detail Tool ---
  const openDetailModal = (tool: Tool) => {
    setToolDetails(tool);
    setIsDetailModalOpen(true);
  };
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setToolDetails(null);
  };

  // --- Handler Modal Edit Tool ---
  const openEditModal = (tool: Tool) => {
    setToolToEdit(tool);
    setEditToolName(tool.name);
    setEditToolImage(tool.image);
    setEditToolStorageCabinet(tool.storageCabinet);
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setToolToEdit(null);
    setEditToolName("");
    setEditToolImage("");
    setEditToolStorageCabinet("Lemari Tools 1");
  };
  const handleEditToolChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditToolName(e.target.value);
  };
  const handleEditToolImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditToolImage(e.target.value);
  };
  const handleEditToolStorageCabinetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as "Lemari Tools 1" | "Lemari Tools 2";
    setEditToolStorageCabinet(value);
  };
  const handleEditToolSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!toolToEdit) return;
    if (editToolName.trim() === "") return;
    const updatedTool: Tool = {
      ...toolToEdit,
      name: editToolName.trim(),
      image: editToolImage.trim() || toolToEdit.image,
      storageCabinet: editToolStorageCabinet,
    };
    setTools((prev) =>
      prev.map((tl) =>
        tl.id === updatedTool.id ? updatedTool : tl
      )
    );
    closeEditModal();
  };

  // --- Handler Modal Borrow Tool ---
  const openBorrowModal = (tool: Tool) => {
    setToolToBorrow(tool);
    // Dummy user untuk peminjaman; dalam aplikasi nyata, user akan dipilih atau diambil dari auth context
    const dummyUser: User = {
      id: uuidv4(),
      firstName: "Rina",
      lastName: "Sari",
      picture: "https://spkapi.tierkun.my.id/files/img/profile/default.png",
    };
    setBorrowUser(dummyUser);
    setBorrowStorageCabinet(tool.storageCabinet);
    setIsBorrowModalOpen(true);
  };
  const closeBorrowModal = () => {
    setIsBorrowModalOpen(false);
    setToolToBorrow(null);
    setBorrowUser(null);
    setBorrowStorageCabinet("Lemari Tools 1");
  };
  const handleBorrowToolSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!toolToBorrow || !borrowUser) return;
    const currentTime = new Date().toISOString();
    const updatedTool: Tool = {
      ...toolToBorrow,
      status: "In Use",
      currentUser: borrowUser,
      usageHoursToday: toolToBorrow.usageHoursToday + 1, // Contoh penambahan jam penggunaan
      storageCabinet: borrowStorageCabinet,
      history: [
        ...toolToBorrow.history,
        {
          id: uuidv4(),
          action: "Borrowed",
          user: borrowUser,
          time: currentTime,
        },
      ],
    };
    setTools((prev) =>
      prev.map((tl) =>
        tl.id === updatedTool.id ? updatedTool : tl
      )
    );
    closeBorrowModal();
  };

  // --- Handler Modal Return Tool ---
  const openReturnModal = (tool: Tool) => {
    setToolToReturn(tool);
    setIsReturnModalOpen(true);
  };
  const closeReturnModal = () => {
    setIsReturnModalOpen(false);
    setToolToReturn(null);
  };
  const handleReturnTool = () => {
    if (!toolToReturn) return;
    const currentTime = new Date().toISOString();
    const updatedTool: Tool = {
      ...toolToReturn,
      status: "Available",
      currentUser: null,
      storageCabinet: toolToReturn.storageCabinet, // Asal lemari tetap
      history: [
        ...toolToReturn.history,
        {
          id: uuidv4(),
          action: "Returned",
          user: toolToReturn.currentUser!, // Asumsi pengguna saat ini ada
          time: currentTime,
        },
      ],
    };
    setTools((prev) =>
      prev.map((tl) =>
        tl.id === updatedTool.id ? updatedTool : tl
      )
    );
    closeReturnModal();
  };

  // --- Handler Modal History Tool (baru) ---
  const openHistoryModal = (tool: Tool) => {
    setHistoryTool(tool);
    setIsHistoryModalOpen(true);
  };
  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setHistoryTool(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-0">Dashboard Status Tools</h1>
          <button
            onClick={openAddModal}
            className="flex items-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
            aria-label="Tambah Tool"
          >
            Tambah Tool
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Cari tool..."
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            aria-label="Cari tool"
          />
        </div>

        {/* Grid Tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-200"
            >
              <div className="relative">
                <Image
                  src={tool.image}
                  alt={tool.name}
                  width={400}
                  height={200}
                  className="w-full h-48 object-cover"
                />
                <span
                  className={`absolute top-2 left-2 px-3 py-1 rounded-full text-sm font-semibold transition-colors duration-200 ${
                    tool.status === "In Use"
                      ? "bg-red-500 text-white"
                      : "bg-green-500 text-white"
                  }`}
                >
                  {tool.status === "In Use" ? "Dipakai" : "Tersedia"}
                </span>
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{tool.name}</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  {tool.status === "In Use" && tool.currentUser ? (
                    <>
                      <span className="font-medium">Dipakai oleh:</span> {tool.currentUser.firstName} {tool.currentUser.lastName}
                    </>
                  ) : (
                    "Tidak ada pengguna saat ini."
                  )}
                </p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Jam Penggunaan Hari Ini:</span> {tool.usageHoursToday} jam
                </p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Asal Lemari:</span> {tool.storageCabinet}
                </p>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => openDetailModal(tool)}
                    className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
                    title="Detail"
                    aria-label={`Detail tool ${tool.name}`}
                  >
                    <LuEye size={20} />
                  </button>
                  <button
                    onClick={() => openEditModal(tool)}
                    className="text-yellow-500 hover:text-yellow-700 transition-colors duration-200"
                    title="Edit"
                    aria-label={`Edit tool ${tool.name}`}
                  >
                    <FiEdit3 size={20} />
                  </button>
                  {tool.status === "Available" ? (
                    <button
                      onClick={() => openBorrowModal(tool)}
                      className="text-green-500 hover:text-green-700 transition-colors duration-200"
                      title="Pinjam"
                      aria-label={`Pinjam tool ${tool.name}`}
                    >
                      {/* Ikon Pinjam */}
                      📥
                    </button>
                  ) : (
                    <button
                      onClick={() => openReturnModal(tool)}
                      className="text-green-500 hover:text-green-700 transition-colors duration-200"
                      title="Kembalikan"
                      aria-label={`Kembalikan tool ${tool.name}`}
                    >
                      {/* Ikon Kembalikan */}
                      📤
                    </button>
                  )}
                  <button
                    onClick={() => openDeleteModal(tool)}
                    className="text-red-500 hover:text-red-700 transition-colors duration-200"
                    title="Hapus"
                    aria-label={`Hapus tool ${tool.name}`}
                  >
                    <MdDeleteForever size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredTools.length === 0 && (
            <p className="col-span-full text-center text-gray-500 dark:text-gray-400">Tidak ada data tool yang ditemukan.</p>
          )}
        </div>

        {/* Modal Add Tool */}
        <Transition show={isAddModalOpen}>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={closeAddModal}
          >
            <Transition.Child
              enter="transition-transform duration-300"
              enterFrom="scale-95 opacity-0"
              enterTo="scale-100 opacity-100"
              leave="transition-transform duration-200"
              leaveFrom="scale-100 opacity-100"
              leaveTo="scale-95 opacity-0"
            >
              <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Tambah Tool Baru</h2>
                  <form onSubmit={handleAddToolSubmit}>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Nama Tool</label>
                      <input
                        type="text"
                        value={newToolName}
                        onChange={(e) => setNewToolName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                        placeholder="Masukkan nama tool"
                        aria-label="Nama Tool"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Foto Tool</label>
                      <input
                        type="url"
                        value={newToolImage}
                        onChange={(e) => setNewToolImage(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                        placeholder="URL gambar tool (opsional)"
                        aria-label="Foto Tool"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Asal Lemari</label>
                      <select
                        value={newToolStorageCabinet}
                        onChange={(e) => setNewToolStorageCabinet(e.target.value as "Lemari Tools 1" | "Lemari Tools 2")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                        aria-label="Asal Lemari"
                      >
                        <option value="Lemari Tools 1">Lemari Tools 1</option>
                        <option value="Lemari Tools 2">Lemari Tools 2</option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={closeAddModal}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-md hover:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                      >
                        Tambah
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Transition>

        {/* Modal Edit Tool */}
        <Transition show={isEditModalOpen && !!toolToEdit}>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={closeEditModal}
          >
            <Transition.Child
              enter="transition-transform duration-300"
              enterFrom="scale-95 opacity-0"
              enterTo="scale-100 opacity-100"
              leave="transition-transform duration-200"
              leaveFrom="scale-100 opacity-100"
              leaveTo="scale-95 opacity-0"
            >
              <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Edit Tool</h2>
                  <form onSubmit={handleEditToolSubmit}>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Nama Tool</label>
                      <input
                        type="text"
                        value={editToolName}
                        onChange={handleEditToolChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors duration-200"
                        placeholder="Masukkan nama tool"
                        aria-label="Nama Tool"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Foto Tool</label>
                      <input
                        type="url"
                        value={editToolImage}
                        onChange={handleEditToolImageChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors duration-200"
                        placeholder="URL gambar tool (opsional)"
                        aria-label="Foto Tool"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Asal Lemari</label>
                      <select
                        value={editToolStorageCabinet}
                        onChange={handleEditToolStorageCabinetChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors duration-200"
                        aria-label="Asal Lemari"
                      >
                        <option value="Lemari Tools 1">Lemari Tools 1</option>
                        <option value="Lemari Tools 2">Lemari Tools 2</option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={closeEditModal}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-yellow-500 dark:bg-yellow-600 text-white rounded-md hover:bg-yellow-600 dark:hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors duration-200"
                      >
                        Simpan
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Transition>

        {/* Modal Delete Tool */}
        <Transition show={isDeleteModalOpen && !!toolToDelete}>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={closeDeleteModal}
          >
            <Transition.Child
              enter="transition-transform duration-300"
              enterFrom="scale-95 opacity-0"
              enterTo="scale-100 opacity-100"
              leave="transition-transform duration-200"
              leaveFrom="scale-100 opacity-100"
              leaveTo="scale-95 opacity-0"
            >
              <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-2xl font-semibold text-red-500 mb-4">Konfirmasi Penghapusan</h2>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    Apakah Anda yakin ingin menghapus tool <strong>{toolToDelete?.name}</strong>? Untuk mengonfirmasi, ketik ulang nama tool di bawah ini.
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmationInput}
                    onChange={handleDeleteConfirmationChange}
                    placeholder={`Ketik ulang "${toolToDelete?.name || ''}"`}
                    className="w-full px-3 py-2 border border-red-500 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200"
                    aria-label="Konfirmasi Penghapusan"
                  />
                  {deleteError && (
                    <p className="text-red-500 mt-2">{deleteError}</p>
                  )}
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      type="button"
                      onClick={closeDeleteModal}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteTool}
                      disabled={!toolToDelete || deleteConfirmationInput !== toolToDelete.name}
                      className={`px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 ${
                        toolToDelete && deleteConfirmationInput === toolToDelete.name
                          ? "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                          : "bg-red-300 cursor-not-allowed dark:bg-red-300"
                      }`}
                      aria-label="Hapus Tool"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Transition>

        {/* Modal Detail Tool */}
        <Transition show={isDetailModalOpen && !!toolDetails}>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={closeDetailModal}
          >
            <Transition.Child
              enter="transition-transform duration-300"
              enterFrom="scale-95 opacity-0"
              enterTo="scale-100 opacity-100"
              leave="transition-transform duration-200"
              leaveFrom="scale-100 opacity-100"
              leaveTo="scale-95 opacity-0"
            >
              <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Detail Tool</h2>
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/2">
                      <Image
                        src={toolDetails?.image || ""}
                        alt={toolDetails?.name || ""}
                        width={400}
                        height={200}
                        className="w-full h-48 object-cover rounded-md"
                      />
                    </div>
                    <div className="md:w-1/2 md:pl-6 mt-4 md:mt-0">
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Nama Tool:</span> {toolDetails?.name}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 mt-2">
                        <span className="font-medium">Status:</span> {toolDetails?.status}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 mt-2">
                        <span className="font-medium">Asal Lemari:</span> {toolDetails?.storageCabinet}
                      </p>
                      {toolDetails && toolDetails.status === "In Use" && toolDetails.currentUser && (
                        <>
                          <div className="flex items-center mt-2">
                            <Image
                              src={toolDetails?.currentUser?.picture || ""}
                              alt={`${toolDetails?.currentUser?.firstName || ''} ${toolDetails?.currentUser?.lastName || ''}`}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                            <p className="ml-3 text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Dipakai oleh:</span> {toolDetails?.currentUser?.firstName} {toolDetails?.currentUser?.lastName}
                            </p>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 mt-2">
                            <span className="font-medium">Jam Penggunaan Hari Ini:</span> {toolDetails.usageHoursToday} jam
                          </p>
                        </>
                      )}
                      {/* History telah dipindahkan ke modal tersendiri */}
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-2">
                    <button
                      onClick={() => toolDetails && openEditModal(toolDetails)}
                      className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                      aria-label={`Edit tool ${toolDetails?.name || ''}`}
                    >
                      <FiEdit3 className="mr-2" /> Edit
                    </button>
                    <button
                      onClick={() => toolDetails && openHistoryModal(toolDetails)}
                      className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
                      aria-label={`Lihat history tool ${toolDetails?.name || ''}`}
                    >
                      Lihat History
                    </button>
                    <button
                      onClick={closeDetailModal}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
                      aria-label="Tutup Detail"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Transition>

        {/* Modal Borrow Tool */}
        <Transition show={isBorrowModalOpen && !!toolToBorrow}>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={closeBorrowModal}
          >
            <Transition.Child
              enter="transition-transform duration-300"
              enterFrom="scale-95 opacity-0"
              enterTo="scale-100 opacity-100"
              leave="transition-transform duration-200"
              leaveFrom="scale-100 opacity-100"
              leaveTo="scale-95 opacity-0"
            >
              <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Pinjam Tool</h2>
                  <form onSubmit={handleBorrowToolSubmit}>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Nama Pengguna</label>
                      <input
                        type="text"
                        value={borrowUser ? `${borrowUser.firstName} ${borrowUser.lastName}` : ""}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none transition-colors duration-200"
                        aria-label="Nama Pengguna"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Asal Lemari</label>
                      <select
                        value={borrowStorageCabinet}
                        onChange={(e) => setBorrowStorageCabinet(e.target.value as "Lemari Tools 1" | "Lemari Tools 2")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                        aria-label="Asal Lemari"
                      >
                        <option value="Lemari Tools 1">Lemari Tools 1</option>
                        <option value="Lemari Tools 2">Lemari Tools 2</option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={closeBorrowModal}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-md hover:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                      >
                        Pinjam
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Transition>

        {/* Modal Return Tool */}
        <Transition show={isReturnModalOpen && !!toolToReturn}>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={closeReturnModal}
          >
            <Transition.Child
              enter="transition-transform duration-300"
              enterFrom="scale-95 opacity-0"
              enterTo="scale-100 opacity-100"
              leave="transition-transform duration-200"
              leaveFrom="scale-100 opacity-100"
              leaveTo="scale-95 opacity-0"
            >
              <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Kembalikan Tool</h2>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    Apakah Anda yakin ingin mengembalikan tool <strong>{toolToReturn?.name}</strong>?
                  </p>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={closeReturnModal}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
                      aria-label="Batal Kembalikan"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleReturnTool}
                      className="px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded-md hover:bg-green-600 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                      aria-label="Kembalikan Tool"
                    >
                      Kembalikan
                    </button>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Transition>

        {/* Modal History Tool (baru) */}
        <Transition show={isHistoryModalOpen && !!historyTool}>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={closeHistoryModal}
          >
            <Transition.Child
              enter="transition-transform duration-300"
              enterFrom="scale-95 opacity-0"
              enterTo="scale-100 opacity-100"
              leave="transition-transform duration-200"
              leaveFrom="scale-100 opacity-100"
              leaveTo="scale-95 opacity-0"
            >
              <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-lg mx-4 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">History Peminjaman/Pengembalian</h2>
                  {historyTool && historyTool.history && historyTool.history.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {historyTool.history.map((entry) => (
                        <li key={entry.id} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                          <div className="flex items-center">
                            <Image
                              src={entry.user.picture}
                              alt={`${entry.user.firstName} ${entry.user.lastName}`}
                              width={30}
                              height={30}
                              className="rounded-full object-cover"
                            />
                            <div className="ml-3">
                              <p className="text-gray-700 dark:text-gray-200">
                                <span className="font-medium">{entry.action} oleh:</span> {entry.user.firstName} {entry.user.lastName}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {new Date(entry.time).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Tidak ada history.</p>
                  )}
                  <div className="mt-6 flex justify-end space-x-2">
                    <button
                      onClick={closeHistoryModal}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
                      aria-label="Tutup History"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Transition>

      </div>
    </div>
  );
};

export default ToolDashboard;