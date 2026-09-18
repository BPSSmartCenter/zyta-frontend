// src/hooks/useEnergyFlow.ts
//
// Live power snapshots of the solar systems on one or more sites, refreshed every minute
// while the energy-flow card is on screen (the Sigenergy poller writes every 5 minutes).
import React from "react";
import {
  fetchEnergyFlowSnapshots,
  type EnergyFlowSnapshot,
} from "../features/electric/energyFlow";

const DEFAULT_POLL_MS = 60 * 1000;

export type EnergyFlowState = {
  /** snapshots keyed by device id (as the devices API returns it) */
  byDeviceId: Map<string, EnergyFlowSnapshot>;
  loading: boolean;
  error: string | null;
  /** when the last successful fetch finished (ms since epoch) */
  refreshedAt: number | null;
  refresh: () => void;
};

const EMPTY = new Map<string, EnergyFlowSnapshot>();

export function useEnergyFlow(
  siteIds: readonly string[],
  enabled: boolean,
  pollMs: number = DEFAULT_POLL_MS
): EnergyFlowState {
  const sitesKey = Array.from(new Set(siteIds.map((s) => String(s).trim()).filter(Boolean)))
    .sort()
    .join("|");
  const [byDeviceId, setByDeviceId] = React.useState<Map<string, EnergyFlowSnapshot>>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = React.useState<number | null>(null);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!enabled || !sitesKey) {
      setByDeviceId(EMPTY);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    let timer: number | null = null;
    const sites = sitesKey.split("|");

    const load = async () => {
      setLoading(true);
      try {
        const lists = await Promise.all(
          sites.map((site) => fetchEnergyFlowSnapshots(site).catch(() => [] as EnergyFlowSnapshot[]))
        );
        if (cancelled) return;
        const next = new Map<string, EnergyFlowSnapshot>();
        for (const list of lists) for (const snap of list) next.set(snap.deviceId, snap);
        setByDeviceId(next);
        setError(null);
        setRefreshedAt(Date.now());
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(async () => {
        // Skip a tick while the tab is hidden; the visibility handler catches up.
        if (document.visibilityState === "visible") await load();
        schedule();
      }, pollMs);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };

    void load().then(schedule);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, sitesKey, pollMs, tick]);

  const refresh = React.useCallback(() => setTick((n) => n + 1), []);

  return { byDeviceId, loading, error, refreshedAt, refresh };
}
