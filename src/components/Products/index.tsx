"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import anime from "animejs";
import { FaSun, FaMoon, FaBars, FaTimes } from "react-icons/fa";
import { FaArrowRightToBracket } from "react-icons/fa6";
import { RiLoginCircleFill } from "react-icons/ri";
import Cookies from "js-cookie";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Konten statis default (Bahasa Inggris)
const defaultContent = {
  hero: {
    preTitle: "Welcome to ",
    titleMaroon: "TEFA AKTI",
    postTitle: "",
    subtitle:
      "Empowering students through hands-on learning and industry-standard practices.",
  },
  products: {
    title: "Our Products",
  },
  menu: {
    home: "Home",
    products: "Products",
    contact: "Contact",
  },
  login: "Login",
};

// Data produk statis
interface Product {
  id: string;
  img: string;
  alt: string;
  title: string;
  description: string;
}

const products: Product[] = [
  {
    id: "1",
    img: "/images/product/product_tefa-01.jpg",
    alt: "Web Development",
    title: "Web Development",
    description: "Custom websites and web applications.",
  },
  {
    id: "2",
    img: "/images/product/product_tefa-02.jpg",
    alt: "Mobile Apps",
    title: "Mobile Apps",
    description: "iOS and Android application development.",
  },
  {
    id: "3",
    img: "/images/product/product_tefa-03.jpg",
    alt: "UI/UX Design",
    title: "UI/UX Design",
    description: "User-centered design solutions.",
  },
  {
    id: "4",
    img: "/images/product/product_tefa-04.jpg",
    alt: "Data Analytics",
    title: "Data Analytics",
    description: "Data-driven insights and visualizations.",
  },
  {
    id: "5",
    img: "/images/product/product_tefa-05.jpg",
    alt: "Cloud Solutions",
    title: "Cloud Solutions",
    description: "Scalable cloud architecture & services.",
  },
];

