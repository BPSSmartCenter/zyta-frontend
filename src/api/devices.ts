// src/api/devices.ts
import { api } from "./axios";

export type DeviceTypeKey = "electric" | "water" | "air" | "camera" | "intercom";

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

export async function listSiteDevices(siteIdOrCode: string, type?: DeviceTypeKey | "all") {
  const params = new URLSearchParams();
  if (type && type !== "all") params.set("type", type);
  const query = params.toString();
  const url = `/site/${encodeURIComponent(siteIdOrCode)}/devices${query ? `?${query}` : ""}`;
  const { data } = await api.get(url);
  return data;
}

export async function deleteSiteDevice(siteIdOrCode: string, deviceId: string) {
  const url = `/site/${encodeURIComponent(siteIdOrCode)}/devices/${encodeURIComponent(deviceId)}`;
  const { data } = await api.delete(url);
  return data;
}

export async function updateSiteDevice(
  siteIdOrCode: string,
  deviceId: string,
  payload: {
    name?: string;
    status?: "online" | "offline" | "maintenance";
    ipAddress?: string | null;
    deviceKey?: string;
    sn?: string;
    category?: "METER" | "INVERTER" | "GATEWAY" | "SENSOR";
  }
) {
  const url = `/site/${encodeURIComponent(siteIdOrCode)}/devices/${encodeURIComponent(deviceId)}`;
  const { data } = await api.put(url, {
    name: payload.name,
    status: payload.status,
    ipAddress: payload.ipAddress,
    deviceKey: payload.deviceKey,
    sn: payload.sn,
    category: payload.category,
  });
  return data;
}
