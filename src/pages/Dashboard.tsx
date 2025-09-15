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

const NON_ALL_COUNT = EVENT_OPTIONS.length - 1;

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

  // ---------- Helpers: ทำให้ค้นได้ทั้งค่าที่แปลแล้ว/ค่าดิบ + วันที่หลายรูปแบบ ----------
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
    site: string;
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

  // ---------- Filters ----------
  const filteredNotis = React.useMemo(() => {
    const q = searchEvent.trim().toLowerCase();
    if (!q) return notis;
    return notis.filter((n) => makeHaystack(n).includes(q));
  }, [searchEvent, i18n.language, makeHaystack]);

  const filteredWellBeginNotis = React.useMemo(() => {
    const q = searchWB.trim().toLowerCase();
    if (!q) return wellBeingNotis;
    return wellBeingNotis.filter((n) => makeHaystack(n).includes(q));
  }, [searchWB, i18n.language, makeHaystack]);

  const filteredRecognize = React.useMemo(() => {
    const q = searchFR.trim().toLowerCase();
    if (!q) return recognizeNotis;
    return recognizeNotis.filter((n) =>
      makeHaystack(n as AnyNoti, { includeDetail: true }).includes(q)
    );
  }, [searchFR, i18n.language, makeHaystack]);

  const filterZYTA = React.useMemo(() => {
    const q = searchZYTA.trim().toLowerCase();
    if (!q) return ZYTA_NOTIS;
    return ZYTA_NOTIS.filter((n) => makeHaystack(n).includes(q));
  }, [searchZYTA, i18n.language, makeHaystack]);

  // ---------- Chart props ----------
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

  const handleSiteChange = React.useCallback(
    (value: string) => setSite(value),
    []
  );
  const handleProvinceChange = React.useCallback(
    (value: string) => setProvince(value),
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

  // ---------- ชุด events สำหรับ Header (notis + wellbeing เรียงใหม่ -> เก่า) ----------
  const headerEvents = React.useMemo(
    () =>
      [...filteredNotis, ...filteredWellBeginNotis].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [filteredNotis, filteredWellBeginNotis]
  );

  // ---------- All Time Alert ที่ใช้สำหรับ "นับทั้งหมด" ----------
  // ✅ นับจาก "notis + wellbeingNotis" (เหมือนที่ All Time Alert แสดง), ไม่ใช่ 5 ตัวบน Header
  const allTimeAlertItems = React.useMemo(
    () => [...filteredNotis, ...filteredWellBeginNotis],
    [filteredNotis, filteredWellBeginNotis]
  );

  // ---------- HELPER: ระบุคีย์เหตุการณ์ของ noti หนึ่งรายการ (motion/fall) ----------
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

      // เผื่อชื่อไทย
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

  // ---------- นับ "ทั้งหมด" จาก All Time Alert ----------
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

  // ---------- อัปเดตค่าใน statItems เฉพาะ motion/fall แล้วค่อยส่งให้ Header ----------
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

      {/* ส่ง statItems ที่ override ตัวเลขทั้งหมด + events สำหรับ Header (จำกัด 5 ภายใน Header) */}
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
