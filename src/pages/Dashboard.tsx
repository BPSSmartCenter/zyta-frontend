// src/pages/Dashboard/Dashboard.tsx
import React from "react";
import Navbar from "../components/Dashboard/Navbar";
import Header from "../components/Dashboard/Header";
import ContentLayout from "../components/Dashboard/ContentLayout";
import SnapshotChartSection from "../components/Chart";

import {
  notis,
  wellBeingNotis,
  recognizeNotis,
  ZYTA_NOTIS,
} from "../data/Dashboard/notis";
import {
  today,
  statItems,
  EVENT_OPTIONS,
} from "../components/Dashboard/dashboard.constants";
import type { DateValue } from "../components/DateInput";
import { useTranslation } from "react-i18next";

import { me, accessSites } from "../data/Dashboard/auth";
import { PROVINCE_CODE_TO_TH } from "../data/Dashboard/data";

const NON_ALL_COUNT = EVENT_OPTIONS.length - 1;

type SiteOption = { label: string; value: string; i18nKey?: string };

export default function Dashboard() {
  const { t, i18n } = useTranslation(["dashboard"]);

  const [date, setDate] = React.useState<DateValue>(today);
  const [site, setSite] = React.useState("all");
  const [province, setProvince] = React.useState("all");
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>(["all"]);

  const [searchSite, setSearchSite] = React.useState("");
  const [searchEvent, setSearchEvent] = React.useState("");
  const [searchWB, setSearchWB] = React.useState("");
  const [searchFR, setSearchFR] = React.useState("");
  const [searchZYTA, setSearchZYTA] = React.useState("");

  // ===== mock auth + access sites =====
  const [role, setRole] = React.useState<"admin" | "officer" | "user">("admin");
  const [accessibleSiteIds, setAccessibleSiteIds] = React.useState<
    string[] | null
  >(null);
  const [siteOptions, setSiteOptions] = React.useState<SiteOption[]>([
    { label: t("navbar.allSites"), value: "all", i18nKey: "navbar.allSites" },
  ]);

  React.useEffect(() => {
    const u = me();
    const resp = accessSites({ includeCountryBBox: true });

    // role
    if (u) setRole(u.role as any);

    // สร้าง options ของ dropdown ให้ตรงสิทธิ์
    if (resp) {
      const ids = resp.items.map((s) => s.id);
      setAccessibleSiteIds(ids);

      const opts: SiteOption[] = [
        {
          label: t("navbar.allSites"),
          value: "all",
          i18nKey: "navbar.allSites",
        },
        ...resp.items.map((s) => ({
          label: s.name,
          value: s.code, // NOTE: ฝั่ง Navbar map ด้วย i18n key "sites.<value>" ได้
        })),
      ];
      setSiteOptions(opts);

      // ถ้า role=user และมีแค่ไซต์เดียว → ตั้ง province ให้โฟกัสจังหวัดนั้น
      if (u?.role === "user" && resp.items.length === 1) {
        const only = resp.items[0];
        const provinceNameTH = PROVINCE_CODE_TO_TH[only.province_code];
        if (provinceNameTH) {
          setProvince(provinceNameTH); // MapPanel จะรับ province นี้ไป focus
        }
      }
    } else {
      // ไม่มี token → ให้ dropdown เป็น all อย่างเดียว
      setAccessibleSiteIds([]);
      setSiteOptions([
        {
          label: t("navbar.allSites"),
          value: "all",
          i18nKey: "navbar.allSites",
        },
      ]);
    }
  }, [t, i18n.language]);

  // ---------- Helpers: ค้นหา (ตามไฟล์เดิม) ----------
  const formatDateStrings = React.useCallback(
    (dateStr: string) => {
      const d = new Date(dateStr);
      const locale = i18n.language || "en";
      return [
        d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        d.toLocaleDateString(locale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        d.toLocaleDateString(locale, {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        d.toLocaleDateString("th-TH", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        dateStr,
        d.toISOString().slice(0, 10),
      ];
    },
    [i18n.language]
  );

  type AnyNoti = {
    title: string;
    titleKey?: string;
    site: string; // << สำคัญ: notis มี site name/code ตรงนี้
    type?: string;
    date: string;
    detail?: string;
    eventKey?: string;
    subtype?: string;
    category?: string;
    key?: string;
  };

  const makeHaystack = React.useCallback(
    (n: AnyNoti, opts?: { includeDetail?: boolean }) => {
      const localizedTitle = n.titleKey
        ? t(n.titleKey, { defaultValue: n.title })
        : n.title;
      const localizedSite = t(`sites.${n.site}`, { defaultValue: n.site });
      const parts = [
        localizedTitle,
        n.title,
        localizedSite,
        n.site,
        n.type,
        ...(opts?.includeDetail ? [n.detail] : []),
        ...formatDateStrings(n.date),
      ];
      return parts.filter(Boolean).join(" ").toLowerCase();
    },
    [t, formatDateStrings]
  );

  // ---- Filter notis ด้วยสิทธิ์ (accessibleSiteIds) ----
  const filterByAcl = React.useCallback(
    (arr: ReadonlyArray<any>) => {
      if (!accessibleSiteIds) return arr; // ยังโหลดไม่เสร็จ → แสดงทั้งหมดชั่วคราว
      if (role === "admin") return arr; // admin เห็นหมด
      // officer/user: noti.site ต้องอยู่ในรายการ site ที่เห็นได้
      // หมายเหตุ: ใน mock notis ใช้ค่า "site" เป็นชื่อ Site ("Site A"|"Site B"|...) ให้ map เป็น id จาก access sites ที่สร้าง option ไว้
      const allowedNames = new Set(
        siteOptions.filter((o) => o.value !== "all").map((o) => o.label)
      );
      return arr.filter((n) => allowedNames.has(n.site));
    },
    [accessibleSiteIds, role, siteOptions]
  );

  // ---------- Filters (คง logic เดิม) ----------
  const filteredNotis = React.useMemo(() => {
    const source = filterByAcl(notis);
    const q = searchEvent.trim().toLowerCase();
    if (!q) return source as any;
    return source.filter((n: any) => makeHaystack(n).includes(q));
  }, [searchEvent, i18n.language, makeHaystack, filterByAcl]);

  const filteredWellBeginNotis = React.useMemo(() => {
    const source = filterByAcl(wellBeingNotis);
    const q = searchWB.trim().toLowerCase();
    if (!q) return source as any;
    return source.filter((n: any) => makeHaystack(n).includes(q));
  }, [searchWB, i18n.language, makeHaystack, filterByAcl]);

  const filteredRecognize = React.useMemo(() => {
    const source = filterByAcl(recognizeNotis);
    const q = searchFR.trim().toLowerCase();
    if (!q) return source as any;
    return source.filter((n: any) =>
      makeHaystack(n as AnyNoti, { includeDetail: true }).includes(q)
    );
  }, [searchFR, i18n.language, makeHaystack, filterByAcl]);

  const filterZYTA = React.useMemo(() => {
    const source = filterByAcl(ZYTA_NOTIS);
    const q = searchZYTA.trim().toLowerCase();
    if (!q) return source as any;
    return source.filter((n: any) => makeHaystack(n).includes(q));
  }, [searchZYTA, i18n.language, makeHaystack, filterByAcl]);

  // ---------- Chart props (เดิม) ----------
  const chartProps = React.useMemo(() => {
    const nonAllSelected = selectedEvents.filter((v) => v !== "all");
    const selectedCount = selectedEvents.includes("all")
      ? NON_ALL_COUNT
      : nonAllSelected.length;

    const buttonLabel =
      selectedCount === NON_ALL_COUNT
        ? t("events.all", { defaultValue: "All Events" })
        : t("events.selectCount", {
            count: selectedCount,
            defaultValue: `Select ${selectedCount}`,
          });

    return { buttonLabel, selectedEvents };
  }, [selectedEvents, i18n.language, t]);

  // ---------- Handlers ----------
  const toggleEvent = React.useCallback((v: string) => {
    setSelectedEvents((prev) => {
      if (v === "all") return ["all"];
      const set = new Set(prev.filter((x) => x !== "all"));
      set.has(v) ? set.delete(v) : set.add(v);
      return set.size === 0 || set.size === NON_ALL_COUNT
        ? ["all"]
        : Array.from(set);
    });
  }, []);

  const handleSiteChange = React.useCallback(
    (value: string) => setSite(value),
    []
  );
  const handleProvinceChange = React.useCallback(
    (value: string) => setProvince(value),
    []
  );
  const handleSearchEvent = React.useCallback(
    (value: string) => setSearchEvent(value),
    []
  );
  const handleSearchWB = React.useCallback(
    (value: string) => setSearchWB(value),
    []
  );
  const handleSearchFR = React.useCallback(
    (value: string) => setSearchFR(value),
    []
  );
  const handleSearchZYTA = React.useCallback(
    (value: string) => setSearchZYTA(value),
    []
  );

  // ---------- Bundle props ----------
  const contentLayoutProps = React.useMemo(
    () => ({
      searchEvent,
      setSearchEvent: handleSearchEvent,
      filteredNotis,
      searchWB,
      setSearchWB: handleSearchWB,
      filteredWellBeginNotis,
      searchZYTA,
      setSearchZYTA: handleSearchZYTA,
      filterZYTA,
      selectedEvents,
      buttonLabel: chartProps.buttonLabel,
      toggleEvent,
      site,
      setSite: handleSiteChange,
      province,
      setProvince: handleProvinceChange,
      searchFR,
      setSearchFR: handleSearchFR,
      filteredRecognize: [...filteredRecognize],
    }),
    [
      searchEvent,
      handleSearchEvent,
      filteredNotis,
      searchWB,
      handleSearchWB,
      filteredWellBeginNotis,
      selectedEvents,
      chartProps.buttonLabel,
      toggleEvent,
      site,
      handleSiteChange,
      province,
      handleProvinceChange,
      searchFR,
      handleSearchFR,
      filteredRecognize,
      searchZYTA,
      filterZYTA,
    ]
  );

  // ---------- Header events / totals (เดิม) ----------
  const headerEvents = React.useMemo(
    () =>
      [...filteredNotis, ...filteredWellBeginNotis].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [filteredNotis, filteredWellBeginNotis]
  );

  const allTimeAlertItems = React.useMemo(
    () => [...filteredNotis, ...filteredWellBeginNotis],
    [filteredNotis, filteredWellBeginNotis]
  );

  const getEventKeyFromNoti = React.useCallback(
    (n: AnyNoti): "motion" | "fall" | null => {
      const direct = (n.eventKey ?? n.subtype ?? n.key ?? n.category ?? "")
        .toString()
        .toLowerCase();
      const titleKey = (n as any).titleKey
        ? String((n as any).titleKey).toLowerCase()
        : "";
      const title = (n.title ?? "").toLowerCase();
      const type = (n.type ?? "").toLowerCase();

      if (
        direct === "motion" ||
        titleKey.includes("motion") ||
        title.includes("motion") ||
        type === "motion"
      )
        return "motion";
      if (
        direct === "fall" ||
        titleKey.includes("fall") ||
        title.includes("fall") ||
        type === "fall"
      )
        return "fall";
      if (
        title.includes("ตรวจจับการเคลื่อนไหว") ||
        title.includes("การเคลื่อนไหว")
      )
        return "motion";
      if (title.includes("ล้ม") || title.includes("ตรวจจับการล้ม"))
        return "fall";
      return null;
    },
    []
  );

  const motionTotal = React.useMemo(
    () =>
      allTimeAlertItems.filter(
        (n) => getEventKeyFromNoti(n as AnyNoti) === "motion"
      ).length,
    [allTimeAlertItems, getEventKeyFromNoti]
  );

  const fallTotal = React.useMemo(
    () =>
      allTimeAlertItems.filter(
        (n) => getEventKeyFromNoti(n as AnyNoti) === "fall"
      ).length,
    [allTimeAlertItems, getEventKeyFromNoti]
  );

  const statItemsForHeader = React.useMemo(
    () =>
      statItems.map((it) => {
        if (it.key === "motion") return { ...it, val: motionTotal };
        if (it.key === "fall") return { ...it, val: fallTotal };
        return it;
      }),
    [motionTotal, fallTotal]
  );

  return (
    <div className="min-h-screen bg-[#F8FBFE] gap-6 flex flex-col">
      <Navbar
        searchSite={searchSite}
        setSearchSite={setSearchSite}
        site={site}
        setSite={setSite}
        date={date}
        setDate={setDate}
      />

      <Header statItems={statItemsForHeader} events={headerEvents as any} />

      <ContentLayout {...contentLayoutProps} />

      <SnapshotChartSection
        buttonLabel={chartProps.buttonLabel}
        selectedEvents={chartProps.selectedEvents}
        toggleEvent={toggleEvent}
      />
    </div>
  );
}
