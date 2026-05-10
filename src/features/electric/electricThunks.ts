// src/features/electric/electricThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { request } from "../../lib/http";

type Category = "INVERTER" | "METER" | "GATEWAY" | "SENSOR";

export type RegisterElectricInput = {
  siteId: string;
  category: Category;
  sn: string;
  ipAddress?: string;
  status?: "online" | "offline" | "maintenance";
  name?: string;
  buildingTag?: string;
};

export const fetchElectricDevices = createAsyncThunk<
  { siteCode: string; data: unknown },
  { siteCode: string; from?: string; to?: string }
>("electric/fetchDevices", async ({ siteCode, from, to }) => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const data = await request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/devices`,
    { params }
  );
  return { siteCode, data };
});

export const syncElectricInventory = createAsyncThunk<
  unknown,
  { siteCode: string; category?: Category }
>("electric/syncInventory", async ({ siteCode, category }) => {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/inventory:sync`,
    { method: "POST", params }
  );
});

export const fetchElectricOverview = createAsyncThunk<
  { siteCode: string; data: unknown },
  string
>("electric/fetchOverview", async (siteCode) => {
  const data = await request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/overview`
  );
  return { siteCode, data };
});

/** V1 semantic fix: was a mutating GET in legacy. */
export const refreshElectricOverview = createAsyncThunk<
  { ok: boolean; today_kwh: number; month_kwh: number } | unknown,
  { siteCode: string; sn: string; category?: Category }
>("electric/refreshOverview", async ({ siteCode, sn, category }) => {
  const body: Record<string, string> = { sn };
  if (category) body.category = category;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/overview:refresh`,
    { method: "POST", json: body }
  );
});

export const fetchElectricSeries = createAsyncThunk<
  unknown,
  { siteCode: string; from: string; to: string; timeUnit?: string; meters?: string }
>("electric/fetchSeries", async ({ siteCode, from, to, timeUnit, meters }) => {
  const params: Record<string, string> = { from, to };
  if (timeUnit) params.timeUnit = timeUnit;
  if (meters) params.meters = meters;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/series`,
    { params }
  );
});

export const registerElectricDevice = createAsyncThunk<
  unknown,
  RegisterElectricInput
>("electric/registerDevice", async ({ siteId, ...rest }) => {
  return request<unknown>(`/sites/${encodeURIComponent(siteId)}/devices`, {
    method: "POST",
    json: { type: "electric", ...rest },
  });
});

// ---------------------------------------------------------------------------
// Equipment telemetry (was api/equipment.ts)
// ---------------------------------------------------------------------------

export const fetchEquipmentTelemetry = createAsyncThunk<
  { ok: boolean; data?: unknown },
  {
    siteIdOrCode: string;
    sn: string;
    startTime: string;
    endTime: string;
    category?: Category;
  }
>("electric/equipmentTelemetry", async (params) => {
  const q: Record<string, string> = {
    startTime: params.startTime,
    endTime: params.endTime,
  };
  if (params.category) q.category = params.category;
  // raw envelope expected (caller reads .data) — wrap manually
  const body = await request<unknown>(
    `/sites/${encodeURIComponent(params.siteIdOrCode)}/electric/equipment/${encodeURIComponent(
      params.sn
    )}/data`,
    { params: q }
  );
  return { ok: true, data: body };
});

// ---------------------------------------------------------------------------
// Meter dashboard (was api/meter.ts)
// ---------------------------------------------------------------------------

export type MeterDashboard = {
  device: {
    id: string;
    name: string;
    siteName: string;
    description?: string | null;
    status: "online" | "offline" | "maintenance";
    location?: string | null;
    billingStatus?: "pending" | "paid";
    serial?: string | null;
  };
  totals: {
    energyUsageKwh: number;
    onPeakKwh: number;
    offPeakKwh: number;
    todayKwh: number;
    todayOnPeakKwh?: number;
    todayOffPeakKwh?: number;
    previousMonthKwh?: number;
  };
  realtime?: {
    totalKwh: number;
    onPeakKwh: number;
    offPeakKwh: number;
    voltage?: number | null;
    timestamp?: string | null;
  };
  cost: {
    totalCost: number;
    onPeakCost: number;
    offPeakCost: number;
    rates: {
      baseOnPeak: number;
      baseOffPeak: number;
      discountedOnPeak: number;
      discountedOffPeak: number;
      discountRate: number;
      ftRate?: number;
      co2Factor?: number;
      treeFactor?: number;
      configuredBaseOnPeak?: number | null;
      configuredBaseOffPeak?: number | null;
      configuredDiscountRate?: number | null;
      configuredFtRate?: number | null;
      configuredCo2Factor?: number | null;
      configuredTreeFactor?: number | null;
    };
  };
  chart: {
    categories: string[];
    current: number[];
    previous: number[];
  };
  billingHistory: Array<{
    id: string;
    monthYear: string;
    energy: number;
    cost: number;
    status: string;
    documentUrl?: string | null;
  }>;
  lastReading: {
    value?: number;
    onPeakKwh?: number;
    offPeakKwh?: number;
    voltage?: number | null;
    timestamp: string;
  } | null;
  range?: {
    startDate?: string;
    endDate?: string;
  };
};

export const fetchMeterDashboard = createAsyncThunk<
  MeterDashboard,
  { deviceId: string; startDate?: string; endDate?: string }
>("electric/fetchMeterDashboard", async ({ deviceId, startDate, endDate }) => {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return request<MeterDashboard>(
    `/devices/${encodeURIComponent(deviceId)}/dashboard`,
    { params }
  );
});

export const fetchSiteMetersDashboard = createAsyncThunk<
  MeterDashboard,
  { siteId: string; startDate?: string; endDate?: string; tag?: string }
>("electric/fetchSiteMetersDashboard", async ({ siteId, startDate, endDate, tag }) => {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (tag) params.tag = tag;
  return request<MeterDashboard>(
    `/sites/${encodeURIComponent(siteId)}/meters/dashboard`,
    { params }
  );
});
