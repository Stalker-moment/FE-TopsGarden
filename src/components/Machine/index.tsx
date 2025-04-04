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

interface Machine {
  id: string;
  name: string;
  image: string; // URL foto mesin
  isInUse: boolean;
  currentUser: User | null;
  usageHoursToday: number;
}

// Data Dummy
const dummyMachines: Machine[] = [
  {
    id: uuidv4(),
    name: "Mesin Las",
    image: "https://spkapi.tierkun.my.id/files/img/machine/cnc.jpg",
    isInUse: true,
    currentUser: {
      id: uuidv4(),
      firstName: "Budi",
      lastName: "Santoso",
      picture: "https://spkapi.tierkun.my.id/files/img/profile/default.png",
    },
    usageHoursToday: 5,
  },
  {
    id: uuidv4(),
    name: "Mesin CNC",
    image: "https://spkapi.tierkun.my.id/files/img/machine/cnc.jpg",
    isInUse: false,
    currentUser: null,
    usageHoursToday: 0,
  },
  {
    id: uuidv4(),
    name: "Mesin Pemotong Laser",
    image: "https://spkapi.tierkun.my.id/files/img/machine/cnc.jpg",
    isInUse: true,
    currentUser: {
      id: uuidv4(),
      firstName: "Siti",
      lastName: "Aminah",
      picture: "https://spkapi.tierkun.my.id/files/img/profile/default.png",
    },
    usageHoursToday: 3,
  },
  // Tambahkan lebih banyak data dummy sesuai kebutuhan
];

