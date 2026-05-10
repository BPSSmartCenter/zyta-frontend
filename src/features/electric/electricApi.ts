// src/features/electric/electricApi.ts
import { request } from "../../lib/http";
import type { MeterDashboard, RegisterElectricInput } from "./electricThunks";

type Category = "INVERTER" | "METER" | "GATEWAY" | "SENSOR";

export async function getElectricDevices(
  siteCode: string,
  opts?: { from?: string; to?: string }
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (opts?.from) params.from = opts.from;
  if (opts?.to) params.to = opts.to;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/devices`,
    { params }
  );
}

export async function syncElectricInventory(
  siteCode: string,
  opts?: { category?: Category }
): Promise<unknown> {
  const params: Record<string, string> = {};
  if (opts?.category) params.category = opts.category;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/inventory:sync`,
    { method: "POST", params }
  );
}

export async function getElectricOverview(siteCode: string): Promise<unknown> {
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/overview`
  );
}

export async function updateElectricOverview(
  siteCode: string,
  sn: string,
  opts?: { category?: Category }
): Promise<unknown> {
  const body: Record<string, string> = { sn };
  if (opts?.category) body.category = opts.category;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/overview:refresh`,
    { method: "POST", json: body }
  );
}

export async function getElectricSeries(
  siteCode: string,
  opts: { from: string; to: string; timeUnit?: string; meters?: string }
): Promise<unknown> {
  const params: Record<string, string> = { from: opts.from, to: opts.to };
  if (opts.timeUnit) params.timeUnit = opts.timeUnit;
  if (opts.meters) params.meters = opts.meters;
  return request<unknown>(
    `/sites/${encodeURIComponent(siteCode)}/electric/series`,
    { params }
  );
}

export async function registerElectricDevice(
  input: RegisterElectricInput
): Promise<unknown> {
  const { siteId, ...rest } = input;
  return request<unknown>(`/sites/${encodeURIComponent(siteId)}/devices`, {
    method: "POST",
    json: { type: "electric", ...rest },
  });
}

export type EquipmentFetchResp = { ok: boolean; data?: unknown };

export async function fetchEquipmentTelemetry(params: {
  siteIdOrCode: string;
  sn: string;
  startTime: string;
  endTime: string;
  category?: Category;
}): Promise<EquipmentFetchResp> {
  const q: Record<string, string> = {
    startTime: params.startTime,
    endTime: params.endTime,
  };
  if (params.category) q.category = params.category;
  const body = await request<unknown>(
    `/sites/${encodeURIComponent(params.siteIdOrCode)}/electric/equipment/${encodeURIComponent(params.sn)}/data`,
    { params: q }
  );
  return { ok: true, data: body };
}

export async function getMeterDashboard(
  deviceId: string,
  params?: { startDate?: string; endDate?: string }
): Promise<MeterDashboard> {
  const q: Record<string, string> = {};
  if (params?.startDate) q.startDate = params.startDate;
  if (params?.endDate) q.endDate = params.endDate;
  return request<MeterDashboard>(
    `/devices/${encodeURIComponent(deviceId)}/dashboard`,
    { params: q }
  );
}

export async function getSiteMetersDashboard(
  siteId: string,
  params?: { startDate?: string; endDate?: string; tag?: string }
): Promise<MeterDashboard> {
  const q: Record<string, string> = {};
  if (params?.startDate) q.startDate = params.startDate;
  if (params?.endDate) q.endDate = params.endDate;
  if (params?.tag) q.tag = params.tag;
  return request<MeterDashboard>(
    `/sites/${encodeURIComponent(siteId)}/meters/dashboard`,
    { params: q }
  );
}
