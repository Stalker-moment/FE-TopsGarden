"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Notification from "@/components/Alerts/notification";
import { FaSun, FaMoon } from "react-icons/fa";

// Komponen Logo Internal
const Logo = () => (
  <div className="mx-auto mb-10 h-auto w-96 object-contain">
    <Image
      src="/images/logo/logo_Sw.svg"
      alt="Logo"
      width={2048}
      height={512}
      className="dark:hidden"
    />
    <Image
      src="/images/logo/logo_Sw.svg"
      alt="Logo Dark"
      width={2048}
      height={512}
      className="hidden dark:block"
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

  return <span>{"Sending" + ".".repeat(dotCount)}</span>;
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState("light");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
  };

  // Mengatur tema berdasarkan localStorage saat komponen dimuat
  useEffect(() => {
    const savedTheme = localStorage.getItem("color-theme");
    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        setTheme(parsedTheme);
        document.documentElement.classList.toggle("dark", parsedTheme === "dark");
      } catch (error) {
        console.error("Error parsing theme from localStorage:", error);
      }
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", prefersDark);
      localStorage.setItem("color-theme", JSON.stringify(prefersDark ? "dark" : "light"));
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("color-theme", JSON.stringify(newTheme));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/forgot/request", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("Reset instructions sent. Please check your email.", "success");
      } else {
        showNotification(data.message || "Failed to send reset instructions. Please try again.", "error");
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
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg box-border">
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleTheme}
              className="flex items-center focus:outline-none transition-colors duration-300 text-xl"
              aria-label="Toggle Dark Mode"
            >
              {theme === "light" ? <FaMoon className="text-gray-800" /> : <FaSun className="text-yellow-400" />}
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
              <label htmlFor="email" className="block mb-2.5 text-gray-700 dark:text-gray-200 font-medium">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingDots /> : "Send Reset Instructions"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/auth/signin" className="text-blue-600 hover:underline dark:text-blue-400">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden md:flex md:w-1/2 items-center justify-center p-6">
        <div className="text-center">
          <Logo />
          <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Welcome Back!</h2>
          <p className="text-gray-600 dark:text-gray-400">Enter your email to reset your password.</p>
        </div>
      </div>
    </div>
  );
}