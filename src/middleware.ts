// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// URL API untuk memvalidasi token
const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL;

// Daftar role yang valid
const roles = ["MAHASISWA", "DOSEN", "MAGANG", "GUEST", "ADMIN", "USER"] as const;

// Daftar halaman (routes) yang bisa diakses publik tanpa login
// Misal: home, product, contact, halaman sign in/up, dsb
const publicRoutes = [
  "/",
  "/product",
  "/contact",
  "/auth/signin",
  "/auth/forgot-password",
  "/reset-password",
];

// Mapping route yang diizinkan untuk masing-masing role
const allowedRoutesByRole: Record<(typeof roles)[number], string[]> = {
  // Guest hanya boleh akses public routes
  GUEST: [...publicRoutes],
  // MAHASISWA boleh akses public routes + apapun yang dibutuhkan
  MAHASISWA: [
    ...publicRoutes,
    "/dashboard",
    "/accounts",
    // Tambahkan routes lainnya sesuai kebutuhan
  ],
  // DOSEN boleh akses lebih banyak
  DOSEN: [
    ...publicRoutes,
    "/dashboard",
    "/accounts",
    "/configurations",
    "/control",
    // Tambahkan routes lainnya sesuai kebutuhan
  ],
  // MAGANG contoh: boleh akses dashboard, control, dll.
  MAGANG: [
    ...publicRoutes,
    "/dashboard",
    "/control",
    // Mungkin tidak boleh /accounts, dsb.
  ],
  // ADMIN boleh akses semua routes
  ADMIN: ["*"],
  // USER boleh akses public routes + beberapa routes lainnya
  USER: [
    ...publicRoutes,
    "/dashboard",
    // Tambahkan routes lainnya sesuai kebutuhan
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ambil token (misal 'userAuth') dari cookie.
  // Asumsi: Jika ada token => user "sudah login".
  const userToken = request.cookies.get("userAuth")?.value;

  // Secara default, kita set role = guest (belum login)
  let currentRole: (typeof roles)[number] = "GUEST";

  // -------------------------
  // 1) Jika ada token => validasi token ke API => dapatkan role.
  //    Kalau token tidak valid, redirect ke /auth/signin
  // -------------------------
  if (userToken) {
    try {
      const response = await fetch(
        `https://${HTTPSAPIURL}/api/users/token/validator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`, // contoh Bearer token
          },
        }
      );

      if (!response.ok) {
        // Jika respons dari API error, token invalid => redirect signin
        return NextResponse.redirect(new URL("/auth/signin", request.url));
      }

      const data = await response.json();
      console.log("User data:", data);

      // Asumsi API mengembalikan { role: "MAHASISWA" } dsb
      if (data?.role && roles.includes(data.role.toUpperCase())) {
        currentRole = data.role.toUpperCase() as (typeof roles)[number];
      } else {
        // Kalau role di respons tidak valid, anggap guest / redirect
        console.error("Invalid or unknown role. Fallback to 'GUEST'.");
      }
    } catch (error) {
      console.error("Error validating token:", error);
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }
  }

  // -------------------------
  // 2) Jika user SUDAH login dan mencoba mengakses halaman auth tertentu,
  //    redirect ke /dashboard.
  //    Halaman yang dicegah: /auth/signin, /auth/forgot-password, /reset-password
  // -------------------------
  if (
    userToken &&
    (
      pathname.startsWith("/auth/signin") ||
      pathname.startsWith("/auth/signup") ||
      pathname.startsWith("/auth/forgot-password") ||
      pathname.startsWith("/reset-password")
    )
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // -------------------------
  // 3) Cek apakah route yang diakses user termasuk dalam allowedRoutesByRole
  //    untuk role-nya saat ini.
  // -------------------------
  const allowedRoutes = allowedRoutesByRole[currentRole] || [];

  // Jika route tidak diizinkan, redirect ke halaman utama atau halaman lain sesuai kebutuhan
  if (!allowedRoutes.includes(pathname) && !allowedRoutes.includes("*")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // -------------------------
  // 4) Jika semua lolos, silakan lanjut ke halaman yang dituju
  // -------------------------
  return NextResponse.next();
}

// -------------------------
// 5) Konfigurasi rute mana saja yang akan dipantau oleh middleware
// -------------------------
export const config = {
  matcher: [
    "/",
    "/product",
    "/contact",
    "/auth/:path*", // mencakup /auth/signin, /auth/forgot-password, dll.
    "/dashboard",
    "/accounts",
    "/control",
    "/configurations",
    "/reset-password",
    // Tambahkan rute lain yang ingin Anda proteksi oleh middleware
  ],
};