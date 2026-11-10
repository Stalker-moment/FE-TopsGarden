// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const HTTPSAPIURL = process.env.NEXT_PUBLIC_HTTPS_API_URL || "gardenapi.tierkun.my.id";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("userAuth")?.value; // Ambil token dari cookies
    console.log("Token:", token);

    console.log(HTTPSAPIURL)

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`https://${HTTPSAPIURL}/api/users/account`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ message: "Failed to fetch user data" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data.contact, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}