import React from "react";
import MapPanel from "../../components/Dashboard/MapPanel";
import { me as apiMe } from "../../api/user";
import { listSites } from "../../api/sites";
import { notis as mockNotis, type Noti } from "../../data/Dashboard/notis";
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
import { selectSandboxMapPanel } from "./cardSandboxSelectors";

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

export default function SandboxMapPanelCard() {
  const dispatch = useAppDispatch();
  const mapPanel = useAppSelector(selectSandboxMapPanel);
  const { date, selectedSite } = useFilters();
  const { items: liveNotis } = useNotisFeed();
  const [accessibleSites, setAccessibleSites] = React.useState<SandboxSite[]>([]);

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

  const selectedDateKey = React.useMemo(() => toDateKey(date), [date]);
  const matchGlobalDate = React.useCallback(
    (value: string) => {
      if (!selectedDateKey) return true;
      return toDateKey(value) === selectedDateKey;
    },
    [selectedDateKey]
  );

  const mapNotis = React.useMemo<Noti[]>(() => {
    const base =
      Array.isArray(liveNotis) && liveNotis.length
        ? liveNotis
        : ((mockNotis as Noti[]) ?? []).map((noti) =>
            decorateNotiForDisplay(noti)
          );
    const siteScoped =
      !selectedSite || selectedSite === "all"
        ? sortByNewest(base)
        : sortByNewest(base.filter((noti) => matchesSite(noti, selectedSite)));
    return siteScoped
      .filter((noti) => matchGlobalDate(noti?.date))
      .filter((noti) => buildNotiKeywordBag(noti) !== null);
  }, [liveNotis, matchGlobalDate, selectedSite]);

  const buttonLabel = React.useMemo(
    () =>
      mapPanel.selectedEvents.includes("all")
        ? "all"
        : mapPanel.selectedEvents.join(", "),
    [mapPanel.selectedEvents]
  );

  return (
    <div className="min-h-full bg-white">
      <MapPanel
        selectedEvents={mapPanel.selectedEvents}
        buttonLabel={buttonLabel}
        toggleEvent={(value) => dispatch(cardSandboxActions.toggleMapEvent(value))}
        site={mapPanel.severity}
        setSite={(value) => dispatch(cardSandboxActions.setMapSeverity(value))}
        province={mapPanel.province}
        setProvince={(value) => dispatch(cardSandboxActions.setMapProvince(value))}
        selectedSiteCode={selectedSite || "all"}
        accessibleSites={accessibleSites}
        overrideNotis={mapNotis}
      />
    </div>
  );
}
