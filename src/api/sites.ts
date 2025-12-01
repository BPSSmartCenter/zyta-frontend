// src/api/sites.ts
import { api } from "./axios";
import type { SiteBillingAccess } from "../types/billing";

export async function listSites() {
  const { data } = await api.get("/sites");
  return data; // ถ้า admin ได้ทั้งหมด, role อื่นได้เฉพาะของตัวเอง
}

export async function getSiteInventory(siteId: string) {
  // Primary route (plural)
  try {
    const { data } = await api.get(`/sites/${encodeURIComponent(siteId)}/inventory`);
    return data;
  } catch (e) {
    // Fallback to singular route if backend uses /site/:id/inventory
    const { data } = await api.get(`/site/${encodeURIComponent(siteId)}/inventory`);
    return data;
  }
}

export async function getSiteDetails(siteIdOrCode: string) {
  const { data } = await api.get(`/site/${encodeURIComponent(siteIdOrCode)}/details`);
  return data;
}

export type RegisterSiteInput = {
  name: string;
  code?: string;
  lat?: number;
  lng?: number;
  zipcode?: string;
  addressProvince?: string;
  addressDistrict?: string;
  addressSubDistrict?: string;
  addressLine?: string;
};

export async function registerSite(input: RegisterSiteInput) {
  const payload: any = {
    name: input.name,
  };
  if (input.code) payload.code = input.code;
  if (typeof input.lat === "number") payload.lat = input.lat;
  if (typeof input.lng === "number") payload.lng = input.lng;
  if (input.zipcode) payload.zipcode = input.zipcode;
  if (input.addressProvince) payload.addressProvince = input.addressProvince;
  if (input.addressDistrict) payload.addressDistrict = input.addressDistrict;
  if (input.addressSubDistrict)
    payload.addressSubDistrict = input.addressSubDistrict;
  if (input.addressLine) payload.addressLine = input.addressLine;

  const { data } = await api.post("/site/register", payload);
  return data;
}

export type UpdateSiteInput = {
  name?: string;
  code?: string;
  lat?: number;
  lng?: number;
  zipcode?: string;
  addressProvince?: string;
  addressDistrict?: string;
  addressSubDistrict?: string;
  addressLine?: string;
};

function normalizeSitePayload(input: UpdateSiteInput) {
  const payload: any = {};
  if (typeof input.name === "string" && input.name.trim()) {
    payload.name = input.name.trim();
  }
  if (typeof input.code === "string" && input.code.trim()) {
    payload.code = input.code.trim();
  }
  if (typeof input.lat === "number" && Number.isFinite(input.lat)) {
    payload.lat = input.lat;
  }
  if (typeof input.lng === "number" && Number.isFinite(input.lng)) {
    payload.lng = input.lng;
  }
  if (input.zipcode) payload.zipcode = input.zipcode;
  if (input.addressProvince) payload.addressProvince = input.addressProvince;
  if (input.addressDistrict) payload.addressDistrict = input.addressDistrict;
  if (input.addressSubDistrict)
    payload.addressSubDistrict = input.addressSubDistrict;
  if (input.addressLine) payload.addressLine = input.addressLine;
  return payload;
}

export async function updateSite(siteId: string, input: UpdateSiteInput) {
  const payload = normalizeSitePayload(input);
  const { data } = await api.put(`/site/${encodeURIComponent(siteId)}`, payload);
  return data;
}

export async function deleteSite(siteId: string) {
  const { data } = await api.delete(`/site/${encodeURIComponent(siteId)}`);
  return data;
}

export async function getSiteBillingAccess(siteIdOrCode: string): Promise<SiteBillingAccess> {
  const { data } = await api.get<{ ok: boolean; data: SiteBillingAccess }>(
    `/site/${encodeURIComponent(siteIdOrCode)}/billing-access`
  );
  return data.data;
}

export async function updateSiteBillingAccess(
  siteIdOrCode: string,
  payload: Partial<SiteBillingAccess>
): Promise<SiteBillingAccess> {
  const { data } = await api.patch<{ ok: boolean; data: SiteBillingAccess }>(
    `/site/${encodeURIComponent(siteIdOrCode)}/billing-access`,
    payload
  );
  return data.data;
}
