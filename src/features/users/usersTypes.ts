// src/features/users/usersTypes.ts
//
// Type definitions and shape normalizers for the /users/* endpoints.

export type UserRole = "admin" | "manager" | "officer" | "user";

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

export type UserStatsResponse = {
  total: number;
  byRole: { admin: number; manager: number; officer: number; user: number };
};

export type AdminUserDto = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  sites?: Array<{ id: string; code?: string; name?: string }>;
  brandingLogoUrl?: string | null;
};

export type UserSearchDto = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
  siteIds: string[];
  inManagedScope: boolean;
  manageableSiteIds: string[];
  manageableSites: Array<{ id: string; name?: string; code?: string }>;
};

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  siteIds?: string[];
  brandingLogoDataUrl?: string;
};

export type UpdateUserInput = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  active: boolean;
  siteIds: string[];
  brandingLogoDataUrl: string;
  removeBrandingLogo: boolean;
}>;

type RawRecord = Record<string, unknown>;

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
  if (!isRecord(payload)) return payload;
  return payload.user ?? payload.currentUser ?? payload.me ?? payload;
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
    province_code: asOptionalText(site.province_code ?? site.provinceCode),
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
