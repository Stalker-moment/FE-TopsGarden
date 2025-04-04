"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Notification from "@/components/Alerts/notification";
import { FaSun, FaMoon } from "react-icons/fa";

const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;

// Komponen Logo Internal
const Logo = () => (
  <div className="mx-auto mb-10 h-auto w-96 object-contain">
    <Image
      src="/images/logo/logo-akti.png" // Logo untuk mode terang
      alt="Logo"
      width={2048}
      height={512}
      className="dark:hidden" // Hanya tampil di mode terang
    />
    <Image
      src="/images/logo/logo-akti.png" // Logo untuk mode gelap
      alt="Logo Dark"
      width={2048}
      height={512}
      className="hidden dark:block" // Hanya tampil di mode gelap
    />
  </div>
);

// Komponen LoadingDots
const LoadingDots: React.FC = () => {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span>
      {"Sending" + ".".repeat(dotCount)}
    </span>
  );
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState("light");
  const [message, setMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
  };

  // Mengatur state tema berdasarkan localStorage saat komponen dimuat
  useEffect(() => {
    const savedTheme = localStorage.getItem("color-theme");
    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        if (parsedTheme === "dark" || parsedTheme === "light") {
          setTheme(parsedTheme);
          if (parsedTheme === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      } catch (error) {
        console.error("Error parsing theme from localStorage:", error);
      }
    } else {
      // Jika tidak ada preferensi yang disimpan, gunakan preferensi sistem
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        setTheme("dark");
        document.documentElement.classList.add("dark");
        localStorage.setItem("color-theme", JSON.stringify("dark"));
      } else {
        setTheme("light");
        document.documentElement.classList.remove("dark");
        localStorage.setItem("color-theme", JSON.stringify("light"));
      }
    }
    // Mencegah scrolling pada halaman reset password
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Handler untuk toggle tema
  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      localStorage.setItem("color-theme", JSON.stringify("dark"));
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("color-theme", JSON.stringify("light"));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch(`https://${HTTPSAPIURL}/api/users/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        showNotification("Reset instructions sent. Please check your email.", "success");
      } else {
        showNotification("Failed to send reset instructions. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error in forgot password:", error);
      showNotification("Failed to send reset instructions. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row items-center justify-center bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {/* Kolom Kiri: Formulir Forgot Password */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg box-border">
          {/* Toggle Theme dengan React Icons */}
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleTheme}
              className="flex items-center focus:outline-none transition-colors duration-300 text-xl"
              aria-label="Toggle Dark Mode"
            >
              {theme === "light" ? (
                <FaMoon className="text-gray-800 dark:text-gray-200" />
              ) : (
                <FaSun className="text-yellow-400" />
              )}
            </button>
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Forgot Password
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Enter your email address and we&apos;ll send you instructions on how to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block mb-2.5 text-gray-700 dark:text-gray-200 font-medium"
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:ring-0 transition-colors duration-300"
              />
            </div>

            {message && (
              <div className="text-sm text-center text-green-600 dark:text-green-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingDots /> : "Send Reset Instructions"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/auth/signin"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Kolom Kanan: Logo dan Teks Sambutan (hanya untuk tampilan desktop) */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center p-6">
        <div className="text-center">
          <Logo />
          <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Welcome Back!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email to reset your password.
          </p>
        </div>
      </div>
    </div>
  );
}