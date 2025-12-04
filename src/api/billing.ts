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
  rows: Array<{
    timestamp: string;
    energyProduction: number;
    energyOnPeak: number;
    energyOffPeak: number;
    energyPurchased: number;
  }>;
  chartPoints: Array<{ label: string; purchased: number; onPeak: number }>;
  documentUrl?: string | null;
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

export async function deleteBill(billId: string) {
  const { data } = await api.delete<{ ok: boolean }>(
    `/billing/bills/${encodeURIComponent(billId)}`
  );
  return data;
}
