"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Slider, { Settings } from "react-slick";
import anime from "animejs";
import {
  FaSun,
  FaMoon,
  FaBars,
  FaTimes,
  FaGlobe,
  FaLeaf,
  FaTint,
  FaLightbulb,
  FaThermometerHalf,
  FaMobileAlt,
  FaChartLine,
  FaArrowUp,
  FaCheckCircle,
  FaArrowRight,
} from "react-icons/fa";
import { FaArrowRightToBracket } from "react-icons/fa6";
import { RiDashboardFill } from "react-icons/ri";
import Cookies from "js-cookie";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// -------------------------------------------------
// 1. TIPE DATA & DATA STATIS
// -------------------------------------------------
type Language = "ID" | "EN";

interface ContentData {
  hero: {
    label: string;
    headline: string;
    subheadline: string;
    cta: string;
  };
  about: {
    title: string;
    description: string;
    points: string[];
  };
  features: {
    title: string;
    subtitle: string;
  };
  ctaSection: {
    title: string;
    text: string;
    button: string;
  };
  footer: string;
  menu: { [key: string]: string };
  dashboard: string;
}

const FEATURES_DATA = [
  {
    id: 1,
    img: "/images/cover/garden1.jpg",
    title: { EN: "Auto Watering", ID: "Penyiraman Otomatis" },
    desc: { EN: "Precision irrigation based on real-time soil moisture.", ID: "Irigasi presisi berdasarkan kelembaban tanah real-time." },
    icon: FaTint,
  },
  {
    id: 2,
    img: "/images/cover/garden2.jpg",
    title: { EN: "Smart Lighting", ID: "Pencahayaan Cerdas" },
    desc: { EN: "Automated grow lights schedules for optimal photosynthesis.", ID: "Jadwal lampu tumbuh otomatis untuk fotosintesis optimal." },
    icon: FaLightbulb,
  },
  {
    id: 3,
    img: "/images/cover/garden3.jpg",
    title: { EN: "Climate Sense", ID: "Sensor Iklim" },
    desc: { EN: "Monitor temp & humidity to prevent plant diseases.", ID: "Pantau suhu & kelembaban untuk mencegah penyakit tanaman." },
    icon: FaThermometerHalf,
  },
  {
    id: 4,
    img: "/images/cover/garden4.jpg",
    title: { EN: "Central Hub", ID: "Hub Pusat" },
    desc: { EN: "Control everything from one single dashboard.", ID: "Kendalikan semuanya dari satu dasbor tunggal." },
    icon: FaMobileAlt,
  },
  {
    id: 5,
    img: "/images/cover/garden5.jpg",
    title: { EN: "Data Insights", ID: "Analisis Data" },
    desc: { EN: "Historical charts to improve your gardening skills.", ID: "Grafik historis untuk meningkatkan kemampuan berkebun Anda." },
    icon: FaChartLine,
  },
];

