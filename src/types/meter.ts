export type MeterOption = {
  id: string;
  name: string;
  siteName: string;
  description?: string;
  location?: string;
  status: "online" | "warning" | "offline";
  lastReading: string;
  lastSync: string;
  todayKwh: number;
  isOverall?: boolean;
  includedMeters?: number;
  phase?: string;
  chartData?: number[];
  billingMonth?: string;
  billingStatus?: "pending" | "paid";
  billingOutstandingMonth?: string;
  billingDueDate?: string;
  trendDirection?: "up" | "down";
};

