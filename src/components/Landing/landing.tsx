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
  FaLeaf, // Ikon branding
  FaTint, // Ikon fitur
  FaLightbulb,
  FaThermometerHalf,
  FaMobileAlt,
  FaChartLine,
  FaInfoCircle, // Ikon baru untuk Info/Contact
} from "react-icons/fa";
import { FaArrowRightToBracket } from "react-icons/fa6";
import { RiDashboardFill } from "react-icons/ri"; // Ikon dashboard
import Cookies from "js-cookie";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// JSON konfigurasi konten bahasa untuk Tops Smart Garden (Private Home)
const content: {
  [key: string]: {
    hero: {
      preTitle: string;
      titleGreen: string; // Nama sistem
      postTitle: string;
      subtitle: string; // Fokus pada penggunaan pribadi & dashboard
    };
    about: {
      title: string; // Mengganti whatIs
      text1: string;
      text2: string; // Menekankan kontrol via dashboard
    };
    features: {
      title: string; // Mengganti products
      // moreButton dihapus
    };
    info: { // Mengganti contact
      title: string;
      text: string; // Teks informatif, bukan ajakan kontak sales
      // Placeholder dan button dihapus karena form dihilangkan
    };
    quickLinks: string;
    // locationTitle dihapus
    menu: {
      home: string;
      features: string; // Mengganti products
      info: string; // Mengganti contact
    };
    dashboard: string; // Mengganti login
    footer: string;
  };
} = {
  EN: {
    hero: {
      preTitle: "Welcome to Your ",
      titleGreen: "Tops Smart Garden",
      postTitle: "",
      subtitle:
        "Monitor and control your personal garden effortlessly through the central dashboard.",
    },
    about: {
      title: "About Your Garden System",
      text1:
        "Integrated smart sensors and automated controls help you manage your garden easily. Monitor conditions and optimize plant health from anywhere.",
      text2:
        "This system provides real-time data and remote access via the dashboard, making gardening simpler, more efficient, and more enjoyable for you.",
    },
    features: {
      title: "System Features",
    },
    info: { // Mengganti contact
      title: "System Information",
      text: "Find quick links and basic system information here. Access the dashboard for full control.",
    },
    quickLinks: "Quick Links",
    // locationTitle dihapus
    menu: {
      home: "Home",
      features: "Features",
      info: "Info", // Mengganti contact
    },
    dashboard: "Dashboard",
    footer: `© ${new Date().getFullYear()} Tops Smart Garden. All rights reserved.`,
  },
  ID: {
    hero: {
      preTitle: "Selamat Datang di ",
      titleGreen: "Tops Smart Garden",
      postTitle: " Anda",
      subtitle:
        "Pantau dan kendalikan taman pribadi Anda dengan mudah melalui dasbor pusat.",
    },
    about: {
      title: "Tentang Sistem Taman Anda",
      text1:
        "Sensor pintar terintegrasi dan kontrol otomatis membantu Anda mengelola taman dengan mudah. Pantau kondisi dan optimalkan kesehatan tanaman dari mana saja.",
      text2:
        "Sistem ini menyediakan data waktu nyata dan akses jarak jauh melalui dasbor, membuat pengalaman berkebun Anda lebih sederhana, efisien, dan menyenangkan.",
    },
    features: {
      title: "Fitur Sistem",
    },
    info: { // Mengganti contact
      title: "Informasi Sistem",
      text: "Temukan tautan cepat dan informasi dasar sistem di sini. Akses dasbor untuk kontrol penuh.",
    },
    quickLinks: "Tautan Cepat",
    // locationTitle dihapus
    menu: {
      home: "Beranda",
      features: "Fitur",
      info: "Info", // Mengganti contact
    },
    dashboard: "Dasbor",
    footer: `© ${new Date().getFullYear()} Tops Smart Garden. Hak cipta dilindungi undang-undang.`,
  },
};

