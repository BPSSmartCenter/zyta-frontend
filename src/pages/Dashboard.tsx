// src/pages/Dashboard.tsx
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
  CAMERA_ITEMS,
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
        // รูปแบบเดิม (en-GB)
        d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        // ตามภาษาปัจจุบัน (ย่อ/เต็ม)
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
        // ไทยเต็ม (กันกรณี locale ยังไม่ใช่ th)
        d.toLocaleDateString("th-TH", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        // ค่าดิบ
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
  };

  const makeHaystack = React.useCallback(
    (n: AnyNoti, opts?: { includeDetail?: boolean }) => {
      const localizedTitle = n.titleKey
        ? t(n.titleKey, { defaultValue: n.title })
        : n.title;
      const localizedSite = t(`sites.${n.site}`, { defaultValue: n.site });

      const parts = [
        // ชื่อเหตุการณ์ (แปล/ดิบ)
        localizedTitle,
        n.title,
        // สถานที่ (แปล/ดิบ)
        localizedSite,
        n.site,
        // ประเภท (ดิบไว้ก่อน)
        n.type,
        // รายละเอียด (สำหรับ Face/Plate)
        ...(opts?.includeDetail ? [n.detail] : []),
        // วันที่หลายรูปแบบ
        ...formatDateStrings(n.date),
      ];

      return parts.filter(Boolean).join(" ").toLowerCase();
    },
    [t, formatDateStrings]
  );

  // ---------- Filters: ผูกกับภาษาเพื่อ re-run เมื่อเปลี่ยนภาษา ----------
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
    // ผูกกับภาษาเพื่ออัปเดตปุ่มเมื่อสลับภาษา
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

  const handleSearchSite = React.useCallback(
    (value: string) => setSearchSite(value),
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

  const handleSiteChange = React.useCallback(
    (value: string) => setSite(value),
    []
  );
  const handleProvinceChange = React.useCallback(
    (value: string) => setProvince(value),
    []
  );
  const handleDateChange = React.useCallback(
    (value: DateValue) => setDate(value),
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

  return (
    <div className="min-h-screen bg-[#F8FBFE] gap-6 flex flex-col">
      <Navbar
        searchSite={searchSite}
        setSearchSite={handleSearchSite}
        site={site}
        setSite={handleSiteChange}
        date={date}
        setDate={handleDateChange}
      />

      <Header statItems={statItems} cameraItems={CAMERA_ITEMS} />

      <ContentLayout {...contentLayoutProps} />

      <SnapshotChartSection
        buttonLabel={chartProps.buttonLabel}
        selectedEvents={chartProps.selectedEvents}
        toggleEvent={toggleEvent}
      />
    </div>
  );
}
