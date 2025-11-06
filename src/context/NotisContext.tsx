// src/context/NotisContext.tsx
import React from "react";
import type { Noti } from "../data/Dashboard/notis";
import { listNotis } from "../api/notis";
import { notis as mockNotis } from "../data/Dashboard/notis";
import { decorateNotiForDisplay, sortByNewest } from "../utils/notis";

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

export function NotisProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Noti[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await listNotis();
      setItems(prepareNotis(fetched));
      setError(undefined);
    } catch (err) {
      console.error("Failed to load notis", err);
      setError("FETCH_FAILED");
      setItems((prev) => pickFallback(prev));
    } finally {
      setLoading(false);
    }
  }, []);

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
