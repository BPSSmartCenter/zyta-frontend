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
  lastReading: { value: number; timestamp: string } | null;
};

export async function getMeterDashboard(deviceId: string) {
  const url = `/devices/${encodeURIComponent(deviceId)}/dashboard`;
  const { data } = await api.get<{ ok: boolean; data: MeterDashboard }>(url);
  return data.data;
}
