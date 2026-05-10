// src/features/billing/billingApi.ts
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

export async function getBillingOverview(
  siteId: string
): Promise<BillingOverviewPayload> {
  return request<BillingOverviewPayload>(
    `/billing/sites/${encodeURIComponent(siteId)}/dashboard`
  );
}

export async function createBill(
  siteId: string,
  payload: CreateBillPayload
): Promise<{ billId: string }> {
  return request<{ billId: string }>(
    `/billing/sites/${encodeURIComponent(siteId)}/bills`,
    { method: "POST", json: payload }
  );
}

export async function getBillDetailApi(
  billId: string
): Promise<BillDetailPayload> {
  return request<BillDetailPayload>(
    `/billing/bills/${encodeURIComponent(billId)}`
  );
}

export async function uploadBillPdf(
  billId: string,
  pdfBase64: string
): Promise<unknown> {
  return request<unknown>(
    `/billing/bills/${encodeURIComponent(billId)}/pdf`,
    { method: "POST", json: { pdfBase64 } }
  );
}

export async function downloadBillPdf(billId: string): Promise<Blob> {
  return requestBlob(`/billing/bills/${encodeURIComponent(billId)}/pdf`);
}

export async function uploadBillExcel(
  billId: string,
  excelBase64: string
): Promise<unknown> {
  return request<unknown>(
    `/billing/bills/${encodeURIComponent(billId)}/excel`,
    { method: "POST", json: { excelBase64 } }
  );
}

export async function downloadBillExcel(billId: string): Promise<Blob> {
  return requestBlob(`/billing/bills/${encodeURIComponent(billId)}/excel`);
}

export async function downloadPreviewBillExcel(
  siteId: string,
  payload: PreviewBillExcelPayload
): Promise<Blob> {
  return requestBlob(
    `/billing/sites/${encodeURIComponent(siteId)}/bills:preview-excel`,
    { method: "POST", json: payload }
  );
}

export async function generateBillExcel(
  billId: string,
  payload?: BillExcelPayload
): Promise<unknown> {
  return request<unknown>(
    `/billing/bills/${encodeURIComponent(billId)}/excel:generate`,
    { method: "POST", json: payload ?? {} }
  );
}

export async function deleteBill(billId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(
    `/billing/bills/${encodeURIComponent(billId)}`,
    { method: "DELETE" }
  );
}

export async function getBillingReadingsData(
  deviceId: string,
  params: BillingReadingsParams
): Promise<BillingReadingsPayload> {
  return request<BillingReadingsPayload>(
    `/devices/${encodeURIComponent(deviceId)}/billing-readings`,
    { params: readingsParamsToQuery(params) }
  );
}

export async function getSiteBillingReadingsData(
  siteId: string,
  params: BillingReadingsParams & { tag?: string }
): Promise<BillingReadingsPayload> {
  const q = readingsParamsToQuery(params);
  if (params.tag) q.tag = params.tag;
  return request<BillingReadingsPayload>(
    `/sites/${encodeURIComponent(siteId)}/billing-readings`,
    { params: q }
  );
}
