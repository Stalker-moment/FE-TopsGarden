"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Notification from "@/components/Alerts/notification";
import { FaSun, FaMoon, FaArrowLeft, FaEnvelope, FaKey } from "react-icons/fa";

const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;

// --- LOADING SPINNER (Konsisten dengan Login) ---
const LoadingSpinner = () => (
  <div className="flex items-center justify-center gap-2">
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Sending...</span>
  </div>
);

export default function ForgotPassword() {
  // --- STATE ---
  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // --- EFFECTS ---
  useEffect(() => {
    setMounted(true);
    // Load Theme
    const savedTheme = localStorage.getItem("color-theme");
    let initialTheme: "light" | "dark" = "light";

    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        if (parsed === "dark" || parsed === "light") initialTheme = parsed;
      } catch {
        if (savedTheme === "dark") initialTheme = "dark";
      }
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      initialTheme = "dark";
    }

    setTheme(initialTheme);
    if (initialTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    // Lock Body Scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // --- HANDLERS ---
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("color-theme", JSON.stringify(newTheme));
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ganti URL sesuai kebutuhan (contoh menggunakan variable env atau hardcoded path relative)
      const response = await fetch(`/api/forgot/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("Reset instructions sent! Please check your email.", "success");
        setEmail(""); // Clear input on success
      } else {
        showNotification(data.message || "Failed to send reset instructions.", "error");
      }
    } catch (error) {
      console.error("Error in forgot password:", error);
      showNotification("Network error. Please try again later.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-500 flex items-center justify-center p-4">
      
      {/* --- BACKGROUND AMBIENT --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-green-400/20 rounded-full blur-[120px] opacity-60 dark:opacity-30 animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-400/20 rounded-full blur-[120px] opacity-60 dark:opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* --- NOTIFICATION --- */}
      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}

      {/* --- MAIN CARD --- */}
      <div className="relative z-10 w-full max-w-5xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2 min-h-[500px]">
        
        {/* LEFT COLUMN: FORM */}
        <div className="p-8 md:p-12 flex flex-col justify-center relative">
           
           {/* Actions Header */}
           <div className="absolute top-6 left-6 md:top-8 md:left-8">
              <Link href="/auth/signin" className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors group">
                 <FaArrowLeft className="transition-transform group-hover:-translate-x-1" />
                 Back to Login
              </Link>
           </div>
           <div className="absolute top-6 right-6 md:top-8 md:right-8">
              <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-all">
                 {theme === "light" ? <FaMoon /> : <FaSun className="text-yellow-400" />}
              </button>
           </div>

           <div className="mt-12 md:mt-4">
              <div className="mb-8">
                 <div className="inline-block p-3 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
                    <FaKey size={24} />
                 </div>
                 <h2 className="text-3xl font-bold tracking-tight mb-3 text-gray-900 dark:text-white">Forgot Password?</h2>
                 <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    Don&apos;t worry! It happens. Please enter the email associated with your account.
                 </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider ml-1">
                        Email Address
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                            <FaEnvelope />
                        </div>
                        <input
                            type="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            required
                            className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                        />
                    </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <LoadingSpinner /> : "Send Instructions"}
                </button>
              </form>
           </div>
        </div>

        {/* RIGHT COLUMN: VISUAL */}
        <div className="hidden md:flex relative bg-gray-100 dark:bg-gray-900 items-center justify-center p-12 overflow-hidden">
           {/* Abstract Shapes */}
           <div className="absolute inset-0 bg-gradient-to-bl from-green-500/10 to-blue-500/10"></div>
           <div className="absolute top-0 left-0 w-64 h-64 bg-green-500/20 rounded-full blur-3xl -ml-16 -mt-16"></div>
           <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mb-16"></div>

           <div className="relative z-10 text-center">
              <div className="mb-8 relative h-48 w-full mx-auto">
                 {/* Pastikan path logo benar */}
                 <Image
                    src="/images/logo/logo_Sw.svg" 
                    alt="Tops Garden Logo"
                    width={200}
                    height={80}
                    className="object-contain mx-auto drop-shadow-xl"
                    priority
                 />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-white">Recovery Made Simple</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
                 Check your email inbox for the reset link. It should arrive within a few minutes.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}