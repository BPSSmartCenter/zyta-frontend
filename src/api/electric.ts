// src/api/electric.ts
import { api } from "./axios";

export async function getElectricDevices(siteCode: string, opts?: { from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  const q = params.toString();
  const url = `/sites/${encodeURIComponent(siteCode)}/electric/devices${q ? `?${q}` : ""}`;
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
  const url = `/sites/${encodeURIComponent(siteCode)}/electric/inventory:sync${q ? `?${q}` : ""}`;
  const { data } = await api.post(url);
  return data;
}

export async function getElectricOverview(siteCode: string) {
  const { data } = await api.get(`/sites/${encodeURIComponent(siteCode)}/electric/overview`);
  return data;
}

export async function updateElectricOverview(
  siteCode: string,
  sn: string,
  opts?: { category?: "INVERTER" | "METER" | "GATEWAY" | "SENSOR" }
) {
  // V1 semantic fix: legacy was a mutating GET (`/electric/overview/update?sn=`).
  // V1 is POST `/electric/overview:refresh` with sn in the body.
  const body: Record<string, string> = { sn };
  if (opts?.category) body.category = opts.category;
  const { data } = await api.post(
    `/sites/${encodeURIComponent(siteCode)}/electric/overview:refresh`,
    body
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
  const { data } = await api.get(`/sites/${encodeURIComponent(siteCode)}/electric/series?${params.toString()}`);
  return data;
}

export type RegisterElectricInput = {
  siteId: string;
  category: "METER" | "INVERTER" | "GATEWAY" | "SENSOR";
  sn: string;
  ipAddress?: string;
  status?: "online" | "offline" | "maintenance";
  name?: string;
  buildingTag?: string;
};

export async function registerElectricDevice(input: RegisterElectricInput) {
  // V1 unified register: POST /sites/{id}/devices body { type:"electric", category, sn, ... }
  const { siteId, ...rest } = input;
  const url = `/sites/${encodeURIComponent(siteId)}/devices`;
  const { data } = await api.post(url, { type: "electric", ...rest });
  return data;
}
