// src/features/notifications/notificationsAdapter.ts
//
// Adapt the legacy v1 notification shape (flat, no payload union) into the
// v2 DTO. Used during the transition window — once `?format=v2` is the only
// thing FE consumes, this adapter can be deleted.
//
// The adapter is best-effort: it preserves identity fields verbatim, infers
// feKey from titleKey via the catalog, and bundles everything else into
// `payload.extra` so consumers don't crash on unknown shapes.

import type { CatalogMap } from "../catalog/catalogTypes";
import type {
  FeKey,
  NotificationDTO,
  NotificationPayload,
  NotiType,
  Severity,
} from "./notificationsTypes";

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function asNullableText(value: unknown): string | null {
  const text = asText(value);
  return text ? text : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeNotiType(value: unknown): NotiType {
  const t = asText(value).toLowerCase();
  if (
    t === "alert" ||
    t === "warning" ||
    t === "info" ||
    t === "normal" ||
    t === "offline" ||
    t === "success"
  ) {
    return t;
  }
  return "info";
}

function normalizeSeverity(value: unknown): Severity {
  const s = asText(value).toLowerCase();
  if (s === "low" || s === "medium" || s === "critical") return s;
  return "low";
}

/**
 * Resolve `feKey` for a legacy notification. Prefer the catalog mapping;
 * fall back to "unknown" when the titleKey isn't recognised — the same
 * behaviour the backend would emit on v2.
 */
function resolveFeKey(
  titleKey: string | null,
  catalog: CatalogMap
): FeKey {
  if (titleKey && catalog[titleKey]) return catalog[titleKey].feKey;
  return "unknown";
}

/**
 * Build the payload union member matching a given feKey, copying only the
 * fields modelled for that key. Unknown vendor fields are funneled into
 * `extra` (DEBUG SURFACE — do not consume in production).
 */
function buildPayload(
  feKey: FeKey,
  raw: RawRecord,
  meta: RawRecord
): NotificationPayload {
  const extra = { ...meta };

  switch (feKey) {
    case "face":
      return {
        feKey,
        person: isRecord(meta.person)
          ? {
              fullName: asNullableText(meta.person.fullName) ?? undefined,
              gender: asNullableText(meta.person.gender) ?? undefined,
            }
          : undefined,
        cameraName: asNullableText(meta.cameraName) ?? undefined,
        cropImg: asNullableText(meta.cropImg) ?? undefined,
        fullFrame: asNullableText(meta.fullFrame) ?? undefined,
        province: asNullableText(meta.province) ?? undefined,
        timeInISO: asNullableText(meta.timeInISO) ?? undefined,
        timeOutISO: asNullableText(meta.timeOutISO) ?? undefined,
        extra,
      };
    case "plate":
      return {
        feKey,
        plateText: asNullableText(meta.plateText) ?? undefined,
        confidence: Array.isArray(meta.confidence)
          ? (meta.confidence.filter(
              (n) => typeof n === "number"
            ) as number[])
          : undefined,
        cameraName: asNullableText(meta.cameraName) ?? undefined,
        platePicture: asNullableText(meta.platePicture) ?? undefined,
        province: asNullableText(meta.province) ?? undefined,
        timestamp: asNullableText(meta.timestamp) ?? undefined,
        extra,
      };
    case "motion":
      return {
        feKey,
        cameraName: asNullableText(meta.cameraName) ?? undefined,
        durationSec: asNumber(meta.durationSec),
        extra,
      };
    case "fire":
      return {
        feKey,
        cameraName: asNullableText(meta.cameraName) ?? undefined,
        intensity: asNumber(meta.intensity),
        extra,
      };
    case "offline":
      return {
        feKey,
        lastSeenAt: asNullableText(meta.lastSeenAt) ?? undefined,
        extra,
      };
    case "online":
      return { feKey, extra };
    case "electric_low":
      return {
        feKey,
        observedW: asNumber(meta.observedW),
        thresholdW: asNumber(meta.thresholdW),
        extra,
      };
    case "fall":
      return {
        feKey,
        location: asNullableText(meta.location) ?? undefined,
        cameraName: asNullableText(meta.cameraName) ?? undefined,
        extra,
      };
    case "sleep":
      return {
        feKey,
        durationMin: asNumber(meta.durationMin),
        extra,
      };
    case "bp_critical":
    case "bp_warning":
      return {
        feKey,
        systolic: asNumber(meta.systolic),
        diastolic: asNumber(meta.diastolic),
        extra,
      };
    case "medical":
      return { feKey, extra };
    case "sos":
      return {
        feKey,
        triggeredBy: asNullableText(meta.triggeredBy) ?? undefined,
        extra,
      };
    case "assistant":
      return {
        feKey,
        intent: asNullableText(meta.intent) ?? undefined,
        transcript: asNullableText(meta.transcript) ?? undefined,
        extra,
      };
    case "water_leak":
      return {
        feKey,
        flowLpm: asNumber(meta.flowLpm),
        estimatedLossLiters: asNumber(meta.estimatedLossLiters),
        extra,
      };
    case "water_backflow":
      return { feKey, extra };
    case "air_pm25":
      return {
        feKey,
        pm25: asNumber(meta.pm25),
        pm10: asNumber(meta.pm10),
        extra,
      };
    case "unknown":
    default:
      return {
        feKey: "unknown",
        titleKey: asNullableText(raw.titleKey),
        extra,
      };
  }
}

export function adaptLegacyV1Notification(
  raw: unknown,
  catalog: CatalogMap
): NotificationDTO | null {
  if (!isRecord(raw)) return null;
  const id = asText(raw.id);
  if (!id) return null;

  const titleKey = asNullableText(raw.titleKey ?? raw.title_key);
  const feKey = resolveFeKey(titleKey, catalog);
  const catalogEntry = titleKey ? catalog[titleKey] : undefined;

  const occurredAt = asText(
    raw.occurredAt ?? raw.occurred_at ?? raw.date ?? new Date().toISOString()
  );

  const meta = isRecord(raw.meta) ? raw.meta : {};

  const lat = asNumber(raw.lat);
  const lng = asNumber(raw.lng);
  const siteId = asNullableText(raw.siteId ?? raw.site_id);
  const siteCode = asNullableText(raw.siteCode ?? raw.site_code);
  const siteName = asNullableText(raw.siteName ?? raw.site_name);
  const site =
    siteId || siteCode || siteName
      ? {
          id: siteId ?? "",
          code: siteCode ?? "",
          name: siteName ?? siteCode ?? "",
          coords:
            typeof lat === "number" && typeof lng === "number"
              ? { lat, lng }
              : null,
        }
      : null;

  const deviceId = asNullableText(raw.deviceId ?? raw.device_id);
  const deviceModel = asNullableText(raw.deviceModel ?? raw.device_model);
  const device = deviceId
    ? {
        id: deviceId,
        model: deviceModel ?? undefined,
        type: asNullableText(raw.deviceType ?? raw.device_type) ?? undefined,
      }
    : null;

  const img = asNullableText(raw.img);
  const image = img ? { url: img } : null;

  const isRead = Boolean(raw.isRead ?? raw.is_read);
  const readAt = asNullableText(raw.readAt ?? raw.read_at);

  return {
    id,
    titleKey,
    feKey,
    type: catalogEntry?.type ?? normalizeNotiType(raw.type),
    severity: catalogEntry?.severity ?? normalizeSeverity(raw.severity),
    title: asText(catalogEntry?.labelTh ?? raw.title ?? titleKey ?? "-"),
    icon: catalogEntry?.icon ?? null,
    occurredAt,
    site,
    device,
    image,
    payload: buildPayload(feKey, raw, meta),
    read: { isRead, readAt },
  };
}

export function adaptV2Notification(raw: unknown): NotificationDTO | null {
  if (!isRecord(raw)) return null;
  const id = asText(raw.id);
  if (!id) return null;
  // The v2 shape is already canonical — pass through after a shallow type
  // assertion. Defensive normalization for fields the FE depends on:
  const payload =
    isRecord(raw.payload) && typeof raw.payload.feKey === "string"
      ? (raw.payload as unknown as NotificationPayload)
      : ({ feKey: "unknown", extra: {} } as NotificationPayload);

  return {
    id,
    titleKey: asNullableText(raw.titleKey),
    feKey: (payload.feKey as FeKey) ?? "unknown",
    type: normalizeNotiType(raw.type),
    severity: normalizeSeverity(raw.severity),
    title: asText(raw.title),
    icon: asNullableText(raw.icon),
    occurredAt: asText(raw.occurredAt),
    site:
      isRecord(raw.site)
        ? {
            id: asText(raw.site.id),
            code: asText(raw.site.code),
            name: asText(raw.site.name),
            coords:
              isRecord(raw.site.coords) &&
              typeof raw.site.coords.lat === "number" &&
              typeof raw.site.coords.lng === "number"
                ? {
                    lat: raw.site.coords.lat,
                    lng: raw.site.coords.lng,
                  }
                : null,
          }
        : null,
    device:
      isRecord(raw.device) && asText(raw.device.id)
        ? {
            id: asText(raw.device.id),
            model: asNullableText(raw.device.model) ?? undefined,
            type: asNullableText(raw.device.type) ?? undefined,
          }
        : null,
    image:
      isRecord(raw.image) && asText(raw.image.url)
        ? { url: asText(raw.image.url) }
        : null,
    payload,
    read:
      isRecord(raw.read)
        ? {
            isRead: Boolean(raw.read.isRead),
            readAt: asNullableText(raw.read.readAt),
          }
        : { isRead: false, readAt: null },
  };
}
