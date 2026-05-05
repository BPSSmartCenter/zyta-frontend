import React from "react";
import AlertEvents from "../../components/Dashboard/AlertEvents";
import WellBeingEvents from "../../components/Dashboard/WellBeingEvents";
import type { Noti } from "../../data/Dashboard/notis";
import { useFilters } from "../../context/FiltersContext";
import { useNotisFeed } from "../../context/NotisContext";
import {
  matchesSite,
  sortByNewest,
  toDateKey,
} from "../../utils/notis";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectSandboxEventPanels,
  selectSandboxFilterGroupForCard,
} from "./cardSandboxSelectors";
import { cardSandboxActions } from "./cardSandboxSlice";
import {
  collectDashboardAlertEvents,
  collectDashboardWellBeingEvents,
  filterDashboardAlertEvents,
  filterDashboardWellBeingEvents,
} from "../../features/dashboardNotis";

type Props = {
  variant: "alerts" | "wellbeing";
  cardId: string;
};

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

export default function SandboxDashboardEventsCard({ variant, cardId }: Props) {
  const dispatch = useAppDispatch();
  const { alertSearch, wellbeingSearch } = useAppSelector(
    selectSandboxEventPanels
  );
  const filterGroup = useAppSelector((state) =>
    selectSandboxFilterGroupForCard(state, cardId)
  );
  const { siteOptions } = useFilters();
  const { items: liveNotis, loading: notisLoading } = useNotisFeed();
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
    const base = Array.isArray(liveNotis) ? liveNotis : [];
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
    () => collectDashboardAlertEvents(dateScopedNotis),
    [dateScopedNotis]
  );

  const wellbeingItems = React.useMemo(() => {
    return collectDashboardWellBeingEvents(dateScopedNotis);
  }, [dateScopedNotis]);

  const filteredAlertItems = React.useMemo(
    () => filterDashboardAlertEvents(alertItems, alertSearch),
    [alertItems, alertSearch]
  );

  const filteredWellBeingItems = React.useMemo(
    () => filterDashboardWellBeingEvents(wellbeingItems, wellbeingSearch),
    [wellbeingItems, wellbeingSearch]
  );

  if (variant === "wellbeing") {
    return (
      <WellBeingEvents
        search={wellbeingSearch}
        setSearch={(value) =>
          dispatch(cardSandboxActions.setWellbeingSearch(value))
        }
        items={filteredWellBeingItems}
        showTitle={false}
        loading={notisLoading}
      />
    );
  }

  return (
    <AlertEvents
      search={alertSearch}
      setSearch={(value) => dispatch(cardSandboxActions.setAlertSearch(value))}
      items={filteredAlertItems}
      loading={notisLoading}
    />
  );
}
