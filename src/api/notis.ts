// src/api/notis.ts
import { api } from "./axios";
import type { Noti, NotiType, Severity } from "../data/Dashboard/notis";

export type ListNotisParams = {
  siteCode?: string;
  siteId?: string;
  deviceId?: string;
  type?: NotiType | string;
  severity?: Severity | string;
  limit?: number;
  from?: string | number | Date;
  to?: string | number | Date;
};

type ApiNoti = {
  id?: string;
  type?: string;
  severity?: string;
  title?: string;
  titleKey?: string;
  title_key?: string;
  img?: string;
  site?: string;
  siteId?: string;
  site_id?: string;
  siteCode?: string;
  site_code?: string;
  siteName?: string;
  site_name?: string;
  coords?: { lat?: number; lng?: number } | null;
  lat?: number | null;
  lng?: number | null;
  occurredAt?: string;
  occurred_at?: string;
  date?: string;
  createdAt?: string;
  created_at?: string;
  deviceId?: string;
  device_id?: string;
  deviceModel?: string;
  device_model?: string;
  meta?: Record<string, unknown> | null;
};

const normalizeType = (value?: string): NotiType => {
  const t = (value || "").toLowerCase();
  if (t === "alert" || t === "warning" || t === "info" || t === "normal" || t === "offline" || t === "success") return t;
  return "info";
};

const normalizeSeverity = (value?: string): Severity | undefined => {
  if (!value) return undefined;
  const s = value.toLowerCase();
  if (s === "low" || s === "medium" || s === "critical") return s;
  return undefined;
};

const parseDate = (value?: string): string => {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
};

const toNoti = (n: ApiNoti): Noti => {
  const iso = parseDate(n.date ?? n.occurredAt ?? n.occurred_at);
  const lat = typeof n.lat === "number" ? n.lat : n.coords?.lat;
  const lng = typeof n.lng === "number" ? n.lng : n.coords?.lng;
  const siteName = n.siteName ?? n.site_name;
  const siteCode = n.siteCode ?? n.site_code;
  const siteId = n.siteId ?? n.site_id;
  const siteLabel = n.site ?? siteName ?? siteCode ?? siteId ?? "-";

  return {
    id: n.id,
    type: normalizeType(n.type),
    severity: normalizeSeverity(n.severity),
    titleKey: n.titleKey ?? n.title_key,
    title: n.title ?? n.titleKey ?? n.title_key ?? "-",
    img: n.img ?? undefined,
    site: siteLabel,
    siteId,
    siteCode,
    siteName,
    coords:
      typeof lat === "number" && typeof lng === "number"
        ? { lat, lng }
        : undefined,
    lat: (lat as number | undefined) ?? undefined,
    lng: (lng as number | undefined) ?? undefined,
    date: iso,
    occurredAt: iso,
    createdAt: parseDate(n.createdAt ?? n.created_at),
    deviceId: n.deviceId ?? n.device_id,
    deviceModel: n.deviceModel ?? n.device_model,
    meta: n.meta ?? undefined,
  };
};

export async function listNotis(params?: ListNotisParams): Promise<Noti[]> {
  const response = await api.get("/notifications", {
    params: {
      limit: params?.limit ?? 200,
      siteCode: params?.siteCode,
      siteId: params?.siteId,
      deviceId: params?.deviceId,
      type: params?.type,
      severity: params?.severity,
      from: params?.from,
      to: params?.to,
    },
  });
  const payload = response?.data;
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];
  return items.map((n: ApiNoti) => toNoti(n));
}