export default function ProductsPage() {
  // -------------------------------------
  // LOGIKA TEMA (membaca dari localStorage jika tersedia)
  // -------------------------------------
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const storedTheme = localStorage.getItem("color-theme");
    if (storedTheme) {
      try {
        const parsedTheme = JSON.parse(storedTheme);
        if (parsedTheme === "light" || parsedTheme === "dark") {
          return parsedTheme;
        }
      } catch (error) {
        console.error("Error parsing theme from localStorage:", error);
      }
    }
    // Jika tidak ada, kembalikan default (misalnya "light")
    return "light";
  });

  const isDark = theme === "dark";

  useLayoutEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("color-theme", JSON.stringify(theme));
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // -------------------------------------
  // Pengecekan cookie login
  // -------------------------------------
  const userCookieExists = Boolean(Cookies.get("userAuth"));

  // -------------------------------------
  // STATE & ANIMASI UNTUK SIDEBAR
  // -------------------------------------
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (isSidebarOpen) {
      anime({
        targets: ".sidebar",
        translateX: ["-100%", "0%"],
        easing: "easeOutQuad",
        duration: 500,
      });
      anime({
        targets: ".overlay",
        opacity: [0, 0.5],
        easing: "linear",
        duration: 500,
      });
    } else {
      anime({
        targets: ".sidebar",
        translateX: ["0%", "-100%"],
        easing: "easeInQuad",
        duration: 500,
      });
      anime({
        targets: ".overlay",
        opacity: [0.5, 0],
        easing: "linear",
        duration: 500,
      });
    }
  }, [isSidebarOpen]);

  // -------------------------------------
  // Header Component (tanpa dropdown bahasa)
  // -------------------------------------
  const Header = () => (
    <header
      className={`fixed left-0 top-0 z-40 w-full backdrop-blur-sm transition-colors ${
        isDark ? "bg-black/40" : "bg-white/70 shadow-md"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
        <div className="flex items-center space-x-3">
          <Image
            src="/images/logo/akti.png"
            alt="Logo TEFA AKTI"
            width={40}
            height={40}
          />
          <span
            className="text-xl font-bold tracking-wide"
            style={{ color: "#cc001b" }}
          >
            TEFA AKTI
          </span>
        </div>
        <nav className="hidden items-center space-x-6 text-lg md:flex">
          <Link
            href="/"
            className={`transition-colors ${
              isDark
                ? "text-gray-400 hover:text-gray-100"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {defaultContent.menu.home}
          </Link>
          <Link
            href="/#products"
            className={`transition-colors ${
              isDark
                ? "text-gray-400 hover:text-gray-100"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {defaultContent.menu.products}
          </Link>
          <Link
            href="/#contact"
            className={`transition-colors ${
              isDark
                ? "text-gray-400 hover:text-gray-100"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {defaultContent.menu.contact}
          </Link>
          <Link
            href={userCookieExists ? "/dashboard" : "/auth/signin"}
            className="inline-flex items-center justify-center space-x-1 rounded px-3 py-2 text-sm font-medium transition-colors"
            style={{ backgroundColor: "#800000", color: "white" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#a00000")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#800000")
            }
          >
            {userCookieExists ? (
              <>
                <span>Dashboard</span>
                <FaArrowRightToBracket />
              </>
            ) : (
              <>
                <span>{defaultContent.login}</span>
                <RiLoginCircleFill />
              </>
            )}
          </Link>
        </nav>
        <div className="flex items-center space-x-3">
          <button
            className="p-2 md:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open Sidebar"
          >
            <FaBars size={20} />
          </button>
          <button onClick={toggleTheme} className="p-2">
            {isDark ? (
              <FaSun size={20} className="text-yellow-400" />
            ) : (
              <FaMoon size={20} className="text-gray-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );

  // -------------------------------------
  // Sidebar Component (menjadi Link Next.js untuk navigasi)
  // -------------------------------------
  const Sidebar = () => (
    <div>
      {/* Overlay */}
      <div
        className="overlay pointer-events-auto fixed inset-0 bg-black"
        style={{ opacity: 0 }}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <div
        className={`sidebar fixed left-0 top-0 z-50 h-full w-64 transform transition-colors duration-300 ${
          isDark
            ? "border-r border-gray-700 bg-gray-800 text-white"
            : "border-r border-gray-300 bg-white text-gray-800"
        }`}
        style={{ transform: "translateX(-100%)" }}
      >
        <div className="flex items-center justify-between border-b border-current px-4 py-4 transition-colors duration-300">
          <span className="text-lg font-semibold">Menu</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close Sidebar"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <nav className="flex flex-col space-y-4 px-4 py-4">
          {/* Gunakan Link Next.js dan tambahkan onClick untuk menutup sidebar */}
          <Link
            href="/"
            onClick={() => setIsSidebarOpen(false)}
            className="transition-colors hover:underline"
          >
            {defaultContent.menu.home}
          </Link>
          <Link
            href="/#products"
            onClick={() => setIsSidebarOpen(false)}
            className="transition-colors hover:underline"
          >
            {defaultContent.menu.products}
          </Link>
          <Link
            href="/#contact"
            onClick={() => setIsSidebarOpen(false)}
            className="transition-colors hover:underline"
          >
            {defaultContent.menu.contact}
          </Link>
        </nav>
        <div className="px-4 py-4">
          <Link
            href={userCookieExists ? "/dashboard" : "/auth/signin"}
            className="inline-flex w-full items-center justify-center space-x-1 rounded px-3 py-1 text-center text-sm font-medium transition-colors"
            style={{ backgroundColor: "#800000", color: "white" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#cc001b")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#800000")
            }
          >
            {userCookieExists ? (
              <>
                <span>Dashboard</span>
                <FaArrowRightToBracket />
              </>
            ) : (
              <>
                <span>{defaultContent.login}</span>
                <RiLoginCircleFill />
              </>
            )}
          </Link>
        </div>
      </div>
    </div>
  );

  // -------------------------------------
  // Pengaturan warna kartu produk berdasarkan tema
  // -------------------------------------
  const cardBgClass = isDark ? "bg-gray-800" : "bg-white";
  const cardInnerBgClass = isDark ? "bg-gray-700" : "bg-gray-200";
  const cardTextClass = isDark ? "text-gray-200" : "text-gray-800";

  // -------------------------------------
  // MAIN CONTENT: List Produk
  // -------------------------------------
  return (
    <div
      key={theme} // Remount seluruh konten ketika tema berubah
      className={`font-sans relative min-h-screen w-full overflow-x-hidden transition-colors ${
        isDark
          ? "bg-gradient-to-b from-gray-900 via-gray-900 to-black"
          : "bg-white"
      }`}
      style={{ scrollBehavior: "smooth" }}
    >
      <Header />
      <Sidebar />
      <main className="pb-10 pt-20">
        <div className="container mx-auto px-4">
          <h1
            className={`mb-8 text-center text-3xl font-bold ${cardTextClass}`}
          >
            {defaultContent.products.title}
          </h1>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className={`group block rounded-lg ${cardBgClass} shadow-md transition-shadow duration-300 hover:shadow-xl`}
              >
                <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                  <Image
                    src={product.img}
                    alt={product.alt}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className={`p-4 ${cardInnerBgClass} rounded-b-lg`}>
                  <h2
                    className={`mb-2 text-xl font-semibold ${cardTextClass} transition-colors group-hover:text-red-600`}
                  >
                    {product.title}
                  </h2>
                  <p className={`text-sm ${cardTextClass}`}>
                    {product.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}