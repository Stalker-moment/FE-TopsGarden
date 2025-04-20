// Sidebar.tsx
"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SidebarItem from "@/components/Sidebar/SidebarItem";
import ClickOutside from "@/components/ClickOutside";
import { MdSpaceDashboard , MdDisplaySettings, MdOutlineWarehouse } from "react-icons/md";
import { FaHandshake, FaTools, FaLightbulb  } from "react-icons/fa";
import { TbDeviceAnalytics } from "react-icons/tb";
import {
  MdOutlineSupervisorAccount,
  MdOutlineManageAccounts,
  MdAccountCircle,
  MdSettingsSuggest,
} from "react-icons/md";

import Cookies from "js-cookie";
import CryptoJS from "crypto-js";
import { GiWateringCan } from "react-icons/gi";

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

// Struktur menuGroups tetap sama
const menuGroups = [
  {
    name: "MAIN MENU",
    menuItems: [
      {
        icon: <MdSpaceDashboard  size={24} />,
        label: "Home",
        route: "/dashboard",
        isAdmin: false,
      },
      {
        icon: <FaLightbulb  style={{ fontSize: "24px" }} />,
        label: "Light Control",
        route: "/dashboard/light-control",
        isAdmin: false,
      },
      {
        icon: <GiWateringCan style={{ fontSize: "24px" }} />,
        label: "Smart Watering",
        route: "/dashboard/smartwatering",
        isAdmin: true,
      },
      {
        icon: <MdSettingsSuggest style={{ fontSize: "24px" }} />,
        label: "Output Setting",
        route: "/dashboard/output",
        isAdmin: false,
      },
    ],
  },
  {
    name: "OTHERS",
    menuItems: [
      {
        icon: <MdAccountCircle size={24} />,
        label: "Profile",
        route: "/dashboard/profile",
        isAdmin: false,
      },
      {
        icon: <MdOutlineManageAccounts style={{ fontSize: "24px" }} />,
        label: "Account Settings",
        route: "/dashboard/pages/settings",
        isAdmin: false,
      },
      {
        icon: <MdOutlineSupervisorAccount style={{ fontSize: "24px" }} />,
        label: "Accounts Management",
        route: "/dashboard/account",
        isAdmin: true,
      },
      // {
      //   icon: <MdDisplaySettings style={{ fontSize: "24px" }} />,
      //   label: "Setting Product/Landing page",
      //   route: "/dashboard/user",
      //   isAdmin: true,
      // },
    ],
  },
];

