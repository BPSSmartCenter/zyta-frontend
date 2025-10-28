// src/pages/Dashboard/Dashboard.tsx
import React from "react";
import Navbar from "../components/Dashboard/Navbar";
import Header from "../components/Dashboard/Header";
import ContentLayout from "../components/Dashboard/ContentLayout";
import SnapshotChartSection from "../components/Chart";
import { useParams, useNavigate } from "react-router-dom";

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
import { PROVINCE_CODE_TO_TH } from "../data/Dashboard/data";
import type { Site } from "../data/Dashboard/data";
import { me as apiMe } from "../api/user";
import { listSites } from "../api/sites";
import { useFilters } from "../context/FiltersContext";

const NON_ALL_COUNT = EVENT_OPTIONS.length - 1;

type SiteOption = { label: string; value: string; i18nKey?: string };

export default function Dashboard() {
  const { t, i18n } = useTranslation(["dashboard"]);
  const params = useParams();
  const navigate = useNavigate();

  const { date: globalDate, setDate: setGlobalDate, selectedSite: globalSite, setSelectedSite: setGlobalSite } = useFilters();
  const [date, setDate] = React.useState<DateValue>(globalDate ?? today);
  const [selectedSiteCode, setSelectedSiteCode] = React.useState(globalSite ?? "all");
  const [mapSeverity, setMapSeverity] = React.useState("all");
  const [province, setProvince] = React.useState("all");
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>(["all"]);

  const [searchSite, setSearchSite] = React.useState("");
  const [searchEvent, setSearchEvent] = React.useState("");
  const [searchWB, setSearchWB] = React.useState("");
  const [searchFR, setSearchFR] = React.useState("");
  const [searchZYTA, setSearchZYTA] = React.useState("");

  // ===== mock auth + access sites =====
  const [role, setRole] = React.useState<"admin" | "officer" | "user" | null>(
    null
  );
  const [accessibleSites, setAccessibleSites] = React.useState<Site[] | null>(
    null
  );
  const [siteOptions, setSiteOptions] = React.useState<SiteOption[]>([
    { label: t("navbar.allSites"), value: "all", i18nKey: "navbar.allSites" },
  ]);

  React.useEffect(() => {
    (async () => {
      try {
        const currentUser = await apiMe();
        const myUid = currentUser?.id;
        const urlUid = params.uid;
        if (myUid && urlUid && myUid !== urlUid) {
          navigate(`/u/${myUid}/dashboard`, { replace: true });
        }
      } catch {
        // ถ้าเรียกไม่ได้ เดี๋ยว RequireAuth พาออกไปหน้า Login อยู่แล้ว
      }
    })();
  }, [params.uid, navigate]);

  // keep context in sync with local dashboard state (date / site)
  React.useEffect(() => {
    if (
      !globalDate ||
      globalDate.y !== date.y ||
      globalDate.m !== date.m ||
      globalDate.d !== date.d
    ) {
      setGlobalDate(date);
    }
    if (globalSite !== selectedSiteCode) setGlobalSite(selectedSiteCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, selectedSiteCode]);

  React.useEffect(() => {
    (async () => {
      // 1) โหลด me() ให้รู้บทบาท
      let currentUser: any = null;
      try {
        currentUser = await apiMe();
        const normalizedRole = String(currentUser?.role || "").toLowerCase() as
          | "admin"
          | "officer"
          | "user";
        setRole(normalizedRole || "user"); // ถ้าไม่เจอ ให้เป็น "user" ปลอดภัยกว่า
      } catch (e) {
        console.error("me() failed", e);
        setRole("user"); // บังคับโหมดต่ำสุด
        // ปล่อยให้ RequireAuth จัดการรีไดเรกต์ในกรณีไม่มีเซสชัน
      }

      // 2) โหลด sites ตามสิทธิ์ (อย่าแตะ role ใน catch อีก)
      try {
        const resp = await listSites();

        // รองรับทั้ง resp.items[] และ resp[] (array ตรง ๆ)
        const items = Array.isArray(resp?.items)
          ? resp.items
          : Array.isArray(resp)
          ? resp
          : [];

        const normalizedSites: Site[] = (items as Site[]).map((s) => ({
          ...s,
        }));
        setAccessibleSites(normalizedSites);

        // ใช้ค่า role จาก state (ที่ normalize แล้ว) เท่านั้น
        const isAdmin = (r: any) => String(r).toLowerCase() === "admin";
        const includeAllOption = isAdmin(currentUser?.role);

        const baseOptions: SiteOption[] = normalizedSites.map((s) => ({
          label: s.name,
          value: s.code,
        }));

        const opts: SiteOption[] = includeAllOption
          ? [
              {
                label: t("navbar.allSites"),
                value: "all",
                i18nKey: "navbar.allSites",
              },
              ...baseOptions,
            ]
          : baseOptions;

        setSiteOptions(opts);

        // ตั้ง selectedSiteCode เริ่มต้น
        setSelectedSiteCode((prev) => {
          if (includeAllOption) {
            if (prev === "all" || baseOptions.some((o) => o.value === prev))
              return prev;
            return "all";
          }
          if (baseOptions.some((o) => o.value === prev)) return prev;
          return baseOptions[0]?.value ?? "";
        });
      } catch (e) {
        console.error("listSites() failed", e);
        setAccessibleSites([]);
        // ตั้ง options แบบไม่รวม all (ยกเว้นยืนยันว่าเป็น admin จาก me())
        const isAdmin =
          String(currentUser?.role || "").toLowerCase() === "admin";
        setSiteOptions(
          isAdmin
            ? [
                {
                  label: t("navbar.allSites"),
                  value: "all",
                  i18nKey: "navbar.allSites",
                },
              ]
            : []
        );
        setSelectedSiteCode(isAdmin ? "all" : "");
        // ❌ อย่าแตะ setRole ที่นี่อีกแล้ว
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, i18n.language]);

  React.useEffect(() => {
    if (!accessibleSites || accessibleSites.length === 0) {
      if (role !== "admin" && province !== "all") {
        setProvince("all");
      }
      return;
    }

    if (role === "admin") {
      if (
        selectedSiteCode !== "all" &&
        !accessibleSites.some((site) => site.code === selectedSiteCode)
      ) {
        setSelectedSiteCode("all");
      }
      return;
    }

    const siteForRole =
      accessibleSites.find((site) => site.code === selectedSiteCode) ??
      accessibleSites[0];

    if (!siteForRole) return;

    if (selectedSiteCode !== siteForRole.code) {
      setSelectedSiteCode(siteForRole.code);
      return;
    }

    const provinceName =
      PROVINCE_CODE_TO_TH[siteForRole.province_code] ?? "all";

    if (provinceName !== "all" && province !== provinceName) {
      setProvince(provinceName);
    }
    if (provinceName === "all" && province !== "all") {
      setProvince("all");
    }
  }, [accessibleSites, selectedSiteCode, role, province]);

  // เลือก site เริ่มต้น + เซ็ต province ทันทีหลังรู้ accessibleSites
  React.useEffect(() => {
    if (!accessibleSites || accessibleSites.length === 0) return;
    if (role === "admin") {
      // admin เห็นทุกจังหวัด → all
      if (selectedSiteCode !== "all") setSelectedSiteCode("all");
      setProvince("all");
      return;
    }
    // officer/user → ใช้ site ตัวแรกตามสิทธิ์
    const first = accessibleSites[0];
    if (!first) return;
    if (String(selectedSiteCode) !== String(first.code)) {
      setSelectedSiteCode(String(first.code));
    }
    if (first.province_code) {
      const nameTh = PROVINCE_CODE_TO_TH[first.province_code];
      if (nameTh) setProvince(nameTh);
    }
  }, [role, JSON.stringify(accessibleSites)]);

  // เมื่อผู้ใช้เปลี่ยน site (จาก Navbar) → sync province ตาม province_code ของ site นั้น
  React.useEffect(() => {
    if (!accessibleSites || accessibleSites.length === 0) return;
    if (!selectedSiteCode || selectedSiteCode === "all") {
      // admin เลือก all → แผนที่กลับประเทศ
      if (role === "admin") setProvince("all");
      return;
    }
    const s = (accessibleSites ?? []).find(
      (x) => String(x.code) === String(selectedSiteCode)
    );
    if (s?.province_code) {
      const nameTh = PROVINCE_CODE_TO_TH[s.province_code];
      if (nameTh) setProvince(nameTh);
    }
  }, [selectedSiteCode, JSON.stringify(accessibleSites)]);

  // ---------- Helpers: เธเนเธเธซเธฒ (เธ•เธฒเธกเนเธเธฅเนเน€เธ”เธดเธก) ----------
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
    site: string; // << เธชเธณเธเธฑเธ: notis เธกเธต site name/code เธ•เธฃเธเธเธตเน
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

  // ---- Filter notis เธ”เนเธงเธขเธชเธดเธ—เธเธดเน (accessibleSites) ----
  const filterByAcl = React.useCallback(
    (arr: ReadonlyArray<any>) => {
      if (!accessibleSites) return arr;
      let list = arr;

      if (role !== "admin") {
        const allowedNames = new Set(accessibleSites.map((s) => s.name));
        list = list.filter((n) => allowedNames.has(n.site));
      }

      if (selectedSiteCode !== "all") {
        const selectedSite = accessibleSites.find(
          (s) => s.code === selectedSiteCode
        );
        if (!selectedSite) {
          return [];
        }
        list = list.filter((n) => n.site === selectedSite.name);
      }

      return list;
    },
    [accessibleSites, role, selectedSiteCode]
  );

  // ---------- Filters (เธเธ logic เน€เธ”เธดเธก) ----------

  // รวม Alert + Well-being แล้วกรองด้วย searchEvent ทีเดียว
  // ใช้ตรรกะกรอง Site แบบเดียวกับ MapPanel (ใช้ code/name/id ได้)
  const filteredAllAlerts = React.useMemo(() => {
    // 1) รวม notis ทั้งหมดก่อน
    let list: AnyNoti[] = [...notis, ...wellBeingNotis] as any;

    // 2) ถ้าผู้ใช้ไม่ใช่ admin → กรองเฉพาะไซต์ที่อนุญาต
    if (role !== "admin") {
      const allowed = new Set((accessibleSites ?? []).map((s) => String(s.name)));
      list = list.filter((n: any) => allowed.has(String(n.site)));
    }

    // 3) ถ้าเลือก Site เฉพาะ → กรองด้วย selectedSiteCode (เทียบได้ทั้งชื่อและโค้ด)
    if (selectedSiteCode && selectedSiteCode !== "all") {
      const nameToCode = new Map((accessibleSites ?? []).map((s) => [String(s.name), String(s.code)]));
      list = list.filter((n: any) => {
        const raw = [
          (n as any).siteId,
          (n as any).site_id,
          (n as any).siteCode,
          (n as any).site_code,
          (n as any).siteName,
          (n as any).site_name,
          (n as any).site,
          (n as any)?.site?.id,
          (n as any)?.site?.code,
          (n as any)?.site?.name,
        ].filter(Boolean).map((x) => String(x));
        // map ชื่อไซต์ -> code เพื่อเทียบกับ selectedSiteCode ได้
        const withCodes = raw.flatMap((v) => {
          const c = nameToCode.get(v);
          return c ? [v, c] : [v];
        });
        return withCodes.includes(String(selectedSiteCode));
      });
    }

    // 4) ค้นหาตามกล่อง searchEvent (หัวข้อ All Events)
    const q = searchEvent.trim().toLowerCase();
    if (!q) return list as any;
    return list.filter((n: any) =>
      makeHaystack(n as AnyNoti, { includeDetail: true }).includes(q)
    );
  }, [
    notis,
    wellBeingNotis,
    role,
    accessibleSites,
    selectedSiteCode,
    searchEvent,
    i18n.language,
    makeHaystack,
  ]);

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

  // ---------- Chart props (เน€เธ”เธดเธก) ----------
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

  const handleMapSeverityChange = React.useCallback(
    (value: string) => setMapSeverity(value),
    []
  );
  const handleSelectedSiteChange = React.useCallback(
    (value: string) => {
      setSelectedSiteCode(value);
      setGlobalSite(value);
    },
    [setGlobalSite]
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
      site: mapSeverity,
      setSite: handleMapSeverityChange,
      province,
      setProvince: handleProvinceChange,
      selectedSiteCode,
      accessibleSites: accessibleSites ?? [],
      role,
      mapNotis: filteredAllAlerts,
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
      mapSeverity,
      handleMapSeverityChange,
      province,
      handleProvinceChange,
      selectedSiteCode,
      accessibleSites,
      role,
      searchFR,
      handleSearchFR,
      filteredRecognize,
      searchZYTA,
      filterZYTA,
      filteredAllAlerts,
    ]
  );

  // ---------- Header events / totals (เน€เธ”เธดเธก) ----------
  const headerEvents = React.useMemo(
    () =>
      [...filteredAllAlerts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [filteredAllAlerts]
  );

  const allTimeAlertItems = React.useMemo(
    () => [...filteredAllAlerts],
    [filteredAllAlerts]
  );

  const getEventKeyFromNoti = React.useCallback(
    (
      n: AnyNoti
    ): "motion" | "fall" | "fire" | "offline" | "sleeping" | null => {
      const base = (n.eventKey ?? n.subtype ?? n.key ?? n.category ?? "")
        .toString()
        .toLowerCase();
      const titleKey = (n as any).titleKey
        ? String((n as any).titleKey).toLowerCase()
        : "";
      const title = (n.title ?? "").toLowerCase();
      const type = (n.type ?? "").toLowerCase();
      const detail = (n.detail ?? "").toLowerCase();

      const text = [base, titleKey, title, type, detail].join(" ");

      if (
        text.includes("fire") ||
        text.includes("ไฟไหม้") ||
        text.includes("เพลิงไหม้")
      )
        return "fire";
      if (
        text.includes("offline") ||
        text.includes("cameraoffline") ||
        text.includes("deviceoffline") ||
        text.includes("ออฟไลน์") ||
        text.includes("หลุดการเชื่อมต่อ")
      )
        return "offline";
      if (
        text.includes("sleep") ||
        text.includes("sleeping") ||
        text.includes("หลับนาน")
      )
        return "sleeping";
      if (
        text.includes("motion") ||
        text.includes("ตรวจจับการเคลื่อนไหว") ||
        text.includes("การเคลื่อนไหว")
      )
        return "motion";
      if (
        text.includes("fall") ||
        text.includes("ล้ม") ||
        text.includes("หกล้ม")
      )
        return "fall";
      return null;
    },
    []
  );

  const eventCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      fire: 0,
      motion: 0,
      offline: 0,
      sleeping: 0,
      fall: 0,
    };

    allTimeAlertItems.forEach((item) => {
      const key = getEventKeyFromNoti(item as AnyNoti);
      if (key) counts[key] = (counts[key] ?? 0) + 1;
    });

    return counts;
  }, [allTimeAlertItems, getEventKeyFromNoti]);

  const statItemsForHeader = React.useMemo(
    () =>
      statItems.map((it) => {
        if (typeof eventCounts[it.key] === "number") {
          return { ...it, val: eventCounts[it.key] };
        }
        return it;
      }),
    [eventCounts]
  );
  return (
    <div className="min-h-screen bg-[#F8FBFE] gap-6 flex flex-col">
      <Navbar
        searchSite={searchSite}
        setSearchSite={setSearchSite}
        siteOptions={siteOptions}
        selectedSite={selectedSiteCode}
        setSelectedSite={handleSelectedSiteChange}
        date={date}
        setDate={setDate}
      />

      <Header
        statItems={statItemsForHeader}
        events={headerEvents as any}
        selectedSiteCode={selectedSiteCode}
      />

      <ContentLayout {...contentLayoutProps} />

      <SnapshotChartSection
        buttonLabel={chartProps.buttonLabel}
        selectedEvents={chartProps.selectedEvents}
        toggleEvent={toggleEvent}
      />
    </div>
  );
}
