import React from "react";
import AlertEvents from "../../components/Dashboard/AlertEvents";
import WellBeingEvents from "../../components/Dashboard/WellBeingEvents";
import { alertImage } from "../../assets";
import { notis as mockNotis, type Noti } from "../../data/Dashboard/notis";
import { useFilters } from "../../context/FiltersContext";
import { useNotisFeed } from "../../context/NotisContext";
import {
  buildNotiKeywordBag,
  decorateNotiForDisplay,
  matchesSite,
  resolveDefaultNotiImage,
  sortByNewest,
  toDateKey,
} from "../../utils/notis";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectSandboxEventPanels,
  selectSandboxFilterGroupForCard,
} from "./cardSandboxSelectors";
import { cardSandboxActions } from "./cardSandboxSlice";

type Props = {
  variant: "alerts" | "wellbeing";
  cardId: string;
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
  keywords.some((keyword) => text.includes(keyword));

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

function isDefaultEventCategory(noti: Noti): boolean {
  const img = resolveDefaultNotiImage(noti);
  return Boolean(img && img !== alertImage);
}

function isWellBeingNoti(noti: Noti): boolean {
  const bag = buildNotiKeywordBag(noti);
  if (!bag) return false;
  if (includesAny(bag, EXCLUDED_KEYWORDS)) return false;
  return includesAny(bag, FALL_KEYWORDS) || includesAny(bag, SLEEP_KEYWORDS);
}

export default function SandboxDashboardEventsCard({ variant, cardId }: Props) {
  const dispatch = useAppDispatch();
  const { alertSearch, wellbeingSearch } = useAppSelector(
    selectSandboxEventPanels
  );
  const filterGroup = useAppSelector((state) =>
    selectSandboxFilterGroupForCard(state, cardId)
  );
  const { siteOptions } = useFilters();
  const { items: liveNotis } = useNotisFeed();
  const fallbackDate = React.useMemo(() => todayValue(), []);
  const selectedDate = filterGroup?.date ?? fallbackDate;
  const selectedSite = filterGroup?.selectedSite ?? "all";

  const selectedDateKey = React.useMemo(
    () => toDateKey(selectedDate),
    [selectedDate]
  );
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
    if (!hasScope) return null;

    const codes = new Set<string>();
    for (const option of siteOptions) {
      const code = String(option.value || "").trim();
      if (!code || code.toLowerCase() === "all") continue;
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
      codes.add(code);
    }

    return codes.size > 0 ? codes : null;
  }, [
    filterGroup?.selectedGroupSite,
    filterGroup?.selectedUtility,
    selectedSite,
    siteOptions,
  ]);

  const dateScopedNotis = React.useMemo<Noti[]>(() => {
    const base =
      Array.isArray(liveNotis) && liveNotis.length
        ? liveNotis
        : ((mockNotis as Noti[]) ?? []).map((noti) =>
            decorateNotiForDisplay(noti)
          );
    const siteScoped =
      !selectedSite || selectedSite === "all"
        ? scopedSiteCodes
          ? sortByNewest(
              base.filter((noti) => matchesScopedSiteCode(noti, scopedSiteCodes))
            )
          : sortByNewest(base)
        : sortByNewest(base.filter((noti) => matchesSite(noti, selectedSite)));
    return siteScoped.filter((noti) => matchGlobalDate(noti?.date));
  }, [liveNotis, matchGlobalDate, scopedSiteCodes, selectedSite]);

  const alertItems = React.useMemo(
    () => sortByNewest(dateScopedNotis),
    [dateScopedNotis]
  );

  const wellbeingItems = React.useMemo(() => {
    return dateScopedNotis.filter((noti) => {
      if (!isDefaultEventCategory(noti)) return false;
      if (!isWellBeingNoti(noti)) return false;
      const type = (noti.type || "").toLowerCase();
      const severity = (noti.severity || "").toLowerCase();
      return (
        type === "alert" ||
        type === "warning" ||
        severity === "critical" ||
        severity === "medium"
      );
    });
  }, [dateScopedNotis]);

  if (variant === "wellbeing") {
    return (
      <WellBeingEvents
        search={wellbeingSearch}
        setSearch={(value) =>
          dispatch(cardSandboxActions.setWellbeingSearch(value))
        }
        items={wellbeingItems}
      />
    );
  }

  return (
    <AlertEvents
      search={alertSearch}
      setSearch={(value) => dispatch(cardSandboxActions.setAlertSearch(value))}
      items={alertItems}
    />
  );
}
