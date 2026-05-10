// src/features/thaiAddress/thaiAddressApi.ts
import { request } from "../../lib/http";
import type { ThaiAddressData, ThaiAddressResponse } from "./thaiAddressThunks";

export async function lookupThaiAddress(
  zipcode: string
): Promise<ThaiAddressResponse> {
  try {
    const data = await request<ThaiAddressData>(
      `/thai-address/${encodeURIComponent(zipcode)}`
    );
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}
