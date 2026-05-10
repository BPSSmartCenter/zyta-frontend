// src/features/siteGroups/siteGroupsThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { request, requestList } from "../../lib/http";

export type SiteGroup = {
  id: string;
  name: string;
  code?: string | null;
  utility_id?: string | null;
  utility?: { id: string; name: string; code?: string | null } | null;
};

export const fetchSiteGroups = createAsyncThunk<SiteGroup[]>(
  "siteGroups/fetch",
  async () => {
    return requestList<SiteGroup>("/site-groups");
  }
);

export const createSiteGroup = createAsyncThunk<
  unknown,
  { name: string; code?: string; utilityId?: string }
>("siteGroups/create", async (input) => {
  const payload: Record<string, unknown> = { name: input.name };
  if (input.code) payload.code = input.code;
  if (input.utilityId) payload.utilityId = input.utilityId;
  return request<unknown>("/site-groups", { method: "POST", json: payload });
});
