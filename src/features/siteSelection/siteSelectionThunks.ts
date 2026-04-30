// src/features/siteSelection/siteSelectionThunks.ts
//
// Async thunks for loading site catalog and hydrating initial selection.
// Logic ย้ายมาจาก FiltersContext (listSites + listSiteGroups + apiMe)
// เพื่อให้ Redux เป็น single source of truth

import { createAsyncThunk } from "@reduxjs/toolkit";
import { me as apiMe } from "../../api/user";
import { listSites } from "../../api/sites";
import { listSiteGroups } from "../../api/siteGroups";
import type { SiteOption } from "./siteSelectionTypes";
import { readStoredSite, writeStoredSite } from "./siteSelectionStorage";

// ─────────────────────────────────────────────────────────
// Helpers (pure)
// ─────────────────────────────────────────────────────────

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function asRecord(value: unknown): ApiRecord | null {
  return isRecord(value) ? value : null;
}

function asText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function asNullableText(value: unknown): string | null {
  const text = asText(value);
  return text.length > 0 ? text : null;
}

function arrayFromResponse(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.items)) return value.items;
  const data = isRecord(value) ? value.data : undefined;
  if (Array.isArray(data)) return data;
  if (isRecord(data) && Array.isArray(data.items)) return data.items;
  return [];
}

function getHttpStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  const response = asRecord(error.response);
  const status = response?.status;
  return typeof status === "number" ? status : undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function getErrorMessage(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  return typeof error.message === "string" ? error.message : undefined;
}

/** Normalize raw site object จาก API → SiteOption */
export function normalizeSiteToOption(site: unknown): SiteOption | null {
  if (!isRecord(site)) return null;
  const rawLabel = site.name ?? site.code ?? site.id ?? "";
  const rawValue = site.code ?? site.id ?? site.name ?? "";
  const groupFromApi =
    asRecord(site.site_group) ??
    asRecord(site.site_groups) ??
    asRecord(site.siteGroup) ??
    asRecord(site.group);
  // Direct utility on the site takes priority; fallback to group's utility
  const utilityFromApi =
    asRecord(site.utility) ??
    asRecord(groupFromApi?.utility) ??
    asRecord(groupFromApi?.utilities);
  const utilityId =
    asNullableText(utilityFromApi?.id) ??
    asNullableText(site.utility_id) ??
    asNullableText(site.utilityId);
  const utilityLabel = asNullableText(utilityFromApi?.name);
  const label = asText(rawLabel);
  const value = asText(rawValue);
  if (!value) return null;
  return {
    label: label || value,
    value,
    groupLabel:
      asNullableText(groupFromApi?.name) ??
      asNullableText(site.site_group_name) ??
      asNullableText(site.siteGroupName) ??
      asNullableText(site.group_name),
    groupId:
      asNullableText(groupFromApi?.id) ??
      asNullableText(site.site_group_id) ??
      asNullableText(site.siteGroupId),
    utilityId,
    utilityLabel,
  };
}

/** Dedup options by value (case-insensitive) */
function dedupOptions(options: SiteOption[]): SiteOption[] {
  const seen = new Set<string>();
  const list: SiteOption[] = [];
  for (const opt of options) {
    const key = opt.value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(opt);
  }
  return list;
}

// ─────────────────────────────────────────────────────────
// Thunk: loadSiteCatalog
// ─────────────────────────────────────────────────────────

export type LoadSiteCatalogResult = {
  isAdmin: boolean;
  sites: SiteOption[];
  uid: string | null;
};

export type LoadSiteCatalogError = {
  code: "UNAUTHORIZED" | "NETWORK" | "UNKNOWN";
  message: string;
};

/**
 * โหลด catalog ไซต์ที่ user เข้าถึงได้
 *
 * Logic:
 * - admin role → ดึงทั้งหมดจาก listSites() (global catalog)
 * - non-admin + มี user.sites → ใช้ user.sites + enrich metadata จาก catalog ถ้าเข้าถึงได้
 * - non-admin + ไม่มี user.sites → คืน [] (ไม่มีสิทธิ์)
 *
 * ไม่ throw สำหรับ "user ไม่มีสิทธิ์" — คืน { sites: [] } แทน
 * Reject เฉพาะ network/auth error
 */
export const loadSiteCatalog = createAsyncThunk<
  LoadSiteCatalogResult,
  void,
  { rejectValue: LoadSiteCatalogError }
