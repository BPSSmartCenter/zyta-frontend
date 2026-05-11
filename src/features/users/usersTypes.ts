// src/features/users/usersTypes.ts
//
// Type definitions and shape normalizer for the /users/me consolidated
// response. Backend ships sites + counters + electricOverview + userStats
// + siteGroups + utilities all in one /me payload, eliminating the previous
// N+1 dashboard fetches.

export type UserRole = "admin" | "manager" | "officer" | "user";

export type MeUserStats = {
  total: number;
  byRole: { admin: number; manager: number; officer: number; user: number };
};

export type MeSiteGroup = {
  id: string;
  name: string;
  code: string | null;
  utility_id: string | null;
};

export type MeUtility = {
  id: string;
  name: string;
  code: string | null;
};

export type MeSiteBilling = {
  allowElectricBilling: boolean;
  allowWaterBilling: boolean;
  onPeakRate: number | null;
  offPeakRate: number | null;
  discountRate: number | null;
  ftRate: number | null;
  co2Factor: number | null;
  treeFactor: number | null;
};

export type MeSiteCounters = {
  devices_total: number;
  devices_camera: number;
  devices_intercom: number;
  devices_water: number;
  devices_electric: number;
  devices_air: number;
  devices_electric_online: number;
  devices_electric_offline: number;
  notis_total: number;
  notis_alert: number;
  notis_warning: number;
  notis_info: number;
  notis_normal: number;
  users_count: number;
};

export type MeSiteElectricOverview = {
  lastUpdateTime: string | null;
  now: {
    unit: string;
    pv_kw: number;
    load_kw: number;
    grid_kw: number;
    storage_kw: number;
  };
  today_kwh: number;
  month_kwh: number;
  lastYear_kwh: number;
  lifetime_kwh: number;
  avg_year_day_kwh: number;
  threshold_90_day_kwh: number;
};

export type MeSite = {
  id: string;
  code: string;
  name: string;
  lat: number | null;
  lng: number | null;
  province_code: string | null;
  zipcode: string | null;
  address_province: string | null;
  address_district: string | null;
  address_sub: string | null;
  address_line: string | null;
  site_group_id: string | null;
  utility_id: string | null;
  brandingLogoUrl: string | null;
  inverterApiType: "solaredge" | "soliscloud" | string | null;
  billing: MeSiteBilling;
  counters: MeSiteCounters;
  electricOverview: MeSiteElectricOverview | null;
  // Allow extra unknown fields for forward-compat with future backend additions.
  [key: string]: unknown;
};

export type MeResponse = {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  brandingLogoUrl: string | null;
  userStats: MeUserStats;
  siteGroups: MeSiteGroup[];
  utilities: MeUtility[];
  sites: MeSite[];
};

export type UserStatsResponse = MeUserStats;

// ---------------------------------------------------------------------------
// Admin user types (kept from before — used by user management pages)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Normalize helpers
// ---------------------------------------------------------------------------

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

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
  return false;
}

function normalizeRole(value: unknown): UserRole {
  const role = asText(value).toLowerCase();
  if (role === "admin" || role === "manager" || role === "officer" || role === "user") {
    return role;
  }
  return "user";
}

function unwrapUserPayload(payload: unknown): unknown {
  if (!isRecord(payload)) return payload;
  return payload.user ?? payload.currentUser ?? payload.me ?? payload;
}

function normalizeUserStats(raw: unknown): MeUserStats {
  if (!isRecord(raw)) {
    return { total: 0, byRole: { admin: 0, manager: 0, officer: 0, user: 0 } };
  }
  const byRole = isRecord(raw.byRole) ? raw.byRole : {};
  return {
    total: asNumber(raw.total),
    byRole: {
      admin: asNumber(byRole.admin),
      manager: asNumber(byRole.manager),
      officer: asNumber(byRole.officer),
      user: asNumber(byRole.user),
    },
  };
}

function normalizeSiteGroup(raw: unknown): MeSiteGroup | null {
  if (!isRecord(raw)) return null;
  const id = asText(raw.id);
  if (!id) return null;
  return {
    id,
    name: asText(raw.name),
    code: asNullableText(raw.code),
    utility_id: asNullableText(raw.utility_id),
  };
}

function normalizeUtility(raw: unknown): MeUtility | null {
  if (!isRecord(raw)) return null;
  const id = asText(raw.id);
  if (!id) return null;
  return {
    id,
    name: asText(raw.name),
    code: asNullableText(raw.code),
  };
}

