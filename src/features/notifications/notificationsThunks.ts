// src/features/notifications/notificationsThunks.ts
//
// Thin wrapper over the /notifications endpoint. Exposes both a plain async
// helper (for use inside other thunks) and a Redux thunk (for direct dispatch
// from components).

import { createAsyncThunk } from "@reduxjs/toolkit";
import { request } from "../../lib/http";
import type { Noti, NotiType, Severity } from "../../data/Dashboard/notis";

export type ListNotificationsParams = {
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
  if (
    t === "alert" ||
    t === "warning" ||
    t === "info" ||
    t === "normal" ||
    t === "offline" ||
    t === "success"
  )
    return t;
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

function paramsToQuery(params?: ListNotificationsParams) {
  const q: Record<string, string> = {};
  q.limit = String(params?.limit ?? 200);
  if (params?.siteCode) q.siteCode = params.siteCode;
  if (params?.siteId) q.siteId = params.siteId;
  if (params?.deviceId) q.deviceId = params.deviceId;
  if (params?.type) q.type = String(params.type);
  if (params?.severity) q.severity = String(params.severity);
  if (params?.from instanceof Date) q.from = params.from.toISOString();
  else if (params?.from != null) q.from = String(params.from);
  if (params?.to instanceof Date) q.to = params.to.toISOString();
  else if (params?.to != null) q.to = String(params.to);
  return q;
}

/**
 * Plain helper — fetch + normalize. Reused from inside other thunks
 * (notisFeed/fetch, sandbox map panel) to avoid thunk-in-thunk dispatching.
 */
export async function listNotifications(
  params?: ListNotificationsParams
): Promise<Noti[]> {
  const payload = await request<unknown>("/notifications", {
    params: paramsToQuery(params),
  });
  // The endpoint may return either a bare array or { items: [...] } depending
  // on which controller variant ran. Both shapes are valid v1 responses.
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items)
      ? ((payload as { items: ApiNoti[] }).items as ApiNoti[])
      : [];
  return items.map((n) => toNoti(n as ApiNoti));
}

export const fetchNotifications = createAsyncThunk<
  Noti[],
  ListNotificationsParams | undefined
>("notifications/fetch", async (params) => listNotifications(params));
