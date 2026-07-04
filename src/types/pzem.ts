export interface PzemDevice {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  shouldReset: boolean;
  lastResetAt: string | null;
}

export interface PzemData {
  id: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  frequency: number;
  pf: number;
  createdAt: string;
}

export interface PzemRealtimeResponse {
  latest: PzemData;
  status: "ONLINE" | "OFFLINE";
}

export interface PzemLog {
  id: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  frequency: number;
  pf: number;
  createdAt: string;
}

export interface PzemWebSocketData {
  id: string;
  name: string;
  location: string;
  lastUpdate: string;
  data: {
    voltage: number;
    current: number;
    power: number;
    energy: number;
    frequency: number;
    pf: number;
  };
}

// === Tipe Baru: kWh Usage ===

export interface PzemDailyUsageItem {
  date: string;
  dateLabel: string;
  usageKwh: number;
  energyKwh: number;
  isResetDay: boolean;
}

export interface PzemDailyUsageResponse {
  year: number;
  month: number;
  totalKwh: number;
  estimatedCost: number;
  plnRate: number;
  days: PzemDailyUsageItem[];
}

export interface PzemMonthlyUsageItem {
  month: number;
  label: string;
  usageKwh: number;
  hasResetDay: boolean;
  daysCount: number;
}

export interface PzemMonthlyUsageResponse {
  year: number;
  totalKwh: number;
  estimatedCost: number;
  plnRate: number;
  months: PzemMonthlyUsageItem[];
}

export interface PzemYearlyUsageItem {
  year: number;
  usageKwh: number;
  hasResetDay: boolean;
}

export interface PzemYearlyUsageResponse {
  plnRate: number;
  years: PzemYearlyUsageItem[];
}

// === Tipe Baru: Power Outage Log (Matlis) ===

export interface PowerOutageLogItem {
  id: string;
  deviceId: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  durationFormatted: string | null;
  lastVoltage: number;
  status: "BERLANGSUNG" | "SELESAI";
  createdAt: string;
}

export interface PowerOutageLogsResponse {
  total: number;
  page: number;
  limit: number;
  logs: PowerOutageLogItem[];
}

// === Tipe Baru: Server Battery Monitor ===

export interface ServerBatteryInfo {
  hasBattery: boolean;
  message?: string;
  percent?: number;
  isCharging?: boolean;
  acConnected?: boolean;
  timeRemaining?: number; // menit
  voltage?: number;
  type?: string;
  manufacturer?: string;
  model?: string;
  cpuTempMax?: number | null;
  memUsedPercent?: number | null;
  fetchedAt?: string;
}
