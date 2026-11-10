import { NextResponse } from "next/server";
import { API_BASE_URL, KOS_DEVICE_ID } from "@/lib/alin/apiConfig";
import { analyzeRealtimeLoad } from "@/lib/alin/alinDisaggregation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch latest PZEM log
    const res = await fetch(
      `${API_BASE_URL}/api/device/pzem/${KOS_DEVICE_ID}/logs?limit=1`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      },
    );

    if (!res.ok) {
      throw new Error(`Sensor server HTTP ${res.status}`);
    }

    const logs = await res.json();
    const latestLog = Array.isArray(logs) ? logs[0] : logs;

    const analysis = analyzeRealtimeLoad(latestLog);
    return NextResponse.json(analysis);
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "OFFLINE",
        timestamp: new Date().toISOString(),
        telemetry: {
          powerWatt: 0,
          voltageVolt: 0,
          currentAmpere: 0,
          powerFactor: 0,
          frequencyHz: 50,
          apparentPowerVA: 0,
          reactivePowerVAR: 0,
        },
        estimatedAppliances: [],
        error: error?.message,
      },
      { status: 200 },
    );
  }
}

