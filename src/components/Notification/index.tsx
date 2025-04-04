// app/pages/notifications.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FiTrash2, FiCheckCircle, FiCircle } from "react-icons/fi";
import Link from "next/link";

// Interface untuk Notifikasi
interface Notification {
  id: string;
  category: string;
  image: string;
  title: string;
  subTitle: string;
  isRead: boolean;
  date: string;
}

// Data Dummy Notifikasi
const dummyNotifications: Notification[] = [
  {
    id: "1",
    category: "All",
    image: "/images/user/user-15.png",
    title: "Piter Joined the Team!",
    subTitle: "Congratulate him",
    isRead: false,
    date: "2025-01-20",
  },
  {
    id: "2",
    category: "Unread",
    image: "/images/user/user-02.png",
    title: "New message received",
    subTitle: "Devid sent you a new message",
    isRead: false,
    date: "2025-01-18",
  },
  {
    id: "3",
    category: "Participating",
    image: "/images/user/user-26.png",
    title: "New Payment received",
    subTitle: "Check your earnings",
    isRead: true,
    date: "2025-01-15",
  },
  {
    id: "4",
    category: "Your Reactions",
    image: "/images/user/user-28.png",
    title: "Jolly completed tasks",
    subTitle: "Assign her new tasks",
    isRead: false,
    date: "2025-01-14",
  },
  {
    id: "5",
    category: "All",
    image: "/images/user/user-27.png",
    title: "Roman Joined the Team!",
    subTitle: "Congratulate him",
    isRead: true,
    date: "2025-01-10",
  },
  // Tambahkan notifikasi dummy lainnya sesuai kebutuhan
];

// Kategori Notifikasi
const categories = ["All", "Unread", "Participating", "Your Reactions"];

const NotificationsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [notifications, setNotifications] = useState<Notification[]>(dummyNotifications);

  // Filter notifikasi berdasarkan kategori yang dipilih
  const filteredNotifications = notifications.filter((notif) => {
    if (selectedCategory === "All") return true;
    return notif.category === selectedCategory;
  });

  // Fungsi untuk menandai notifikasi sebagai dibaca
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  // Fungsi untuk menghapus notifikasi
  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  // Menghitung jumlah notifikasi baru (belum dibaca)
  const newNotificationsCount = notifications.filter((notif) => !notif.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {/* Header Kategori */}
        <header className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="mt-4 flex space-x-4 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedCategory === category
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {category}
                {category === "All" && newNotificationsCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                    {newNotificationsCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        {/* Daftar Notifikasi */}
        <main className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
              {selectedCategory} Notifikasi
            </h2>
            {selectedCategory !== "All" && (
              <Link
                href="#"
                className="text-blue-500 hover:underline"
              >
                Tandai semua sebagai dibaca
              </Link>
            )}
          </div>

          {filteredNotifications.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Tidak ada notifikasi di kategori ini.</p>
          ) : (
            <ul className="space-y-4">
              {filteredNotifications.map((notif) => (
                <li
                  key={notif.id}
                  className={`p-4 rounded-lg flex justify-between items-start ${
                    notif.isRead ? "bg-gray-100 dark:bg-gray-700" : "bg-blue-50 dark:bg-gray-600"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Image
                        width={56}
                        height={56}
                        src={notif.image}
                        alt="User"
                        className="rounded-full"
                      />
                    </div>
                    <div>
                      <h3 className={`text-xl font-medium ${
                        notif.isRead ? "text-gray-700 dark:text-gray-200" : "text-blue-700 dark:text-white"
                      }`}>
                        {notif.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">{notif.subTitle}</p>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{notif.date}</span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    {!notif.isRead ? (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="text-green-500 hover:text-green-700"
                        title="Tandai sebagai dibaca"
                      >
                        <FiCheckCircle size={24} />
                      </button>
                    ) : (
                      <FiCircle size={24} className="text-gray-400" />
                    )}
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Hapus notifikasi"
                    >
                      <FiTrash2 size={24} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
};

export default NotificationsPage;