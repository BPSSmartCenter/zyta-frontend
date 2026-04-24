import React from "react";
import type { Noti } from "../data/Dashboard/notis";
import { selectDateFilterValue } from "../features/dateFilter";
import {
  fetchNotisFeed,
  selectNotisFeedError,
  selectNotisFeedItems,
  selectNotisFeedLoading,
} from "../features/notisFeed";
import {
  selectAccessibleSites,
  selectHasHydrated,
  selectSelectedGroup,
  selectSelectedSite,
  selectSelectedUtility,
  selectSiteCatalogStatus,
} from "../features/siteSelection";
import { useAppDispatch, useAppSelector } from "../store/hooks";

type NotisContextValue = {
  items: Noti[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
};

function NotisFeedPollingBridge() {
  const dispatch = useAppDispatch();
  const date = useAppSelector(selectDateFilterValue);
  const selectedSite = useAppSelector(selectSelectedSite);
  const selectedGroupSite = useAppSelector(selectSelectedGroup);
  const selectedUtility = useAppSelector(selectSelectedUtility);
  const accessibleSites = useAppSelector(selectAccessibleSites);
  const catalogStatus = useAppSelector(selectSiteCatalogStatus);
  const hasHydrated = useAppSelector(selectHasHydrated);

  const ready = catalogStatus === "ready" && hasHydrated;
  const queryKey = React.useMemo(
    () =>
      JSON.stringify({
        date,
        selectedSite,
        selectedGroupSiteId: selectedGroupSite?.id ?? null,
        selectedGroupSiteLabel: selectedGroupSite?.label ?? null,
        selectedUtilityId: selectedUtility?.id ?? null,
        accessibleSites: accessibleSites.map((site) => ({
          value: site.value,
          groupId: site.groupId ?? null,
          groupLabel: site.groupLabel ?? null,
          utilityId: site.utilityId ?? null,
        })),
      }),
    [accessibleSites, date, selectedGroupSite, selectedSite, selectedUtility]
  );

  React.useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      if (cancelled) return;
      await dispatch(fetchNotisFeed());
      if (cancelled) return;
      timer = setTimeout(run, 5_000);
    };

    void run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [dispatch, queryKey, ready]);

  React.useEffect(() => {
    if (!ready) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void dispatch(fetchNotisFeed());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch, queryKey, ready]);

  return null;
}

export function NotisProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NotisFeedPollingBridge />
      {children}
    </>
  );
}

export function useNotisFeed(): NotisContextValue {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectNotisFeedItems);
  const loading = useAppSelector(selectNotisFeedLoading);
  const error = useAppSelector(selectNotisFeedError) ?? undefined;

  const refresh = React.useCallback(async () => {
    await dispatch(fetchNotisFeed());
  }, [dispatch]);

  return React.useMemo(
    () => ({
      items,
      loading,
      error,
      refresh,
    }),
    [error, items, loading, refresh]
  );
}
