import React from "react";
import type { Noti } from "../data/Dashboard/notis";
import CriticalAlertModal from "../components/CriticalAlertModal";
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
import { notiSeverity } from "../utils/notis";

type NotisContextValue = {
  items: Noti[];
  loading: boolean;
  error?: string;
  refresh: () => Promise<void>;
};

const ACKED_CRITICAL_ALERTS_KEY = "bps:acked-critical-alerts";

function buildCriticalAlertKey(item: Noti): string {
  const occurredAt = item.occurredAt ?? item.createdAt ?? item.date ?? "";
  return [
    item.id ?? "",
    item.titleKey ?? item.title ?? "",
    item.siteCode ?? item.siteId ?? item.siteName ?? item.site ?? "",
    item.deviceId ?? "",
    occurredAt,
  ]
    .map((value) => String(value).trim())
    .join("|");
}

function readAckedCriticalAlertKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(ACKED_CRITICAL_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map((value) => String(value || "").trim())
          .filter((value) => value.length > 0)
      : [];
  } catch {
    return [];
  }
}

function writeAckedCriticalAlertKeys(keys: Iterable<string>) {
  if (typeof window === "undefined") return;
  try {
    const deduped = Array.from(new Set(keys))
      .map((value) => String(value || "").trim())
      .filter((value) => value.length > 0)
      .slice(-50);
    window.sessionStorage.setItem(
      ACKED_CRITICAL_ALERTS_KEY,
      JSON.stringify(deduped)
    );
  } catch {
    // ignore storage failures
  }
}

function CriticalAlertBridge() {
  const items = useAppSelector(selectNotisFeedItems);
  const [activeAlert, setActiveAlert] = React.useState<Noti | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [soundPending, setSoundPending] = React.useState(false);
  const ackedKeysRef = React.useRef<Set<string>>(new Set());
  const audioContextRef = React.useRef<AudioContext | null>(null);

  React.useEffect(() => {
    ackedKeysRef.current = new Set(readAckedCriticalAlertKeys());
  }, []);

  const playAlarm = React.useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    const AudioCtor =
      window.AudioContext ||
      (
        window as Window &
          typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
          }
      ).webkitAudioContext;

    if (!AudioCtor) return false;

    try {
      const ctx = audioContextRef.current ?? new AudioCtor();
      audioContextRef.current = ctx;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const pattern = [0, 0.22, 0.44];
      const duration = 0.14;
      const now = ctx.currentTime;

      pattern.forEach((offset, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(index % 2 === 0 ? 880 : 740, now + offset);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + offset + duration
        );
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + duration);
      });

      return true;
    } catch {
      return false;
    }
  }, []);

  React.useEffect(() => {
    const criticalItems = items.filter((item) => notiSeverity(item) === "critical");
    if (criticalItems.length === 0) {
      setIsOpen(false);
      setActiveAlert(null);
      setSoundPending(false);
      return;
    }

    const nextAlert = criticalItems.find(
      (item) => !ackedKeysRef.current.has(buildCriticalAlertKey(item))
    );

    if (!nextAlert) return;

    const nextKey = buildCriticalAlertKey(nextAlert);
    const currentKey = activeAlert ? buildCriticalAlertKey(activeAlert) : null;
    if (currentKey === nextKey && isOpen) return;

    setActiveAlert(nextAlert);
    setIsOpen(true);
  }, [activeAlert, isOpen, items]);

  React.useEffect(() => {
    if (!isOpen || !activeAlert) return;
    let cancelled = false;
    void playAlarm().then((played) => {
      if (cancelled) return;
      setSoundPending(!played);
    });
    return () => {
      cancelled = true;
    };
  }, [activeAlert, isOpen, playAlarm]);

  React.useEffect(() => {
    if (!isOpen || !soundPending) return;

    const retry = () => {
      void playAlarm().then((played) => {
        if (played) {
          setSoundPending(false);
        }
      });
    };

    window.addEventListener("pointerdown", retry, { once: true });
    window.addEventListener("keydown", retry, { once: true });

    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [isOpen, playAlarm, soundPending]);

  React.useEffect(() => {
    return () => {
      void audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
    };
  }, []);

  const handleClose = React.useCallback(() => {
    if (activeAlert) {
      const key = buildCriticalAlertKey(activeAlert);
      ackedKeysRef.current.add(key);
      writeAckedCriticalAlertKeys(ackedKeysRef.current);
    }
    setIsOpen(false);
    setSoundPending(false);
  }, [activeAlert]);

  return (
    <CriticalAlertModal
      open={isOpen}
      alert={activeAlert}
      soundPending={soundPending}
      onClose={handleClose}
    />
  );
}

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
      <CriticalAlertBridge />
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
