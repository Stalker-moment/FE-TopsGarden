"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Notification from "@/components/Alerts/notification";
import { FaSun, FaMoon, FaArrowLeft, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

// Komponen Logo
const Logo = () => (
  <div className="mx-auto mb-10 h-auto w-96 object-contain">
    <Image
      src="/images/logo/logo-removebg-preview.png"
      alt="Logo"
      width={2048}
      height={512}
      className="dark:hidden"
    />
    <Image
      src="/images/logo/logo-removebg-preview.png"
      alt="Logo Dark"
      width={2048}
      height={512}
      className="hidden dark:block"
    />
  </div>
);

// Loading Animation
const LoadingDots: React.FC = () => {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return <span>{"Resetting" + ".".repeat(dotCount)}</span>;
};

// Komponen validasi password
interface ValidationProps {
  isValid: boolean;
  label: string;
}

const ValidationItem: React.FC<ValidationProps> = ({ isValid, label }) => {
  return (
    <div className="flex items-center text-sm">
      {isValid ? (
        <FaCheckCircle className="mr-2 text-green-500" />
      ) : (
        <FaTimesCircle className="mr-2 text-red-500" />
      )}
      <span>{label}</span>
    </div>
  );
};

interface PasswordValidatorProps {
  password: string;
}

const PasswordValidator: React.FC<PasswordValidatorProps> = ({ password }) => {
  // Aturan validasi password
  const validations = [
    {
      isValid: password.length >= 8,
      label: "Minimal 8 karakter",
    },
    {
      isValid: /[A-Z]/.test(password),
      label: "Minimal 1 huruf kapital",
    },
    {
      isValid: /[a-z]/.test(password),
      label: "Minimal 1 huruf kecil",
    },
    {
      isValid: /[0-9]/.test(password),
      label: "Minimal 1 angka",
    },
    {
      isValid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      label: "Minimal 1 simbol",
    },
  ];

  return (
    <div className="mb-4 space-y-1">
      {validations.map((item, index) => (
        <ValidationItem key={index} isValid={item.isValid} label={item.label} />
      ))}
    </div>
  );
};

export default function ResetPassword() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams ? searchParams.get("token") : null;

  const [theme, setTheme] = useState("light");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null); // null: pengecekan token belum selesai

  // Cek validitas token, jika token ada kirim request ke /api/forgot/validate
  useEffect(() => {
    if (token) {
      const validateToken = async () => {
        try {
          const response = await fetch("/api/forgot/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const data = await response.json();
          if (response.ok && data.valid) {
            setIsTokenValid(true);
          } else {
            setIsTokenValid(false);
          }
        } catch (error) {
          setIsTokenValid(false);
        }
      };
      validateToken();
    } else {
      setIsTokenValid(false);
    }
  }, [token]);

  // Mengatur tema dari localStorage
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
    }
  }, []);

  // Toggle Tema
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("color-theme", JSON.stringify(newTheme));
  };

  // Fungsi untuk mengecek semua validasi password terpenuhi
  const isPasswordValid = () => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Pastikan token tersedia dan valid
    if (!token || !isTokenValid) return;

    if (!isPasswordValid()) {
      setNotification({ message: "Password tidak memenuhi syarat keamanan.", type: "error" });
      return;
    }

    if (password !== confirmPassword) {
      setNotification({ message: "Password tidak cocok.", type: "error" });
      return;
    }

    setLoading(true);
    setNotification(null);

    try {
      // Mengirimkan token dan password ke endpoint /api/forgot/reset
      const response = await fetch("/api/forgot/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setNotification({ message: "Password berhasil diubah! Redirecting...", type: "success" });
        setTimeout(() => router.push("/auth/signin"), 3000);
      } else {
        setNotification({ message: data.message || "Gagal mengubah password.", type: "error" });
      }
    } catch (error) {
      setNotification({ message: "Terjadi kesalahan. Silakan coba lagi.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Jika token tidak valid, tampilkan halaman "Link Tidak Valid" beserta tombol kembali ke home
  if (isTokenValid === false) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="p-8 rounded-lg bg-white dark:bg-gray-800 shadow-lg text-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Link Tidak Valid
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Token tidak ditemukan atau sudah kadaluarsa.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors duration-300 hover:bg-blue-700"
          >
            Kembali ke Home
          </Link>
        </div>
      </div>
    );
  }

  // Jika pengecekan token masih berjalan, tampilkan loading
  if (isTokenValid === null) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <span className="text-gray-800 dark:text-gray-200">Memvalidasi token...</span>
      </div>
    );
  }

  // Jika token valid, tampilkan halaman reset password
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-900 md:flex-row">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="flex w-full items-center justify-center p-6 md:w-1/2">
        <div className="box-border w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
          {/* Header Bar: Back button dan Toggle Theme */}
          <div className="mb-4 flex justify-between">
            <Link href="/" className="flex items-center transition-colors duration-300 focus:outline-none">
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

          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Reset Password</h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">Masukkan password baru Anda di bawah.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="mb-2.5 block font-medium text-gray-700 dark:text-gray-200">
                New Password
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-gray-700 transition-colors duration-300 focus:border-blue-500 focus:ring-0 dark:border-gray-600 dark:text-gray-200"
              />
            </div>

            {/* Realtime password validator */}
            <PasswordValidator password={password} />

            <div>
              <label htmlFor="confirm-password" className="mb-2.5 block font-medium text-gray-700 dark:text-gray-200">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-gray-700 transition-colors duration-300 focus:border-blue-500 focus:ring-0 dark:border-gray-600 dark:text-gray-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 text-white transition-colors duration-300 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingDots /> : "Reset Password"}
            </button>
          </form>
        </div>
      </div>

      <div className="hidden items-center justify-center p-6 md:flex md:w-1/2">
        <div className="text-center">
          <Logo />
          <h2 className="mb-4 text-3xl font-semibold text-gray-800 dark:text-gray-200">Reset Your Password</h2>
          <p className="text-gray-600 dark:text-gray-400">Masukkan password baru untuk melanjutkan.</p>
        </div>
      </div>
    </div>
  );
}