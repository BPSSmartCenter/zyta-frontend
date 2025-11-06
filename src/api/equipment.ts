// src/api/equipment.ts
import { api } from "./axios";

export type EquipmentFetchResp = {
  ok: boolean;
  data?: any;
};

export async function fetchEquipmentTelemetry(params: {
  siteIdOrCode: string;
  sn: string;
  startTime: string; // "YYYY-MM-DD HH:MM:SS"
  endTime: string; // same format
  category?: "INVERTER" | "METER" | "GATEWAY" | "SENSOR";
}) {
  const q = new URLSearchParams();
  q.set("startTime", params.startTime);
  q.set("endTime", params.endTime);
  if (params.category) q.set("category", params.category);
  const url = `/site/${encodeURIComponent(params.siteIdOrCode)}/electric/equipment/${encodeURIComponent(params.sn)}/data?${q.toString()}`;
  const { data } = await api.get<EquipmentFetchResp>(url);
  return data;
}
