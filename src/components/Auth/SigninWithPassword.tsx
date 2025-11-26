"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import Image from "next/image";
import Notification from "../Alerts/notification";
import { 
  FaSun, 
  FaMoon, 
  FaArrowLeft, 
  FaEye, 
  FaEyeSlash, 
  FaLeaf 
} from "react-icons/fa";

const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;

// --- LOADING ANIMATION ---
const LoadingSpinner = () => (
  <div className="flex items-center justify-center gap-2">
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Processing...</span>
  </div>
);

export default function SigninWithPassword() {
  // --- STATE ---
  const [data, setData] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    setTimeout(() => setNotification(null), 4000); // Auto hide
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("color-theme", JSON.stringify(newTheme));
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setData({ ...data, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (Cookies.get("userAuth")) {
      window.location.href = "/dashboard";
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://${HTTPSAPIURL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        Cookies.set("userAuth", result.token, { expires: new Date(result.expired) });
        window.location.href = "/dashboard";
      } else {
        showNotification("Login failed. Check credentials.", "error");
      }
    } catch (error) {
      console.error("Login Error:", error);
      showNotification("An network error occurred.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-500 flex items-center justify-center">
      
      {/* --- BACKGROUND AMBIENT --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-green-400/20 rounded-full blur-[120px] opacity-60 dark:opacity-30 animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-400/20 rounded-full blur-[120px] opacity-60 dark:opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* --- NOTIFICATION --- */}
      {notification && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
           <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
        </div>
      )}

      {/* --- MAIN CARD CONTAINER --- */}
      <div className="relative z-10 w-full max-w-5xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl border border-white/50 dark:border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-2 min-h-[600px]">
        
        {/* LEFT COLUMN: FORM */}
        <div className="p-8 md:p-12 flex flex-col justify-center relative">
           
           {/* Header Actions */}
           <div className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors group">
                 <FaArrowLeft className="transition-transform group-hover:-translate-x-1" />
                 Back
              </Link>
           </div>
           <div className="absolute top-6 right-6 md:top-8 md:right-8">
              <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-all">
                 {theme === "light" ? <FaMoon /> : <FaSun className="text-yellow-400" />}
              </button>
           </div>

           {/* Form Content */}
           <div className="mt-12 md:mt-0">
              <div className="mb-8">
                 <div className="inline-block p-3 rounded-2xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4">
                    <FaLeaf size={24} />
                 </div>
                 <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome Back!</h2>
                 <p className="text-gray-500 dark:text-gray-400">Sign in to continue to your garden dashboard.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                 
                 {/* Email Input */}
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider ml-1">Email Address</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={data.email} 
                      onChange={handleChange} 
                      placeholder="name@example.com" 
                      required 
                      className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                    />
                 </div>

                 {/* Password Input */}
                 <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                       <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Password</label>
                       <Link href="/auth/forgot-password" className="text-xs font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300">
                          Forgot Password?
                       </Link>
                    </div>
                    <div className="relative">
                       <input 
                         type={showPassword ? "text" : "password"} 
                         name="password" 
                         value={data.password} 
                         onChange={handleChange} 
                         placeholder="Enter your password" 
                         required 
                         className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3.5 pr-12 outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                       />
                       <button 
                         type="button" 
                         onClick={() => setShowPassword(!showPassword)} 
                         className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                       >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                       </button>
                    </div>
                 </div>

                 {/* Checkbox */}
                 <div className="flex items-center gap-2 py-2">
                    <input 
                      id="remember" 
                      type="checkbox" 
                      name="remember" 
                      checked={data.remember} 
                      onChange={handleChange} 
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="remember" className="text-sm font-medium text-gray-600 dark:text-gray-300 select-none cursor-pointer">
                       Remember me for 30 days
                    </label>
                 </div>

                 {/* Submit Button */}
                 <button 
                   type="submit" 
                   disabled={loading} 
                   className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                    {loading ? <LoadingSpinner /> : "Sign In"}
                 </button>

                 <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    Don&apos;t have an account? <Link href="/auth/signup" className="font-bold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300">Create Account</Link>
                 </p>
              </form>
           </div>
        </div>

        {/* RIGHT COLUMN: VISUAL / BRANDING (Hidden on mobile) */}
        <div className="hidden md:flex relative bg-gray-100 dark:bg-gray-900 items-center justify-center p-12 overflow-hidden">
           {/* Abstract Shapes in Right Panel */}
           <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10"></div>
           <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -ml-16 -mb-16"></div>

           <div className="relative z-10 text-center max-w-sm">
              <div className="mb-8 relative h-64 w-full">
                 {/* Ganti dengan ilustrasi/gambar yang relevan */}
                 <Image 
                   src="/images/logo/logo_Sw.svg" 
                   alt="Branding Illustration" 
                   fill 
                   className="object-contain drop-shadow-2xl"
                   priority
                 />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-white">Smart Gardening Made Easy</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                 Monitor your plants, automate watering, and track growth analytics all in one place.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}