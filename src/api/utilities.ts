import { api } from "./axios";

export type Utility = {
  id: string;
  name: string;
  code?: string | null;
};

export async function listUtilities(): Promise<Utility[]> {
  const { data } = await api.get("/utilities");
  return Array.isArray(data?.items) ? data.items : data?.items ?? data ?? [];
}

export async function createUtility(input: {
  name: string;
  code?: string;
}): Promise<Utility> {
  const payload: Record<string, any> = { name: input.name };
  if (input.code) payload.code = input.code;
  const { data } = await api.post("/utilities", payload);
  return data?.item ?? data;
}

export async function updateUtility(
  utilityId: string,
  input: { name?: string; code?: string | null }
): Promise<Utility> {
  const { data } = await api.put(`/utilities/${utilityId}`, input);
  return data?.item ?? data;
}

export async function deleteUtility(utilityId: string): Promise<void> {
  await api.delete(`/utilities/${utilityId}`);
}
