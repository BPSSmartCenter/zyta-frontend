import { api } from "./axios";

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

export async function getBillingOverview(siteId: string) {
  const url = `/site/${encodeURIComponent(siteId)}/billing/overview`;
  const { data } = await api.get<{ ok: boolean; data: BillingOverviewPayload }>(url);
  return data.data;
}

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
  form?: Record<string, any>;
};

export async function createBill(siteId: string, payload: CreateBillPayload) {
  const url = `/site/${encodeURIComponent(siteId)}/billing/bills`;
  const { data } = await api.post<{ ok: boolean; bill: { billId: string } }>(url, payload);
  return data.bill;
}

export async function getBillDetailApi(billId: string) {
  const { data } = await api.get<{ ok: boolean; data: BillDetailPayload }>(
    `/billing/bills/${encodeURIComponent(billId)}`
  );
  return data.data;
}

export async function uploadBillPdf(billId: string, pdfBase64: string) {
  const { data } = await api.post(`/billing/bills/${encodeURIComponent(billId)}/pdf`, {
    pdfBase64,
  });
  return data;
}

export async function downloadBillPdf(billId: string) {
  const response = await api.get(`/billing/bills/${encodeURIComponent(billId)}/pdf`, {
    responseType: "blob",
  });
  return response.data as Blob;
}

export async function uploadBillExcel(billId: string, excelBase64: string) {
  const { data } = await api.post(`/billing/bills/${encodeURIComponent(billId)}/excel`, {
    excelBase64,
  });
  return data;
}

export async function downloadBillExcel(billId: string) {
  const response = await api.get(`/billing/bills/${encodeURIComponent(billId)}/excel`, {
    responseType: "blob",
  });
  return response.data as Blob;
}

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
  // report customization
  leftLogoDataUrl?: string | null;
  rightLogoDataUrl?: string | null;
  leftLogoVisible?: boolean;
  rightLogoVisible?: boolean;
  lineColor?: string | null;
};

export async function downloadPreviewBillExcel(
  siteId: string,
  payload: PreviewBillExcelPayload
) {
  const response = await api.post(
    `/site/${encodeURIComponent(siteId)}/billing/preview/excel`,
    payload,
    { responseType: "blob" }
  );
  return response.data as Blob;
}

type BillExcelPayload = {
  mode?: "daily" | "monthly";
  dailyDate?: string;
  billingMonth?: number | string;
  billingYear?: number | string;
  utilityCode?: string | null;
  // report customization
  leftLogoDataUrl?: string | null;
  rightLogoDataUrl?: string | null;
  leftLogoVisible?: boolean;
  rightLogoVisible?: boolean;
  lineColor?: string | null;
};

export async function generateBillExcel(billId: string, payload?: BillExcelPayload) {
  const { data } = await api.post(
    `/billing/bills/${encodeURIComponent(billId)}/excel/generate`,
    payload ?? {}
  );
  return data;
}

export async function deleteBill(billId: string) {
  const { data } = await api.delete<{ ok: boolean }>(
    `/billing/bills/${encodeURIComponent(billId)}`
  );
  return data;
}

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

type DailyBillingReadingsParams = { mode: "daily"; date: string };
type MonthlyBillingReadingsParams = { mode: "monthly"; month: number; year: number };
type QuarterBillingReadingsParams = { mode: "quarter"; date: string };

export async function getBillingReadingsData(
  deviceId: string,
  params:
    | DailyBillingReadingsParams
    | MonthlyBillingReadingsParams
    | QuarterBillingReadingsParams
) {
  const query = new URLSearchParams();
  query.set("mode", params.mode);
  if (params.mode === "daily") {
    query.set("date", params.date);
  } else if (params.mode === "monthly") {
    query.set("month", String(params.month));
    query.set("year", String(params.year));
  } else {
    query.set("date", params.date);
  }
  const { data } = await api.get<{ ok: boolean; data: BillingReadingsPayload }>(
    `/devices/${encodeURIComponent(deviceId)}/billing-readings?${query.toString()}`
  );
  return data.data;
}

export async function getSiteBillingReadingsData(
  siteId: string,
  params: (DailyBillingReadingsParams | MonthlyBillingReadingsParams | QuarterBillingReadingsParams) & {
    tag?: string;
  }
) {
  const query = new URLSearchParams();
  query.set("mode", params.mode);
  if (params.mode === "daily") {
    query.set("date", params.date);
  } else if (params.mode === "monthly") {
    query.set("month", String(params.month));
    query.set("year", String(params.year));
  } else {
    query.set("date", params.date);
  }
  if (params.tag) query.set("tag", String(params.tag));
  const { data } = await api.get<{ ok: boolean; data: BillingReadingsPayload }>(
    `/site/${encodeURIComponent(siteId)}/billing-readings?${query.toString()}`
  );
  return data.data;
}
