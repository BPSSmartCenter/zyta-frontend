import React from "react";
import MapPanel from "../../components/Dashboard/MapPanel";
import { me as apiMe } from "../../api/user";
import { listSites } from "../../api/sites";
import { listNotis } from "../../api/notis";
import type { Noti } from "../../data/Dashboard/notis";
import { useFilters } from "../../context/FiltersContext";
import { useNotisFeed } from "../../context/NotisContext";
import {
  buildNotiKeywordBag,
  decorateNotiForDisplay,
  matchesSite,
  sortByNewest,
  toDateKey,
} from "../../utils/notis";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { cardSandboxActions } from "./cardSandboxSlice";
import { selectSandboxFilterGroupForCard } from "./cardSandboxSelectors";

type SandboxSite = {
  id?: string;
  code?: string;
  name?: string;
  province_code?: string;
  lat?: number;
  lng?: number;
  utility?: string;
  groupSite?: string;
};

type Props = {
  cardId: string;
};

const DEFAULT_SELECTED_EVENTS = ["all"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSiteList(value: unknown): SandboxSite[] {
  const list = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.items)
    ? value.items
    : [];

  return list
    .filter(isRecord)
    .map((site) => ({
      id: optionalString(site.id),
      code: optionalString(site.code),
      name: optionalString(site.name),
      province_code: optionalString(site.province_code),
      lat: optionalNumber(site.lat),
      lng: optionalNumber(site.lng),
      utility: optionalString(
        isRecord(site.utility) ? site.utility.name : site.utility
      ),
      groupSite: optionalString(
        site.groupSite ??
          site.group_site ??
          site.site_group_name ??
          (isRecord(site.site_group) ? site.site_group.name : undefined)
      ),
    }))
    .filter((site) => Boolean(site.id || site.code || site.name));
}

function mergeSiteMetadata(
  assignedSites: SandboxSite[],
  catalogSites: SandboxSite[]
) {
  const catalogByKey = new Map<string, SandboxSite>();
  for (const site of catalogSites) {
    [site.code, site.id, site.name]
      .filter(Boolean)
      .map(String)
      .forEach((key) => catalogByKey.set(key.toLowerCase(), site));
  }

  return assignedSites.map((site) => {
    const catalog =
      [site.code, site.id, site.name]
        .filter(Boolean)
        .map(String)
        .map((key) => catalogByKey.get(key.toLowerCase()))
        .find(Boolean) ?? null;
    if (!catalog) return site;
    return {
      ...site,
      province_code: site.province_code ?? catalog.province_code,
      lat: site.lat ?? catalog.lat,
      lng: site.lng ?? catalog.lng,
      utility: site.utility ?? catalog.utility,
      groupSite: site.groupSite ?? catalog.groupSite,
    };
  });
}

