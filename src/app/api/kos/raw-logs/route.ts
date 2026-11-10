import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL, KOS_DEVICE_ID } from "@/lib/alin/apiConfig";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || request.headers.get("x-kos-date");
    const hour = searchParams.get("hour") || request.headers.get("x-kos-hour");
    const minute = searchParams.get("minute") || request.headers.get("x-kos-minute");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const limit = searchParams.get("limit") || request.headers.get("x-kos-limit") || "1000";

    const backendParams = new URLSearchParams();
    if (limit) backendParams.set("limit", limit);

    let startIso: string | null = null;
    let endIso: string | null = null;

    if (startDateParam) {
      const d = new Date(startDateParam);
      if (!isNaN(d.getTime())) startIso = d.toISOString();
    }
    if (endDateParam) {
      const d = new Date(endDateParam);
      if (!isNaN(d.getTime())) endIso = d.toISOString();
    }

    if (date && (!startIso || !endIso)) {
      const dateStr = date.trim();
      const hasHour = hour !== null && hour !== "" && hour !== "all";
      const hasMinute = minute !== null && minute !== "" && minute !== "all";

      if (hasHour && hasMinute) {
        const h = String(hour).padStart(2, "0");
        const m = String(minute).padStart(2, "0");
        startIso = startIso || new Date(`${dateStr}T${h}:${m}:00+07:00`).toISOString();
        endIso = endIso || new Date(`${dateStr}T${h}:${m}:59.999+07:00`).toISOString();
      } else if (hasHour) {
        const h = String(hour).padStart(2, "0");
        startIso = startIso || new Date(`${dateStr}T${h}:00:00+07:00`).toISOString();
        endIso = endIso || new Date(`${dateStr}T${h}:59:59.999+07:00`).toISOString();
      } else {
        startIso = startIso || new Date(`${dateStr}T00:00:00+07:00`).toISOString();
        endIso = endIso || new Date(`${dateStr}T23:59:59.999+07:00`).toISOString();
      }
    }

    if (startIso) backendParams.set("startDate", startIso);
    if (endIso) backendParams.set("endDate", endIso);
    if (date) backendParams.set("date", date);
    if (hour != null) backendParams.set("hour", hour);
    if (minute != null) backendParams.set("minute", minute);

    const queryStr = backendParams.toString();
    const targetUrl = `${API_BASE_URL}/api/device/pzem/${KOS_DEVICE_ID}/logs?${queryStr}`;

    const res = await fetch(targetUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      throw new Error(`Server sensor HTTP ${res.status}`);
    }

    const raw = await res.json();
    if (!Array.isArray(raw)) throw new Error("Format log tidak valid");

    const points = raw
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .filter(
        (r) =>
          typeof r.createdAt === "string" &&
          Number.isFinite(Date.parse(r.createdAt)),
      )
      .sort(
        (a, b) =>
          Date.parse(String(a.createdAt)) - Date.parse(String(b.createdAt)),
      );

    const startMs = startIso ? Date.parse(startIso) : null;
    const endMs = endIso ? Date.parse(endIso) : null;

    const matchesWindow =
      startMs != null && endMs != null
        ? points.some(
            (p) =>
              Date.parse(String(p.createdAt)) >= startMs - 2000 &&
              Date.parse(String(p.createdAt)) <= endMs + 2000,
          )
        : true;

    return NextResponse.json({
      count: points.length,
      coverage: {
        limit: Number(limit) || 1000,
        oldest: points[0]?.createdAt ?? null,
        newest: points[points.length - 1]?.createdAt ?? null,
      },
      requestedWindow: {
        date,
        hour,
        minute,
        startDate: startIso,
        endDate: endIso,
      },
      matchesWindow,
      points,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Tidak dapat memuat log sensor" },
      { status: 500 },
    );
  }
}

