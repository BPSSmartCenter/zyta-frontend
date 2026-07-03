import { createAsyncThunk } from "@reduxjs/toolkit";
import { listNotifications } from "../notifications";
import type { Noti } from "../../data/Dashboard/notis";
import type { RootState } from "../../store/store";
import { decorateNotiForDisplay, sortByNewest } from "../../utils/notis";
import { selectDateFilterValue } from "../dateFilter";
import {
  selectAccessibleSites,
  selectSelectedGroup,
  selectSelectedSite,
  selectSelectedUtility,
  type SelectedGroupSite,
  type SelectedUtility,
  type SiteOption,
} from "../siteSelection";

type FetchNotisFeedResult = {
  items: Noti[];
};

export type FetchNotisFeedError = {
  code: "FETCH_FAILED";
  message: string;
};

type SiteScope = {
  selectedSite: string | null;
  selectedGroupSite: SelectedGroupSite;
  selectedUtility: SelectedUtility;
  accessibleSites: SiteOption[];
};

const prepareNotis = (items: Noti[]): Noti[] =>
  sortByNewest(items.map((item) => decorateNotiForDisplay(item)));

const toIsoRangeForDate = (date: { y: number; m: number; d: number }) => {
  const from = new Date(date.y, date.m - 1, date.d, 0, 0, 0, 0);
  const to = new Date(date.y, date.m - 1, date.d, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Failed to load notifications";
}

function toRequestedSiteCode(
  selectedSite: string | null,
  selectedGroupSite: SelectedGroupSite
): string | undefined {
  if (selectedSite && selectedSite !== "all") return selectedSite;

  const groupId = String(selectedGroupSite?.id || "").trim();
  if (!groupId) return undefined;

  const normalized = groupId.toLowerCase();
  if (normalized.startsWith("__site:") || normalized.startsWith("__bps:")) {
    const tail = groupId.split(":").pop()?.trim();
    return tail || undefined;
  }

  return groupId;
}

function buildScopedSiteCodes(scope: SiteScope): Set<string> | null {
  const isAll = !scope.selectedSite || scope.selectedSite === "all";
  if (!isAll) return null;

  const hasGroupFilter = Boolean(
    scope.selectedUtility?.id || scope.selectedGroupSite?.id
  );
  if (!hasGroupFilter) return null;

  const codes = new Set<string>();
  for (const option of scope.accessibleSites) {
    const code = String(option.value || "").trim();
    if (!code || code.toLowerCase() === "all") continue;
    if (
      scope.selectedUtility?.id &&
      option.utilityId !== scope.selectedUtility.id
    ) {
      continue;
    }
    if (scope.selectedGroupSite?.id) {
      if (
        option.groupId !== scope.selectedGroupSite.id &&
        option.groupLabel !== scope.selectedGroupSite.label
      ) {
        continue;
      }
    }
    codes.add(code);
  }

  return codes.size > 0 ? codes : null;
}

function matchesActiveSiteCode(noti: Noti, codes: Set<string>): boolean {
  const candidates = [
    noti.siteCode,
    noti.siteId,
    noti.siteName,
    noti.site,
    (noti as Record<string, unknown>).site_code,
    (noti as Record<string, unknown>).site_id,
  ];

  return candidates
    .filter((candidate): candidate is string => typeof candidate === "string")
    .some((candidate) => codes.has(candidate.trim()));
}

function filterFetchedNotisByScope(items: Noti[], scope: SiteScope): Noti[] {
  const isAll = !scope.selectedSite || scope.selectedSite === "all";
  const scopedSiteCodes = buildScopedSiteCodes(scope);
  const activeFilter = scopedSiteCodes;

  // When selectedSite is "all" with no group/utility scope, backend already
  // returns user-scoped notifications. Applying an extra client-side filter by
  // site code can drop valid events that only carry siteId/siteName.
  if (isAll && !activeFilter) return items;

  if (!activeFilter) return items;
  return items.filter((noti) => matchesActiveSiteCode(noti, activeFilter));
}

export const fetchNotisFeed = createAsyncThunk<
  FetchNotisFeedResult,
  void,
  { state: RootState; rejectValue: FetchNotisFeedError }
>("notisFeed/fetch", async (_, { getState, rejectWithValue }) => {
  const state = getState();
  const date = selectDateFilterValue(state);
  const selectedSite = selectSelectedSite(state);
  const selectedGroupSite = selectSelectedGroup(state);
  const selectedUtility = selectSelectedUtility(state);
  const accessibleSites = selectAccessibleSites(state);

  try {
    const range = toIsoRangeForDate(date);
    const requestedSiteCode = toRequestedSiteCode(
      selectedSite,
      selectedGroupSite
    );
    const fetched = await listNotifications({
      from: range.from,
      to: range.to,
      siteCode: requestedSiteCode,
      limit: 500,
    });

    const scoped = filterFetchedNotisByScope(fetched, {
      selectedSite,
      selectedGroupSite,
      selectedUtility,
      accessibleSites,
    });

    return {
      items: prepareNotis(scoped),
    };
  } catch (error) {
    return rejectWithValue({
      code: "FETCH_FAILED",
      message: getErrorMessage(error),
    });
  }
});
