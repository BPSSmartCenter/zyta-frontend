// src/pages/DashboardPage/index.tsx
import React from "react";
import ContentLayout from "../../components/Dashboard/ContentLayout";
import SnapshotChartSection from "../../components/Chart";
import { me as apiMe } from "../../api/user";
import { listSites } from "../../api/sites";
import { notis as mockNotis } from "../../data/Dashboard/notis";
import { useFilters } from "../../context/FiltersContext";
import { useNotisFeed } from "../../context/NotisContext";
import type { Noti } from "../../data/Dashboard/notis";
import {
  matchesSite,
  sortByNewest,
  toDateKey,
  decorateNotiForDisplay,
  resolveDefaultNotiImage,
  buildNotiKeywordBag,
} from "../../utils/notis";
import { alertImage } from "../../assets";

// keep master key seeded in backend; not used for dashboard gating

type Site = {
  id?: string;
  code?: string;
  name?: string;
  province_code?: string;
  lat?: number;
  lng?: number;
  utility?: string;
  groupSite?: string;
};

type DashboardRole = "admin" | "manager" | "officer" | "user";

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

function normalizeSiteList(value: unknown): Site[] {
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

const isDefaultEventCategory = (n: Noti): boolean => {
  const img = resolveDefaultNotiImage(n);
  if (!img) return false;
  return img !== alertImage;
};

const FALL_KEYWORDS = [
  "notis.falldetected",
  "fall",
  "fall detected",
  "ตรวจพบคนล้ม",
  "คนล้ม",
];
const SLEEP_KEYWORDS = [
  "notis.sleepinglong",
  "sleep",
  "sleeping",
  "ตรวจพบคนหลับ",
  "หลับ",
  "นอนหลับ",
];
const EXCLUDED_KEYWORDS = [
  "notis.firedetected",
  "fire",
  "ไฟไหม้",
  "เพลิง",
  "notis.motiondetected",
  "motion",
  "เคลื่อนไหว",
  "ตรวจพบการเคลื่อนไหว",
  "offline",
  "camera offline",
  "device offline",
  "ออฟไลน์",
];

const includesAny = (text: string, keywords: string[]) =>
  keywords.some((kw) => text.includes(kw));

const isWellBeingNoti = (n: Noti): boolean => {
  const bag = buildNotiKeywordBag(n);
  if (!bag) return false;
  if (includesAny(bag, EXCLUDED_KEYWORDS)) return false;
  return includesAny(bag, FALL_KEYWORDS) || includesAny(bag, SLEEP_KEYWORDS);
};

const isZytaNoti = (n: Noti): boolean => {
  const key = String(n.titleKey || "").toLowerCase();
  return key.startsWith("zytanotis.");
};

export default function Dashboard() {
  const { items: liveNotis } = useNotisFeed();

  const { date: globalDate, selectedSite } = useFilters();
  // Role + sites for ContentLayout behavior similar to original
  const [role, setRole] = React.useState<DashboardRole | null>(null);
  const [accessibleSites, setAccessibleSites] = React.useState<Site[]>([]);
  React.useEffect(() => {
    (async () => {
      try {
        const me = await apiMe();
        setRole(normalizeRole(me?.role));
        const meSites = normalizeSiteList(me?.sites);
        if (meSites.length > 0) {
          setAccessibleSites(meSites);
          return;
        }
        const resp: unknown = await listSites();
        setAccessibleSites(normalizeSiteList(resp));
      } catch {
        setRole((r) => r ?? "user");
        setAccessibleSites([]);
      }
    })();
  }, []);

  // Filters and derived data for ContentLayout
  const [searchEvent, setSearchEvent] = React.useState("");
  const [searchWB, setSearchWB] = React.useState("");
  const [searchFR, setSearchFR] = React.useState("");
  const [searchZYTA, setSearchZYTA] = React.useState("");
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>(["all"]);
  const buttonLabel = React.useMemo(
    () => (selectedEvents.includes("all") ? "all" : selectedEvents.join(", ")),
    [selectedEvents]
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

  const selectedDateKey = React.useMemo(
    () => toDateKey(globalDate),
    [globalDate]
  );

  const matchGlobalDate = React.useCallback(
    (value: string) => {
      if (!selectedDateKey) return true;
      return toDateKey(value) === selectedDateKey;
    },
    [selectedDateKey]
  );

  const baseNotis = React.useMemo<Noti[]>(() => {
    if (Array.isArray(liveNotis) && liveNotis.length) return liveNotis;
    return ((mockNotis as Noti[]) ?? []).map((n) => decorateNotiForDisplay(n));
  }, [liveNotis]);

  const siteScopedNotis = React.useMemo(() => {
    if (!selectedSite || selectedSite === "all") return sortByNewest(baseNotis);
    return sortByNewest(baseNotis.filter((n) => matchesSite(n, selectedSite)));
  }, [baseNotis, selectedSite]);

  const dateScopedNotis = React.useMemo(
    () => siteScopedNotis.filter((n) => matchGlobalDate(n?.date)),
    [siteScopedNotis, matchGlobalDate]
  );

  const faceRecognizeItems = React.useMemo(() => {
    const normalize = (value?: unknown) =>
      value === undefined || value === null ? undefined : String(value);

    const toFacePlateItem = (n: Noti): Noti => {
      const meta = isRecord(n.meta) ? n.meta : {};
      const row = isRecord(meta.row) ? meta.row : {};
      const faceRow = isRecord(meta.faceRow) ? meta.faceRow : {};
      const device = isRecord(meta.device) ? meta.device : {};
      const deviceHeaders = isRecord(meta.deviceHeaders)
        ? meta.deviceHeaders
        : {};
      const person = isRecord(meta.person) ? meta.person : {};
      const key = String(n.titleKey || n.title || "").toLowerCase();
      const isFace = key.includes("facedetected");
      const isPlate = key.includes("platedetected");
      const occurredAt = n.occurredAt ?? n.date ?? new Date().toISOString();
      const rawId =
        normalize(meta.rawId) ||
        normalize(row.id) ||
        normalize(faceRow.id) ||
        n.id ||
        occurredAt;
      const cameraName =
        normalize(meta.cameraName) ??
        normalize(device.name) ??
        normalize(deviceHeaders.deviceKey);
      const siteLabel =
        n.site ?? normalize(meta.siteName) ?? normalize(meta.siteCode) ?? "-";
      const title = isFace
        ? normalize(person.fullName) ?? n.title ?? "Face detected"
        : normalize(meta.plateText) ?? n.title ?? "License plate detected";
      const img = isFace
        ? normalize(meta.faceCropImg) ??
          normalize(meta.faceFullImg) ??
          normalize(meta.picture) ??
          n.img
        : normalize(meta.platePicture) ?? normalize(meta.picture) ?? n.img;
      const enhancedMeta = {
        ...meta,
        kind: isPlate ? "plate" : "face",
        rawId,
        cameraName,
      };
      return {
        ...n,
        id: rawId ?? n.id ?? occurredAt,
        title,
        site: siteLabel,
        occurredAt,
        date: occurredAt,
        img,
        meta: enhancedMeta,
      };
    };

    return dateScopedNotis
      .filter((n) => {
        const key = String(n.titleKey || "").toLowerCase();
        return key === "notis.facedetected" || key === "notis.platedetected";
      })
      .map(toFacePlateItem);
  }, [dateScopedNotis]);

  const alertEventSource = React.useMemo(
    () => sortByNewest(dateScopedNotis),
    [dateScopedNotis]
  );

  const wellBeingSource = React.useMemo(() => {
    return dateScopedNotis.filter((n) => {
      if (!isDefaultEventCategory(n)) return false;
      if (!isWellBeingNoti(n)) return false;
      const type = (n.type || "").toLowerCase();
      const severity = (n.severity || "").toLowerCase();
      return (
        type === "alert" ||
        type === "warning" ||
        severity === "critical" ||
        severity === "medium"
      );
    });
  }, [dateScopedNotis]);

  const rawAlertEvents = alertEventSource;

  const filteredWellBeginNotis = React.useMemo(() => {
    const q = searchWB.toLowerCase().trim();
    return wellBeingSource
      .filter((n) => matchGlobalDate(n?.date))
      .filter((n) => (q ? JSON.stringify(n).toLowerCase().includes(q) : true));
  }, [searchWB, matchGlobalDate, wellBeingSource]);

  const filteredRecognize = React.useMemo(() => {
    const q = searchFR.toLowerCase().trim();
    return faceRecognizeItems.filter((n) =>
      q ? JSON.stringify(n).toLowerCase().includes(q) : true
    );
  }, [searchFR, faceRecognizeItems]);
  const filterZYTA = React.useMemo(() => {
    const q = searchZYTA.toLowerCase().trim();
    const src = dateScopedNotis.filter(isZytaNoti);
    return src.filter((n) =>
      q ? JSON.stringify(n).toLowerCase().includes(q) : true
    );
  }, [searchZYTA, dateScopedNotis]);

  const contentLayoutProps = React.useMemo(
    () => ({
      searchEvent,
      setSearchEvent,
      alertEvents: rawAlertEvents,
      searchWB,
      setSearchWB,
      filteredWellBeginNotis,
      selectedEvents,
      buttonLabel,
      toggleEvent,
      site: mapSeverity,
      setSite: setMapSeverity,
      province,
      setProvince,
      mapNotis: [...rawAlertEvents, ...filteredWellBeginNotis].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      searchFR,
      setSearchFR,
      filteredRecognize,
      searchZYTA,
      setSearchZYTA,
      filterZYTA,
      selectedSiteCode: selectedSite,
      accessibleSites,
      role,
    }),
    [
      searchEvent,
      searchWB,
      rawAlertEvents,
      filteredWellBeginNotis,
      selectedEvents,
      buttonLabel,
      toggleEvent,
      mapSeverity,
      province,
      filteredRecognize,
      searchFR,
      searchZYTA,
      filterZYTA,
      selectedSite,
      accessibleSites,
      role,
    ]
  );

  return (
    <div className="p-0 min-h-screen bg-[#F8FBFE] flex flex-col gap-3 sm:gap-4 lg:gap-6">
      <ContentLayout {...contentLayoutProps} />

      <SnapshotChartSection
        buttonLabel={buttonLabel}
        selectedEvents={selectedEvents}
        toggleEvent={toggleEvent}
      />
    </div>
  );
}
