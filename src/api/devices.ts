// src/api/devices.ts
import { api } from "./axios";

export type ManualDeviceRegisterInput = {
  siteId: string;
  deviceKey: string;
  sn?: string;
  ipAddress?: string;
  status?: "online" | "offline" | "maintenance";
  name?: string;
};

type ManualDevicePayload = Omit<ManualDeviceRegisterInput, "siteId">;

async function postManualRegister(
  siteId: string,
  endpoint: "cctv" | "water" | "air",
  payload: ManualDevicePayload
) {
  const url = `/site/${encodeURIComponent(siteId)}/${endpoint}/devices/register`;
  const { data } = await api.post(url, payload);
  return data;
}

export function registerCctvDevice(input: ManualDeviceRegisterInput) {
  const { siteId, ...payload } = input;
  return postManualRegister(siteId, "cctv", payload);
}

export function registerWaterMeterDevice(input: ManualDeviceRegisterInput) {
  const { siteId, ...payload } = input;
  return postManualRegister(siteId, "water", payload);
}

export function registerAirSensorDevice(input: ManualDeviceRegisterInput) {
  const { siteId, ...payload } = input;
  return postManualRegister(siteId, "air", payload);
}
