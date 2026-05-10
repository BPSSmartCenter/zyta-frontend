// src/features/utilities/utilitiesApi.ts
import { request, requestList } from "../../lib/http";
import type { Utility } from "./utilitiesThunks";

export async function listUtilities(): Promise<Utility[]> {
  return requestList<Utility>("/utilities");
}

export async function createUtility(input: {
  name: string;
  code?: string;
}): Promise<Utility> {
  const payload: Record<string, unknown> = { name: input.name };
  if (input.code) payload.code = input.code;
  const data = await request<Utility | { item: Utility }>("/utilities", {
    method: "POST",
    json: payload,
  });
  return (data as { item?: Utility })?.item ?? (data as Utility);
}

export async function updateUtility(
  utilityId: string,
  input: { name?: string; code?: string | null }
): Promise<Utility> {
  const data = await request<Utility | { item: Utility }>(
    `/utilities/${encodeURIComponent(utilityId)}`,
    { method: "PUT", json: input }
  );
  return (data as { item?: Utility })?.item ?? (data as Utility);
}

export async function deleteUtility(utilityId: string): Promise<void> {
  await request(`/utilities/${encodeURIComponent(utilityId)}`, {
    method: "DELETE",
  });
}
