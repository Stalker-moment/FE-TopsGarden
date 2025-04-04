// src/app/api/forgot/reset/route.ts
import { NextRequest, NextResponse } from "next/server";

const HTTPS_API_URL = process.env.NEXT_PUBLIC_HTTPS_API_URL;
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(","); // Define your allowed origins in environment variables

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");

    if (!origin || !ALLOWED_ORIGIN?.includes(origin)) {
      return NextResponse.json(
        { message: "Forbidden: Access is denied" },
        { status: 403 },
      );
    }

    // Ambil data body dengan req.json()
    const { password, token } = await req.json();

    if (!password) {
      return NextResponse.json(
        { message: "password is required" },
        { status: 400 },
      );
    }

    if (!token) {
      return NextResponse.json(
        { message: "Token is required" },
        { status: 400 },
      );
    }

    // Kirim request ke API eksternal
    const response = await fetch(`https://${HTTPS_API_URL}/api/users/forgot/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password, token }),
    });

    // Periksa apakah request ke API eksternal berhasil
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { message: errorData.message || "Failed to reset password" },
        { status: response.status },
      );
    }

    // Ambil data response dari API eksternal
    const data = await response.json();

    // Kembalikan response API ke frontend
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Internal Server Error", error: errorMessage },
      { status: 500 },
    );
  }
}
