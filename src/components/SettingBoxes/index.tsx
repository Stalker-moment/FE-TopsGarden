// app/dashboard/SettingBoxesWrapper.tsx
import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FaExclamationTriangle, FaSignInAlt } from "react-icons/fa";
import SettingBoxes from "./SettingBoxes";

// --- Tipe Data ---
export interface UserData {
  contact: {
    firstName: string;
    lastName: string;
    phone: string;
    noreg?: string;
    email: string;
    picture: string;
    banner?: string; // Tambahan jika ada banner
  };
  email: string;
  role?: string;
}

const SettingBoxesWrapper = async () => {
  const API_URL = process.env.NEXT_PUBLIC_HTTPS_API_URL;

  // 1. Validasi Environment Variable
  if (!API_URL) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        <p className="font-bold">System Error</p>
        <p className="text-sm">API URL configuration is missing.</p>
      </div>
    );
  }
  
  // 2. Ambil Token
  const cookieStore = cookies();
  const token = cookieStore.get("userAuth")?.value;

  // 3. Handle Unauthorized (Token Hilang)
  if (!token) {
    // Opsional: Bisa langsung redirect menggunakan: redirect('/auth/signin');
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/30">
          <FaExclamationTriangle size={32} />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">Sesi Berakhir</h2>
        <p className="mb-6 max-w-xs text-sm text-gray-500 dark:text-gray-400">
          Anda tidak memiliki izin untuk mengakses halaman ini atau sesi Anda telah habis.
        </p>
        <Link
          href="/auth/signin"
          className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-bold text-white shadow-lg transition-transform hover:bg-green-700 active:scale-95"
        >
          <FaSignInAlt /> Login Kembali
        </Link>
      </div>
    );
  }

  try {
    // 4. Fetch Data Server-Side
    const res = await fetch(`https://${API_URL}/api/users/account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store", // PENTING: Agar data tidak di-cache (selalu fresh saat edit profile)
    });
    
    if (!res.ok) {
      // Jika token expired di sisi API (401/403), throw error spesifik
      if (res.status === 401 || res.status === 403) {
        throw new Error("Unauthorized");
      }
      throw new Error(`Gagal memuat data (Status: ${res.status})`);
    }
    
    const data: UserData = await res.json();

    // 5. Return Client Component
    return <SettingBoxes initialUserData={data} />;

  } catch (error: any) {
    console.error("Error fetching user settings:", error);

    // Handle UI Error
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/30">
          <FaExclamationTriangle size={32} />
        </div>
        <h3 className="mb-2 text-xl font-bold text-gray-800 dark:text-white">Terjadi Kesalahan</h3>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {error.message === "Unauthorized" 
            ? "Sesi login Anda tidak valid." 
            : "Gagal mengambil data profil dari server."}
        </p>
        <Link
          href="/dashboard" // Atau refresh halaman
          className="rounded-xl border border-gray-300 px-6 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }
};

export default SettingBoxesWrapper;