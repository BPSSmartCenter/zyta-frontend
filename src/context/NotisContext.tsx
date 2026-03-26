// src/context/NotisContext.tsx
import React from "react";
import type { Noti } from "../data/Dashboard/notis";
import { listNotis } from "../api/notis";
import { notis as mockNotis } from "../data/Dashboard/notis";
import { decorateNotiForDisplay, sortByNewest } from "../utils/notis";
import { useFilters } from "./FiltersContext";

type NotisContextValue = {
  items: Noti[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
};

const defaultValue: NotisContextValue = {
  items: [],
  loading: true,
  refresh: async () => {},
};

const NotisContext = React.createContext<NotisContextValue>(defaultValue);

const prepareNotis = (list: Noti[]): Noti[] =>
  sortByNewest(list.map((item) => decorateNotiForDisplay(item)));

const pickFallback = (current: Noti[]): Noti[] => {
  if (Array.isArray(current) && current.length) return current;
  if (Array.isArray(mockNotis) && mockNotis.length) {
    return prepareNotis(mockNotis as Noti[]);
  }
  return [];
};

const toIsoRangeForDate = (date: { y: number; m: number; d: number }) => {
  // DatePicker is local-calendar based, so build local day boundaries.
  const from = new Date(date.y, date.m - 1, date.d, 0, 0, 0, 0);
  const to = new Date(date.y, date.m - 1, date.d, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
};

export function NotisProvider({ children }: { children: React.ReactNode }) {
  const { date, selectedSite, selectedUtility, selectedGroupSite, siteOptions } = useFilters();
  const [items, setItems] = React.useState<Noti[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();

  // Build set of allowed site codes from siteOptions (excludes "all" sentinel)
  // ใช้เป็น defensive client-side guard เมื่อ selectedSite === "all"
  const allowedSiteCodes = React.useMemo<Set<string>>(() => {
    const codes = new Set<string>();
    for (const opt of siteOptions) {
      const code = String(opt.value || "").trim();
      if (!code || code.toLowerCase() === "all") continue;
      codes.add(code);
    }
    return codes;
  }, [siteOptions]);

  // Build set of site codes that match the current utility/group scope
  const scopedSiteCodes = React.useMemo<Set<string> | null>(() => {
    const isAll = !selectedSite || selectedSite === "all";
    if (!isAll) return null; // single site — no client filter needed

    // เมื่อ "all": เสมอกรองด้วย allowedSiteCodes เพื่อป้องกัน data leak
    // จากนั้น narrow ลงอีกถ้ามี utility/group filter
    const hasGroupFilter = !!(selectedUtility?.id || selectedGroupSite?.id);

    const codes = new Set<string>();
    for (const opt of siteOptions) {
      const code = String(opt.value || "").trim();
      if (!code || code.toLowerCase() === "all") continue;
      if (hasGroupFilter) {
        if (selectedUtility?.id && (opt as any).utilityId !== selectedUtility.id) continue;
        if (selectedGroupSite?.id) {
          const gId = (opt as any).groupId;
          const gLabel = (opt as any).groupLabel;
          if (gId !== selectedGroupSite.id && gLabel !== selectedGroupSite.label) continue;
        }
      }
      codes.add(code);
    }
    return codes;
  }, [selectedSite, selectedUtility, selectedGroupSite, siteOptions]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const range = toIsoRangeForDate(date);
      const fetched = await listNotis({
        from: range.from,
        to: range.to,
        siteCode: selectedSite && selectedSite !== "all" ? selectedSite : undefined,
        limit: 500,
      });
      // Client-side filter:
      // - ถ้า scopedSiteCodes มีค่า (selectedSite=all หรือมี utility/group filter) ใช้ filter นั้น
      // - ถ้า selectedSite=all และ allowedSiteCodes ไม่ว่าง ให้กรองตาม allowedSiteCodes เสมอ
      const isAll = !selectedSite || selectedSite === "all";
      const activeFilter = scopedSiteCodes ?? (isAll && allowedSiteCodes.size > 0 ? allowedSiteCodes : null);
      const filtered = activeFilter
        ? fetched.filter((n) => {
            const code = (n as any).siteCode ?? (n as any).site_code ?? "";
            return activeFilter.has(String(code).trim());
          })
        : fetched;
      setItems(prepareNotis(filtered));
      setError(undefined);
    } catch (err) {
      console.error("Failed to load notis", err);
      setError("FETCH_FAILED");
      setItems((prev) => pickFallback(prev));
    } finally {
      setLoading(false);
    }
  }, [date, selectedSite, scopedSiteCodes, allowedSiteCodes]);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      if (cancelled) return;
      await load();
      if (cancelled) return;
      timer = setTimeout(run, 5_000);
    };

    run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  const value = React.useMemo(
    () => ({
      items,
      loading,
      error,
      refresh: load,
    }),
    [items, loading, error, load]
  );

  return <NotisContext.Provider value={value}>{children}</NotisContext.Provider>;
}

export function useNotisFeed() {
  return React.useContext(NotisContext);
}
