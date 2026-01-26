// src/pages/Dashboard/Dashboard.tsx
import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Dashboard/Navbar";
import ContentLayout from "../components/Dashboard/ContentLayout";
import Header from "../components/Dashboard/Header";
import SnapshotChartSection from "../components/Chart";
import { useTranslation } from "react-i18next";
import { me as apiMe } from "../api/user";
import { listSites } from "../api/sites";
import { notis as mockNotis } from "../data/Dashboard/notis";
import { statItems } from "../components/Dashboard/dashboard.constants";
import { useFilters } from "../context/FiltersContext";
import { useNotisFeed } from "../context/NotisContext";
import type { Noti } from "../data/Dashboard/notis";
import {
  matchesSite,
  sortByNewest,
  toDateKey,
  decorateNotiForDisplay,
  resolveDefaultNotiImage,
  buildNotiKeywordBag,
} from "../utils/notis";
import { alertImage } from "../assets";

// keep master key seeded in backend; not used for dashboard gating

type Site = {
  id?: string;
  code?: string;
  name?: string;
  province_code?: string;
};

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
  const { t } = useTranslation(["dashboard"]);
  const { items: liveNotis } = useNotisFeed();

  // Navbar state
  const {
    date: globalDate,
    setDate: setGlobalDate,
    selectedSite,
    setSelectedSite,
    siteOptions,
    searchSite,
    setSearchSite,
  } = useFilters();
  // Role + sites for ContentLayout behavior similar to original
  const [role, setRole] = React.useState<"admin" | "officer" | "user" | null>(
    null
  );
  const [accessibleSites, setAccessibleSites] = React.useState<Site[]>([]);
  React.useEffect(() => {
    (async () => {
      try {
        const me = await apiMe();
        const myRole =
          (String(me?.role || "user").toLowerCase() as any) ?? "user";
        setRole(myRole);
        const resp = await listSites();
        const items = Array.isArray(resp?.items)
          ? resp.items
          : Array.isArray(resp)
          ? resp
          : [];
        const sites = items as any[];
        setAccessibleSites(sites as any);
      } catch {
        setRole((r) => r ?? "user");
        setAccessibleSites([]);
      }
    })();
  }, [t]);

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
    const normalize = (value?: any) =>
      value === undefined || value === null ? undefined : String(value);

    const toFacePlateItem = (n: Noti): Noti => {
      const meta = (n.meta ?? {}) as any;
      const key = String(n.titleKey || n.title || "").toLowerCase();
      const isFace = key.includes("facedetected");
      const isPlate = key.includes("platedetected");
      const occurredAt = n.occurredAt ?? n.date ?? new Date().toISOString();
      const rawId =
        normalize(meta?.rawId) ||
        normalize(meta?.row?.id) ||
        normalize(meta?.faceRow?.id) ||
        n.id ||
        occurredAt;
      const cameraName =
        meta?.cameraName ?? meta?.device?.name ?? meta?.deviceHeaders?.deviceKey;
      const siteLabel = n.site ?? meta?.siteName ?? meta?.siteCode ?? "-";
      const title = isFace
        ? meta?.person?.fullName ?? n.title ?? "Face detected"
        : meta?.plateText ?? n.title ?? "License plate detected";
      const img = isFace
        ? meta?.faceCropImg ?? meta?.faceFullImg ?? meta?.picture ?? n.img
        : meta?.platePicture ?? meta?.picture ?? n.img;
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
      mapNotis: ((): any[] => {
        return [...rawAlertEvents, ...filteredWellBeginNotis].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      })(),
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
    <Sidebar>
      <div className="p-0 min-h-screen bg-[#F8FBFE] flex flex-col gap-3 sm:gap-4 lg:gap-6">
        <Navbar
          searchSite={searchSite}
          setSearchSite={setSearchSite}
          siteOptions={siteOptions}
          selectedSite={selectedSite}
          setSelectedSite={setSelectedSite}
          date={globalDate as any}
          setDate={setGlobalDate as any}
        />

        <Header
          statItems={statItems as any}
          selectedSiteCode={selectedSite}
          events={dateScopedNotis}
        />

        <ContentLayout {...(contentLayoutProps as any)} />

        <SnapshotChartSection
          buttonLabel={buttonLabel}
          selectedEvents={selectedEvents}
          toggleEvent={toggleEvent}
        />
      </div>
    </Sidebar>
  );
}
