import { api } from "./axios";

export type ThaiAddressResponse = {
  ok: boolean;
  data?: {
    zipcode: string;
    province: { th: string; en: string } | null;
    districts: Array<{ th: string; en: string }>;
    subDistricts: Array<{ th: string; en: string }>;
    combinations: Array<{
      district: { th: string; en: string };
      subDistrict: { th: string; en: string };
    }>;
  };
};

export async function lookupThaiAddress(zipcode: string) {
  const { data } = await api.get<ThaiAddressResponse>(
    `/thai-address/${encodeURIComponent(zipcode)}`
  );
  return data;
}
