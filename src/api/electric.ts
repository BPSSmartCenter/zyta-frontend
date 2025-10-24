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

export async function getElectricOverview(siteCode: string) {
  const { data } = await api.get(`/site/${encodeURIComponent(siteCode)}/electric/overview`);
  return data;
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