>("siteSelection/loadCatalog", async (_, { rejectWithValue }) => {
  try {
    const currentUser = await apiMe();
    const uid = currentUser?.id ?? null;
    const isAdmin = String(currentUser?.role || "").toLowerCase() === "admin";

    const assignedOptions: SiteOption[] = Array.isArray(currentUser?.sites)
      ? currentUser.sites
          .map((site) => normalizeSiteToOption(site))
          .filter((opt): opt is SiteOption => Boolean(opt))
      : [];

    // พยายามดึง site groups (เพื่อ enrich groupLabel ในกรณี assigned ไม่ได้ populate ครบ)
    let groupsById = new Map<string, string>();
    try {
      const groups = await listSiteGroups();
      groupsById = new Map(
        (Array.isArray(groups) ? groups : [])
          .map((group): [string, string] => [
            String(group?.id || "").trim(),
            String(group?.name || "").trim(),
          ])
          .filter(([id, name]) => id.length > 0 && name.length > 0)
      );
    } catch {
      groupsById = new Map();
    }

    // ดึง catalog จาก /sites — ใช้สำหรับ admin (แทน assigned) หรือ non-admin (enrich)
    let catalogOptions: SiteOption[] = [];
    try {
      const sitesResp: unknown = await listSites();
      const items = arrayFromResponse(sitesResp);
      catalogOptions = items
        .map((site) => normalizeSiteToOption(site))
        .map((opt: SiteOption | null) => {
          if (!opt) return null;
          if (opt.groupLabel || !opt.groupId) return opt;
          const name = groupsById.get(String(opt.groupId).trim());
          return name ? { ...opt, groupLabel: name } : opt;
        })
        .filter((opt: SiteOption | null): opt is SiteOption => Boolean(opt));
    } catch {
      catalogOptions = [];
    }

    let baseOptions: SiteOption[] = [];
    if (isAdmin) {
      baseOptions = catalogOptions;
    } else if (assignedOptions.length > 0) {
      // enrich metadata จาก catalog แต่ไม่เพิ่มไซต์นอก scope
      const catalogByValue = new Map(
        catalogOptions.map((opt) => [opt.value.toLowerCase(), opt] as const)
      );
      baseOptions = assignedOptions.map((opt) => {
        const catalog = catalogByValue.get(opt.value.toLowerCase());
        if (!catalog) return opt;
        return {
          ...opt,
          groupLabel: opt.groupLabel ?? catalog.groupLabel ?? null,
          groupId: opt.groupId ?? catalog.groupId ?? null,
          utilityId: opt.utilityId ?? catalog.utilityId ?? null,
          utilityLabel: opt.utilityLabel ?? catalog.utilityLabel ?? null,
        };
      });
    } else {
      baseOptions = [];
    }

    return {
      isAdmin,
      sites: dedupOptions(baseOptions),
      uid,
    };
  } catch (error: unknown) {
    const status = getHttpStatus(error);
    if (status === 401 || status === 403) {
      return rejectWithValue({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }
    if (getErrorCode(error) === "ERR_NETWORK" || !status) {
      return rejectWithValue({
        code: "NETWORK",
        message: "Network error",
      });
    }
    return rejectWithValue({
      code: "UNKNOWN",
      message: getErrorMessage(error) ?? "Failed to load sites",
    });
  }
});

// ─────────────────────────────────────────────────────────
// Thunk: hydrateSelection
// ─────────────────────────────────────────────────────────

export type HydrateSelectionInput = {
  /** uid ปัจจุบันจาก URL หรือ auth — ใช้เป็น key สำหรับ sessionStorage */
  uid: string;
  /** ถ้า URL มี :siteCode ให้ส่งมา (จะ priority สูงสุด) */
  urlSiteCode?: string | null;
};

export type HydrateSelectionResult =
  | {
      kind: "resolved";
      /** ค่าที่เลือก ("all" หรือ site code) */
      value: string;
      /** source ที่มาของค่า (สำหรับ debug/analytics) */
      source: "url" | "storage" | "auto-single";
    }
  | {
      kind: "needs-picker";
      /** เปิด modal แบบ forced (ผู้ใช้มีหลายไซต์ ต้องเลือก) */
    }
  | {
      kind: "no-access";
      /** ไม่มีไซต์ให้เลือกเลย (non-admin, no assigned sites) */
    };

/**
 * Resolve initial selection หลัง catalog โหลดเสร็จ
 *
 * Priority:
 *   1. URL `:siteCode` (ถ้า user มีสิทธิ์)
 *   2. sessionStorage (ถ้ายัง valid + site ยังอยู่ใน catalog)
 *   3. auto-select ถ้ามีไซต์เดียว
 *   4. else → needs-picker
 */
export const hydrateSelection = createAsyncThunk<
  HydrateSelectionResult,
  HydrateSelectionInput,
  { state: { siteSelection: { sites: SiteOption[] } } }
>("siteSelection/hydrate", async ({ uid, urlSiteCode }, { getState }) => {
  const { sites } = getState().siteSelection;

  if (sites.length === 0) {
    return { kind: "no-access" };
  }

  const validValues = new Set<string>(["all", ...sites.map((s) => s.value.toLowerCase())]);

  // 1) URL
  if (urlSiteCode) {
    const norm = urlSiteCode.trim().toLowerCase();
    if (validValues.has(norm)) {
      // หา casing ต้นฉบับ
      const match = sites.find((s) => s.value.toLowerCase() === norm);
      const value = match ? match.value : urlSiteCode.trim();
      writeStoredSite(uid, value);
      return { kind: "resolved", value, source: "url" };
    }
    // URL มี siteCode แต่ไม่มีสิทธิ์ — ไม่ auto-resolve, ตกลงสู่ขั้นตอนถัดไป
  }

  // 2) sessionStorage
  const stored = readStoredSite(uid);
  if (stored) {
    const norm = stored.toLowerCase();
    if (validValues.has(norm)) {
      const match = sites.find((s) => s.value.toLowerCase() === norm);
      const value = norm === "all" ? "all" : match ? match.value : stored;
      return { kind: "resolved", value, source: "storage" };
    }
  }

  // 3) auto-select ถ้ามีไซต์เดียว
  if (sites.length === 1) {
    const only = sites[0].value;
    writeStoredSite(uid, only);
    return { kind: "resolved", value: only, source: "auto-single" };
  }

  // 4) ต้อง force picker
  return { kind: "needs-picker" };
});
