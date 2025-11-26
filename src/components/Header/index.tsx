"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import DarkModeSwitcher from "./DarkModeSwitcher";
import DropdownNotification from "./DropdownNotification";
import DropdownUser from "./DropdownUser";
import { FaLeaf } from "react-icons/fa"; // Ikon tambahan untuk branding

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
}) => {
  // State untuk greeting
  const [greeting, setGreeting] = useState({
    time: "Pagi",
    name: "User"
  });

  // Mengatur sapaan berdasarkan waktu & local storage
  useEffect(() => {
    const currentHour = new Date().getHours();
    let timeGreeting = "Pagi";
    if (currentHour >= 11 && currentHour < 15) timeGreeting = "Siang";
    else if (currentHour >= 15 && currentHour < 18) timeGreeting = "Sore";
    else if (currentHour >= 18 || currentHour < 4) timeGreeting = "Malam";

    // Ambil nama, prioritaskan localStorage, fallback ke "Gardener"
    let storedName = "Gardener";
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("fullName");
      if (savedName) storedName = savedName.split(" ")[0]; // Ambil nama depan saja biar tidak kepanjangan
    }

    setGreeting({ time: timeGreeting, name: storedName });
  }, []);

  return (
    <header className="sticky top-0 z-40 flex w-full bg-white/80 backdrop-blur-xl transition-colors duration-300 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        
        {/* --- BAGIAN KIRI (Mobile Hamburger & Logo) --- */}
        <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
          {/* Hamburger Toggle Button */}
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              props.setSidebarOpen(!props.sidebarOpen);
            }}
            className="z-50 block rounded-lg border border-gray-200 bg-white p-1.5 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 lg:hidden"
          >
            <span className="relative block h-5.5 w-5.5 cursor-pointer">
              <span className="du-block absolute right-0 h-full w-full">
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-gray-600 delay-[0] duration-200 ease-in-out dark:bg-gray-300 ${
                    !props.sidebarOpen && "!w-full delay-300"
                  }`}
                ></span>
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-gray-600 delay-150 duration-200 ease-in-out dark:bg-gray-300 ${
                    !props.sidebarOpen && "delay-400 !w-full"
                  }`}
                ></span>
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-gray-600 delay-200 duration-200 ease-in-out dark:bg-gray-300 ${
                    !props.sidebarOpen && "!w-full delay-500"
                  }`}
                ></span>
              </span>
              <span className="absolute right-0 h-full w-full rotate-45">
                <span
                  className={`absolute left-2.5 top-0 block h-full w-0.5 rounded-sm bg-gray-600 delay-300 duration-200 ease-in-out dark:bg-gray-300 ${
                    !props.sidebarOpen && "!h-0 !delay-[0]"
                  }`}
                ></span>
                <span
                  className={`delay-400 absolute left-0 top-2.5 block h-0.5 w-full rounded-sm bg-gray-600 duration-200 ease-in-out dark:bg-gray-300 ${
                    !props.sidebarOpen && "!h-0 !delay-200"
                  }`}
                ></span>
              </span>
            </span>
          </button>

          {/* Mobile Logo */}
          <Link className="block flex-shrink-0 lg:hidden" href="/">
            <div className="relative h-8 w-8">
               <Image
                src="/images/logo/logo_Sw-dark.svg"
                alt="Logo"
                fill
                className="object-contain dark:hidden"
              />
              <Image
                src="/images/logo/logo_Sw-dark.svg"
                alt="Logo"
                fill
                className="hidden object-contain dark:block"
              />
            </div>
          </Link>
        </div>

        {/* --- BAGIAN TENGAH/KIRI (Desktop Greeting) --- */}
        <div className="hidden sm:block">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              Dashboard
              <span className="hidden xl:inline-block text-xs font-normal text-gray-400 dark:text-gray-500">|</span>
              <span className="hidden xl:inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                <FaLeaf size={12} /> Tops Smart Garden
              </span>
            </h1>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Selamat {greeting.time}, <span className="text-gray-800 dark:text-gray-200 font-semibold">{greeting.name}</span> 👋
            </p>
          </div>
        </div>

        {/* --- BAGIAN KANAN (Actions) --- */}
        <div className="flex items-center gap-3 2xsm:gap-7">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            {/* Dark Mode Toggle */}
            <DarkModeSwitcher />

            {/* Notification Menu Area */}
            {/* <DropdownNotification /> */}
          </ul>

          {/* User Menu Area */}
          <DropdownUser />
        </div>
      </div>
    </header>
  );
};

export default Header;