const MachineDashboard: React.FC = () => {
  // State utama
  const [machines, setMachines] = useState<Machine[]>(dummyMachines);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // State modal Add Machine
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newMachineName, setNewMachineName] = useState<string>("");
  const [newMachineImage, setNewMachineImage] = useState<string>("");

  // State modal Delete Machine
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [machineToDelete, setMachineToDelete] = useState<Machine | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState<string>("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // State modal Detail Machine
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [machineDetails, setMachineDetails] = useState<Machine | null>(null);

  // State modal Edit Machine
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [machineToEdit, setMachineToEdit] = useState<Machine | null>(null);
  const [editMachineName, setEditMachineName] = useState<string>("");
  const [editMachineImage, setEditMachineImage] = useState<string>("");

  // Handler pencarian
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredMachines = machines.filter((machine) =>
    machine.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Handler Modal Add Machine ---
  const openAddModal = () => setIsAddModalOpen(true);
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setNewMachineName("");
    setNewMachineImage("");
  };
  const handleAddMachineSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newMachineName.trim() === "") return;
    const newMachine: Machine = {
      id: uuidv4(),
      name: newMachineName.trim(),
      image: newMachineImage.trim() || "https://via.placeholder.com/300x200.png?text=Mesin+Baru",
      isInUse: false,
      currentUser: null,
      usageHoursToday: 0,
    };
    setMachines((prev) => [newMachine, ...prev]);
    closeAddModal();
  };

  // --- Handler Modal Delete Machine ---
  const openDeleteModal = (machine: Machine) => {
    setMachineToDelete(machine);
    setDeleteConfirmationInput("");
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setMachineToDelete(null);
    setDeleteConfirmationInput("");
    setDeleteError(null);
  };
  const handleDeleteConfirmationChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDeleteConfirmationInput(e.target.value);
  };
  const handleDeleteMachine = () => {
    if (!machineToDelete) return;
    if (deleteConfirmationInput !== machineToDelete.name) {
      setDeleteError(`Konfirmasi tidak sesuai. Ketik ulang nama mesin "${machineToDelete.name}" untuk menghapus mesin.`);
      return;
    }
    setMachines((prev) => prev.filter((mach) => mach.id !== machineToDelete.id));
    closeDeleteModal();
  };

  // --- Handler Modal Detail Machine ---
  const openDetailModal = (machine: Machine) => {
    setMachineDetails(machine);
    setIsDetailModalOpen(true);
  };
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setMachineDetails(null);
  };

  // --- Handler Modal Edit Machine ---
  const openEditModal = (machine: Machine) => {
    setMachineToEdit(machine);
    setEditMachineName(machine.name);
    setEditMachineImage(machine.image);
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setMachineToEdit(null);
    setEditMachineName("");
    setEditMachineImage("");
  };
  const handleEditMachineChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditMachineName(e.target.value);
  };
  const handleEditMachineImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditMachineImage(e.target.value);
  };
  const handleEditMachineSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!machineToEdit) return;
    if (editMachineName.trim() === "") return;
    const updatedMachine: Machine = {
      ...machineToEdit,
      name: editMachineName.trim(),
      image: editMachineImage.trim() || machineToEdit.image,
    };
    setMachines((prev) =>
      prev.map((mach) =>
        mach.id === updatedMachine.id ? updatedMachine : mach
      )
    );
    closeEditModal();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-0">Dashboard Mesin TEFA</h1>
          <button
            onClick={openAddModal}
            className="flex items-center bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
            aria-label="Tambah Mesin"
          >
            Tambah Mesin
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Cari mesin..."
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            aria-label="Cari mesin"
          />
        </div>

        {/* Grid Mesin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMachines.map((machine) => (
            <div
              key={machine.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform duration-200"
            >
              <div className="relative">
                <Image
                  src={machine.image}
                  alt={machine.name}
                  width={400}
                  height={200}
                  className="w-full h-48 object-cover"
                />
                <span
                  className={`absolute top-2 left-2 px-3 py-1 rounded-full text-sm font-semibold transition-colors duration-200 ${
                    machine.isInUse
                      ? "bg-red-500 text-white"
                      : "bg-green-500 text-white"
                  }`}
                >
                  {machine.isInUse ? "Dipakai" : "Tidak Dipakai"}
                </span>
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{machine.name}</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  {machine.isInUse && machine.currentUser ? (
                    <>
                      <span className="font-medium">Dipakai oleh:</span> {machine.currentUser.firstName} {machine.currentUser.lastName}
                    </>
                  ) : (
                    "Tidak ada pengguna saat ini."
                  )}
                </p>
                <p className="mt-1 text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Jam Penggunaan Hari Ini:</span> {machine.usageHoursToday} jam
                </p>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => openDetailModal(machine)}
                    className="text-blue-500 hover:text-blue-700 transition-colors duration-200"
                    title="Detail"
                    aria-label={`Detail mesin ${machine.name}`}
                  >
                    <LuEye size={20} />
                  </button>
                  <button
                    onClick={() => openEditModal(machine)}
                    className="text-yellow-500 hover:text-yellow-700 transition-colors duration-200"
                    title="Edit"
                    aria-label={`Edit mesin ${machine.name}`}
                  >
                    <FiEdit3 size={20} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(machine)}
                    className="text-red-500 hover:text-red-700 transition-colors duration-200"
                    title="Hapus"
                    aria-label={`Hapus mesin ${machine.name}`}
                  >
                    <MdDeleteForever size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredMachines.length === 0 && (
            <p className="col-span-full text-center text-gray-500 dark:text-gray-400">Tidak ada data mesin yang ditemukan.</p>
          )}
        </div>

        {/* Modal Add Machine */}
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
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Tambah Mesin Baru</h2>
                  <form onSubmit={handleAddMachineSubmit}>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Nama Mesin</label>
                      <input
                        type="text"
                        value={newMachineName}
                        onChange={(e) => setNewMachineName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                        placeholder="Masukkan nama mesin"
                        aria-label="Nama Mesin"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Foto Mesin</label>
                      <input
                        type="url"
                        value={newMachineImage}
                        onChange={(e) => setNewMachineImage(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors duration-200"
                        placeholder="URL gambar mesin (opsional)"
                        aria-label="Foto Mesin"
                      />
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

        {/* Modal Edit Machine */}
        <Transition show={isEditModalOpen && !!machineToEdit}>
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
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Edit Mesin</h2>
                  <form onSubmit={handleEditMachineSubmit}>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Nama Mesin</label>
                      <input
                        type="text"
                        value={editMachineName}
                        onChange={handleEditMachineChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors duration-200"
                        placeholder="Masukkan nama mesin"
                        aria-label="Nama Mesin"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Foto Mesin</label>
                      <input
                        type="url"
                        value={editMachineImage}
                        onChange={handleEditMachineImageChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors duration-200"
                        placeholder="URL gambar mesin (opsional)"
                        aria-label="Foto Mesin"
                      />
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

        {/* Modal Delete Machine */}
        <Transition show={isDeleteModalOpen && !!machineToDelete}>
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
                    Apakah Anda yakin ingin menghapus mesin <strong>{machineToDelete?.name}</strong>? Untuk mengonfirmasi, ketik ulang nama mesin di bawah ini.
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmationInput}
                    onChange={handleDeleteConfirmationChange}
                    placeholder={`Ketik ulang "${machineToDelete?.name || ''}"`}
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
                      onClick={handleDeleteMachine}
                      disabled={!machineToDelete || deleteConfirmationInput !== machineToDelete.name}
                      className={`px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200 ${
                        machineToDelete && deleteConfirmationInput === machineToDelete.name
                          ? "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                          : "bg-red-300 cursor-not-allowed dark:bg-red-300"
                      }`}
                      aria-label="Hapus Mesin"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Transition>

        {/* Modal Detail Machine */}
        <Transition show={isDetailModalOpen && !!machineDetails}>
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
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Detail Mesin</h2>
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/2">
                      <Image
                        src={machineDetails?.image || ""}
                        alt={machineDetails?.name || ""}
                        width={400}
                        height={200}
                        className="w-full h-48 object-cover rounded-md"
                      />
                    </div>
                    <div className="md:w-1/2 md:pl-6 mt-4 md:mt-0">
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Nama Mesin:</span> {machineDetails?.name}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 mt-2">
                        <span className="font-medium">Status:</span> {machineDetails?.isInUse ? "Dipakai" : "Tidak Dipakai"}
                      </p>
                      {machineDetails && machineDetails.isInUse && machineDetails.currentUser && (
                        <>
                          <div className="flex items-center mt-2">
                            <Image
                              src={machineDetails?.currentUser?.picture || ""}
                              alt={`${machineDetails?.currentUser?.firstName || ''} ${machineDetails?.currentUser?.lastName || ''}`}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                            <p className="ml-3 text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Dipakai oleh:</span> {machineDetails?.currentUser?.firstName} {machineDetails?.currentUser?.lastName}
                            </p>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 mt-2">
                            <span className="font-medium">Jam Penggunaan Hari Ini:</span> {machineDetails.usageHoursToday} jam
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-2">
                    <button
                      onClick={() => machineDetails && openEditModal(machineDetails)}
                      className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                      aria-label={`Edit mesin ${machineDetails?.name || ''}`}
                    >
                      <FiEdit3 className="mr-2" /> Edit
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
      </div>
    </div>
  );
};

export default MachineDashboard;