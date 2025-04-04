"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Slider from "react-slick";
import anime from "animejs";
import {
  FaSun,
  FaMoon,
  FaBars,
  FaTimes,
  FaGlobe,
  FaChevronDown,
} from "react-icons/fa";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function Landing() {
  // -------------------------------------------------
  // DATA PRODUK
  // -------------------------------------------------
  const products = [
    {
      id: 1,
      img: "/images/product/product_tefa-01.jpg",
      alt: "Web Development",
      title: "Web Development",
      description: "Custom websites and web applications.",
    },
    {
      id: 2,
      img: "/images/product/product_tefa-02.jpg",
      alt: "Mobile Apps",
      title: "Mobile Apps",
      description: "iOS and Android application development.",
    },
    {
      id: 3,
      img: "/images/product/product_tefa-03.jpg",
      alt: "UI/UX Design",
      title: "UI/UX Design",
      description: "User-centered design solutions.",
    },
    {
      id: 4,
      img: "/images/product/product_tefa-04.jpg",
      alt: "Data Analytics",
      title: "Data Analytics",
      description: "Data-driven insights and visualizations.",
    },
    {
      id: 5,
      img: "/images/product/product_tefa-05.jpg",
      alt: "Cloud Solutions",
      title: "Cloud Solutions",
      description: "Scalable cloud architecture & services.",
    },
  ];

  // -------------------------------------------------
  // STATE THEME & PERSISTENSI ke localStorage
  // -------------------------------------------------
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const storedTheme = localStorage.getItem("color-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("color-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const isDark = theme === "dark";

  // -------------------------------------------------
  // KONFIGURASI SLIDER REACT-SLICK
  // -------------------------------------------------
  const defaultSlidesToShow = 3;
  const sliderSettings = {
    dots: true,
    infinite: products.length > defaultSlidesToShow,
    speed: 600,
    slidesToShow: defaultSlidesToShow,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(2, products.length),
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  // -------------------------------------------------
  // REFS UNTUK SCROLL REVEAL & HERO IMAGE
  // -------------------------------------------------
  const revealSectionsRef = useRef<HTMLDivElement[]>([]);
  const heroImageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    anime({
      targets: ".animate-product",
      scale: [0.8, 1],
      opacity: [0, 1],
      delay: anime.stagger(200, { start: 400 }),
      duration: 800,
      easing: "easeInOutQuad",
    });
  }, []);

  useEffect(() => {
    if (heroImageRef.current) {
      anime({
        targets: heroImageRef.current,
        translateY: [50, 0],
        opacity: [0, 1],
        duration: 1000,
        easing: "easeOutExpo",
      });
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            anime({
              targets: entry.target,
              translateY: [50, 0],
              opacity: [0, 1],
              duration: 800,
              easing: "easeOutExpo",
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    revealSectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const addToRefs = (el: HTMLDivElement) => {
    if (el && !revealSectionsRef.current.includes(el)) {
      revealSectionsRef.current.push(el);
    }
  };

  const handleProductHover = (e: React.MouseEvent<HTMLDivElement>) => {
    anime.remove(e.currentTarget);
    anime({
      targets: e.currentTarget,
      scale: 1.05,
      boxShadow: "0 12px 24px rgba(0,0,0,0.2)",
      duration: 300,
      easing: "easeOutQuad",
    });
  };

  const handleProductHoverLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    anime.remove(e.currentTarget);
    anime({
      targets: e.currentTarget,
      scale: 1,
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
      duration: 300,
      easing: "easeOutQuad",
    });
  };

  const cardBgClass = isDark ? "bg-gray-800" : "bg-gray-100";
  const cardInnerBgClass = isDark ? "bg-gray-700" : "bg-gray-200";
  const textColorClass = isDark ? "text-gray-200" : "text-gray-800";

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  // -------------------------------------------------
  // STATE DAN ANIMASI UNTUK SIDEBAR
  // -------------------------------------------------
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

  // -------------------------------------------------
  // STATE UNTUK BAHASA
  // -------------------------------------------------
  const [language, setLanguage] = useState("EN");

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    // Implementasikan logika perubahan bahasa jika diperlukan
  };

  return (
    <div
      className={`font-sans relative min-h-screen w-full overflow-x-hidden transition-colors ${
        isDark ? "bg-gradient-to-b from-gray-900 via-gray-900 to-black" : "bg-white"
      }`}
      style={{ scrollBehavior: "smooth" }}
    >
      {/* Overlay untuk Sidebar */}
      <div
        className={`overlay fixed inset-0 bg-black transition-opacity duration-500 ${
          isSidebarOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar dengan tombol navigasi & login */}
      <div className="sidebar fixed top-0 left-0 h-full w-64 bg-gray-800 text-white z-50 transform -translate-x-full">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
          <span className="text-lg font-semibold">Menu</span>
          <button onClick={() => setIsSidebarOpen(false)} aria-label="Close Sidebar">
            <FaTimes size={20} />
          </button>
        </div>
        <nav className="flex flex-col px-4 py-4 space-y-4">
          {["home", "products", "contact"].map((item) => (
            <a
              key={item}
              href={`#${item}`}
              onClick={(e) => {
                handleAnchorClick(e, item);
                setIsSidebarOpen(false);
              }}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </a>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <div className="relative">
            <FaGlobe className="absolute top-1 left-2 text-white pointer-events-none" />
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-gray-700 text-white rounded focus:outline-none appearance-none border border-gray-600 text-sm leading-none"
            >
              <option value="EN">English</option>
              <option value="ID">Indonesia</option>
            </select>
            <FaChevronDown className="absolute top-2 right-2 text-white pointer-events-none" />
          </div>
        </div>
        {/* Tombol Login di Sidebar */}
        <div className="px-4 py-4">
          <a
            href="/auth/signin"
            className="block w-full rounded px-3 py-1 text-center text-sm font-medium transition-colors"
            style={{ backgroundColor: "#800000", color: "white" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#a00000")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#800000")}
          >
            Login
          </a>
        </div>
      </div>

      {/* Background Image Parallax */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url("/images/background.jpg")` }}
      ></div>

      {/* Header */}
      <header
        className={`fixed left-0 top-0 z-40 w-full backdrop-blur-sm transition-colors ${
          isDark ? "bg-black/40" : "bg-white/70 shadow-md"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          {/* Logo & Nama */}
          <div className="flex items-center space-x-3">
            <Image src="/images/logo/akti.png" alt="Logo TEFA AKTI" width={40} height={40} />
            <span className={`text-xl font-bold tracking-wide ${textColorClass}`}>TEFA AKTI</span>
          </div>

          {/* Navigasi Desktop */}
          <nav className="hidden md:flex space-x-6 items-center text-lg">
            {["home", "products", "contact"].map((item) => (
              <a
                key={item}
                href={`#${item}`}
                onClick={(e) => handleAnchorClick(e, item)}
                className={`transition-colors ${
                  isDark ? "text-gray-400 hover:text-gray-100" : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </a>
            ))}
            {/* Opsi Bahasa untuk Desktop */}
            <div className="relative flex items-center">
              <FaGlobe className="absolute left-2 text-gray-400 pointer-events-none" />
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full pl-8 pr-10 py-2 bg-transparent text-gray-400 rounded focus:outline-none appearance-none border border-gray-400 text-sm leading-none"
              >
                <option value="EN">EN</option>
                <option value="ID">ID</option>
              </select>
              <FaChevronDown className="absolute right-2 text-gray-400 pointer-events-none" />
            </div>
            {/* Tombol Login untuk Desktop */}
            <a
              href="/auth/signin"
              className="rounded px-3 py-1 text-sm font-medium transition-colors"
              style={{ backgroundColor: "#800000", color: "white" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#a00000")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#800000")}
            >
              Login
            </a>
          </nav>

          {/* Navigasi Mobile: Tombol Hamburger */}
          <div className="flex items-center space-x-3">
            <button
              className="md:hidden p-2"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open Sidebar"
            >
              <FaBars size={20} />
            </button>
            <button onClick={toggleTheme} className="p-2">
              {isDark ? <FaSun size={20} className="text-yellow-400" /> : <FaMoon size={20} className="text-gray-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="pt-16">
        {/* HERO SECTION */}
        <section id="home" className="relative min-h-[80vh] w-full overflow-hidden py-10 md:py-24">
          <div ref={heroImageRef} className="pointer-events-none absolute bottom-0 right-0 h-full w-full">
            <Image
              src="/images/tefa-akti-mirrored.png"
              alt="TEFA Illustration"
              fill
              style={{ objectFit: "contain", objectPosition: "right bottom" }}
            />
          </div>
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-between px-4 sm:px-8 md:flex-row">
            {/* Konten Teks dengan margin bawah besar agar turun lebih jauh */}
            <div className="mb-12 space-y-6 md:mb-0 md:w-1/2">
              <h1 className={`text-3xl font-extrabold leading-tight md:text-5xl ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                Welcome to <span style={{ color: "#800000" }}>TEFA AKTI</span>
              </h1>
              <p className={`max-w-lg text-lg leading-relaxed ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                Empowering students through hands-on learning and industry-standard practices.
              </p>
              <div className="space-x-4 pt-4">
                <button
                  className="rounded px-5 py-2 text-sm font-medium transition-colors"
                  style={{ backgroundColor: "#800000", color: "white" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#a00000")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#800000")}
                >
                  Learn More
                </button>
                <button
                  className={`rounded border px-5 py-2 text-sm font-medium transition-colors ${
                    isDark ? "border-gray-400 text-gray-200" : "border-gray-600 text-gray-800"
                  }`}
                >
                  Our Products
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT IS TEFA AKTI */}
        <section className={`${isDark ? "bg-gray-800" : "bg-gray-100"} py-16`} ref={addToRefs}>
          <div className="mx-auto max-w-5xl px-4 sm:px-8 text-center">
            <h2 className={`mb-4 text-2xl font-bold md:text-3xl ${textColorClass}`}>What is TEFA AKTI?</h2>
            <p className={`mb-6 leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              TEFA AKTI (Teaching Factory Akademi Komunitas Toyota Indonesia) adalah program pendidikan inovatif
              yang menjembatani kesenjangan antara pembelajaran akademik dan praktik industri.
            </p>
            <p className={`${isDark ? "text-gray-300" : "text-gray-600"} leading-relaxed`}>
              Dengan TEFA AKTI, mahasiswa mengembangkan kemampuan praktikal, pengetahuan industri, dan sikap profesional yang
              mempersiapkan mereka untuk berkarier di sektor teknologi informasi.
            </p>
          </div>
        </section>

        {/* OUR PRODUCTS */}
        <section id="products" className="mx-auto max-w-7xl px-4 sm:px-8 py-16" ref={addToRefs}>
          <h3 className={`mb-6 text-center text-2xl font-bold md:text-3xl ${textColorClass}`}>Our Products</h3>
          <Slider {...sliderSettings}>
            {products.map((product) => (
              <div key={product.id} className="px-2">
                <div
                  className={`animate-product ${cardBgClass} rounded p-5 text-center shadow-md transition-all duration-300`}
                  onMouseEnter={handleProductHover}
                  onMouseLeave={handleProductHoverLeave}
                >
                  <div className={`mb-4 w-full ${cardInnerBgClass} relative flex items-center justify-center rounded`} style={{ paddingBottom: "56.25%" }}>
                    <Image src={product.img} alt={product.alt} fill style={{ objectFit: "contain" }} />
                  </div>
                  <h4 className={`mb-2 text-lg font-semibold ${textColorClass}`}>{product.title}</h4>
                  <p className="text-sm text-gray-400">{product.description}</p>
                </div>
              </div>
            ))}
          </Slider>
        </section>

        {/* CONTACT US */}
        <section id="contact" className={`${isDark ? "bg-gray-800" : "bg-gray-100"} px-4 sm:px-8 py-16`} ref={addToRefs}>
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
            {/* Form Kontak */}
            <div>
              <h4 className={`mb-4 text-xl font-bold md:text-2xl ${textColorClass}`}>Contact Us</h4>
              <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mb-6`}>
                Get in touch with us for any inquiries or collaborations.
              </p>
              <form className="flex flex-col space-y-4">
                <input
                  type="email"
                  placeholder="Your email"
                  className={`rounded px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#800000] ${
                    isDark ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"
                  }`}
                />
                {/* Kolom Nomor HP */}
                <input
                  type="tel"
                  placeholder="Your Phone Number"
                  className={`rounded px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#800000] ${
                    isDark ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Subject"
                  className={`rounded px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#800000] ${
                    isDark ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"
                  }`}
                />
                <textarea
                  placeholder="Your message"
                  rows={4}
                  className={`rounded px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#800000] ${
                    isDark ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"
                  }`}
                />
                <button
                  type="submit"
                  className="w-fit rounded px-5 py-2 font-medium transition-colors"
                  style={{ backgroundColor: "#800000", color: "white" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#a00000")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#800000")}
                >
                  Send Message
                </button>
              </form>
            </div>
            {/* Google Maps & Quick Links */}
            <div className="flex flex-col space-y-8">
              {/* Google Maps Embed & Text Lokasi */}
              <div>
                <h4 className={`mb-2 text-xl font-bold ${textColorClass}`}>Our Location</h4>
                <div className="w-full h-48 md:h-60 rounded overflow-hidden shadow-md">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3965.2845180268537!2d107.25791547586968!3d-6.35720616219392!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e699ddb63ef95b9%3A0x28e1865af748920b!2sAkademi%20Komunitas%20Toyota%20Indonesia%20(Toyota%20Indonesia%20Academy)!5e0!3m2!1sid!2sid!4v1737422934612!5m2!1sid!2sid"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </div>
              {/* Quick Links */}
              <div>
                <h4 className={`mb-4 text-xl font-bold md:text-2xl ${textColorClass}`}>Quick Links</h4>
                {["home", "products", "contact"].map((item) => (
                  <a
                    key={item}
                    href={`#${item}`}
                    onClick={(e) => handleAnchorClick(e, item)}
                    className="block hover:underline"
                  >
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </a>
                ))}
                <div className="mt-4 text-gray-400">© 2023 TEFA AKTI. All rights reserved.</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}