const CONTENT_DATA: Record<Language, ContentData> = {
  EN: {
    hero: {
      label: "Smart Home Garden System",
      headline: "Grow Smarter, Not Harder.",
      subheadline: "Transform your home garden with IoT precision. Monitor, control, and thrive from anywhere in the world.",
      cta: "Launch Dashboard",
    },
    about: {
      title: "Why Choose Tops Garden?",
      description: "Traditional gardening involves guesswork. Our system brings data-driven precision to your fingertips, ensuring your plants get exactly what they need, when they need it.",
      points: ["Real-time plant monitoring", "Automated care schedules", "Save water and energy", "Accessible from any device"],
    },
    features: {
      title: "Powerful Features",
      subtitle: "Everything you need to maintain a healthy garden.",
    },
    ctaSection: {
      title: "Ready to Upgrade Your Garden?",
      text: "Join the future of home gardening. Access your dashboard now.",
      button: "Go to Dashboard",
    },
    footer: "© 2025 Tops Smart Garden. All rights reserved.",
    menu: { home: "Home", features: "Features", about: "About", info: "Info" },
    dashboard: "Dashboard",
  },
  ID: {
    hero: {
      label: "Sistem Taman Rumah Pintar",
      headline: "Berkebun Lebih Cerdas.",
      subheadline: "Transformasi taman rumah Anda dengan presisi IoT. Pantau, kendalikan, dan suburkan tanaman dari mana saja.",
      cta: "Buka Dasbor",
    },
    about: {
      title: "Mengapa Tops Garden?",
      description: "Berkebun tradisional seringkali hanya menebak-nebak. Sistem kami membawa presisi berbasis data, memastikan tanaman Anda mendapatkan apa yang mereka butuhkan.",
      points: ["Pemantauan tanaman real-time", "Jadwal perawatan otomatis", "Hemat air dan energi", "Akses dari semua perangkat"],
    },
    features: {
      title: "Fitur Unggulan",
      subtitle: "Segala yang Anda butuhkan untuk taman yang sehat.",
    },
    ctaSection: {
      title: "Siap Meningkatkan Taman Anda?",
      text: "Bergabunglah dengan masa depan berkebun di rumah. Akses dasbor Anda sekarang.",
      button: "Buka Dasbor",
    },
    footer: "© 2025 Tops Smart Garden. Hak cipta dilindungi.",
    menu: { home: "Beranda", features: "Fitur", about: "Tentang", info: "Info" },
    dashboard: "Dasbor",
  },
};

