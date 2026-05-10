// src/features/sites/sitesApi.ts
import { request } from "../../lib/http";
import {
  buildRegisterSitePayload,
  buildUpdateSitePayload,
  type ListSitesResponse,
  type RegisterSiteInput,
  type SiteBillingAccess,
  type UpdateSiteInput,
} from "./sitesTypes";

export async function listSites(): Promise<ListSitesResponse> {
  return request<ListSitesResponse>("/sites");
}

export async function getSiteInventory(siteId: string): Promise<unknown> {
  return request<unknown>(`/sites/${encodeURIComponent(siteId)}/inventory`);
}

export async function getSiteDetails(siteIdOrCode: string): Promise<unknown> {
  return request<unknown>(`/sites/${encodeURIComponent(siteIdOrCode)}/details`);
}

export async function registerSite(input: RegisterSiteInput): Promise<unknown> {
  return request<unknown>("/sites:register", {
    method: "POST",
    json: buildRegisterSitePayload(input),
  });
}

export async function updateSite(
  siteId: string,
  input: UpdateSiteInput
): Promise<unknown> {
  return request<unknown>(`/sites/${encodeURIComponent(siteId)}`, {
    method: "PUT",
    json: buildUpdateSitePayload(input),
  });
}

export async function deleteSite(siteId: string): Promise<unknown> {
  return request<unknown>(`/sites/${encodeURIComponent(siteId)}`, {
    method: "DELETE",
  });
}

export async function getSiteBillingAccess(
  siteIdOrCode: string
): Promise<SiteBillingAccess> {
  return request<SiteBillingAccess>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/billing-access`
  );
}

export async function updateSiteBillingAccess(
  siteIdOrCode: string,
  payload: Partial<SiteBillingAccess>
): Promise<SiteBillingAccess> {
  return request<SiteBillingAccess>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/billing-access`,
    { method: "PATCH", json: payload }
  );
}
