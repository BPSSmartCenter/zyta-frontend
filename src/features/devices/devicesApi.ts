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
type IoTQueryScope = {
  siteId?: string | null;
  siteGroupId?: string | null;
};

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

export async function getIoTDevices(scope?: IoTQueryScope): Promise<IoTDevice[]> {
  const params: Record<string, string | number> = { t: Date.now() };
  const siteId = String(scope?.siteId || "").trim();
  const siteGroupId = String(scope?.siteGroupId || "").trim();
  if (siteId) params.siteId = siteId;
  if (siteGroupId) params.siteGroupId = siteGroupId;

  const data = await request<unknown>("/devices", { params });

  const rawDevices: Array<Record<string, unknown>> =
    Array.isArray(data)
      ? (data as Array<Record<string, unknown>>)
      : data && typeof data === "object" && Array.isArray((data as { devices?: unknown }).devices)
      ? ((data as { devices: Array<Record<string, unknown>> }).devices ?? [])
      : [];

  return rawDevices
    .filter((row) => String(row.type ?? "").toLowerCase() === "iot")
    .map((row) => {
      const locationId = row.locationId == null ? "" : String(row.locationId).trim();
      return {
        ...row,
        id: row.id == null ? undefined : String(row.id),
        deviceId:
          row.externalId == null
            ? row.id == null
              ? undefined
              : String(row.id)
            : String(row.externalId),
        name:
          row.name == null
            ? row.externalId == null
              ? ""
              : String(row.externalId)
            : String(row.name),
        type: String(row.type ?? ""),
        status: String(row.status ?? "Unknown"),
        siteId: locationId || undefined,
        siteCode: locationId || undefined,
        siteName:
          row.subLocation == null
            ? row.locationName == null
              ? undefined
              : String(row.locationName)
            : String(row.subLocation),
      } as IoTDevice;
    });
}
