"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import DarkModeSwitcher from "./DarkModeSwitcher";
import DropdownNotification from "./DropdownNotification";
import DropdownUser from "./DropdownUser";
import Image from "next/image";
import SearchForm from "@/components/Header/SearchForm";
import anime from "animejs";

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
}) => {
  // State untuk mengatur apakah animasi akhir sudah selesai (untuk menampilkan tampilan statis)
  const [showStatic, setShowStatic] = useState(false);

  // State untuk menyimpan full name dari localStorage
  const [userName, setUserName] = useState<string>("");

  // Determine greeting time based on local time
  const getGreetingTime = () => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) return "Pagi";
    if (currentHour < 18) return "Siang";
    return "Malam";
  };

  const greetingTime = getGreetingTime();

  // Ambil fullName dari localStorage setelah komponen ter-mount
  useEffect(() => {
    // Pastikan window sudah terdefinisi
    if (typeof window !== "undefined") {
      const fullName = localStorage.getItem("fullName");
      if (fullName) {
        setUserName(fullName);
      }
    }
  }, []);

  useEffect(() => {
    // Animasi tahap 1:
    // Teks awal: "Selamat {greetingTime}, {userName}" dan <p> kosong
    anime({
      targets: "#title",
      opacity: [0, 1],
      translateY: [-20, 0],
      duration: 1500,
      easing: "easeOutExpo",
      complete: () => {
        // Setelah animasi tahap 1 selesai, tampilkan tampilan statis
        setTimeout(() => {
          setShowStatic(true);
        }, 2000);
      },
    });
  }, [userName, greetingTime]);

  return (
    <header className="sticky top-0 z-999 flex w-full border-b border-stroke bg-white dark:border-stroke-dark dark:bg-gray-dark">
      <div className="flex flex-grow items-center justify-between px-4 py-5 shadow-2 md:px-5 2xl:px-10">
        <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
          {/* Hamburger Toggle BTN */}
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              props.setSidebarOpen(!props.sidebarOpen);
            }}
            className="z-99999 block rounded-sm border border-stroke bg-white p-1.5 shadow-sm dark:border-dark-3 dark:bg-dark-2 lg:hidden"
          >
            <span className="relative block h-5.5 w-5.5 cursor-pointer">
              <span className="du-block absolute right-0 h-full w-full">
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-dark delay-[0] duration-200 ease-in-out dark:bg-white ${
                    !props.sidebarOpen && "!w-full delay-300"
                  }`}
                ></span>
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-dark delay-150 duration-200 ease-in-out dark:bg-white ${
                    !props.sidebarOpen && "delay-400 !w-full"
                  }`}
                ></span>
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-dark delay-200 duration-200 ease-in-out dark:bg-white ${
                    !props.sidebarOpen && "!w-full delay-500"
                  }`}
                ></span>
              </span>
              <span className="absolute right-0 h-full w-full rotate-45">
                <span
                  className={`absolute left-2.5 top-0 block h-full w-0.5 rounded-sm bg-dark delay-300 duration-200 ease-in-out dark:bg-white ${
                    !props.sidebarOpen && "!h-0 !delay-[0]"
                  }`}
                ></span>
                <span
                  className={`delay-400 absolute left-0 top-2.5 block h-0.5 w-full rounded-sm bg-dark duration-200 ease-in-out dark:bg-white ${
                    !props.sidebarOpen && "!h-0 !delay-200"
                  }`}
                ></span>
              </span>
            </span>
          </button>
          {/* Hamburger Toggle BTN */}

          {/* Logo */}
          <Link className="block flex-shrink-0 lg:hidden" href="/">
            <Image
              width={60}
              height={60}
              src="/images/logo/logo_Sw-dark.svg"
              alt="Logo"
              className="dark:hidden"
            />
            <Image
              width={60}
              height={60}
              src="/images/logo/logo_Sw-dark.svg"
              alt="Logo"
              className="hidden dark:block"
            />
          </Link>
        </div>

        <div className="hidden xl:block">
          <div>
            {showStatic ? (
              <>
                <h1 className="mb-0.5 text-heading-5 font-bold text-dark dark:text-white">
                  Dashboard
                </h1>
                <p className="font-medium">Tops Smart Garden</p>
              </>
            ) : (
              <>
                {/* Animasi Tahap 1 */}
                <h1 id="title" className="mb-0.5 text-heading-5 font-bold text-dark dark:text-white">
                  {`Selamat ${greetingTime}, ${userName || "User"}`}
                </h1>
                <p id="subtitle" className="font-medium"></p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-normal gap-2 2xsm:gap-4 lg:w-full lg:justify-between xl:w-auto xl:justify-normal">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            {/* Search Form */}
            {/* <SearchForm /> */}
            {/* Dark Mode Toggle */}
            <DarkModeSwitcher />
            {/* Notification Menu Area */}
            {/* <DropdownNotification /> */}
          </ul>

          {/* User Area */}
          <DropdownUser />
        </div>
      </div>
    </header>
  );
};

export default Header;