function normalizeBilling(raw: unknown): MeSiteBilling {
  const r = isRecord(raw) ? raw : {};
  return {
    allowElectricBilling: asBool(r.allowElectricBilling),
    allowWaterBilling: asBool(r.allowWaterBilling),
    onPeakRate: asNullableNumber(r.onPeakRate),
    offPeakRate: asNullableNumber(r.offPeakRate),
    discountRate: asNullableNumber(r.discountRate),
    ftRate: asNullableNumber(r.ftRate),
    co2Factor: asNullableNumber(r.co2Factor),
    treeFactor: asNullableNumber(r.treeFactor),
  };
}

function normalizeCounters(raw: unknown): MeSiteCounters {
  const r = isRecord(raw) ? raw : {};
  return {
    devices_total: asNumber(r.devices_total),
    devices_camera: asNumber(r.devices_camera),
    devices_intercom: asNumber(r.devices_intercom),
    devices_water: asNumber(r.devices_water),
    devices_electric: asNumber(r.devices_electric),
    devices_air: asNumber(r.devices_air),
    devices_electric_online: asNumber(r.devices_electric_online),
    devices_electric_offline: asNumber(r.devices_electric_offline),
    notis_total: asNumber(r.notis_total),
    notis_alert: asNumber(r.notis_alert),
    notis_warning: asNumber(r.notis_warning),
    notis_info: asNumber(r.notis_info),
    notis_normal: asNumber(r.notis_normal),
    users_count: asNumber(r.users_count),
  };
}

function normalizeElectricOverview(raw: unknown): MeSiteElectricOverview | null {
  if (!isRecord(raw)) return null;
  const now = isRecord(raw.now) ? raw.now : {};
  return {
    lastUpdateTime: asNullableText(raw.lastUpdateTime),
    now: {
      unit: asText(now.unit) || "kW",
      pv_kw: asNumber(now.pv_kw),
      load_kw: asNumber(now.load_kw),
      grid_kw: asNumber(now.grid_kw),
      storage_kw: asNumber(now.storage_kw),
    },
    today_kwh: asNumber(raw.today_kwh),
    month_kwh: asNumber(raw.month_kwh),
    lastYear_kwh: asNumber(raw.lastYear_kwh),
    lifetime_kwh: asNumber(raw.lifetime_kwh),
    avg_year_day_kwh: asNumber(raw.avg_year_day_kwh),
    threshold_90_day_kwh: asNumber(raw.threshold_90_day_kwh),
  };
}

function normalizeSite(raw: unknown): MeSite | null {
  if (!isRecord(raw)) return null;
  const id = asText(raw.id);
  const code = asText(raw.code);
  const name = asText(raw.name);
  if (!id && !code && !name) return null;
  return {
    ...raw,
    id: id || code || name,
    code,
    name: name || code,
    lat: asNullableNumber(raw.lat ?? raw.latitude),
    lng: asNullableNumber(raw.lng ?? raw.longitude),
    province_code: asNullableText(raw.province_code ?? raw.provinceCode),
    zipcode: asNullableText(raw.zipcode),
    address_province: asNullableText(raw.address_province),
    address_district: asNullableText(raw.address_district),
    address_sub: asNullableText(raw.address_sub),
    address_line: asNullableText(raw.address_line),
    site_group_id: asNullableText(raw.site_group_id ?? raw.siteGroupId),
    utility_id: asNullableText(raw.utility_id ?? raw.utilityId),
    brandingLogoUrl: asNullableText(raw.brandingLogoUrl),
    inverterApiType: asNullableText(raw.inverterApiType ?? raw.inverter_api_type),
    billing: normalizeBilling(raw.billing),
    counters: normalizeCounters(raw.counters),
    electricOverview: normalizeElectricOverview(raw.electricOverview),
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

  return {
    id,
    email: asText(user.email),
    role: normalizeRole(user.role),
    firstName: asText(user.firstName ?? user.first_name ?? user.firstname),
    lastName: asText(user.lastName ?? user.last_name ?? user.lastname),
    emailVerified: asBool(user.emailVerified ?? user.email_verified),
    brandingLogoUrl:
      asNullableText(user.brandingLogoUrl ?? user.branding_logo_url),
    userStats: normalizeUserStats(user.userStats),
    siteGroups: Array.isArray(user.siteGroups)
      ? user.siteGroups
          .map(normalizeSiteGroup)
          .filter((g): g is MeSiteGroup => g !== null)
      : [],
    utilities: Array.isArray(user.utilities)
      ? user.utilities
          .map(normalizeUtility)
          .filter((u): u is MeUtility => u !== null)
      : [],
    sites: Array.isArray(user.sites)
      ? user.sites
          .map(normalizeSite)
          .filter((s): s is MeSite => s !== null)
      : [],
  };
}
