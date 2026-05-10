// src/features/utilities/utilitiesThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { request, requestList } from "../../lib/http";

export type Utility = {
  id: string;
  name: string;
  code?: string | null;
};

export const fetchUtilities = createAsyncThunk<Utility[]>(
  "utilities/fetch",
  async () => {
    return requestList<Utility>("/utilities");
  }
);

export const createUtility = createAsyncThunk<
  Utility,
  { name: string; code?: string }
>("utilities/create", async (input) => {
  const payload: Record<string, unknown> = { name: input.name };
  if (input.code) payload.code = input.code;
  const data = await request<Utility | { item: Utility }>("/utilities", {
    method: "POST",
    json: payload,
  });
  return (data as { item?: Utility })?.item ?? (data as Utility);
});

export const updateUtility = createAsyncThunk<
  Utility,
  { utilityId: string; input: { name?: string; code?: string | null } }
>("utilities/update", async ({ utilityId, input }) => {
  const data = await request<Utility | { item: Utility }>(
    `/utilities/${encodeURIComponent(utilityId)}`,
    { method: "PUT", json: input }
  );
  return (data as { item?: Utility })?.item ?? (data as Utility);
});

export const deleteUtility = createAsyncThunk<string, string>(
  "utilities/delete",
  async (utilityId) => {
    await request(`/utilities/${encodeURIComponent(utilityId)}`, {
      method: "DELETE",
    });
    return utilityId;
  }
);
