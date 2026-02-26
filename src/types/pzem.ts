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
