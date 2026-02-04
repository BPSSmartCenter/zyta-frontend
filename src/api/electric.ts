// src/api/electric.ts
import { api } from "./axios";

export async function getElectricDevices(siteCode: string, opts?: { from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  const q = params.toString();
  const url = `/site/${encodeURIComponent(siteCode)}/electric/devices${q ? `?${q}` : ""}`;
  const { data } = await api.get(url);
  return data;
}

export async function syncElectricInventory(
  siteCode: string,
  opts?: { category?: "INVERTER" | "METER" | "GATEWAY" | "SENSOR" }
) {
  const params = new URLSearchParams();
  if (opts?.category) params.set("category", opts.category);
  const q = params.toString();
  const url = `/site/${encodeURIComponent(siteCode)}/electric/inventory/sync${q ? `?${q}` : ""}`;
  const { data } = await api.post(url);
  return data;
}

export async function getElectricOverview(siteCode: string) {
  const { data } = await api.get(`/site/${encodeURIComponent(siteCode)}/electric/overview`);
  return data;
}

export async function updateElectricOverview(
  siteCode: string,
  sn: string,
  opts?: { category?: "INVERTER" | "METER" | "GATEWAY" | "SENSOR" }
) {
  const params = new URLSearchParams();
  params.set("sn", sn);
  if (opts?.category) {
    params.set("category", opts.category);
  }
  const { data } = await api.get(
    `/site/${encodeURIComponent(siteCode)}/electric/overview/update?${params.toString()}`
  );
  return data as { ok: boolean; today_kwh: number; month_kwh: number } | any;
}

export async function getElectricSeries(
  siteCode: string,
  opts: { from: string; to: string; timeUnit?: string; meters?: string }
) {
  const params = new URLSearchParams();
  params.set("from", opts.from);
  params.set("to", opts.to);
  if (opts.timeUnit) params.set("timeUnit", opts.timeUnit);
  if (opts.meters) params.set("meters", opts.meters);
  const { data } = await api.get(`/site/${encodeURIComponent(siteCode)}/electric/series?${params.toString()}`);
  return data;
}

export type RegisterElectricInput = {
  siteId: string;
  category: "METER" | "INVERTER" | "GATEWAY" | "SENSOR";
  sn: string;
  ipAddress?: string;
  status?: "online" | "offline" | "maintenance";
  name?: string;
};

export async function registerElectricDevice(input: RegisterElectricInput) {
  const { siteId, ...payload } = input;
  const url = `/site/${encodeURIComponent(siteId)}/electric/devices/register`;
  const { data } = await api.post(url, payload);
  return data;
}
