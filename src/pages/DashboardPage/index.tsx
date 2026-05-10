// src/pages/DashboardPage/index.tsx
import React from "react";
import ContentLayout from "../../components/Dashboard/ContentLayout";
import { listSites } from "../../api/sites";
import { useFilters } from "../../context/FiltersContext";
import DetectionSummaryBar from "../../components/Dashboard/DetectionSummaryBar";
import DashboardTopBar from "../../components/Dashboard/DashboardTopBar";
import { statItems } from "../../components/Dashboard/dashboard.constants";
import { useAppSelector } from "../../store/hooks";
import { selectAuthUser } from "../../features/auth";
import {
  selectDashboardAlertEventItems,
  selectDashboardFaceRecognizeItems,
  selectDashboardRawNotis,
  selectDashboardWellBeingItems,
  selectDashboardZytaItems,
} from "../../features/dashboardNotis";
import { selectNotisFeedLoading } from "../../features/notisFeed";

// keep master key seeded in backend; not used for dashboard gating

type DashboardRole = "admin" | "manager" | "officer" | "user";

type DashboardSiteSummary = {
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

function normalizeRole(value: unknown): DashboardRole {
  const role = String(value || "user").toLowerCase();
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

function normalizeSiteList(value: unknown): DashboardSiteSummary[] {
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
      utility: optionalString(site.utility),
      groupSite: optionalString(site.groupSite ?? site.group_site),
    }))
    .filter((site) => Boolean(site.id || site.code || site.name));
}

export default function Dashboard() {
  const { selectedSite } = useFilters();
  const authUser = useAppSelector(selectAuthUser);
  const liveRawNotis = useAppSelector(selectDashboardRawNotis);
  const liveAlertEvents = useAppSelector(selectDashboardAlertEventItems);
  const liveWellBeingEvents = useAppSelector(selectDashboardWellBeingItems);
  const liveFaceRecognizeItems = useAppSelector(selectDashboardFaceRecognizeItems);
  const liveZytaItems = useAppSelector(selectDashboardZytaItems);
  const liveNotisLoading = useAppSelector(selectNotisFeedLoading);

  const rawNotis = liveRawNotis;
  const alertEvents = liveAlertEvents;
  const wellBeingEvents = liveWellBeingEvents;
  const faceRecognizeItems = liveFaceRecognizeItems;
  const zytaItems = liveZytaItems;
  const notisLoading = liveNotisLoading;

  // Role comes straight from Redux (bootstrapAuth already populated authSlice).
  const role: DashboardRole | null = authUser
    ? normalizeRole(authUser.role)
    : null;

  // Accessible sites: prefer the list bootstrapAuth captured. Fall back to
  // /sites only when the user object doesn't carry assigned sites (rare; e.g.
  // first login of a manager whose assignment hasn't propagated yet).
  const [accessibleSites, setAccessibleSites] = React.useState<
    DashboardSiteSummary[]
  >(() => normalizeSiteList(authUser?.sites));

  React.useEffect(() => {
    const fromAuth = normalizeSiteList(authUser?.sites);
    if (fromAuth.length > 0) {
      setAccessibleSites(fromAuth);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp: unknown = await listSites();
        if (!cancelled) setAccessibleSites(normalizeSiteList(resp));
      } catch {
        if (!cancelled) setAccessibleSites([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.sites]);

  // View state for ContentLayout
  const [searchEvent, setSearchEvent] = React.useState("");
  const [searchWB, setSearchWB] = React.useState("");
  const [searchFR, setSearchFR] = React.useState("");
  const [searchZYTA, setSearchZYTA] = React.useState("");
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>(["all"]);
  const buttonLabel = React.useMemo(
    () => (selectedEvents.includes("all") ? "all" : selectedEvents.join(", ")),
    [selectedEvents],
  );
  const toggleEvent = React.useCallback((v: string) => {
    setSelectedEvents((prev) => {
      if (v === "all") return ["all"];
      const has = prev.includes(v);
      const next = has
        ? prev.filter((x) => x !== v)
        : [...prev.filter((x) => x !== "all"), v];
      return next.length === 0 ? ["all"] : next;
    });
  }, []);
  const [mapSeverity, setMapSeverity] = React.useState("all");
  const [province, setProvince] = React.useState("all");

  const contentLayoutProps = React.useMemo(
    () => ({
      searchEvent,
      setSearchEvent,
      alertEvents,
      searchWB,
      setSearchWB,
      wellBeingEvents,
      selectedEvents,
      buttonLabel,
      toggleEvent,
      site: mapSeverity,
      setSite: setMapSeverity,
      province,
      setProvince,
      searchFR,
      setSearchFR,
      faceRecognizeItems,
      searchZYTA,
      setSearchZYTA,
      zytaItems,
      notisLoading,
      selectedSiteCode: selectedSite,
      accessibleSites,
      role,
      rawNotis,
    }),
    [
      alertEvents,
      accessibleSites,
      buttonLabel,
      faceRecognizeItems,
      mapSeverity,
      notisLoading,
      province,
      rawNotis,
      role,
      searchEvent,
      searchFR,
      searchZYTA,
      searchWB,
      selectedSite,
      selectedEvents,
      toggleEvent,
      wellBeingEvents,
      zytaItems,
    ],
  );

  return (
    <div className="min-h-screen bg-[#F5F7FB] px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
      <div className="flex flex-col gap-4 lg:gap-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6">
          <div className="min-w-0">
            <DashboardTopBar />
          </div>
          <DetectionSummaryBar
            statItems={statItems as any}
            selectedSiteCode={selectedSite}
            events={rawNotis}
            variant="inline"
            className="shrink-0"
          />
        </div>

        <ContentLayout {...contentLayoutProps} />
      </div>
    </div>
  );
}
