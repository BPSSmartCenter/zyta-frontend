// src/api/air.ts
import { api } from "./axios";

export type AirDeviceRecord = {
  id: string;
  site_id?: string;
  model: string;
  status: string;
  meta?: unknown;
};

export type AirDevicesResponse =
  | {
      ok?: boolean;
      items?: AirDeviceRecord[];
    }
  | AirDeviceRecord[];

export async function getAirDevices(siteIdOrCode: string) {
  const { data } = await api.get(
    `/sites/${encodeURIComponent(siteIdOrCode)}/air/devices`
  );
  return data as AirDevicesResponse;
}