// -------------------------------------------------
// 2. MAIN COMPONENT
// -------------------------------------------------
export default function TopsSmartGardenHome() {
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("ID");
  const [scrolled, setScrolled] = useState(false);
  const [currentHeroImg, setCurrentHeroImg] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false); // State back to top

  // THEME STATE
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const heroRef = useRef<HTMLDivElement>(null);

  // --- EFFECTS ---

  // 1. Hydration & Theme Init
  useEffect(() => {
    setMounted(true);
    
    // Read from LocalStorage
    const rawStoredTheme = localStorage.getItem("color-theme");
    let storedTheme: "light" | "dark" | null = null;

    if (rawStoredTheme) {
      try {
        // Parse to remove quotes if stored as "dark"
        storedTheme = JSON.parse(rawStoredTheme);
      } catch (e) {
        // Fallback if stored as raw string dark
        if (rawStoredTheme === "dark" || rawStoredTheme === "light") {
          storedTheme = rawStoredTheme;
        }
      }
    }

    const sysTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(storedTheme || sysTheme);

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      setShowBackToTop(window.scrollY > 400); // Show back to top button
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. Theme Application & Save
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // SAVE WITH QUOTES using JSON.stringify
    localStorage.setItem("color-theme", JSON.stringify(theme));
  }, [theme, mounted]);

  // 3. Auto Slide Hero Image
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroImg((prev) => (prev + 1) % FEATURES_DATA.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // 4. Scroll Reveal Observer (Optional, but nice to have)
  useEffect(() => {
    if(!mounted) return;
    // Simple entry animation for hero text
    anime({
      targets: heroRef.current,
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 1000,
      easing: 'easeOutExpo',
      delay: 300
    });
  }, [mounted]);


  // Handlers
  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");
  const isDark = theme === "dark";
  const userCookieExists = Boolean(Cookies.get("userAuth"));
  const lang = CONTENT_DATA[language];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setIsSidebarOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Hover Animations
  const handleFeatureHover = (e: React.MouseEvent<HTMLDivElement>) => {
    anime({
      targets: e.currentTarget,
      translateY: -8,
      boxShadow: isDark ? "0 15px 30px rgba(0,0,0,0.5)" : "0 15px 30px rgba(0,0,0,0.1)",
      duration: 250,
      easing: "easeOutQuad",
    });
  };

  const handleFeatureHoverLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    anime({
      targets: e.currentTarget,
      translateY: 0,
      boxShadow: "none",
      duration: 300,
      easing: "easeOutQuad",
    });
  };

  // Slider Settings
  const sliderSettings: Settings = {
    dots: true,
    infinite: true,
    speed: 600,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    arrows: false,
    responsive: [
      { breakpoint: 1024, settings: { slidesToShow: 2, centerMode: false } },
      { breakpoint: 640, settings: { slidesToShow: 1, centerMode: true, centerPadding: "20px" } },
    ],
    appendDots: (dots) => <ul className="slick-dots-custom">{dots}</ul>,
  };

  if (!mounted) return <div className="min-h-screen bg-white dark:bg-gray-950" />;

  return (
    <div className={`font-sans min-h-screen transition-colors duration-300 selection:bg-green-500 selection:text-white ${isDark ? "bg-gray-950 text-gray-100" : "bg-white text-gray-800"}`}>
      
      {/* CSS Reset for Slick Dots & Flexbox Fix */}
      <style jsx global>{`
        .slick-dots-custom { display: flex !important; justify-content: center; gap: 8px; margin-top: 30px; padding: 0; }
        .slick-dots-custom li { width: 10px; height: 10px; border-radius: 50%; background: ${isDark ? '#374151' : '#d1d5db'}; cursor: pointer; transition: all 0.3s; }
        .slick-dots-custom li.slick-active { width: 30px; border-radius: 10px; background: #16a34a; }
        .slick-dots-custom li button { display: none; }

        /* Fix height consistency */
        .slick-track { display: flex !important; }
        .slick-slide { height: auto !important; display: flex !important; height: 100%; }
        .slick-slide > div { width: 100%; display: flex; flex: 1; }
      `}</style>

      {/* --- NAVBAR --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg py-3 border-b border-gray-200/50 dark:border-gray-800/50" : "bg-transparent py-5"}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
            <div className="relative h-8 w-8">
                 <FaLeaf className="text-green-500 w-full h-full" /> 
            </div>
            <span className="font-bold text-xl tracking-tight">Tops<span className="text-green-500">Garden</span></span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {Object.entries(lang.menu).map(([key, label]) => (
              <button key={key} onClick={() => scrollToSection(key)} className="text-sm font-medium hover:text-green-500 transition-colors">
                {label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => setLanguage(l => l === "ID" ? "EN" : "ID")} className="text-xs font-bold px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:border-green-500 transition-all w-10">
              {language}
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-yellow-500">
              {isDark ? <FaSun /> : <FaMoon />}
            </button>
            <a href={userCookieExists ? "/dashboard" : "/auth/signin"} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-green-500/30 transition-transform active:scale-95 flex items-center gap-2">
              {userCookieExists ? <RiDashboardFill /> : <FaArrowRightToBracket />}
              {userCookieExists ? lang.dashboard : "Login"}
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-2xl" onClick={() => setIsSidebarOpen(true)}>
            <FaBars />
          </button>
        </div>
      </nav>

      {/* --- MOBILE SIDEBAR --- */}
      <div className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity ${isSidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"}`} onClick={() => setIsSidebarOpen(false)} />
      <aside className={`fixed top-0 right-0 h-full w-3/4 max-w-xs bg-white dark:bg-gray-900 z-[70] shadow-2xl transform transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "translate-x-full"} p-6 flex flex-col`}>
        <div className="flex justify-between items-center mb-8">
          <span className="font-bold text-xl flex items-center gap-2"><FaLeaf className="text-green-500"/> Menu</span>
          <button onClick={() => setIsSidebarOpen(false)}><FaTimes className="text-2xl" /></button>
        </div>
        <div className="flex flex-col gap-4 flex-1">
          {Object.entries(lang.menu).map(([key, label]) => (
            <button key={key} onClick={() => scrollToSection(key)} className="text-lg font-medium text-left px-2 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              {label}
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-4 border-t border-gray-100 dark:border-gray-800 pt-6">
           <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
              <span className="text-sm font-medium">Mode</span>
              <button onClick={toggleTheme} className="text-yellow-500 p-1">{isDark ? <FaSun /> : <FaMoon/>}</button>
           </div>
           <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
              <span className="text-sm font-medium">Bahasa</span>
              <button onClick={() => setLanguage(l => l === "ID" ? "EN" : "ID")} className="font-bold text-green-500">{language}</button>
           </div>
           <a href="/auth/signin" className="bg-green-600 text-white text-center py-3.5 rounded-xl font-bold shadow-md">
             {lang.dashboard}
           </a>
        </div>
      </aside>

      {/* --- HERO SECTION --- */}
      <section id="home" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none opacity-60 dark:opacity-30">
           <div className="absolute top-20 left-10 w-72 h-72 bg-green-400/20 rounded-full blur-[100px]"></div>
           <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/20 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Text */}
          <div ref={heroRef} className="text-center lg:text-left order-2 lg:order-1">
            <span className="inline-block py-1 px-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold tracking-wide uppercase mb-6 animate-pulse">
              {lang.hero.label}
            </span>
            <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight mb-6">
              {lang.hero.headline.split(' ')[0]} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-teal-400">
                {lang.hero.headline.split(' ').slice(1).join(' ')}
              </span>
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
              {lang.hero.subheadline}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <a href={userCookieExists ? "/dashboard" : "/auth/signin"} className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-xl shadow-green-500/20 transition-all hover:-translate-y-1">
                {lang.hero.cta}
              </a>
              <button onClick={() => scrollToSection('features')} className="w-full sm:w-auto px-8 py-4 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {language === 'ID' ? 'Pelajari Lebih' : 'Learn More'}
              </button>
            </div>
          </div>

          {/* Right: Dynamic Image Display */}
          <div className="relative w-full max-w-lg mx-auto lg:ml-auto order-1 lg:order-2 mb-10 lg:mb-0">
             <div className="relative z-10 rounded-[2rem] overflow-hidden shadow-2xl border-[6px] border-white dark:border-gray-800 aspect-[4/3] group">
                <Image
                  key={currentHeroImg} 
                  src={FEATURES_DATA[currentHeroImg].img}
                  alt="Hero"
                  fill
                  className="object-cover transition-transform duration-[5000ms] scale-105 group-hover:scale-110 animate-fade-in"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white">
                   <div className="flex items-center gap-2 mb-1 text-green-400">
                      {React.createElement(FEATURES_DATA[currentHeroImg].icon)}
                      <span className="text-xs font-bold uppercase tracking-wider">Featured System</span>
                   </div>
                   <p className="text-xl font-bold">{FEATURES_DATA[currentHeroImg].title[language]}</p>
                </div>
             </div>
             <div className="absolute -bottom-6 -right-6 w-full h-full border-2 border-green-500/20 rounded-[2.5rem] z-0"></div>
          </div>
        </div>
      </section>

      {/* --- FEATURES CAROUSEL --- */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">{lang.features.title}</h2>
            <p className="text-gray-500 dark:text-gray-400">{lang.features.subtitle}</p>
          </div>

          <div className="px-2">
            <Slider {...sliderSettings}>
              {FEATURES_DATA.map((item) => (
                <div key={item.id} className="px-3 py-6 h-full">
                  <div 
                    className="group h-full w-full bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 transition-all duration-300 flex flex-col items-start text-left relative overflow-hidden cursor-default hover:shadow-xl hover:shadow-green-500/5 hover:-translate-y-2"
                    onMouseEnter={handleFeatureHover}
                    onMouseLeave={handleFeatureHoverLeave}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:bg-green-500/10"></div>
                    
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-3xl transition-transform duration-300 group-hover:scale-110 ${isDark ? 'bg-gray-700 text-green-400' : 'bg-green-50 text-green-600'}`}>
                      {React.createElement(item.icon)}
                    </div>
                    <h3 className="text-xl font-bold mb-3 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{item.title[language]}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 flex-grow">
                      {item.desc[language]}
                    </p>
                    <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-auto">
                       <div className="h-full bg-green-500 w-0 group-hover:w-full transition-all duration-500 ease-out"></div>
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section id="about" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
           <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="relative order-2 lg:order-1">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4 mt-8">
                        <div className="h-48 rounded-3xl bg-gray-200 dark:bg-gray-800 overflow-hidden relative shadow-lg border-4 border-white dark:border-gray-700">
                           <Image src="/images/cover/garden1.jpg" alt="Detail 1" fill className="object-cover hover:scale-110 transition-transform duration-700"/>
                        </div>
                        <div className="h-32 rounded-3xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 border-4 border-white dark:border-gray-700">
                           <FaLeaf className="text-5xl opacity-80" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="h-32 rounded-3xl bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center text-center p-4 border-4 border-white dark:border-gray-700 shadow-sm">
                           <span className="text-4xl font-black text-green-500">IoT</span>
                           <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Technology</span>
                        </div>
                        <div className="h-64 rounded-3xl bg-gray-200 dark:bg-gray-800 overflow-hidden relative shadow-lg border-4 border-white dark:border-gray-700">
                           <Image src="/images/cover/garden2.jpg" alt="Detail 2" fill className="object-cover hover:scale-110 transition-transform duration-700"/>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="order-1 lg:order-2">
                 <div className="inline-flex items-center gap-2 text-green-600 font-bold text-sm uppercase tracking-wider mb-4">
                    <span className="w-8 h-[2px] bg-green-600"></span> About System
                 </div>
                 <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">{lang.about.title}</h2>
                 <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                    {lang.about.description}
                 </p>
                 <ul className="grid sm:grid-cols-2 gap-4">
                    {lang.about.points.map((point, idx) => (
                       <li key={idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <FaCheckCircle className="text-green-500 flex-shrink-0 mt-1" />
                          <span className="font-medium text-sm">{point}</span>
                       </li>
                    ))}
                 </ul>
              </div>
           </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section id="info" className="py-28 bg-green-900 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-600/30 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-teal-600/30 rounded-full blur-[120px]"></div>
         </div>

         <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-8 tracking-tight leading-tight">
               {lang.ctaSection.title}
            </h2>
            <p className="text-green-100 text-lg lg:text-xl mb-12 max-w-2xl mx-auto leading-relaxed opacity-90">
               {lang.ctaSection.text}
            </p>
            <a href={userCookieExists ? "/dashboard" : "/auth/signin"} className="inline-flex items-center gap-3 bg-white text-green-900 px-10 py-5 rounded-full font-bold text-lg hover:bg-green-50 hover:scale-105 transition-all shadow-2xl">
               {lang.ctaSection.button}
               <FaArrowRight />
            </a>
         </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-950 text-gray-400 py-16 border-t border-gray-900">
         <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 text-sm">
            <div className="col-span-1 md:col-span-2">
               <div className="flex items-center gap-2 mb-6 text-white">
                  <FaLeaf className="text-green-500 text-2xl" />
                  <span className="font-bold text-2xl">TopsSmartGarden</span>
               </div>
               <p className="max-w-sm text-gray-500 leading-relaxed">
                  {language === 'ID' ? 'Solusi IoT terbaik untuk taman rumah Anda. Pantau dan kendalikan dengan mudah melalui teknologi terdepan.' : 'The best IoT solution for your home garden. Monitor and control with ease using cutting-edge technology.'}
               </p>
            </div>
            <div>
               <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Navigation</h4>
               <ul className="space-y-4">
                  {Object.entries(lang.menu).map(([key, label]) => (
                     <li key={key}><button onClick={() => scrollToSection(key)} className="hover:text-green-500 transition-colors">{label}</button></li>
                  ))}
               </ul>
            </div>
            <div>
               <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Legal & Info</h4>
               <ul className="space-y-4">
                  <li><a href="#" className="hover:text-green-500">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-green-500">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-green-500">Contact Support</a></li>
               </ul>
            </div>
         </div>
         <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <p>{lang.footer}</p>
         </div>
      </footer>

      {/* Back to Top */}
      <button 
        onClick={scrollToTop} 
        className={`fixed bottom-8 right-8 p-4 bg-green-600 text-white rounded-full shadow-2xl transition-all duration-500 z-40 hover:bg-green-700 hover:-translate-y-2 ${scrolled && showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
      >
        <FaArrowUp />
      </button>

    </div>
  );
}