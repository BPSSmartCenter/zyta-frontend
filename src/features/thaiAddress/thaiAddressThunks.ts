// src/features/thaiAddress/thaiAddressThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { request } from "../../lib/http";

export type ThaiAddressData = {
  zipcode: string;
  province: { th: string; en: string } | null;
  districts: Array<{ th: string; en: string }>;
  subDistricts: Array<{ th: string; en: string }>;
  combinations: Array<{
    district: { th: string; en: string };
    subDistrict: { th: string; en: string };
  }>;
};

export type ThaiAddressResponse = {
  ok: boolean;
  data?: ThaiAddressData;
};

export const lookupThaiAddress = createAsyncThunk<ThaiAddressResponse, string>(
  "thaiAddress/lookup",
  async (zipcode) => {
    // Endpoint returns the full envelope; caller code expects { ok, data }.
    // Since http.request unwraps `data`, re-wrap to preserve the legacy shape.
    try {
      const data = await request<ThaiAddressData>(
        `/thai-address/${encodeURIComponent(zipcode)}`
      );
      return { ok: true, data };
    } catch {
      return { ok: false };
    }
  }
);
