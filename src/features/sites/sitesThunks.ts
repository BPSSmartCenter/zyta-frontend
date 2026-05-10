// src/features/sites/sitesThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { request } from "../../lib/http";
import {
  buildRegisterSitePayload,
  buildUpdateSitePayload,
  type ListSitesResponse,
  type RegisterSiteInput,
  type SiteBillingAccess,
  type UpdateSiteInput,
} from "./sitesTypes";

/** GET /sites — list of sites visible to the current user. */
export const fetchSiteList = createAsyncThunk<ListSitesResponse>(
  "sites/fetchList",
  async () => {
    return request<ListSitesResponse>("/sites");
  }
);

/** GET /sites/{id}/inventory */
export const fetchSiteInventory = createAsyncThunk<unknown, string>(
  "sites/fetchInventory",
  async (siteId) => {
    return request<unknown>(`/sites/${encodeURIComponent(siteId)}/inventory`);
  }
);

/** GET /sites/{idOrCode}/details */
export const fetchSiteDetails = createAsyncThunk<unknown, string>(
  "sites/fetchDetails",
  async (siteIdOrCode) => {
    return request<unknown>(`/sites/${encodeURIComponent(siteIdOrCode)}/details`);
  }
);

/** POST /sites:register */
export const registerSite = createAsyncThunk<unknown, RegisterSiteInput>(
  "sites/register",
  async (input) => {
    return request<unknown>("/sites:register", {
      method: "POST",
      json: buildRegisterSitePayload(input),
    });
  }
);

/** PUT /sites/{id} */
export const updateSite = createAsyncThunk<
  unknown,
  { siteId: string; payload: UpdateSiteInput }
>("sites/update", async ({ siteId, payload }) => {
  return request<unknown>(`/sites/${encodeURIComponent(siteId)}`, {
    method: "PUT",
    json: buildUpdateSitePayload(payload),
  });
});

/** DELETE /sites/{id} */
export const deleteSite = createAsyncThunk<unknown, string>(
  "sites/delete",
  async (siteId) => {
    return request<unknown>(`/sites/${encodeURIComponent(siteId)}`, {
      method: "DELETE",
    });
  }
);

/** GET /sites/{idOrCode}/billing-access */
export const fetchSiteBillingAccess = createAsyncThunk<
  { id: string; access: SiteBillingAccess },
  string
>("sites/fetchBillingAccess", async (siteIdOrCode) => {
  const access = await request<SiteBillingAccess>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/billing-access`
  );
  return { id: siteIdOrCode, access };
});

/** PATCH /sites/{idOrCode}/billing-access */
export const updateSiteBillingAccess = createAsyncThunk<
  { id: string; access: SiteBillingAccess },
  { siteIdOrCode: string; payload: Partial<SiteBillingAccess> }
>("sites/updateBillingAccess", async ({ siteIdOrCode, payload }) => {
  const access = await request<SiteBillingAccess>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/billing-access`,
    { method: "PATCH", json: payload }
  );
  return { id: siteIdOrCode, access };
});