// Fungsi dekripsi data WebSocket menggunakan CryptoJS
const decryptData = (encryptedData: { iv: string; content: string } | null) => {
  if (!encryptedData || !encryptedData.iv || !encryptedData.content) {
    console.error("Invalid encrypted data:", encryptedData);
    return null;
  }

  try {
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
      },
    );

    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const pathname = usePathname();

  const [userInfo, setUserInfo] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // State untuk menampung apakah tiap group sedang terbuka (expand) atau tidak
  const [openGroups, setOpenGroups] = useState<boolean[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebarOpenGroups");
      if (stored) {
        // Pastikan parse ke array boolean
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {
          console.error("Error parsing localStorage data:", e);
        }
      }
    }
    // Default: semua terbuka (atau semua tertutup) — silakan diubah sesuai kebutuhan
    return menuGroups.map(() => true);
  });

  // Fungsi toggle untuk buka/tutup group
  const handleToggleGroup = (index: number) => {
    setOpenGroups((prevOpenGroups) => {
      const newOpenGroups = [...prevOpenGroups];
      newOpenGroups[index] = !newOpenGroups[index];
      // Simpan ke localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "sidebarOpenGroups",
          JSON.stringify(newOpenGroups),
        );
      }
      return newOpenGroups;
    });
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(`/api/user-info`, {
          method: "GET",
        });

        if (response.ok) {
          const data = await response.json();

          if (data?.iv && data?.content) {
            const decryptedData = decryptData(data);
            if (decryptedData) {
              setUserInfo(decryptedData);
              setIsAdmin(decryptedData.role === "ADMIN");
            }
          } else {
            console.error("Invalid encrypted response from API:", data);
          }
        } else {
          console.error("Failed to fetch user info");
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <ClickOutside onClick={() => setSidebarOpen(false)}>
      <aside
        className={`absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden 
    border-r border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark 
    lg:static lg:translate-x-0 
    ${sidebarOpen ? "translate-x-0 duration-300 ease-linear" : "-translate-x-full"}`}
      >
        {/* Bagian header logo + tombol toggle */}
        <div className="flex items-center justify-between px-6 py-8">
          <Link href="/">
            <Image
              width={196}
              height={196}
              src={"/images/logo/logo_Sw.svg"}
              alt="Logo"
              priority
              className="dark:hidden"
            />
            <Image
              width={196}
              height={196}
              src={"/images/logo/logo_Sw.svg"}
              alt="Logo"
              priority
              className="hidden dark:block"
            />
          </Link>

          {/* Tombol toggle sidebar, muncul hanya di mobile */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="block lg:hidden"
          >
            <svg
              className="fill-current"
              width="20"
              height="18"
              viewBox="0 0 20 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* SVG Path */}
              <path
                d="M18 1H2C1.73478 1 
              1.48043 1.10536 1.29289 1.29289C1.10536 1.48043 
              1 1.73478 1 2C1 2.26522 1.10536 2.51957 
              1.29289 2.70711C1.48043 2.89464 1.73478 
              3 2 3H18C18.2652 3 18.5196 2.89464 
              18.7071 2.70711C18.8946 2.51957 19 
              2.26522 19 2C19 1.73478 18.8946 1.48043 
              18.7071 1.29289C18.5196 1.10536 18.2652 
              1 18 1ZM18 7H2C1.73478 7 1.48043 7.10536 
              1.29289 7.29289C1.10536 7.48043 1 7.73478 
              1 8C1 8.26522 1.10536 8.51957 1.29289 
              8.70711C1.48043 8.89464 1.73478 9 2 
              9H18C18.2652 9 18.5196 8.89464 18.7071 
              8.70711C18.8946 8.51957 19 8.26522 19 
              8C19 7.73478 18.8946 7.48043 18.7071 
              7.29289C18.5196 7.10536 18.2652 7 18 7ZM18 
              13H2C1.73478 13 1.48043 13.1054 1.29289 
              13.2929C1.10536 13.4804 1 13.7348 1 14C1 
              14.2652 1.10536 14.5196 1.29289 14.7071C1.48043 
              14.8946 1.73478 15 2 15H18C18.2652 15 18.5196 
              14.8946 18.7071 14.7071C18.8946 14.5196 19 
              14.2652 19 14C19 13.7348 18.8946 13.4804 
              18.7071 13.2929C18.5196 13.1054 18.2652 
              13 18 13Z"
                fill=""
              />
            </svg>
          </button>
        </div>

        {/* Bagian menu */}
        <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
          <nav className="mt-1 px-4 lg:px-6">
            {menuGroups.map((group, groupIndex) => {
              // Cek apakah group ini sedang terbuka atau tidak
              const isGroupOpen = openGroups[groupIndex];

              return (
                <div key={groupIndex} className="mb-4">
                  {/* Header group + ikon toggle */}
                  <div
                    onClick={() => handleToggleGroup(groupIndex)}
                    className="mb-2 flex cursor-pointer items-center justify-between"
                  >
                    <h3 className="text-sm font-medium text-dark-4 dark:text-dark-6">
                      {group.name}
                    </h3>
                    <svg
                      className={`h-4 w-4 transition-transform ${
                        isGroupOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>

                  {/* Daftar menu item, tampil jika isGroupOpen == true */}
                  {isGroupOpen && (
                    <ul className="mb-2 flex flex-col gap-2">
                      {group.menuItems
                        .filter((menuItem) => !menuItem.isAdmin || isAdmin)
                        .map((menuItem, menuIndex) => (
                          <SidebarItem
                            key={menuIndex}
                            item={menuItem}
                            isActive={
                              pathname === menuItem.route ||
                              (menuItem.route !== "/dashboard" &&
                                pathname?.startsWith(menuItem.route) === true)
                            }
                          />
                        ))}
                    </ul>
                  )}
                  <hr className="border-t border-gray-200 dark:border-stroke-dark" />
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
    </ClickOutside>
  );
};

export default Sidebar;