// src/features/devices/devicesThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { request } from "../../lib/http";

export type DeviceTypeKey = "electric" | "water" | "air" | "camera" | "intercom";

export type ManualDeviceRegisterInput = {
  siteId: string;
  type: "cctv" | "water" | "air";
  deviceKey: string;
  sn?: string;
  ipAddress?: string;
  status?: "online" | "offline" | "maintenance";
  name?: string;
};

export type UpdateDevicePayload = {
  name?: string;
  status?: "online" | "offline" | "maintenance";
  ipAddress?: string | null;
  deviceKey?: string;
  sn?: string;
  category?: "METER" | "INVERTER" | "GATEWAY" | "SENSOR";
  buildingTag?: string | null;
};

/** GET /sites/{id}/devices?type= */
export const fetchSiteDevices = createAsyncThunk<
  { siteId: string; type: DeviceTypeKey | "all"; data: unknown },
  { siteIdOrCode: string; type?: DeviceTypeKey | "all" }
>("devices/fetch", async ({ siteIdOrCode, type }) => {
  const params: Record<string, string> = {};
  if (type && type !== "all") params.type = type;
  const data = await request<unknown>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/devices`,
    { params }
  );
  return { siteId: siteIdOrCode, type: type ?? "all", data };
});

/** POST /sites/{id}/devices — unified register (cctv/water/air) */
export const registerManualDevice = createAsyncThunk<
  unknown,
  ManualDeviceRegisterInput
>("devices/registerManual", async ({ siteId, type, ...rest }) => {
  return request<unknown>(`/sites/${encodeURIComponent(siteId)}/devices`, {
    method: "POST",
    json: { type, ...rest },
  });
});

/** PUT /sites/{id}/devices/{deviceId} */
export const updateSiteDevice = createAsyncThunk<
  unknown,
  { siteIdOrCode: string; deviceId: string; payload: UpdateDevicePayload }
>("devices/update", async ({ siteIdOrCode, deviceId, payload }) => {
  return request<unknown>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/devices/${encodeURIComponent(
      deviceId
    )}`,
    { method: "PUT", json: payload }
  );
});

/** DELETE /sites/{id}/devices/{deviceId} */
export const deleteSiteDevice = createAsyncThunk<
  unknown,
  { siteIdOrCode: string; deviceId: string }
>("devices/delete", async ({ siteIdOrCode, deviceId }) => {
  return request<unknown>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/devices/${encodeURIComponent(
      deviceId
    )}`,
    { method: "DELETE" }
  );
});

// ---------------------------------------------------------------------------
// Water / Air listings (separate endpoints, same shape as devices but typed)
// ---------------------------------------------------------------------------

export type WaterDeviceRecord = {
  id: string;
  site_id?: string;
  model: string;
  status: string;
  meta?: unknown;
};

export type AirDeviceRecord = WaterDeviceRecord;

export const fetchWaterDevices = createAsyncThunk<
  { siteId: string; data: unknown },
  string
>("devices/fetchWater", async (siteIdOrCode) => {
  const data = await request<unknown>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/water/devices`
  );
  return { siteId: siteIdOrCode, data };
});

export const fetchAirDevices = createAsyncThunk<
  { siteId: string; data: unknown },
  string
>("devices/fetchAir", async (siteIdOrCode) => {
  const data = await request<unknown>(
    `/sites/${encodeURIComponent(siteIdOrCode)}/air/devices`
  );
  return { siteId: siteIdOrCode, data };
});

// ---------------------------------------------------------------------------
// IoT realtime list (legacy /api carve-out — not in v1 reference yet)
// ---------------------------------------------------------------------------

export type IoTDevice = {
  id?: string | number;
  deviceId?: string;
  name: string;
  type?: string;
  status?: string;
  value?: string | number;
  ipAddress?: string;
  snapshot?: Record<string, any>;
  timestamp?: string;
  // Devices return a wide variety of vendor-specific fields beyond the typed
  // ones above. Loosely typed so existing callers can still index siteCode etc.
  [key: string]: any;
};

export const fetchIoTDevices = createAsyncThunk<IoTDevice[]>(
  "devices/fetchIoT",
  async () => {
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
);
