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
import { selectSandboxEventPanels } from "./cardSandboxSelectors";
import { cardSandboxActions } from "./cardSandboxSlice";

type Props = {
  variant: "alerts" | "wellbeing";
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

export default function SandboxDashboardEventsCard({ variant }: Props) {
  const dispatch = useAppDispatch();
  const { alertSearch, wellbeingSearch } = useAppSelector(
    selectSandboxEventPanels
  );
  const { date, selectedSite } = useFilters();
  const { items: liveNotis } = useNotisFeed();

  const selectedDateKey = React.useMemo(() => toDateKey(date), [date]);
  const matchGlobalDate = React.useCallback(
    (value: string) => {
      if (!selectedDateKey) return true;
      return toDateKey(value) === selectedDateKey;
    },
    [selectedDateKey]
  );

  const dateScopedNotis = React.useMemo<Noti[]>(() => {
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
    return siteScoped.filter((noti) => matchGlobalDate(noti?.date));
  }, [liveNotis, matchGlobalDate, selectedSite]);

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
