
// src/api/sites.ts
import { api, unwrapApiData } from "./axios";
import type { SiteBillingAccess } from "../types/billing";

export type SiteListItem = {
  id?: string;
  code?: string;
  name?: string;
  province_code?: string;
  [key: string]: unknown;
};

export type ListSitesResponse = {
  items?: Array<SiteListItem | null | undefined>;
  [key: string]: unknown;
};

export async function listSites(): Promise<ListSitesResponse> {
  const { data } = await api.get("/sites");
  return unwrapApiData<ListSitesResponse>(data);
}

export async function getSiteInventory(siteId: string) {
  // Primary route (plural)
  try {
    const { data } = await api.get(`/sites/${encodeURIComponent(siteId)}/inventory`);
    return data;
  } catch {
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
  utilityId?: string;
  siteGroupId?: string;
  siteGroupName?: string;
  lat?: number;
  lng?: number;
  zipcode?: string;
  addressProvince?: string;
  addressDistrict?: string;
  addressSubDistrict?: string;
  addressLine?: string;
  brandingLogoDataUrl?: string;
  inverterApiType?: string;
  solaredgeSiteId?: string;
  solaredgeApiKey?: string;
  solisKeyId?: string;
  solisKeySecret?: string;
  solisStationId?: string;
};

export async function registerSite(input: RegisterSiteInput) {
  const payload: Record<string, unknown> = {
    name: input.name,
  };
  if (input.code) payload.code = input.code;
  if (input.utilityId) payload.utilityId = input.utilityId;
  if (input.siteGroupId) payload.siteGroupId = input.siteGroupId;
  if (input.siteGroupName) payload.siteGroupName = input.siteGroupName;
  if (typeof input.lat === "number") payload.lat = input.lat;
  if (typeof input.lng === "number") payload.lng = input.lng;
  if (input.zipcode) payload.zipcode = input.zipcode;
  if (input.addressProvince) payload.addressProvince = input.addressProvince;
  if (input.addressDistrict) payload.addressDistrict = input.addressDistrict;
  if (input.addressSubDistrict)
    payload.addressSubDistrict = input.addressSubDistrict;
  if (input.addressLine) payload.addressLine = input.addressLine;
  if (input.brandingLogoDataUrl) payload.brandingLogoDataUrl = input.brandingLogoDataUrl;
  if (typeof input.inverterApiType === "string") {
    payload.inverterApiType = input.inverterApiType;
  }
  if (typeof input.solaredgeSiteId === "string") {
    payload.solaredgeSiteId = input.solaredgeSiteId.trim();
  }
  if (typeof input.solaredgeApiKey === "string") {
    payload.solaredgeApiKey = input.solaredgeApiKey.trim();
  }
  if (typeof input.solisKeyId === "string") {
    payload.solisKeyId = input.solisKeyId.trim();
  }
  if (typeof input.solisKeySecret === "string") {
    payload.solisKeySecret = input.solisKeySecret.trim();
  }
  if (typeof input.solisStationId === "string") {
    payload.solisStationId = input.solisStationId.trim();
  }

  const { data } = await api.post("/site/register", payload);
  return data;
}

export type UpdateSiteInput = {
  name?: string;
  code?: string;
  utilityId?: string;
  removeUtility?: boolean;
  siteGroupId?: string;
  siteGroupName?: string;
  removeSiteGroup?: boolean;
  lat?: number;
  lng?: number;
  zipcode?: string;
  addressProvince?: string;
  addressDistrict?: string;
  addressSubDistrict?: string;
  addressLine?: string;
  brandingLogoDataUrl?: string;
  removeBrandingLogo?: boolean;
  inverterApiType?: string;
  solaredgeSiteId?: string;
  solaredgeApiKey?: string;
  solisKeyId?: string;
  solisKeySecret?: string;
  solisStationId?: string;
};

function normalizeSitePayload(input: UpdateSiteInput) {
  const payload: Record<string, unknown> = {};
  if (typeof input.name === "string" && input.name.trim()) {
    payload.name = input.name.trim();
  }
  if (typeof input.code === "string" && input.code.trim()) {
    payload.code = input.code.trim();
  }
  if (typeof input.utilityId === "string" && input.utilityId.trim()) {
    payload.utilityId = input.utilityId.trim();
  }
  if (typeof input.removeUtility === "boolean") {
    payload.removeUtility = input.removeUtility;
  }
  if (typeof input.siteGroupId === "string" && input.siteGroupId.trim()) {
    payload.siteGroupId = input.siteGroupId.trim();
  }
  if (typeof input.siteGroupName === "string" && input.siteGroupName.trim()) {
    payload.siteGroupName = input.siteGroupName.trim();
  }
  if (typeof input.removeSiteGroup === "boolean") {
    payload.removeSiteGroup = input.removeSiteGroup;
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
  if (input.brandingLogoDataUrl)
    payload.brandingLogoDataUrl = input.brandingLogoDataUrl;
  if (typeof input.removeBrandingLogo === "boolean")
    payload.removeBrandingLogo = input.removeBrandingLogo;
  if (typeof input.inverterApiType === "string") {
    payload.inverterApiType = input.inverterApiType;
  }
  if (typeof input.solaredgeSiteId === "string") {
    payload.solaredgeSiteId = input.solaredgeSiteId;
  }
  if (typeof input.solaredgeApiKey === "string") {
    payload.solaredgeApiKey = input.solaredgeApiKey;
  }
  if (typeof input.solisKeyId === "string") {
    payload.solisKeyId = input.solisKeyId;
  }
  if (typeof input.solisKeySecret === "string") {
    payload.solisKeySecret = input.solisKeySecret;
  }
  if (typeof input.solisStationId === "string") {
    payload.solisStationId = input.solisStationId;
  }
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
