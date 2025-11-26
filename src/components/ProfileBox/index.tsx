// app/components/ProfileBox.tsx
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { FaPhoneAlt, FaEnvelope, FaUserEdit, FaCalendarAlt } from "react-icons/fa";

// Tipe data
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  picture: string;
  banner: string;
}

interface UserResponse {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
}

// Helper untuk format tanggal
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const ProfileBox: React.FC = async () => {
  const API_URL = process.env.NEXT_PUBLIC_HTTPS_API_URL;

  if (!API_URL) {
    throw new Error("HTTPS_API_URL is not defined.");
  }

  const token = cookies().get("userAuth")?.value;

  if (!token) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl bg-red-50 p-8 text-center text-red-600 dark:bg-red-900/20 dark:text-red-400">
        <p className="font-semibold">Akses Ditolak</p>
        <p className="text-sm">Silakan login kembali untuk melihat profil.</p>
      </div>
    );
  }

  try {
    const res = await fetch(`https://${API_URL}/api/users/account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Gagal mengambil data profil (Status: ${res.status})`);
    }

    const data: UserResponse = await res.json();
    const { contact } = data;

    return (
      <div className="group relative w-full overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-none transition-colors duration-300">
        
        {/* 1. Banner Section */}
        <div className="relative h-48 w-full md:h-64">
          <Image
            src={contact.banner || "/images/cover/cover-01.png"}
            alt="Profile Cover"
            fill
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Gradient Overlay agar menyatu dengan background kartu saat dark mode */}
          <div className="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-white/90 via-white/50 to-transparent dark:from-gray-800 dark:via-gray-800/50"></div>
        </div>

        {/* 2. Profile Info Container */}
        <div className="relative px-6 pb-8 text-center md:px-10">
          
          {/* Avatar Floating */}
          <div className="relative -mt-20 mb-6 inline-block">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border-[6px] border-white bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800 sm:h-40 sm:w-40 transition-colors duration-300">
              <Image
                src={contact.picture || "/images/user/default-avatar.png"}
                alt="Profile Picture"
                fill
                className="object-cover"
              />
            </div>
            {/* Status Indicator */}
            <span className="absolute bottom-2 right-2 h-5 w-5 rounded-full border-4 border-white bg-green-500 dark:border-gray-800 transition-colors duration-300"></span>
          </div>

          {/* Nama & Role */}
          <h3 className="mb-1.5 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl transition-colors duration-300">
            {`${contact.firstName} ${contact.lastName}`}
          </h3>
          <p className="mb-6 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors duration-300">
            {data.role || "User"}
          </p>

          {/* Detail Info Grid */}
          <div className="mx-auto mb-8 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
            
            {/* Email Card */}
            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-green-500/30 hover:bg-green-500/5 dark:border-gray-700 dark:bg-gray-700/50 dark:hover:border-green-500/30">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <FaEnvelope />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={contact.email}>
                  {contact.email}
                </p>
              </div>
            </div>

            {/* Phone Card */}
            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-green-500/30 hover:bg-green-500/5 dark:border-gray-700 dark:bg-gray-700/50 dark:hover:border-green-500/30">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <FaPhoneAlt />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Telepon</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {contact.phone || "-"}
                </p>
              </div>
            </div>

            {/* Join Date Card */}
            <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-green-500/30 hover:bg-green-500/5 dark:border-gray-700 dark:bg-gray-700/50 dark:hover:border-green-500/30 sm:col-span-2 md:col-span-1">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                <FaCalendarAlt />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Bergabung</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatDate(data.createdAt)}
                </p>
              </div>
            </div>

             {/* Edit Button */}
             <div className="flex items-center justify-center sm:col-span-2 md:col-span-1">
               <Link 
                 href="/dashboard/pages/settings" 
                 className="group relative flex w-full items-center justify-center gap-2.5 rounded-xl bg-green-600 py-4 px-6 font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-700 hover:shadow-green-500/30 active:scale-95 dark:bg-green-600 dark:hover:bg-green-700"
               >
                 <FaUserEdit className="text-lg" />
                 <span>Edit Profil</span>
               </Link>
             </div>

          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-900/20">
           !
        </div>
        <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Gagal Memuat Profil</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error.message || "Terjadi kesalahan jaringan."}</p>
      </div>
    );
  }
};

export default ProfileBox;