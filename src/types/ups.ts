export interface UpsDevice {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsLog {
  id: string;
  deviceId: string;
  cell1Voltage: number;
  cell2Voltage: number;
  cell3Voltage: number;
  totalVoltage: number;
  voltageIn: number;
  voltage12v: number;
  current12v: number;
  voltage5v: number;
  current5v: number;
  temperatures: {
    system?: number;
    mosfet?: number;
    ambient?: number;
    cell1?: number;
    cell2?: number;
    cell3?: number;
    [key: string]: number | undefined;
  };
  createdAt: string;
}

export interface UpsWebSocketData {
  id: string;
  name: string;
  location: string | null;
  lastUpdate: string | null;
  data: UpsLog | null;
  logs: UpsLog[];
  chart: UpsLog[];
}
