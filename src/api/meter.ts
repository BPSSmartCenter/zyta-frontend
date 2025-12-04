import { api } from "./axios";

export type MeterDashboard = {
  device: {
    id: string;
    name: string;
    siteName: string;
    description?: string | null;
    status: "online" | "offline" | "maintenance";
    location?: string | null;
    billingStatus?: "pending" | "paid";
    serial?: string | null;
  };
  totals: {
    energyUsageKwh: number;
    onPeakKwh: number;
    offPeakKwh: number;
    todayKwh: number;
    todayOnPeakKwh?: number;
    todayOffPeakKwh?: number;
  };
  realtime?: {
    totalKwh: number;
    onPeakKwh: number;
    offPeakKwh: number;
    voltage?: number | null;
    timestamp?: string | null;
  };
  cost: {
    totalCost: number;
    onPeakCost: number;
    offPeakCost: number;
    rates: {
      baseOnPeak: number;
      baseOffPeak: number;
      discountedOnPeak: number;
      discountedOffPeak: number;
      discountRate: number;
    };
  };
  chart: {
    categories: string[];
    current: number[];
    previous: number[];
  };
  billingHistory: Array<{
    id: string;
    monthYear: string;
    energy: number;
    cost: number;
    status: string;
    documentUrl?: string | null;
  }>;
  lastReading: {
    value?: number;
    onPeakKwh?: number;
    offPeakKwh?: number;
    voltage?: number | null;
    timestamp: string;
  } | null;
  range?: {
    startDate?: string;
    endDate?: string;
  };
};

type MeterDashboardParams = {
  startDate?: string;
  endDate?: string;
};

export async function getMeterDashboard(
  deviceId: string,
  params?: MeterDashboardParams
) {
  const query = new URLSearchParams();
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);
  const url = `/devices/${encodeURIComponent(deviceId)}/dashboard${
    query.size ? `?${query.toString()}` : ""
  }`;
  const { data } = await api.get<{ ok: boolean; data: MeterDashboard }>(url);
  return data.data;
}

export type MeterSummary = {
  range: { start: string; end: string };
  totals: { energyProductionKwh: number; energyOnPeakKwh: number; energyOffPeakKwh: number };
  hours: Array<{
    hour: string;
    energyProductionKwh: number;
    energyOnPeakKwh: number;
    energyOffPeakKwh: number;
  }>;
};

export async function getMeterSummary(
  deviceId: string,
  params?: { startDate?: string; endDate?: string; month?: string; year?: string }
) {
  const query = new URLSearchParams();
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);
  if (params?.month) query.set("month", params.month);
  if (params?.year) query.set("year", params.year);
  const url = `/devices/${encodeURIComponent(deviceId)}/summary${
    query.size ? `?${query.toString()}` : ""
  }`;
  const { data } = await api.get<{ ok: boolean; data: MeterSummary }>(url);
  return data.data;
}
