"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Cookies from "js-cookie";
import Image from "next/image";
import Notification from "../Alerts/notification";
import { FaSun, FaMoon, FaArrowLeft, FaEye, FaEyeSlash } from "react-icons/fa"; // Tambahkan FaEye dan FaEyeSlash

const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;

// Komponen Logo Internal
const Logo = () => (
  <div className="mx-auto mb-10 h-auto w-96 object-contain">
    <Image
      src="/images/logo/logo_Sw.svg" // Logo untuk mode terang
      alt="Logo"
      width={2048}
      height={512}
      className="dark:hidden" // Hanya tampil di mode terang
    />
    <Image
      src="/images/logo/logo_Sw.svg" // Logo untuk mode gelap
      alt="Logo Dark"
      width={2048}
      height={512}
      className="hidden dark:block" // Hanya tampil di mode gelap
    />
  </div>
);

// Komponen LoadingDots untuk animasi loading button
const LoadingDots: React.FC = () => {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4); // 0,1,2,3
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return <span>{"Sign in" + ".".repeat(dotCount)}</span>;
};

export default function SigninWithPassword() {
  const [data, setData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [theme, setTheme] = useState("light"); // Default tema
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false); // Tambahkan state showPassword

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
  };

  // Saat komponen dimuat, baca tema dari localStorage (dengan tanda kutip)
  useEffect(() => {
    const savedTheme = localStorage.getItem("color-theme");
    if (savedTheme) {
      // savedTheme berupa string misalnya: "\"dark\"" atau "\"light\""
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

    // Mencegah scrolling pada halaman login
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value, type, checked } = e.target;
    setData({
      ...data,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  interface LoginResponse {
    token: string;
    deviceType: string;
    sessionId: string;
    expired: number; // timestamp dalam milidetik
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    // Jika sudah ada cookie userAuth, langsung redirect ke dashboard
    const userAuthCookie = Cookies.get("userAuth");
    if (userAuthCookie) {
      window.location.href = "/dashboard";
      return;
    }

    setLoading(true);
    try {
      // Tambahkan properti "remember" pada body request
      const response = await fetch(`https://${HTTPSAPIURL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          remember: data.remember,
        }),
      });

      if (response.ok) {
        const result: LoginResponse = await response.json();
        // Ubah timestamp expired menjadi objek Date
        const expiryDate = new Date(result.expired);
        Cookies.set("userAuth", result.token, {
          expires: expiryDate,
        });
        window.location.href = "/dashboard";
      } else {
        showNotification("Login failed. Please check your credentials.", "error");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      showNotification("An error occurred during login.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-900 md:flex-row">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => {
            console.log("Notification onClose dipanggil");
            setNotification(null);
          }}
        />
      )}
      {/* Kolom Kiri: Formulir Login */}
      <div className="flex w-full items-center justify-center p-6 md:w-1/2">
        <div className="box-border w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
          {/* Header Bar: Back button dan Toggle Theme */}
          <div className="mb-4 flex justify-between">
            <Link
              href="/"
              className="flex items-center transition-colors duration-300 focus:outline-none"
            >
              <FaArrowLeft className="h-6 w-6 text-gray-800 dark:text-gray-200" />
              <span className="ml-2 text-gray-800 dark:text-gray-200">Back</span>
            </Link>
            <button
              onClick={toggleTheme}
              className="flex items-center transition-colors duration-300 focus:outline-none text-xl"
              aria-label="Toggle Dark Mode"
            >
              {theme === "light" ? (
                <FaMoon className="text-gray-800 dark:text-gray-200" />
              ) : (
                <FaSun className="text-yellow-400" />
              )}
            </button>
          </div>

          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Login to Your Account
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Fill in your details to sign in to your account.
          </p>

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Field Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2.5 block font-medium text-gray-700 dark:text-gray-200"
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                value={data.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-gray-700 transition-colors duration-300 focus:border-blue-500 focus:ring-0 dark:border-gray-600 dark:text-gray-200"
              />
            </div>

            {/* Field Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2.5 block font-medium text-gray-700 dark:text-gray-200"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} // Ganti tipe input berdasarkan state
                  name="password"
                  value={data.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 pr-10 text-gray-700 transition-colors duration-300 focus:border-blue-500 focus:ring-0 dark:border-gray-600 dark:text-gray-200"
                />
                {/* Tombol untuk toggle password visibility */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Baris untuk Remember me dan Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="remember"
                  checked={data.remember}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                />
                <label htmlFor="remember" className="ml-2 text-gray-700 dark:text-gray-200">
                  Remember me
                </label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 text-white transition-colors duration-300 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingDots /> : "Sign In"}
            </button>
          </form>
        </div>
      </div>

      {/* Kolom Kanan: Logo dan Teks Sambutan (hanya untuk tampilan desktop) */}
      <div className="hidden items-center justify-center p-6 md:flex md:w-1/2">
        <div className="text-center">
          <Logo />
          <h2 className="mb-4 text-3xl font-semibold text-gray-800 dark:text-gray-200">
            Welcome Back!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to your account to continue.
          </p>
        </div>
      </div>
    </div>
  );
}
