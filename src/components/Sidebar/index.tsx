// Sidebar.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SidebarItem from "@/components/Sidebar/SidebarItem"; // Asumsi SidebarItem juga diupdate atau sudah mendukung className custom
import ClickOutside from "@/components/ClickOutside";
import { 
  MdSpaceDashboard, 
  MdDisplaySettings, 
  MdOutlineWarehouse,
  MdOutlineSupervisorAccount,
  MdOutlineManageAccounts,
  MdAccountCircle,
  MdSettingsSuggest,
  MdChevronRight // Ikon panah baru
} from "react-icons/md";
import { FaHandshake, FaTools, FaLightbulb, FaBolt } from "react-icons/fa";
import { TbDeviceAnalytics } from "react-icons/tb";
import { GiWateringCan } from "react-icons/gi";
import { motion, AnimatePresence } from "framer-motion";
import Cookies from "js-cookie";
import CryptoJS from "crypto-js";

const WS_SECRET_KEY = process.env.NEXT_PUBLIC_WS_SECRET_KEY || "";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  route: string;
  isAdmin: boolean;
}

// Struktur menuGroups
const menuGroups = [
  {
    name: "MAIN MENU",
    menuItems: [
      { icon: <MdSpaceDashboard size={22} />, label: "Home", route: "/dashboard", isAdmin: false },
      { icon: <FaLightbulb size={20} />, label: "Light Control", route: "/dashboard/light-control", isAdmin: false },
      { icon: <FaBolt size={20} />, label: "Power Monitor", route: "/dashboard/power", isAdmin: false },
      // { icon: <GiWateringCan size={22} />, label: "Smart Watering", route: "/dashboard/smartwatering", isAdmin: true },
      { icon: <MdSettingsSuggest size={22} />, label: "Output Setting", route: "/dashboard/output", isAdmin: false },
      { icon: <MdDisplaySettings size={22} />, label: "PLC Setting", route: "/dashboard/plc-setting", isAdmin: false },
    ],
  },
  {
    name: "OTHERS",
    menuItems: [
      { icon: <MdAccountCircle size={22} />, label: "Profile", route: "/dashboard/profile", isAdmin: false },
      { icon: <MdOutlineManageAccounts size={22} />, label: "Account Settings", route: "/dashboard/pages/settings", isAdmin: false },
      { icon: <MdOutlineSupervisorAccount size={22} />, label: "Accounts Management", route: "/dashboard/account", isAdmin: true },
    ],
  },
];

// Dekripsi Data
const decryptData = (encryptedData: { iv: string; content: string } | null) => {
  if (!encryptedData?.iv || !encryptedData?.content) return null;
  try {
    const { iv, content } = encryptedData;
    const decrypted = CryptoJS.AES.decrypt(
      CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(content)),
      CryptoJS.enc.Utf8.parse(WS_SECRET_KEY),
      { iv: CryptoJS.enc.Hex.parse(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  } catch (error) { return null; }
};

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  // State Accordion (Default semua terbuka)
  const [openGroups, setOpenGroups] = useState<boolean[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebarOpenGroups");
      if (stored) { try { return JSON.parse(stored); } catch {} }
    }
    return menuGroups.map(() => true);
  });

  const handleToggleGroup = (index: number) => {
    setOpenGroups((prev) => {
      const newOpen = [...prev];
      newOpen[index] = !newOpen[index];
      localStorage.setItem("sidebarOpenGroups", JSON.stringify(newOpen));
      return newOpen;
    });
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch(`/api/user-info`);
        if (res.ok) {
          const data = await res.json();
          if (data?.iv && data?.content) {
            const decrypted = decryptData(data);
            if (decrypted) {
              setUserInfo(decrypted);
              setIsAdmin(decrypted.role === "ADMIN");
            }
          }
        }
      } catch (e) { console.error("User info fetch error", e); }
    };
    fetchUserInfo();
  }, []);

  return (
    <ClickOutside onClick={() => setSidebarOpen(false)}>
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-y-hidden bg-white dark:bg-gray-900 shadow-lg transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* --- Header Logo --- */}
        <div className="flex items-center justify-between gap-2 px-6 py-6 lg:py-8">
          <Link href="/" className="flex items-center gap-2">
            {/* Pastikan ukuran logo konsisten */}
            <div className="relative h-10 w-32"> 
                <Image
                fill
                src={"/images/logo/logo_Sw.svg"}
                alt="Logo"
                className="object-contain dark:hidden"
                priority
                />
                <Image
                fill
                src={"/images/logo/logo_Sw.svg"}
                alt="Logo"
                className="hidden object-contain dark:block"
                priority
                />
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="block lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="fill-current" width="20" height="18" viewBox="0 0 20 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z" />
            </svg>
          </button>
        </div>

        {/* --- Menu List --- */}
        <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear px-4 pb-4">
          <nav className="space-y-6 mt-2">
            {menuGroups.map((group, groupIndex) => {
              const isGroupOpen = openGroups[groupIndex];

              return (
                <div key={groupIndex}>
                  {/* Group Header */}
                  <button
                    onClick={() => handleToggleGroup(groupIndex)}
                    className="group mb-3 flex w-full items-center justify-between px-4 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {group.name}
                    <MdChevronRight 
                        className={`h-4 w-4 transition-transform duration-200 ${isGroupOpen ? "rotate-90" : ""}`} 
                    />
                  </button>

                  {/* Menu Items */}
                  <AnimatePresence>
                    {isGroupOpen && (
                        <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="space-y-1 overflow-hidden"
                        >
                        {group.menuItems
                            .filter((menuItem) => !menuItem.isAdmin || isAdmin)
                            .map((menuItem, menuIndex) => {
                                const isActive = pathname === menuItem.route || 
                                                (menuItem.route !== "/dashboard" && pathname?.startsWith(menuItem.route));

                                return (
                                    <li key={menuIndex}>
                                        <Link
                                            href={menuItem.route}
                                            className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium duration-300 ease-in-out 
                                                ${isActive 
                                                    ? "bg-green-600 text-white shadow-lg shadow-green-500/30" 
                                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                }
                                            `}
                                        >
                                            <span className={`text-xl ${isActive ? "text-white" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors"}`}>
                                                {menuItem.icon}
                                            </span>
                                            {menuItem.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </div>
        
        {/* User Info Footer (Opsional) */}
        {/* <div className="mt-auto border-t border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div> 
                 <div>
                     <p className="text-sm font-medium text-gray-800 dark:text-white">User</p>
                     <p className="text-xs text-gray-500">Role</p>
                 </div>
            </div>
        </div> */}

      </aside>
    </ClickOutside>
  );
};

export default Sidebar;