function toIsoRangeForDate(date: { y: number; m: number; d: number }) {
  const from = new Date(date.y, date.m - 1, date.d, 0, 0, 0, 0);
  const to = new Date(date.y, date.m - 1, date.d, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function todayValue() {
  const date = new Date();
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

function matchesScopedSiteCode(noti: Noti, codes: Set<string>) {
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

export default function SandboxMapPanelCard({ cardId }: Props) {
  const dispatch = useAppDispatch();
  const filterGroup = useAppSelector((state) =>
    selectSandboxFilterGroupForCard(state, cardId)
  );
  const { siteOptions } = useFilters();
  const { items: liveNotis } = useNotisFeed();
  const [accessibleSites, setAccessibleSites] = React.useState<SandboxSite[]>([]);
  const [remoteNotis, setRemoteNotis] = React.useState<Noti[] | null>(null);

  const fallbackDate = React.useMemo(() => todayValue(), []);
  const selectedDate = filterGroup?.date ?? fallbackDate;
  const selectedSite = filterGroup?.selectedSite ?? "all";
  const selectedEvents = filterGroup?.selectedEvents ?? DEFAULT_SELECTED_EVENTS;
  const severity = filterGroup?.severity ?? "all";
  const province = filterGroup?.province ?? "all";

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const currentUser = await apiMe();
        const role = String(currentUser?.role || "").toLowerCase();
        const assignedSites = normalizeSiteList(currentUser?.sites);
        let catalogSites: SandboxSite[] = [];
        try {
          catalogSites = normalizeSiteList(await listSites());
        } catch {
          catalogSites = [];
        }

        const next =
          role === "admin"
            ? catalogSites
            : assignedSites.length
            ? mergeSiteMetadata(assignedSites, catalogSites)
            : [];
        if (!cancelled) setAccessibleSites(next);
      } catch {
        if (!cancelled) setAccessibleSites([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedDateKey = React.useMemo(
    () => toDateKey(selectedDate),
    [selectedDate]
  );

  React.useEffect(() => {
    let cancelled = false;
    const range = toIsoRangeForDate(selectedDate);

    setRemoteNotis(null);
    listNotis({
      from: range.from,
      to: range.to,
      siteCode: selectedSite && selectedSite !== "all" ? selectedSite : undefined,
      limit: 500,
    })
      .then((items) => {
        if (!cancelled) {
          setRemoteNotis(sortByNewest(items.map((noti) => decorateNotiForDisplay(noti))));
        }
      })
      .catch(() => {
        if (!cancelled) setRemoteNotis(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedSite]);

  const matchGlobalDate = React.useCallback(
    (value: string) => {
      if (!selectedDateKey) return true;
      return toDateKey(value) === selectedDateKey;
    },
    [selectedDateKey]
  );

  const scopedSiteCodes = React.useMemo<Set<string> | null>(() => {
    const isAll = !selectedSite || selectedSite === "all";
    if (!isAll) return null;

    const selectedUtility = filterGroup?.selectedUtility;
    const selectedGroupSite = filterGroup?.selectedGroupSite;
    const hasScope = Boolean(selectedUtility?.id || selectedGroupSite?.id);
    const codes = new Set<string>();

    for (const option of siteOptions) {
      const code = String(option.value || "").trim();
      if (!code || code.toLowerCase() === "all") continue;
      if (hasScope) {
        if (selectedUtility?.id && option.utilityId !== selectedUtility.id) {
          continue;
        }
        if (selectedGroupSite?.id) {
          const groupId = option.groupId;
          const groupLabel = option.groupLabel;
          if (
            groupId !== selectedGroupSite.id &&
            groupLabel !== selectedGroupSite.label
          ) {
            continue;
          }
        }
      }
      codes.add(code);
    }

    return codes.size > 0 ? codes : null;
  }, [
    filterGroup?.selectedGroupSite,
    filterGroup?.selectedUtility,
    selectedSite,
    siteOptions,
  ]);

  const mapNotis = React.useMemo<Noti[]>(() => {
    const base =
      remoteNotis !== null
        ? remoteNotis
        : Array.isArray(liveNotis) && liveNotis.length
        ? liveNotis
        : [];
    const siteScoped =
      !selectedSite || selectedSite === "all"
        ? scopedSiteCodes
          ? sortByNewest(
              base.filter((noti) => matchesScopedSiteCode(noti, scopedSiteCodes))
            )
          : sortByNewest(base)
        : sortByNewest(base.filter((noti) => matchesSite(noti, selectedSite)));
    return siteScoped
      .filter((noti) => matchGlobalDate(noti?.date))
      .filter((noti) => buildNotiKeywordBag(noti) !== null);
  }, [liveNotis, matchGlobalDate, remoteNotis, scopedSiteCodes, selectedSite]);

  const buttonLabel = React.useMemo(
    () =>
      selectedEvents.includes("all")
        ? "all"
        : selectedEvents.join(", "),
    [selectedEvents]
  );

  return (
    <div className="min-h-full bg-white">
      <MapPanel
        selectedEvents={selectedEvents}
        buttonLabel={buttonLabel}
        toggleEvent={(value) =>
          filterGroup &&
          dispatch(
            cardSandboxActions.toggleFilterGroupEvent({
              id: filterGroup.id,
              value,
            })
          )
        }
        site={severity}
        setSite={(value) =>
          filterGroup &&
          dispatch(
            cardSandboxActions.setFilterGroupSeverity({
              id: filterGroup.id,
              value,
            })
          )
        }
        province={province}
        setProvince={(value) =>
          filterGroup &&
          dispatch(
            cardSandboxActions.setFilterGroupProvince({
              id: filterGroup.id,
              value,
            })
          )
        }
        selectedSiteCode={selectedSite || "all"}
        accessibleSites={accessibleSites}
        overrideNotis={mapNotis}
      />
    </div>
  );
}
