export interface ApplianceInfo {
  id: string;
  name: string;
  category: string;
  usagePattern: string;
  nominalWatt: number;
  nominalVA: number;
  nominalVAR: number;
  expectedPf: number;
  color: string;
  icon: string;
  description: string;
}

export interface ApplianceMetric {
  id: string;
  name: string;
  category: string;
  usagePattern: string;
  color: string;
  icon: string;
  signatureP: number;
  signatureS: number;
  signatureQ: number;
  totalKwh: number;
  percentage: number;
  peakWatt: number;
  activeCount: number;
}

export interface DisaggregatedPoint {
  label: string;
  periodKey?: string;
  durationHours?: number;
  sampleCount?: number;
  maxPower?: number;
  timestamp?: string | null;
  actualPower: number;
  actualVoltage: number;
  actualCurrent: number;
  apparentPower: number;
  reactivePower: number;
  pf: number;
  usageKwh: number;
  powers: Record<string, number>;
}

export interface DisaggregationResult {
  metadata: {
    deviceId: string;
    granularity: "minutely" | "hourly" | "daily" | "monthly" | "yearly";
    timeframeLabel: string;
    totalPoints: number;
    totalEnergyKwh: number;
    totalEnergyMeasuredKwh: number;
    estimatedCostIdr: number;
    reconstructionAccuracyPct: number;
    rmse: number;
    generatedAt: string;
    unidentifiedKwh?: number;
    analysisMode?: "minute-estimates" | "energy-summary";
  };
  applianceBreakdown: ApplianceMetric[];
  points: DisaggregatedPoint[];
}

export interface RealtimeTelemetry {
  powerWatt: number;
  voltageVolt: number;
  currentAmpere: number;
  powerFactor: number;
  frequencyHz: number;
  apparentPowerVA: number;
  reactivePowerVAR: number;
  energyKwh?: number;
}

export interface ApplianceRealtimeState {
  id: string;
  name: string;
  estimatedWatt: number;
  isActive: boolean;
  confidence: number;
  state?: "estimated" | "uncertain" | "off" | "unknown" | "stale";
  color: string;
  icon: string;
}

export interface RealtimeAnalysis {
  status: "ONLINE" | "OFFLINE";
  inference?: {
    method: string;
    calibrated: boolean;
  };
  timestamp: string;
  telemetry: RealtimeTelemetry;
  estimatedAppliances: ApplianceRealtimeState[];
}

export interface RawLogItem {
  id?: string;
  deviceId?: string;
  createdAt: string;
  power?: number;
  voltage?: number;
  current?: number;
  energy?: number;
  pf?: number;
  frequency?: number;
}

export interface RawLogsResponse {
  points: RawLogItem[];
  count?: number;
  coverage: {
    limit: number;
    oldest: string | null;
    newest: string | null;
  };
  requestedWindow?: {
    date: string | null;
    hour: string | null;
    minute: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  matchesWindow?: boolean;
  historicalQuerySupported?: boolean;
}

