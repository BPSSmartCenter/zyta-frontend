// src/features/devices/devicesApi.ts
import { request } from "../../lib/http";
import type {
  AirDeviceRecord,
  DeviceTypeKey,
  IoTDevice,
  ManualDeviceRegisterInput,
  UpdateDevicePayload,
  WaterDeviceRecord,
} from "./devicesThunks";

export type DevicesListResponse = unknown;
export type WaterDevicesResponse =
  | { ok?: boolean; items?: WaterDeviceRecord[] }
  | WaterDeviceRecord[];
export type AirDevicesResponse =
  | { ok?: boolean; items?: AirDeviceRecord[] }
  | AirDeviceRecord[];

export async function listSiteDevices(
  siteIdOrCode: string,
  type?: DeviceTypeKey | "all"
): Promise<DevicesListResponse> {
  const params: Record<string, string> = {};
  if (type && type !== "all") params.type = type;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/devices`,
    { params }
  );
}

export async function deleteSiteDevice(
  siteIdOrCode: string,
  deviceId: string
): Promise<unknown> {
  return request<unknown>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/devices/${encodeURIComponent(deviceId)}`,
    { method: "DELETE" }
  );
}

export async function updateSiteDevice(
  siteIdOrCode: string,
  deviceId: string,
  payload: UpdateDevicePayload
): Promise<unknown> {
  return request<unknown>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/devices/${encodeURIComponent(deviceId)}`,
    { method: "PUT", json: payload }
  );
}

async function postUnifiedRegister(
  siteId: string,
  type: "cctv" | "water" | "air",
  payload: Omit<ManualDeviceRegisterInput, "siteId" | "type">
): Promise<unknown> {
  return request<unknown>(`/sites/${encodeURIComponent(siteId)}/devices`, {
    method: "POST",
    json: { type, ...payload },
  });
}

export function registerCctvDevice(input: Omit<ManualDeviceRegisterInput, "type">) {
  const { siteId, ...rest } = input;
  return postUnifiedRegister(siteId, "cctv", rest);
}

export function registerWaterMeterDevice(input: Omit<ManualDeviceRegisterInput, "type">) {
  const { siteId, ...rest } = input;
  return postUnifiedRegister(siteId, "water", rest);
}

export function registerAirSensorDevice(input: Omit<ManualDeviceRegisterInput, "type">) {
  const { siteId, ...rest } = input;
  return postUnifiedRegister(siteId, "air", rest);
}

export async function getWaterDevices(siteIdOrCode: string): Promise<WaterDevicesResponse> {
  return request<WaterDevicesResponse>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/water/devices`
  );
}

export async function getAirDevices(siteIdOrCode: string): Promise<AirDevicesResponse> {
  return request<AirDevicesResponse>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/air/devices`
  );
}

/** IoT realtime list — pinned to legacy /api (not in v1 reference yet). */
export async function getIoTDevices(): Promise<IoTDevice[]> {
  const data = await request<unknown>(`/devices?t=${Date.now()}`, {
    legacy: true,
  });
  if (Array.isArray(data)) return data as IoTDevice[];
  if (data && typeof data === "object") {
    const inner = (data as { data?: unknown }).data;
    if (Array.isArray(inner)) return inner as IoTDevice[];
  }
  return [];
}