export default function TopsSmartGardenHome() { // Nama komponen diubah
  // -------------------------------------------------
  // DATA FITUR TOPS SMART GARDEN
  // -------------------------------------------------
  const features = [
    {
      id: 1,
      img: "/images/cover/garden1.jpg", // Pastikan path gambar sesuai
      alt: "Smart Watering",
      title: { EN: "Automated Watering", ID: "Penyiraman Otomatis" },
      description: { EN: "Schedule & adjust based on weather/soil data via dashboard.", ID: "Jadwal & penyesuaian via dasbor berdasarkan data cuaca/tanah." }, // Tekankan dashboard
      icon: FaTint,
    },
    {
      id: 2,
      img: "/images/cover/garden2.jpg", // Pastikan path gambar sesuai
      alt: "Smart Lighting",
      title: { EN: "Smart Lighting Control", ID: "Kontrol Pencahayaan Cerdas" },
      description: { EN: "Manage ambiance, schedules & security settings.", ID: "Kelola suasana, jadwal & pengaturan keamanan." },
      icon: FaLightbulb,
    },
    {
      id: 3,
      img: "/images/cover/garden3.jpg", // Pastikan path gambar sesuai
      alt: "Environment Sensors",
      title: { EN: "Environment Monitoring", ID: "Pemantauan Lingkungan" },
      description: { EN: "View real-time temperature, light & humidity on dashboard.", ID: "Lihat suhu, cahaya & kelembaban waktu nyata di dasbor." }, // Tekankan dashboard
      icon: FaThermometerHalf,
    },
    {
      id: 4,
      img: "/images/cover/garden4.jpg", // Mungkin gambar dashboard?
      alt: "Dashboard Access",
      title: { EN: "Central Dashboard", ID: "Dasbor Pusat" },
      description: { EN: "Manage all garden aspects from one place.", ID: "Kelola semua aspek taman Anda dari satu tempat." }, // Lebih fokus ke dashboard
      icon: FaMobileAlt, // Atau RiDashboardFill?
    },
    {
      id: 5,
      img: "/images/cover/garden5.jpg", // Pastikan path gambar sesuai
      alt: "Garden Analytics",
      title: { EN: "Garden Insights", ID: "Wawasan Taman" },
      description: { EN: "Track conditions & plant health history via dashboard.", ID: "Lacak riwayat kondisi & kesehatan tanaman via dasbor." }, // Tekankan dashboard
      icon: FaChartLine,
    },
  ];

// -------------------------------------------------
// STATE THEME & PERSISTENSI ke localStorage
// -------------------------------------------------
const [theme, setTheme] = useState<'"light"' | '"dark"'>(() => {
  if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem("color-theme");
      if (storedTheme === '"light"' || storedTheme === '"dark"') {
          return storedTheme;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return '"dark"';
      }
  }
  return '"light"';
});

useEffect(() => {
  if (typeof window !== 'undefined') {
      localStorage.setItem("color-theme", theme);
      if (theme === '"dark"') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }
}, [theme]);

const toggleTheme = () => {
  setTheme((prev) => (prev === '"light"' ? '"dark"' : '"light"'));
};

