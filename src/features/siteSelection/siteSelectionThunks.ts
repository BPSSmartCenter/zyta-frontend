// src/features/siteSelection/siteSelectionThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { MeResponse, MeSite } from "../users/usersTypes";
import type { RootState } from "../../store/store";
import type { SiteOption } from "./siteSelectionTypes";
import { readStoredSite, writeStoredSite } from "./siteSelectionStorage";

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function asNullableText(value: unknown): string | null {
  const text = asText(value);
  return text.length > 0 ? text : null;
}

/**
 * Map a /me site (full data) → picker SiteOption.
 * Group/utility labels are looked up from the /me payload's siteGroups +
 * utilities tables — no extra fetch needed.
 */
function meSiteToOption(
  site: MeSite,
  groupsById: Map<string, string>,
  utilitiesById: Map<string, string>
): SiteOption | null {
  const value = asText(site.code) || asText(site.id) || asText(site.name);
  if (!value) return null;
  const label = asText(site.name) || value;
  const groupId = site.site_group_id ?? null;
  const utilityId = site.utility_id ?? null;
  return {
    label,
    value,
    groupId,
    groupLabel: groupId ? (groupsById.get(groupId) ?? null) : null,
    utilityId,
    utilityLabel: utilityId ? (utilitiesById.get(utilityId) ?? null) : null,
  };
}

function buildCatalogFromMe(me: MeResponse): LoadSiteCatalogResult {
  const groupsById = new Map<string, string>(
    me.siteGroups
      .filter((g) => g.id && g.name)
      .map((g) => [g.id, g.name] as const)
  );
  const utilitiesById = new Map<string, string>(
    me.utilities
      .filter((u) => u.id && u.name)
      .map((u) => [u.id, u.name] as const)
  );
  const options = me.sites
    .map((s) => meSiteToOption(s, groupsById, utilitiesById))
    .filter((opt): opt is SiteOption => opt !== null);
  return {
    isAdmin: me.role === "admin",
    sites: dedupOptions(options),
    uid: me.id || null,
  };
}

/** Legacy normalizer — still used by callers that get raw site objects from
 * other endpoints (e.g. cardSandbox /sites fetch). Kept exported. */
export function normalizeSiteToOption(site: unknown): SiteOption | null {
  if (!isRecord(site)) return null;
  const rawLabel = site.name ?? site.code ?? site.id ?? "";
  const rawValue = site.code ?? site.id ?? site.name ?? "";
  const groupFromApi =
    (isRecord(site.site_group) && site.site_group) ||
    (isRecord(site.site_groups) && site.site_groups) ||
    (isRecord(site.siteGroup) && site.siteGroup) ||
    (isRecord(site.group) && site.group) ||
    null;
  const utilityFromApi =
    (isRecord(site.utility) && site.utility) ||
    (groupFromApi && isRecord(groupFromApi.utility) && groupFromApi.utility) ||
    null;
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
 * Build the site picker catalog from a single /users/me probe.
 *
 * The consolidated /me payload now includes sites, siteGroups, and utilities
 * — so we no longer call /sites or /site-groups here. Group/utility labels
 * come from the embedded lookup tables in the same response.
 */
/**
 * Build picker catalog from auth state (no network).
 *
 * The bootstrap probe (`bootstrapAuth` thunk dispatched in main.tsx) already
 * fetches `/users/me` once on app start and stores the full consolidated
 * payload in `state.auth.user`. This thunk just re-shapes that data into
 * `SiteOption[]` for the picker — no second /me request.
 *
 * If auth.user is missing (race condition or bootstrap failed),
 * BootstrapSitesGate will not have mounted this dispatch in the first place
 * (it guards on `user?.id`), but we still reject with UNAUTHORIZED defensively.
 */
export const loadSiteCatalog = createAsyncThunk<
  LoadSiteCatalogResult,
  void,
  { state: RootState; rejectValue: LoadSiteCatalogError }
>("siteSelection/loadCatalog", async (_, { getState, rejectWithValue }) => {
  const me = getState().auth.user;
  if (!me) {
    return rejectWithValue({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  return buildCatalogFromMe(me as MeResponse);
});

export type HydrateSelectionInput = {
  uid: string;
  urlSiteCode?: string | null;
};

export type HydrateSelectionResult =
  | { kind: "resolved"; value: string; source: "url" | "storage" | "auto-single" }
  | { kind: "needs-picker" }
  | { kind: "no-access" };

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

  if (urlSiteCode) {
    const norm = urlSiteCode.trim().toLowerCase();
    if (validValues.has(norm)) {
      const match = sites.find((s) => s.value.toLowerCase() === norm);
      const value = match ? match.value : urlSiteCode.trim();
      writeStoredSite(uid, value);
      return { kind: "resolved", value, source: "url" };
    }
  }

  const stored = readStoredSite(uid);
  if (stored) {
    const norm = stored.toLowerCase();
    if (validValues.has(norm)) {
      const match = sites.find((s) => s.value.toLowerCase() === norm);
      const value = norm === "all" ? "all" : match ? match.value : stored;
      return { kind: "resolved", value, source: "storage" };
    }
  }

  if (sites.length === 1) {
    const only = sites[0].value;
    writeStoredSite(uid, only);
    return { kind: "resolved", value: only, source: "auto-single" };
  }

  return { kind: "needs-picker" };
});
