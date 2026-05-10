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
    previousMonthKwh?: number;
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
      ftRate?: number;
      co2Factor?: number;
      treeFactor?: number;
      configuredBaseOnPeak?: number | null;
      configuredBaseOffPeak?: number | null;
      configuredDiscountRate?: number | null;
      configuredFtRate?: number | null;
      configuredCo2Factor?: number | null;
      configuredTreeFactor?: number | null;
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

export async function getSiteMetersDashboard(
  siteId: string,
  params?: MeterDashboardParams & { tag?: string }
) {
  const query = new URLSearchParams();
  if (params?.startDate) query.set("startDate", params.startDate);
  if (params?.endDate) query.set("endDate", params.endDate);
  if (params?.tag) query.set("tag", params.tag);
  const url = `/sites/${encodeURIComponent(siteId)}/meters/dashboard${
    query.size ? `?${query.toString()}` : ""
  }`;
  const { data } = await api.get<{ ok: boolean; data: MeterDashboard }>(url);
  return data.data;
}
