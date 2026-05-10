// src/features/sites/sitesTypes.ts
import type { SiteBillingAccess } from "../../types/billing";

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

export type UpdateSiteInput = Partial<RegisterSiteInput> & {
  removeUtility?: boolean;
  removeSiteGroup?: boolean;
  removeBrandingLogo?: boolean;
};

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

export type { SiteBillingAccess };

function trimString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function buildRegisterSitePayload(input: RegisterSiteInput) {
  const payload: Record<string, unknown> = { name: input.name };
  if (input.code) payload.code = input.code;
  if (input.utilityId) payload.utilityId = input.utilityId;
  if (input.siteGroupId) payload.siteGroupId = input.siteGroupId;
  if (input.siteGroupName) payload.siteGroupName = input.siteGroupName;
  if (typeof input.lat === "number") payload.lat = input.lat;
  if (typeof input.lng === "number") payload.lng = input.lng;
  if (input.zipcode) payload.zipcode = input.zipcode;
  if (input.addressProvince) payload.addressProvince = input.addressProvince;
  if (input.addressDistrict) payload.addressDistrict = input.addressDistrict;
  if (input.addressSubDistrict) payload.addressSubDistrict = input.addressSubDistrict;
  if (input.addressLine) payload.addressLine = input.addressLine;
  if (input.brandingLogoDataUrl) payload.brandingLogoDataUrl = input.brandingLogoDataUrl;
  if (typeof input.inverterApiType === "string") payload.inverterApiType = input.inverterApiType;
  const solaredgeSiteId = trimString(input.solaredgeSiteId);
  if (solaredgeSiteId !== undefined) payload.solaredgeSiteId = solaredgeSiteId;
  const solaredgeApiKey = trimString(input.solaredgeApiKey);
  if (solaredgeApiKey !== undefined) payload.solaredgeApiKey = solaredgeApiKey;
  const solisKeyId = trimString(input.solisKeyId);
  if (solisKeyId !== undefined) payload.solisKeyId = solisKeyId;
  const solisKeySecret = trimString(input.solisKeySecret);
  if (solisKeySecret !== undefined) payload.solisKeySecret = solisKeySecret;
  const solisStationId = trimString(input.solisStationId);
  if (solisStationId !== undefined) payload.solisStationId = solisStationId;
  return payload;
}

export function buildUpdateSitePayload(input: UpdateSiteInput) {
  const payload: Record<string, unknown> = {};
  const name = trimString(input.name);
  if (name) payload.name = name;
  const code = trimString(input.code);
  if (code) payload.code = code;
  const utilityId = trimString(input.utilityId);
  if (utilityId) payload.utilityId = utilityId;
  if (typeof input.removeUtility === "boolean") payload.removeUtility = input.removeUtility;
  const siteGroupId = trimString(input.siteGroupId);
  if (siteGroupId) payload.siteGroupId = siteGroupId;
  const siteGroupName = trimString(input.siteGroupName);
  if (siteGroupName) payload.siteGroupName = siteGroupName;
  if (typeof input.removeSiteGroup === "boolean") payload.removeSiteGroup = input.removeSiteGroup;
  if (typeof input.lat === "number" && Number.isFinite(input.lat)) payload.lat = input.lat;
  if (typeof input.lng === "number" && Number.isFinite(input.lng)) payload.lng = input.lng;
  if (input.zipcode) payload.zipcode = input.zipcode;
  if (input.addressProvince) payload.addressProvince = input.addressProvince;
  if (input.addressDistrict) payload.addressDistrict = input.addressDistrict;
  if (input.addressSubDistrict) payload.addressSubDistrict = input.addressSubDistrict;
  if (input.addressLine) payload.addressLine = input.addressLine;
  if (input.brandingLogoDataUrl) payload.brandingLogoDataUrl = input.brandingLogoDataUrl;
  if (typeof input.removeBrandingLogo === "boolean") payload.removeBrandingLogo = input.removeBrandingLogo;
  if (typeof input.inverterApiType === "string") payload.inverterApiType = input.inverterApiType;
  if (typeof input.solaredgeSiteId === "string") payload.solaredgeSiteId = input.solaredgeSiteId;
  if (typeof input.solaredgeApiKey === "string") payload.solaredgeApiKey = input.solaredgeApiKey;
  if (typeof input.solisKeyId === "string") payload.solisKeyId = input.solisKeyId;
  if (typeof input.solisKeySecret === "string") payload.solisKeySecret = input.solisKeySecret;
  if (typeof input.solisStationId === "string") payload.solisStationId = input.solisStationId;
  return payload;
}
