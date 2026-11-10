import { NextResponse } from "next/server";
import { API_BASE_URL, KOS_DEVICE_ID } from "@/lib/alin/apiConfig";
import { jakartaDate } from "@/lib/alin/historyData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const today = jakartaDate();
    const [year, month] = today.split("-");

    const res = await fetch(
      `${API_BASE_URL}/api/device/pzem/${KOS_DEVICE_ID}/daily-usage?year=${year}&month=${month}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!res.ok) {
      return NextResponse.json({ dates: [today] });
    }

    const data = await res.json();
    const days: any[] = data.days || [];

    const dates = days
      .filter((d) => Number(d.usageKwh) > 0 || d.date?.startsWith(today))
      .map((d) => {
        if (d.date) {
          const dt = new Date(d.date);
          if (!isNaN(dt.getTime())) {
            return dt.toISOString().slice(0, 10);
          }
        }
        return null;
      })
      .filter((d): d is string => typeof d === "string");

    if (!dates.includes(today)) {
      dates.unshift(today);
    }

    return NextResponse.json({ dates: Array.from(new Set(dates)) });
  } catch {
    return NextResponse.json({ dates: [jakartaDate()] });
  }
}

