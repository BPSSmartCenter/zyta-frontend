// src/features/siteGroups/siteGroupsApi.ts
import { request, requestList } from "../../lib/http";
import type { SiteGroup } from "./siteGroupsThunks";

export async function listSiteGroups(): Promise<SiteGroup[]> {
  return requestList<SiteGroup>("/site-groups");
}

export async function createSiteGroup(input: {
  name: string;
  code?: string;
  utilityId?: string;
}): Promise<unknown> {
  const payload: Record<string, unknown> = { name: input.name };
  if (input.code) payload.code = input.code;
  if (input.utilityId) payload.utilityId = input.utilityId;
  return request<unknown>("/site-groups", { method: "POST", json: payload });
}
