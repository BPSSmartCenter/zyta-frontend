// src/features/siteSelection/siteSelectionThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ApiError, request, requestList } from "../../lib/http";
import { normalizeMeResponse, type MeResponse } from "../users/usersTypes";
import type { SiteGroup } from "../siteGroups/siteGroupsThunks";
import type { ListSitesResponse } from "../sites/sitesTypes";
import type { SiteOption } from "./siteSelectionTypes";
import { readStoredSite, writeStoredSite } from "./siteSelectionStorage";

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

export function normalizeSiteToOption(site: unknown): SiteOption | null {
  if (!isRecord(site)) return null;
  const rawLabel = site.name ?? site.code ?? site.id ?? "";
  const rawValue = site.code ?? site.id ?? site.name ?? "";
  const groupFromApi =
    asRecord(site.site_group) ??
    asRecord(site.site_groups) ??
    asRecord(site.siteGroup) ??
    asRecord(site.group);
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

export const loadSiteCatalog = createAsyncThunk<
  LoadSiteCatalogResult,
  void,
  { rejectValue: LoadSiteCatalogError }
>("siteSelection/loadCatalog", async (_, { rejectWithValue }) => {
  try {
    const meRaw = await request<unknown>("/users/me");
    const currentUser: MeResponse = normalizeMeResponse(meRaw);
    const uid = currentUser?.id ?? null;
    const isAdmin = String(currentUser?.role || "").toLowerCase() === "admin";

    const assignedOptions: SiteOption[] = Array.isArray(currentUser?.sites)
      ? currentUser.sites
          .map((site) => normalizeSiteToOption(site))
          .filter((opt): opt is SiteOption => Boolean(opt))
      : [];

    let groupsById = new Map<string, string>();
    try {
      const groups = await requestList<SiteGroup>("/site-groups");
      groupsById = new Map(
        groups
          .map((group): [string, string] => [
            String(group?.id || "").trim(),
            String(group?.name || "").trim(),
          ])
          .filter(([id, name]) => id.length > 0 && name.length > 0)
      );
    } catch {
      groupsById = new Map();
    }

    let catalogOptions: SiteOption[] = [];
    try {
      const sitesResp = await request<ListSitesResponse>("/sites");
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
    }

    return {
      isAdmin,
      sites: dedupOptions(baseOptions),
      uid,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 || error.status === 403) {
        return rejectWithValue({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }
      if (error.status === undefined) {
        return rejectWithValue({ code: "NETWORK", message: "Network error" });
      }
      return rejectWithValue({
        code: "UNKNOWN",
        message: error.message || "Failed to load sites",
      });
    }
    return rejectWithValue({
      code: "UNKNOWN",
      message: "Failed to load sites",
    });
  }
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
