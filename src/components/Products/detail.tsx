"use client";

import React, { useEffect, useLayoutEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import anime from "animejs";
import {
  FaSun,
  FaMoon,
  FaBars,
  FaTimes,
  FaArrowLeft,
  FaShoppingCart,
  FaSearch,
  FaPhoneAlt,
  FaHome,
} from "react-icons/fa";
import { RiLoginCircleFill } from "react-icons/ri";
import Cookies from "js-cookie";
import Slider from "react-slick";
import Modal from "react-modal";

// Import style untuk slick-carousel
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Konten statis default
const defaultContent = {
  products: {
    detail: "Detail Produk",
    back: "Kembali",
  },
  menu: {
    home: "Beranda",
    products: "Produk",
    contact: "Kontak",
  },
  login: "Masuk",
};

// Tipe dan data produk (contoh)
export interface Product {
  id: string;
  images: { src: string; alt: string }[];
  title: string;
  description: string;
}

const products: Product[] = [
  {
    id: "1",
    images: [
      { src: "/images/product/product_tefa-01.jpg", alt: "Web Development 1" },
      { src: "/images/product/product_tefa-01-2.jpg", alt: "Web Development 2" },
      { src: "/images/product/product_tefa-01-3.jpg", alt: "Web Development 3" },
    ],
    title: "Pengembangan Web",
    description:
      "Website kustom dan aplikasi web yang disesuaikan dengan kebutuhan Anda.",
  },
  {
    id: "2",
    images: [
      { src: "/images/product/product_tefa-02.jpg", alt: "Mobile Apps 1" },
      { src: "/images/product/product_tefa-02-2.jpg", alt: "Mobile Apps 2" },
    ],
    title: "Aplikasi Mobile",
    description:
      "Pengembangan aplikasi iOS dan Android yang responsif dan user-friendly.",
  },
  // Tambahkan lebih banyak produk sesuai kebutuhan
];

export default function ProductDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  // Ambil id produk dari URL misalnya "/products/1"
  const id = pathname ? pathname.split("/").pop() : null;
  const product = products.find((p) => p.id === id);

  // ---------- Konfigurasi Modal (pastikan dijalankan di sisi klien) ----------
  useEffect(() => {
    const appElement = document.getElementById("__next") || document.body;
    Modal.setAppElement(appElement);
  }, []);

  // ---------- Setting Tema ----------
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("color-theme");
    if (stored) {
      try {
        const t = JSON.parse(stored);
        if (t === "light" || t === "dark") return t;
      } catch (error) {
        console.error("Parsing theme error", error);
      }
    }
    return "light";
  });
  const isDark = theme === "dark";

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("color-theme", JSON.stringify(theme));
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  // ---------- Cek Cookie Login ----------
  const userCookieExists = Boolean(Cookies.get("userAuth"));

  // ---------- Animasi Sidebar ----------
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

  // ---------- Modal Zoom Gambar ----------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomImg, setZoomImg] = useState<{ src: string; alt: string } | null>(
    null,
  );

  const openModal = (img: { src: string; alt: string }) => {
    console.log("Opening modal with image:", img.src); // Tambahkan log untuk debugging
    setZoomImg(img);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setZoomImg(null);
  };

  // Jika produk tidak ditemukan, tampilkan pesan error
  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
        <div className="rounded-lg bg-white p-6 text-center shadow-md dark:bg-gray-800">
          <h1 className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
            Produk tidak ditemukan
          </h1>
          <Link
            href="/products"
            className="inline-block rounded bg-gray-200 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-300"
          >
            {defaultContent.products.back}
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Header Component ----------
  const Header = () => (
    <header
      className={`fixed left-0 top-0 z-40 w-full backdrop-blur-sm transition-colors ${
        isDark ? "bg-black/40" : "bg-white/70 shadow-md"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
        <div className="flex items-center space-x-3">
          <Link href="/">
            <Image
              src="/images/logo/akti.png"
              alt="Logo TEFA AKTI"
              width={40}
              height={40}
            />
          </Link>
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
            className={`flex items-center space-x-1 transition-colors ${
              isDark
                ? "text-gray-500 hover:text-gray-400"
                : "text-gray-700 hover:text-gray-600"
            }`}
          >
            <FaHome size={16} />
            <span>{defaultContent.menu.home}</span>
          </Link>
          <Link
            href="/products"
            className={`flex items-center space-x-1 transition-colors ${
              isDark
                ? "text-gray-500 hover:text-gray-400"
                : "text-gray-700 hover:text-gray-600"
            }`}
          >
            <FaShoppingCart size={16} />
            <span>{defaultContent.menu.products}</span>
          </Link>
          <Link
            href="/#contact"
            className={`flex items-center space-x-1 transition-colors ${
              isDark
                ? "text-gray-500 hover:text-gray-400"
                : "text-gray-700 hover:text-gray-600"
            }`}
          >
            <FaPhoneAlt size={16} />
            <span>{defaultContent.menu.contact}</span>
          </Link>
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari produk..."
              className="hidden rounded-md border border-gray-300 bg-white px-3 py-1 pl-8 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 sm:block"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
          </div>
          <Link
            href={userCookieExists ? "/dashboard" : "/auth/signin"}
            className="inline-flex items-center justify-center space-x-1 rounded px-3 py-2 text-sm font-medium transition-colors"
            style={{ backgroundColor: "#555", color: "white" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#666")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#555")
            }
          >
            {userCookieExists ? (
              <span>Dashboard</span>
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
            aria-label="Buka Sidebar"
          >
            <FaBars size={20} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2"
            aria-label="Toggle Tema"
          >
            {isDark ? (
              <FaSun size={20} className="text-yellow-400" />
            ) : (
              <FaMoon size={20} className="text-gray-600" />
            )}
          </button>
          {/* Ikon Keranjang (hanya UI) */}
          <Link
            href="/cart"
            className="relative hidden md:inline-block"
            aria-label="Keranjang Belanja"
          >
            <FaShoppingCart
              size={20}
              className="text-gray-700 dark:text-gray-200"
            />
            {/* Placeholder untuk jumlah item */}
            <span className="absolute -right-2 -top-2 inline-flex items-center justify-center rounded-full bg-red-500 text-xs text-white">
              0
            </span>
          </Link>
        </div>
      </div>
    </header>
  );

  // ---------- Sidebar Component ----------
  const Sidebar = () => (
    <div>
      <div
        className="overlay pointer-events-auto fixed inset-0 bg-black"
        style={{ opacity: 0 }}
        onClick={() => setIsSidebarOpen(false)}
      ></div>
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
            aria-label="Tutup Sidebar"
          >
            <FaTimes size={20} />
          </button>
        </div>
        <nav className="flex flex-col space-y-4 px-4 py-4">
          <Link
            href="/"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center space-x-2 transition-colors hover:underline"
          >
            <FaHome size={16} />
            <span>{defaultContent.menu.home}</span>
          </Link>
          <Link
            href="/products"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center space-x-2 transition-colors hover:underline"
          >
            <FaShoppingCart size={16} />
            <span>{defaultContent.menu.products}</span>
          </Link>
          <Link
            href="/#contact"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center space-x-2 transition-colors hover:underline"
          >
            <FaPhoneAlt size={16} />
            <span>{defaultContent.menu.contact}</span>
          </Link>
          {/* Search Bar di Sidebar */}
          <div className="relative mt-4">
            <input
              type="text"
              placeholder="Cari produk..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-8 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 transform text-gray-400" />
          </div>
        </nav>
        <div className="px-4 py-4">
          <Link
            href={userCookieExists ? "/dashboard" : "/auth/signin"}
            className="inline-flex w-full items-center justify-center space-x-1 rounded px-3 py-2 text-center text-sm font-medium transition-colors"
            style={{ backgroundColor: "#555", color: "white" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#666")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#555")
            }
          >
            {userCookieExists ? (
              <span>Dashboard</span>
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

  // ---------- Konfigurasi Slider ----------
  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: false, // Nonaktifkan adaptiveHeight agar tinggi slider tetap konsisten
    arrows: true,
  };

  return (
    <div
      className={`font-sans relative min-h-screen w-full overflow-x-hidden transition-colors ${
        isDark ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
      }`}
      style={{ scrollBehavior: "smooth" }}
    >
      <Header />
      <Sidebar />

      <main className="pb-10 pt-20">
        <div className="container mx-auto px-4">
          {/* Tombol Back */}
          <div className="mb-4 mt-8">
            <Link
              href="/products"
              className="flex items-center space-x-2 text-gray-800 hover:text-gray-900 focus:outline-none"
            >
              <FaArrowLeft />
              <span className="font-medium">Kembali ke Produk</span>
            </Link>
          </div>

          {/* Detail Produk */}
          <div className="mx-auto max-w-5xl rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
            <div className="flex flex-col md:flex-row">
              {/* Slider Gambar */}
              <div className="md:w-1/2">
                <Slider {...sliderSettings}>
                  {product.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="cursor-pointer relative aspect-video" // Menetapkan rasio aspek tetap
                      onClick={() => openModal(img)}
                    >
                      <Image
                        src={img.src}
                        alt={img.alt}
                        fill
                        className="rounded-lg object-cover" // Menjaga objek tetap menutupi kontainer dan terpusat
                      />
                    </div>
                  ))}
                </Slider>
              </div>
              {/* Detail Produk */}
              <div className="mt-6 md:ml-8 md:mt-0 md:w-1/2">
                <h2 className="mb-4 text-3xl font-bold text-gray-800 dark:text-gray-200">
                  {product.title}
                </h2>
                <p className="mb-6 text-lg text-gray-700 dark:text-gray-300">
                  {product.description}
                </p>
                {/* Placeholder untuk informasi tambahan */}
                <div className="mt-4">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                    Informasi Produk
                  </h3>
                  <ul className="mt-2 list-inside list-disc text-gray-700 dark:text-gray-300">
                    <li>Fitur 1</li>
                    <li>Fitur 2</li>
                    <li>Fitur 3</li>
                  </ul>
                </div>
                {/* Placeholder untuk tombol aksi (jika diperlukan di masa depan) */}
                {/* <button className="mt-6 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Hubungi Kami</button> */}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Zoom Gambar */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Zoom Image"
        className="flex items-center justify-center outline-none"
        overlayClassName="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      >
        {zoomImg && (
          <div className="relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-3xl w-full">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 z-50 rounded-full bg-black bg-opacity-50 p-2 text-white focus:outline-none"
              aria-label="Tutup Modal"
            >
              <FaTimes size={20} />
            </button>
            <div className="flex justify-center items-center">
              <Image
                src={zoomImg.src}
                alt={zoomImg.alt}
                width={800} // Atur lebar gambar sesuai kebutuhan
                height={450} // Atur tinggi gambar sesuai kebutuhan
                className="rounded-lg object-contain"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}