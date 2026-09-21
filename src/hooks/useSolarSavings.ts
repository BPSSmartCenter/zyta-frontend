// src/hooks/useSolarSavings.ts
//
// Real solar savings of one site for the Billing page: lists the site's electric devices,
// keeps the solar makers (Sigenergy, Huawei, …), reads the utility rates the site has in
// Site Management and sums this month / year-to-date self-consumed kWh × rate.
import React from "react";
import { useAppSelector } from "../store/hooks";
import { selectAuthSites } from "../features/auth";
import {
  getElectricDevices,
  loadSiteSolarSavings,
  solarDevicesFromItems,
  tariffFromSiteBilling,
  type SiteSolarSavings,
  type SolarTariff,
} from "../features/electric";

const CACHE_TTL_MS = 10 * 60 * 1000;

const readCache = (key: string): SiteSolarSavings | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SiteSolarSavings;
    if (Date.now() - Number(parsed.fetchedAt || 0) > CACHE_TTL_MS) return null;
    // Date objects don't survive JSON; rebuild them for consumers that format days.
    for (const device of parsed.devices) {
      for (const day of device.daily) {
        const [y, m, d] = day.key.split("-").map(Number);
        day.date = new Date(y, (m || 1) - 1, d || 1);
      }
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (key: string, value: SiteSolarSavings) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / private mode — the numbers are still on screen
  }
};

export type SolarSavingsState = {
  data: SiteSolarSavings | null;
  loading: boolean;
  error: string | null;
  /** the site has no generating device with readings */
  noSolarDevices: boolean;
  tariff: SolarTariff;
  refresh: () => void;
};

export function useSolarSavings(siteIdOrCode: string | null): SolarSavingsState {
  const sites = useAppSelector(selectAuthSites);
  const site = React.useMemo(() => {
    if (!siteIdOrCode) return null;
    const key = siteIdOrCode.trim().toLowerCase();
    return (
      sites.find(
        (s) => String(s.id).toLowerCase() === key || String(s.code).toLowerCase() === key
      ) ?? null
    );
  }, [sites, siteIdOrCode]);
  const tariff = React.useMemo(() => tariffFromSiteBilling(site?.billing), [site]);
  const tariffKey = `${tariff.onPeakRate ?? ""}|${tariff.offPeakRate ?? ""}|${tariff.ftRate ?? ""}`;

  const [data, setData] = React.useState<SiteSolarSavings | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [noSolarDevices, setNoSolarDevices] = React.useState(false);
  const [refreshTick, setRefreshTick] = React.useState(0);

  React.useEffect(() => {
    if (!siteIdOrCode) {
      setData(null);
      setLoading(false);
      setError(null);
      setNoSolarDevices(false);
      return;
    }
    let cancelled = false;
    const today = new Date();
    const dayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const cacheKey = `billing:solar-savings:${siteIdOrCode}:${tariffKey}:${dayKey}`;
    const cached = refreshTick === 0 ? readCache(cacheKey) : null;
    if (cached) {
      setData(cached);
      setNoSolarDevices(cached.devices.length === 0);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = (await getElectricDevices(siteIdOrCode)) as Record<string, unknown>;
        const items: unknown[] = Array.isArray(res?.items)
          ? (res.items as unknown[])
          : Array.isArray((res?.data as Record<string, unknown> | undefined)?.items)
            ? ((res.data as Record<string, unknown>).items as unknown[])
            : [];
        const devices = solarDevicesFromItems(items, siteIdOrCode);
        if (cancelled) return;
        if (!devices.length) {
          setData(null);
          setNoSolarDevices(true);
          setLoading(false);
          return;
        }
        const result = await loadSiteSolarSavings({ siteIdOrCode, devices, tariff });
        if (cancelled) return;
        setData(result);
        setNoSolarDevices(false);
        writeCache(cacheKey, result);
      } catch (err) {
        if (cancelled) return;
        console.error("[useSolarSavings] load failed", err);
        setData(null);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `tariff` is folded into tariffKey so a re-created object with the same rates does not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteIdOrCode, tariffKey, refreshTick]);

  const refresh = React.useCallback(() => setRefreshTick((n) => n + 1), []);

  return { data, loading, error, noSolarDevices, tariff, refresh };
}
