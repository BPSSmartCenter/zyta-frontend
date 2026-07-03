// src/features/notifications/notificationsLegacy.ts
//
// DEPRECATED — to be removed once `notisFeed` slice and `SandboxMapPanelCard`
// migrate to the new v2 `fetchNotifications` thunk + `byFeKey` selectors.
//
// Legacy plain helper that fetches `/notifications` and returns `Noti[]` (the
// old dashboard view-model, see `data/Dashboard/notis.ts`). Kept during the
// migration window so the existing `notisFeedThunks` doesn't break.

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
  site?:
    | string
    | {
        id?: string;
        code?: string;
        name?: string;
        coords?: { lat?: number; lng?: number } | null;
      }
    | null;
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
  payload?: {
    feKey?: string;
    extra?: Record<string, unknown> | null;
  } | null;
  device?: {
    id?: string;
    model?: string;
    type?: string;
  } | null;
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
  const siteRecord =
    n.site && typeof n.site === "object" && !Array.isArray(n.site)
      ? n.site
      : null;
  const lat =
    typeof n.lat === "number"
      ? n.lat
      : typeof siteRecord?.coords?.lat === "number"
      ? siteRecord.coords.lat
      : n.coords?.lat;
  const lng =
    typeof n.lng === "number"
      ? n.lng
      : typeof siteRecord?.coords?.lng === "number"
      ? siteRecord.coords.lng
      : n.coords?.lng;
  const siteName = n.siteName ?? n.site_name ?? siteRecord?.name;
  const siteCode = n.siteCode ?? n.site_code ?? siteRecord?.code;
  const siteId = n.siteId ?? n.site_id ?? siteRecord?.id;
  const siteLabel =
    typeof n.site === "string" && n.site.trim().length
      ? n.site
      : siteName ?? siteCode ?? siteId ?? "-";
  const payloadExtra = n.payload?.extra ?? null;
  const mergedMeta = {
    ...(n.meta ?? {}),
    ...(payloadExtra ?? {}),
    ...(typeof n.payload?.feKey === "string" ? { feKey: n.payload.feKey } : {}),
  };

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
    deviceId: n.deviceId ?? n.device_id ?? n.device?.id,
    deviceModel: n.deviceModel ?? n.device_model ?? n.device?.model,
    meta: Object.keys(mergedMeta).length ? mergedMeta : undefined,
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
 * @deprecated Use `fetchNotifications` thunk + `selectByFeKeys` selector
 * instead. Kept for compatibility with `notisFeed` slice and sandbox cards
 * until those callers migrate.
 */
export async function listNotifications(
  params?: ListNotificationsParams
): Promise<Noti[]> {
  const payload = await request<unknown>("/notifications", {
    params: paramsToQuery(params),
  });
  const items = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { items?: unknown }).items)
      ? ((payload as { items: ApiNoti[] }).items as ApiNoti[])
      : [];
  return items.map((n) => toNoti(n as ApiNoti));
}
