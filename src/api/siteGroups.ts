import { api } from "./axios";

export type SiteGroup = {
  id: string;
  name: string;
  code?: string | null;
  utility_id?: string | null;
  utility?: { id: string; name: string; code?: string | null } | null;
};

export async function listSiteGroups(): Promise<SiteGroup[]> {
  const { data } = await api.get("/sites/site-groups");
  return Array.isArray(data?.items) ? data.items : data?.items ?? data ?? [];
}

export async function createSiteGroup(input: {
  name: string;
  code?: string;
  utilityId?: string;
}) {
  const payload: Record<string, any> = { name: input.name };
  if (input.code) payload.code = input.code;
  if (input.utilityId) payload.utilityId = input.utilityId;
  const { data } = await api.post("/sites/site-groups", payload);
  return data;
}