const isDark = theme === '"dark"';


  // -------------------------------------------------
  // KONFIGURASI SLIDER REACT-SLICK
  // -------------------------------------------------
  const defaultSlidesToShow = 3;
  const sliderSettings = {
    dots: true,
    infinite: features.length > defaultSlidesToShow,
    speed: 600,
    slidesToShow: defaultSlidesToShow,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    pauseOnHover: true,
    arrows: false,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: Math.min(2, features.length),
          infinite: features.length > 2,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          infinite: features.length > 1,
        },
      },
    ],
    appendDots: (dots: React.ReactNode) => (
        <div style={{ bottom: "-30px" }}>
            <ul style={{ margin: "0px" }}> {dots} </ul>
        </div>
    ),
    customPaging: (i: number) => (
        <div
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                isDark ? 'bg-gray-600' : 'bg-gray-300'
            } slick-paging-dot`}
        >
        </div>
    )
  };

   // Tambahkan CSS global untuk slick-dots active
   useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
        .slick-dots li.slick-active .slick-paging-dot {
            background-color: ${isDark ? '#16a34a' : '#16a34a'} !important; /* Warna hijau aktif */
        }
        .slick-dots li button:before {
            content: '' !important; /* Sembunyikan ::before default */
        }
         .slick-dots li {
            margin: 0 4px !important;
        }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [isDark]);


  // -------------------------------------------------
  // REFS UNTUK SCROLL REVEAL & HERO IMAGE
  // -------------------------------------------------
  const revealSectionsRef = useRef<HTMLElement[]>([]);
  const heroImageRef = useRef<HTMLDivElement>(null);

  // Scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            anime({
              targets: entry.target,
              translateY: [30, 0],
              opacity: [0, 1],
              duration: 900,
              easing: "easeOutExpo",
              delay: anime.stagger(100)
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealSectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !revealSectionsRef.current.includes(el)) {
      revealSectionsRef.current.push(el);
    }
  };

  // Animasi hover fitur
  const handleFeatureHover = (e: React.MouseEvent<HTMLDivElement>) => {
    anime.remove(e.currentTarget);
    anime({
      targets: e.currentTarget,
      translateY: -5,
      boxShadow: `0 10px 20px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(100,100,100,0.15)'}`,
      duration: 250,
      easing: "easeOutQuad",
    });
  };

  const handleFeatureHoverLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    anime.remove(e.currentTarget);
    anime({
      targets: e.currentTarget,
      translateY: 0,
      boxShadow: `0 4px 8px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(150,150,150,0.1)'}`,
      duration: 300,
      easing: "easeOutQuad",
    });
  };

  // Kelas warna dinamis
  const cardBgClass = isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200";
  const textColorClass = isDark ? "text-gray-200" : "text-gray-800";
  const secondaryTextColorClass = isDark ? "text-gray-400" : "text-gray-600";
  const inputBgClass = isDark ? "bg-gray-700 text-gray-200 border-gray-600" : "bg-white text-gray-800 border-gray-300";
  const accentColor = "green-600"; // Warna utama (hijau)
  const accentHoverColor = "green-700";

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  // -------------------------------------------------
  // STATE DAN ANIMASI UNTUK SIDEBAR
  // -------------------------------------------------
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
       document.body.style.overflow = isSidebarOpen ? "hidden" : "auto";
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    if (isSidebarOpen) {
      anime({ targets: ".sidebar", translateX: ["-100%", "0%"], easing: "easeOutQuad", duration: 400 });
      anime({ targets: ".overlay", opacity: [0, 0.6], easing: "linear", duration: 400 });
    } else {
      anime({ targets: ".overlay", opacity: [0.6, 0], easing: "linear", duration: 300 });
      anime({ targets: ".sidebar", translateX: ["0%", "-100%"], easing: "easeInQuad", duration: 400, delay: 100 });
    }
  }, [isSidebarOpen]);

  // -------------------------------------------------
  // STATE UNTUK BAHASA
  // -------------------------------------------------
  const [language, setLanguage] = useState("ID"); // Default ke Bahasa Indonesia

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
  };

  // -------------------------------------------------
  // LOGIKA ANIMASI HERO IMAGE BERGANTI-GANTI
  // -------------------------------------------------
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const heroImages = features.map(f => ({ id: f.id, img: f.img, alt: f.alt }));

  const animateHeroImageExit = (imageElement: HTMLElement) => {
    anime({
      targets: imageElement,
      translateX: [0, anime.random(-40, 40)],
      translateY: [0, 50],
      scale: [1, 0.9],
      opacity: [1, 0],
      rotate: anime.random(-5, 5),
      duration: 700,
      easing: "easeInCubic",
      complete: () => {
        setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
      },
    });
  };

  useEffect(() => {
    if (heroImageRef.current) {
      anime.set(heroImageRef.current.children[0], {
        translateX: anime.random(-40, 40),
        translateY: -30,
        opacity: 0,
        scale: 0.9,
        rotate: anime.random(-5, 5),
      });
      anime({
        targets: heroImageRef.current.children[0],
        translateX: 0,
        translateY: 0,
        opacity: 1,
        scale: 1,
        rotate: 0,
        duration: 800,
        easing: "easeOutExpo",
        delay: 100
      });
    }
  }, [currentHeroIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (heroImageRef.current?.children[0]) {
        animateHeroImageExit(heroImageRef.current.children[0] as HTMLElement);
      }
    }, 5000);
    return () => clearInterval(interval);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ambil konten sesuai bahasa yang aktif
  const langContent = content[language];

  // Pengecekan cookie "userAuth"
  const userCookieExists = Boolean(Cookies.get("userAuth"));

  return (
    <div
      className={`font-sans relative min-h-screen w-full overflow-x-hidden transition-colors duration-300 ${
        isDark ? "bg-gray-900 text-gray-300" : "bg-white text-gray-700"
      }`}
      style={{ scrollBehavior: "smooth" }}
    >
      {/* Overlay untuk Sidebar */}
      <div
        className={`overlay fixed inset-0 bg-black z-40 transition-opacity duration-500 ${
          isSidebarOpen ? "opacity-60 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <div
        className={`sidebar fixed top-0 left-0 h-full w-72 max-w-[80vw] z-50 transform shadow-xl transition-colors duration-300 -translate-x-full ${
          isDark
            ? "bg-gray-800 text-white border-r border-gray-700"
            : "bg-white text-gray-800 border-r border-gray-200"
        }`}
      >
        {/* Header Sidebar */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center space-x-2">
              <FaLeaf className={`text-${accentColor}`} size={20} />
              <span className="text-lg font-semibold">Tops Smart Garden</span> {/* Nama Baru */}
            </div>
          <button onClick={() => setIsSidebarOpen(false)} aria-label="Close Sidebar" className={`p-1 rounded-full ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
            <FaTimes size={20} />
          </button>
        </div>
        {/* Navigasi Sidebar */}
        <nav className="flex flex-col px-5 py-5 space-y-3">
          {Object.entries(langContent.menu).map(([key, item]) => (
            <a
              key={key}
              href={`#${key}`} // Gunakan key sebagai id target (home, features, info)
              onClick={(e) => handleAnchorClick(e, key)}
              className={`block py-2 rounded px-3 transition-colors duration-200 ${isDark ? 'hover:bg-gray-700 hover:text-white' : 'hover:bg-green-50 hover:text-green-700'}`}
            >
              {item}
            </a>
          ))}
        </nav>
        {/* Pengaturan Bahasa Sidebar */}
        <div className={`px-5 py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <label htmlFor="lang-select-sidebar" className="text-sm font-medium mb-1 block">Bahasa</label>
          <div className="relative">
            <FaGlobe className={`absolute inset-y-0 left-3 my-auto pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <select
              id="lang-select-sidebar"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-${accentColor} text-sm leading-tight appearance-none transition-colors ${inputBgClass}`}
            >
              <option value="ID">Indonesia</option>
              <option value="EN">English</option>
            </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-400">
                 <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
          </div>
        </div>
        {/* Tombol Dashboard Sidebar */}
        <div className="px-5 py-5">
          <a
            href={userCookieExists ? "/dashboard" : "/auth/signin"} // Sesuaikan link jika perlu
            className={`w-full rounded px-4 py-2.5 text-center text-sm font-semibold transition-colors inline-flex items-center justify-center space-x-2 shadow-md ${
                isDark ? `bg-${accentColor} text-white hover:bg-${accentHoverColor}` : `bg-${accentColor} text-white hover:bg-${accentHoverColor}`
            }`}
          >
            {userCookieExists ? (
              <>
                <RiDashboardFill size={16}/>
                <span>{langContent.dashboard}</span>
              </>
            ) : (
              <>
                 <FaArrowRightToBracket size={16} />
                <span>Masuk Akun</span> {/* Atau teks login generik */}
              </>
            )}
          </a>
        </div>
      </div>

      {/* Header Utama */}
      <header
        className={`fixed left-0 top-0 z-30 w-full backdrop-blur-md transition-colors duration-300 ${
          isDark ? "bg-gray-900/70 border-b border-gray-700/50" : "bg-white/80 border-b border-gray-200/60 shadow-sm"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            {/* Logo dan Nama */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Image src="/images/logo/logo_Sw-dark.svg" alt="Logo Tops Smart Garden" width={50} height={50} className="h-9 w-9" /> {/* Ganti logo jika ada */}
            <span className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : `text-gray-800`}`}>
              Tops <span className={`text-${accentColor}`}>Smart Garden</span> {/* Nama Baru */}
            </span>
          </div>
            {/* Navigasi Desktop */}
          <nav className="hidden md:flex space-x-6 items-center">
              {Object.entries(langContent.menu).map(([key, item]) => (
                 <a
                    key={key}
                    href={`#${key}`} // Target: home, features, info
                    onClick={(e) => handleAnchorClick(e, key)}
                    className={`text-sm font-medium transition-colors duration-200 ${
                        isDark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
                    }`}
                 >
                    {item}
                 </a>
              ))}
          </nav>
            {/* Opsi Kanan (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
              {/* Language Selector Desktop */}
              <div className="relative">
                  <FaGlobe className={`absolute inset-y-0 left-2.5 my-auto pointer-events-none h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <select
                    aria-label="Select language"
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className={`pl-8 pr-7 py-1.5 rounded border text-xs leading-tight appearance-none focus:outline-none focus:ring-2 focus:ring-${accentColor} transition-colors ${inputBgClass}`}
                >
                    <option value="ID">ID</option>
                    <option value="EN">EN</option>
                </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-700 dark:text-gray-400">
                    <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
              {/* Tombol Dashboard Desktop */}
              <a
                  href={userCookieExists ? "/dashboard" : "/auth/signin"}
                   className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors inline-flex items-center justify-center space-x-1.5 shadow-sm ${
                       isDark ? `bg-${accentColor} text-white hover:bg-${accentHoverColor}` : `bg-${accentColor} text-white hover:bg-${accentHoverColor}`
                   }`}
              >
                  {userCookieExists ? ( <RiDashboardFill size={14}/> ) : ( <FaArrowRightToBracket size={14} /> )}
                   <span>{userCookieExists ? langContent.dashboard : "Login"}</span>
              </a>
              {/* Tombol Tema */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-700 hover:text-yellow-400' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
              >
                {isDark ? <FaSun size={18} /> : <FaMoon size={18} />}
              </button>
          </div>

            {/* Tombol Mobile (Menu & Tema) */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
               className={`p-2 rounded-md transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-700 hover:text-yellow-400' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
            >
              {isDark ? <FaSun size={20} /> : <FaMoon size={20} />}
            </button>
              <button onClick={() => setIsSidebarOpen(true)} aria-label="Open menu" className={`p-2 rounded-md ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>
               <FaBars size={20} />
             </button>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="pt-16"> {/* Padding atas untuk header fixed */}
        {/* HERO SECTION */}
        <section
          id="home"
          ref={addToRefs}
          className={`relative w-full overflow-hidden py-16 md:py-24 lg:py-32 ${isDark ? 'bg-gradient-to-b from-gray-900 via-gray-800 to-gray-800' : 'bg-gradient-to-b from-white via-green-50 to-white'}`}
         >
          {/* Optional: Background pattern */}
          {/* <div className="absolute inset-0 bg-[url('/images/garden/bg-pattern.svg')] opacity-5"></div> */}

          <div className="relative z-10 mx-auto flex max-w-7xl flex-col lg:flex-row items-center justify-between px-4 sm:px-6 lg:px-8 gap-10">
              {/* Teks Hero */}
            <div className="lg:w-1/2 text-center lg:text-left mb-10 lg:mb-0">
              <h1
                className={`text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl ${textColorClass}`}
              >
                {langContent.hero.preTitle}
                <span className={`text-${accentColor}`}>{langContent.hero.titleGreen}</span>
                {langContent.hero.postTitle}
              </h1>
              <p className={`mt-4 max-w-xl mx-auto lg:mx-0 text-lg leading-relaxed ${secondaryTextColorClass}`}>
                {langContent.hero.subtitle} {/* Subtitle disesuaikan */}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                   {/* Tombol CTA disederhanakan */}
                   <a href={userCookieExists ? "/dashboard" : "#features"} onClick={(e) => !userCookieExists && handleAnchorClick(e, 'features')} className={`inline-block rounded-md bg-${accentColor} px-6 py-3 text-base font-semibold text-white shadow-md transition-transform hover:scale-105 hover:bg-${accentHoverColor}`}>
                       {userCookieExists ? "Buka Dasbor" : "Lihat Fitur"} {/* Ubah teks tombol */}
                   </a>
                   {/* Tombol Kontak dihapus dari Hero */}
              </div>
            </div>
              {/* Gambar Hero */}
            <div className="relative w-full max-w-md lg:w-1/2 lg:max-w-lg aspect-square lg:aspect-video overflow-hidden rounded-lg shadow-xl mx-auto ">
              {/* Wrapper untuk animasi */}
              <div ref={heroImageRef} className="w-full h-full">
                 {/* Elemen Image di dalam wrapper */}
                <Image
                  key={heroImages[currentHeroIndex].id}
                  src={heroImages[currentHeroIndex].img}
                  alt={(heroImages[currentHeroIndex].alt)}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
                  style={{ objectFit: "cover", borderRadius: '0.5rem' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT TECHNOLOGY SECTION */}
        <section id="about" className={`${isDark ? "bg-gray-800" : "bg-white"} py-16 md:py-20`} ref={addToRefs}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className={`mb-4 text-3xl font-bold tracking-tight ${textColorClass}`}>
              {langContent.about.title} {/* Judul disesuaikan */}
            </h2>
            <p className={`max-w-3xl mx-auto mb-6 leading-relaxed ${secondaryTextColorClass}`}>
              {langContent.about.text1}
            </p>
            <p className={`max-w-3xl mx-auto leading-relaxed ${secondaryTextColorClass}`}>
              {langContent.about.text2} {/* Teks disesuaikan */}
            </p>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className={`${isDark ? "bg-gray-900" : "bg-green-50/50"} py-16 md:py-20`} ref={addToRefs}>
           <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
             <h3 className={`mb-10 text-center text-3xl font-bold tracking-tight ${textColorClass}`}>
               {langContent.features.title} {/* Judul disesuaikan */}
             </h3>
              {/* Slider Container */}
             <div className="pb-10">
                <Slider {...sliderSettings}>
                {features.map((feature) => (
                    <div key={feature.id} className="px-3"> {/* Padding antar slide */}
                    <div
                        className={`animate-feature flex flex-col h-full ${cardBgClass} rounded-lg overflow-hidden p-5 text-center shadow-md transition-all duration-300`}
                        onMouseEnter={handleFeatureHover}
                        onMouseLeave={handleFeatureHoverLeave}
                    >
                         {/* Icon Feature */}
                        <div className={`mb-4 text-${accentColor} mx-auto`}>
                            <feature.icon size={36} />
                        </div>
                         {/* Judul Feature */}
                        <h4 className={`mb-2 text-lg font-semibold ${textColorClass}`}>
                             {feature.title[language as keyof typeof feature.title] || feature.title['EN']}
                        </h4>
                         {/* Deskripsi Feature */}
                        <p className={`text-sm grow ${secondaryTextColorClass}`}>
                             {feature.description[language as keyof typeof feature.description] || feature.description['EN']} {/* Deskripsi disesuaikan */}
                        </p>
                    </div>
                    </div>
                ))}
                </Slider>
             </div>

             {/* Tombol More Features Dihapus */}
          </div>
        </section>

        {/* INFO SECTION (Menggantikan Contact) */}
        <section id="info" className={`${isDark ? "bg-gray-800" : "bg-white"} px-4 sm:px-6 lg:px-8 py-16 md:py-20`} ref={addToRefs}>
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-1 text-center"> {/* Dibuat 1 kolom & text center */}
              {/* Info Text */}
             <div>
               <h4 className={`mb-4 text-2xl font-bold ${textColorClass}`}>
                 <FaInfoCircle className="inline-block mr-2 mb-1" /> {/* Tambah ikon */}
                 {langContent.info.title} {/* Judul disesuaikan */}
               </h4>
               <p className={`${secondaryTextColorClass} mb-6 text-base max-w-2xl mx-auto`}> {/* Lebih besar sedikit, max-width */}
                 {langContent.info.text} {/* Teks disesuaikan */}
               </p>

                {/* Formulir Kontak Dihapus */}

                {/* Quick Links tetap di sini jika diperlukan */}
               <div className="mt-8">
                 <h4 className={`mb-3 text-xl font-bold ${textColorClass}`}>
                   {langContent.quickLinks}
                 </h4>
                 <nav className="space-y-1.5">
                    {Object.entries(langContent.menu).map(([key, item]) => (
                        <a
                          key={key}
                          href={`#${key}`}
                          onClick={(e) => handleAnchorClick(e, key)}
                          className={`block text-sm transition-colors ${secondaryTextColorClass} hover:text-${accentColor} dark:hover:text-green-400 hover:underline`}
                        >
                          {item}
                        </a>
                    ))}
                     {/* Link Tambahan jika ada */}
                     {/* <a href="/privacy-policy" className="...">Privacy Policy</a> */}
                 </nav>
               </div>

                 {/* Info Kontak Tambahan (Email/Telepon) - JIKA PERLU, misal untuk support */}
                {/* <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 max-w-xs mx-auto">
                   <h5 className={`text-sm font-semibold mb-1 ${textColorClass}`}>Info Kontak Support</h5>
                   <p className={`text-xs ${secondaryTextColorClass}`}>Email: support@topssmartgarden.example.com</p>
                   <p className={`text-xs ${secondaryTextColorClass}`}>Telepon: +62 812 0000 0000</p>
                </div> */}

             </div>
              {/* Bagian Peta dihapus total */}
           </div>
        </section>
      </main>

      {/* Footer */}
       <footer className={`py-8 ${isDark ? 'bg-gray-900 border-t border-gray-700' : 'bg-gray-50 border-t border-gray-200'}`}>
            <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-xs ${secondaryTextColorClass}`}>
                {langContent.footer} {/* Footer disesuaikan */}
            </div>
       </footer>
    </div>
  );
}