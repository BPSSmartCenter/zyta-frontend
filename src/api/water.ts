// src/api/water.ts
import { api } from "./axios";

export type WaterDeviceRecord = {
  id: string;
  site_id?: string;
  model: string;
  status: string;
  meta?: unknown;
};

export type WaterDevicesResponse =
  | {
      ok?: boolean;
      items?: WaterDeviceRecord[];
    }
  | WaterDeviceRecord[];

export async function getWaterDevices(siteIdOrCode: string) {
  const { data } = await api.get(
    `/sites/${encodeURIComponent(siteIdOrCode)}/water/devices`
  );
  return data as WaterDevicesResponse;
}
