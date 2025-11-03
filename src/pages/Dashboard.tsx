// src/pages/Dashboard/Dashboard.tsx
import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Dashboard/Navbar";
import ContentLayout from "../components/Dashboard/ContentLayout";
import Header from "../components/Dashboard/Header";
import SnapshotChartSection from "../components/Chart";
import type { DateValue } from "../components/DateInput";
import { useTranslation } from "react-i18next";
import { me as apiMe } from "../api/user";
import { listSites } from "../api/sites";
import { notis, wellBeingNotis, recognizeNotis, ZYTA_NOTIS } from "../data/Dashboard/notis";
import { statItems } from "../components/Dashboard/dashboard.constants";

// keep master key seeded in backend; not used for dashboard gating

type Site = { id?: string; code?: string; name?: string; province_code?: string };
type SiteOption = { label: string; value: string; i18nKey?: string };

function today(): DateValue {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() } as any;
}

export default function Dashboard() {
  const { t } = useTranslation(["dashboard"]);

  // Navbar state
  const [searchSite, setSearchSite] = React.useState("");
  const [siteOptions, setSiteOptions] = React.useState<SiteOption[]>([
    { label: t("navbar.allSites"), value: "all", i18nKey: "navbar.allSites" },
  ]);
  const [selectedSite, setSelectedSite] = React.useState("all");
  const [date, setDate] = React.useState<DateValue>(today());
  // Role + sites for ContentLayout behavior similar to original
  const [role, setRole] = React.useState<"admin" | "officer" | "user" | null>(null);
  const [accessibleSites, setAccessibleSites] = React.useState<Site[]>([]);
  React.useEffect(() => {
    (async () => {
      try {
        const me = await apiMe();
        const myRole = (String(me?.role || "user").toLowerCase() as any) ?? "user";
        setRole(myRole);
        const resp = await listSites();
        const items = Array.isArray(resp?.items) ? resp.items : Array.isArray(resp) ? resp : [];
        const sites = items as any[];
        setAccessibleSites(sites as any);
        // build dropdown options
        const baseOptions: SiteOption[] = sites.map((s: any) => ({ label: s.name, value: s.code }));
        const includeAllOption = myRole === "admin";
        setSiteOptions(
          includeAllOption
            ? [{ label: t("navbar.allSites"), value: "all", i18nKey: "navbar.allSites" }, ...baseOptions]
            : baseOptions
        );
        // Auto-focus first accessible site for non-admin on first load
        setSelectedSite((prev) => {
          if (includeAllOption) return "all";
          if (prev && prev !== "all") return prev;
          return baseOptions[0]?.value ?? prev ?? "all";
        });
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
  const buttonLabel = React.useMemo(() => (selectedEvents.includes("all") ? "all" : selectedEvents.join(", ")), [selectedEvents]);
  const toggleEvent = React.useCallback((v: string) => {
    setSelectedEvents((prev) => {
      if (v === "all") return ["all"]; 
      const has = prev.includes(v);
      const next = has ? prev.filter((x) => x !== v) : [...prev.filter((x) => x !== "all"), v];
      return next.length === 0 ? ["all"] : next;
    });
  }, []);
  const [mapSeverity, setMapSeverity] = React.useState("all");
  const [province, setProvince] = React.useState("all");

  const filteredNotis = React.useMemo(() => {
    const q = searchEvent.toLowerCase().trim();
    const src = notis as unknown as any[];
    return src.filter((n) => (q ? JSON.stringify(n).toLowerCase().includes(q) : true));
  }, [searchEvent]);
  const filteredWellBeginNotis = React.useMemo(() => {
    const q = searchWB.toLowerCase().trim();
    const src = wellBeingNotis as unknown as any[];
    return src.filter((n) => (q ? JSON.stringify(n).toLowerCase().includes(q) : true));
  }, [searchWB]);
  const filteredRecognize = React.useMemo(() => {
    const q = searchFR.toLowerCase().trim();
    const src = recognizeNotis as unknown as any[];
    return src.filter((n) => (q ? JSON.stringify(n).toLowerCase().includes(q) : true));
  }, [searchFR]);
  const filterZYTA = React.useMemo(() => {
    const q = searchZYTA.toLowerCase().trim();
    const src = ZYTA_NOTIS as unknown as any[];
    return src.filter((n) => (q ? JSON.stringify(n).toLowerCase().includes(q) : true));
  }, [searchZYTA]);

  const contentLayoutProps = React.useMemo(
    () => ({
      searchEvent,
      setSearchEvent,
      filteredNotis,
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
      mapNotis: ([] as any[]).concat(filteredNotis as unknown as any[], filteredWellBeginNotis as unknown as any[]),
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
      filteredNotis,
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
      <div className="p-0 min-h-screen bg-[#F8FBFE] gap-6 flex flex-col">
        <Navbar
          searchSite={searchSite}
          setSearchSite={setSearchSite}
          siteOptions={siteOptions}
          selectedSite={selectedSite}
          setSelectedSite={setSelectedSite}
          date={date}
          setDate={setDate}
        />

        <Header statItems={statItems as any} selectedSiteCode={selectedSite} />

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

