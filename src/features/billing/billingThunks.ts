// src/features/billing/billingThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { request, requestBlob } from "../../lib/http";
import type {
  BillDetailPayload,
  BillExcelPayload,
  BillingOverviewPayload,
  BillingReadingsParams,
  BillingReadingsPayload,
  CreateBillPayload,
  PreviewBillExcelPayload,
} from "./billingTypes";

function readingsParamsToQuery(
  params: BillingReadingsParams
): Record<string, string> {
  const q: Record<string, string> = { mode: params.mode };
  if (params.mode === "daily") q.date = params.date;
  else if (params.mode === "monthly") {
    q.month = String(params.month);
    q.year = String(params.year);
  } else q.date = params.date;
  return q;
}

// ---------------------------------------------------------------------------
// Stateful (cached) — overview, bill detail, readings
// ---------------------------------------------------------------------------

export const fetchBillingOverview = createAsyncThunk<
  { siteId: string; data: BillingOverviewPayload },
  string
>("billing/fetchOverview", async (siteId) => {
  const data = await request<BillingOverviewPayload>(
    `/billing/sites/${encodeURIComponent(siteId)}/dashboard`
  );
  return { siteId, data };
});

export const fetchBillDetail = createAsyncThunk<BillDetailPayload, string>(
  "billing/fetchBillDetail",
  async (billId) => {
    return request<BillDetailPayload>(
      `/billing/bills/${encodeURIComponent(billId)}`
    );
  }
);

export const fetchDeviceBillingReadings = createAsyncThunk<
  BillingReadingsPayload,
  { deviceId: string; params: BillingReadingsParams }
>("billing/fetchDeviceReadings", async ({ deviceId, params }) => {
  return request<BillingReadingsPayload>(
    `/devices/${encodeURIComponent(deviceId)}/billing-readings`,
    { params: readingsParamsToQuery(params) }
  );
});

export const fetchSiteBillingReadings = createAsyncThunk<
  BillingReadingsPayload,
  { siteId: string; params: BillingReadingsParams & { tag?: string } }
>("billing/fetchSiteReadings", async ({ siteId, params }) => {
  const q = readingsParamsToQuery(params);
  if (params.tag) q.tag = params.tag;
  return request<BillingReadingsPayload>(
    `/sites/${encodeURIComponent(siteId)}/billing-readings`,
    { params: q }
  );
});

// ---------------------------------------------------------------------------
// Imperative — mutations + blob downloads (no slice state)
// ---------------------------------------------------------------------------

export const createBill = createAsyncThunk<
  { billId: string },
  { siteId: string; payload: CreateBillPayload }
>("billing/createBill", async ({ siteId, payload }) => {
  return request<{ billId: string }>(
    `/billing/sites/${encodeURIComponent(siteId)}/bills`,
    { method: "POST", json: payload }
  );
});

export const deleteBill = createAsyncThunk<unknown, string>(
  "billing/deleteBill",
  async (billId) => {
    return request<unknown>(`/billing/bills/${encodeURIComponent(billId)}`, {
      method: "DELETE",
    });
  }
);

export const uploadBillPdf = createAsyncThunk<
  unknown,
  { billId: string; pdfBase64: string }
>("billing/uploadBillPdf", async ({ billId, pdfBase64 }) => {
  return request<unknown>(
    `/billing/bills/${encodeURIComponent(billId)}/pdf`,
    { method: "POST", json: { pdfBase64 } }
  );
});

export const uploadBillExcel = createAsyncThunk<
  unknown,
  { billId: string; excelBase64: string }
>("billing/uploadBillExcel", async ({ billId, excelBase64 }) => {
  return request<unknown>(
    `/billing/bills/${encodeURIComponent(billId)}/excel`,
    { method: "POST", json: { excelBase64 } }
  );
});

export const downloadBillPdf = createAsyncThunk<Blob, string>(
  "billing/downloadBillPdf",
  async (billId) => {
    return requestBlob(`/billing/bills/${encodeURIComponent(billId)}/pdf`);
  }
);

export const downloadBillExcel = createAsyncThunk<Blob, string>(
  "billing/downloadBillExcel",
  async (billId) => {
    return requestBlob(`/billing/bills/${encodeURIComponent(billId)}/excel`);
  }
);

export const downloadPreviewBillExcel = createAsyncThunk<
  Blob,
  { siteId: string; payload: PreviewBillExcelPayload }
>("billing/previewExcel", async ({ siteId, payload }) => {
  return requestBlob(
    `/billing/sites/${encodeURIComponent(siteId)}/bills:preview-excel`,
    { method: "POST", json: payload }
  );
});

export const generateBillExcel = createAsyncThunk<
  unknown,
  { billId: string; payload?: BillExcelPayload }
>("billing/generateExcel", async ({ billId, payload }) => {
  return request<unknown>(
    `/billing/bills/${encodeURIComponent(billId)}/excel:generate`,
    { method: "POST", json: payload ?? {} }
  );
});
