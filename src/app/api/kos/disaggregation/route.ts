import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL, KOS_DEVICE_ID } from "@/lib/alin/apiConfig";
import { disaggregateTimeSeries } from "@/lib/alin/alinDisaggregation";
import { jakartaDate } from "@/lib/alin/historyData";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const granularity = (searchParams.get("granularity") || "hourly") as
      | "minutely"
      | "hourly"
      | "daily"
      | "monthly"
      | "yearly";
    const date = searchParams.get("date") || jakartaDate();
    const hour = searchParams.get("hour");
    const year = searchParams.get("year") || date.slice(0, 4);
    const month = searchParams.get("month") || date.slice(5, 7);

    // 1. Try remote dedicated ALIN endpoint first
    try {
      const remoteAlinUrl = new URL(`${API_BASE_URL}/api/alin/disaggregation`);
      remoteAlinUrl.searchParams.set("deviceId", KOS_DEVICE_ID);
      remoteAlinUrl.searchParams.set("granularity", granularity);
      remoteAlinUrl.searchParams.set("date", date);
      if (hour !== null && hour !== "") remoteAlinUrl.searchParams.set("hour", hour);
      remoteAlinUrl.searchParams.set("year", year);
      remoteAlinUrl.searchParams.set("month", month);

      const alinRes = await fetch(remoteAlinUrl.toString(), {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      if (alinRes.ok) {
        const alinData = await alinRes.json();
        if (alinData?.points && Array.isArray(alinData.points)) {
          return NextResponse.json(alinData);
        }
      }
    } catch {
      // Remote ALIN endpoint not responding or not mounted; fall back to local solver
    }

    // 2. Fall back to PZEM raw history endpoints + local ALIN solveNMF
    let endpoint = "";
    let stepDurationHours = 1;

    if (granularity === "minutely") {
      endpoint = `minutely-usage?date=${date}${hour !== null && hour !== "" ? `&hour=${hour}` : ""}`;
      stepDurationHours = 1 / 60;
    } else if (granularity === "hourly") {
      endpoint = `hourly-usage?date=${date}`;
      stepDurationHours = 1;
    } else if (granularity === "daily") {
      endpoint = `daily-usage?year=${year}&month=${month}`;
      stepDurationHours = 24;
    } else if (granularity === "monthly") {
      endpoint = `monthly-usage?year=${year}`;
      stepDurationHours = 24 * 30;
    } else {
      endpoint = "yearly-usage";
      stepDurationHours = 24 * 365;
    }

    const pzemRes = await fetch(
      `${API_BASE_URL}/api/device/pzem/${KOS_DEVICE_ID}/${endpoint}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!pzemRes.ok) {
      throw new Error(`Server sensor mengembalikan HTTP ${pzemRes.status}`);
    }

    const rawData = await pzemRes.json();
    let series: any[] = [];

    if (granularity === "minutely") {
      series = rawData?.minutes || rawData?.points || [];
    } else if (granularity === "hourly") {
      series = rawData?.hours || rawData?.points || [];
    } else if (granularity === "daily") {
      series = rawData?.days || rawData?.points || [];
    } else if (granularity === "monthly") {
      series = rawData?.months || rawData?.points || [];
    } else {
      series = rawData?.years || rawData?.points || [];
    }

    const result = disaggregateTimeSeries(series, stepDurationHours, granularity);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Gagal memproses disagregasi ALIN" },
      { status: 500 },
    );
  }
}

