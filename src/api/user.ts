// src/api/user.ts
import { api, unwrapApiData } from "./axios";

type RawRecord = Record<string, unknown>;
type UserRole = "admin" | "manager" | "officer" | "user";

export type MeSite = {
  id: string;
  code?: string;
  name?: string;
  province_code?: string;
  lat?: number;
  lng?: number;
  [key: string]: unknown;
};
export type MeResponse = {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  sites: MeSite[];
  brandingLogoUrl?: string | null;
};

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function asOptionalText(value: unknown): string | undefined {
  const text = asText(value);
  return text ? text : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeRole(value: unknown): UserRole {
  const role = asText(value).toLowerCase();
  if (
    role === "admin" ||
    role === "manager" ||
    role === "officer" ||
    role === "user"
  ) {
    return role;
  }
  return "user";
}

function unwrapUserPayload(payload: unknown): unknown {
  const unwrapped = unwrapApiData(payload);
  if (!isRecord(unwrapped)) return unwrapped;
  return unwrapped.user ?? unwrapped.currentUser ?? unwrapped.me ?? unwrapped;
}

function normalizeSite(site: unknown): MeSite | null {
  if (!isRecord(site)) return null;
  const id = asText(site.id ?? site.siteId ?? site.site_id);
  const code = asOptionalText(site.code ?? site.siteCode ?? site.site_code);
  const name = asOptionalText(site.name ?? site.siteName ?? site.site_name);

  if (!id && !code && !name) return null;

  return {
    ...site,
    id: id || code || name || "",
    code,
    name,
    province_code: asOptionalText(
      site.province_code ?? site.provinceCode
    ),
    lat: asNumber(site.lat ?? site.latitude),
    lng: asNumber(site.lng ?? site.longitude),
  };
}

export function normalizeMeResponse(payload: unknown): MeResponse {
  const user = unwrapUserPayload(payload);
  if (!isRecord(user)) {
    throw new Error("Invalid /users/me response: expected user object");
  }

  const id = asText(user.id ?? user.userId ?? user.user_id ?? user.uuid);
  if (!id) {
    throw new Error("Invalid /users/me response: missing user id");
  }

  const rawSites =
    user.sites ?? user.assignedSites ?? user.assigned_sites ?? [];

  return {
    id,
    email: asText(user.email),
    role: normalizeRole(user.role),
    firstName: asText(user.firstName ?? user.first_name ?? user.firstname),
    lastName: asText(user.lastName ?? user.last_name ?? user.lastname),
    sites: Array.isArray(rawSites)
      ? rawSites
          .map(normalizeSite)
          .filter((site): site is MeSite => Boolean(site))
      : [],
    brandingLogoUrl:
      asOptionalText(user.brandingLogoUrl ?? user.branding_logo_url) ?? null,
  };
}

/**
 * GET /users/me
 *
 * @param opts.silent401
 *   ถ้า true: axios interceptor จะไม่ redirect/log เมื่อเจอ 401
 *   เหมาะกับเคส "probe cookie" ตอน boot app เพื่อเช็คว่ามี session valid ไหม
 *   — 401 ที่นี่เป็น expected, ไม่ใช่ bug
 */
export async function me(opts?: { silent401?: boolean }): Promise<MeResponse> {
  const { data } = await api.get("/users/me", {
    // ส่ง flag ผ่าน request config เพื่อให้ axios interceptor รู้ว่า 401 ครั้งนี้ตั้งใจ
    // (ดู src/api/axios.ts)
    ...(opts?.silent401 ? { _silent401: true } : {}),
  } as import("axios").AxiosRequestConfig);
  return normalizeMeResponse(data);
}

export type UserStatsResponse = {
  total: number;
  byRole: { admin: number; manager: number; officer: number; user: number };
};

export async function getUserStats(site?: string): Promise<UserStatsResponse> {
  const url = site ? `/users/stats?site=${encodeURIComponent(site)}` : "/users/stats";
  const { data } = await api.get(url);
  return data;
}
