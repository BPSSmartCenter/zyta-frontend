// src/features/billing/billingTypes.ts

export type BillingMonitorRow = {
  id: string;
  meter: string;
  meterId?: string;
  reading?: string;
  readingOnPeakKwh?: number;
  readingOffPeakKwh?: number;
  voltage?: number | null;
  timestamp?: string;
  arlTime?: string;
  site?: string;
  status?: "sync" | "offline";
  user?: string;
  usageKwh?: number;
  billingCost?: number;
  billingStatus?: "paid" | "due";
  documentUrl?: string | null;
  issuedAt?: string;
  billingPeriodMonth?: number;
  billingPeriodYear?: number;
};

export type MonthlyListRow = {
  id: string;
  month: string;
  cost: number;
  status: "paid" | "due";
  billId?: string | null;
  usageTotalKwh: number;
  updatedAt: string;
};

export type BillingOverviewPayload = {
  cards: {
    totalUsageKwh: number;
    billAmountThisMonth: number;
    monthlyTrendPercent: number;
  };
  usageRows: BillingMonitorRow[];
  billingRows: BillingMonitorRow[];
  historyItems: string[];
  monthlyList: MonthlyListRow[];
  monthlyChart: {
    categories: string[];
    series: Array<{ name: string; data: number[] }>;
  };
};

export type CreateBillPayload = {
  meterId: string;
  meterLabel?: string;
  meterSerial?: string;
  billingMonth: string;
  billingYear: string;
  ereOnPeak: string;
  ereOffPeak: string;
  baseOnPeak: string;
  baseOffPeak: string;
  notes?: string;
  brandingLogoDataUrl?: string;
};

export type BillDetailPayload = {
  id: string;
  status: string;
  site: { name?: string; address?: string; brandingLogoUrl?: string | null };
  meter: { id?: string; name?: string; serial?: string | null };
  period: { month: number; year: number; label: string };
  totals: { totalKwh: number; onPeakKwh: number; offPeakKwh: number };
  cost: { total: number; onPeak: number; offPeak: number };
  summary?: {
    financialSaving: number;
    ftSaving: number;
    co2Reduction: number;
    treeSaving: number;
    baseOnPeak: number;
    baseOffPeak: number;
    discountRate: number;
    ftRate: number;
    co2Factor: number;
    treeFactor: number;
  };
  rows: Array<{
    label?: string;
    timestamp: string;
    energyProduction: number;
    energyOnPeak: number;
    energyOffPeak: number;
    energyPurchased: number;
  }>;
  chartPoints: Array<{ label: string; purchased: number; onPeak: number }>;
  documentUrl?: string | null;
  documentExcelUrl?: string | null;
  documents?: Partial<Record<"pdf" | "xlsx", string>>;
  form?: Record<string, unknown>;
};

export type PreviewBillExcelPayload = {
  meterId: string;
  billingMode?: "daily" | "monthly";
  dailyDate?: string;
  billingMonth?: number | string;
  billingYear?: number | string;
  baseOnPeak?: string;
  baseOffPeak?: string;
  billingDiscountRate?: string | number;
  billingFtRate?: string | number;
  billingCo2Factor?: string | number;
  billingTreeFactor?: string | number;
  brandingLogoDataUrl?: string | null;
  customLogoDataUrl?: string | null;
  utilityCode?: string | null;
  leftLogoDataUrl?: string | null;
  rightLogoDataUrl?: string | null;
  leftLogoVisible?: boolean;
  rightLogoVisible?: boolean;
  lineColor?: string | null;
};

export type BillExcelPayload = {
  mode?: "daily" | "monthly";
  dailyDate?: string;
  billingMonth?: number | string;
  billingYear?: number | string;
  utilityCode?: string | null;
  leftLogoDataUrl?: string | null;
  rightLogoDataUrl?: string | null;
  leftLogoVisible?: boolean;
  rightLogoVisible?: boolean;
  lineColor?: string | null;
};

export type BillingReadingsRow = {
  label: string;
  timestamp: string;
  onPeak: number;
  offPeak: number;
  total: number;
};

export type BillingReadingsPayload = {
  mode: "daily" | "monthly" | "quarter";
  rows: BillingReadingsRow[];
  range: { start: string; end: string };
};

export type DailyBillingReadingsParams = { mode: "daily"; date: string };
export type MonthlyBillingReadingsParams = {
  mode: "monthly";
  month: number;
  year: number;
};
export type QuarterBillingReadingsParams = { mode: "quarter"; date: string };

export type BillingReadingsParams =
  | DailyBillingReadingsParams
  | MonthlyBillingReadingsParams
  | QuarterBillingReadingsParams;
