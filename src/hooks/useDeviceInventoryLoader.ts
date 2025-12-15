import React from "react";
import { getSiteDetails, listSites } from "../api/sites";
import { getIoTDevices } from "../api/iot";
import { useDeviceInventory } from "../context/DeviceInventoryContext";

type DeviceCounts = Partial<{
  cameras: number;
  intercom: number;
  waterMeter: number;
  electricMeter: number;
  airSensor: number;
  zyta: number;
  iot: number;
}>;

type DeviceTotals = { online: number; offline: number };

type SiteSummary = {
  id?: string;
  code?: string;
  name?: string;
  province_code?: string;
};

type Options = {
  selectedSiteCode?: string | null;
  accessibleSites?: Array<SiteSummary | null | undefined> | null;
  enabled?: boolean;
};

const EMPTY_TOTALS: DeviceTotals = { online: 0, offline: 0 };

const normalizeSite = (site: SiteSummary | null | undefined): SiteSummary => {
  if (!site || typeof site !== "object") return {};
  const code = site.code != null ? String(site.code) : undefined;
  const id = site.id != null ? String(site.id) : undefined;
  return { ...site, code, id };
};

async function fetchSiteDetailsFor(site: SiteSummary): Promise<any | null> {
  const attempts = [site.code, site.id].filter(
    (v, idx, arr) => typeof v === "string" && v.trim().length > 0 && arr.indexOf(v) === idx
  ) as string[];

  for (const key of attempts) {
    try {
      const res = await getSiteDetails(key);
      return res?.data ?? res;
    } catch (e) {
      // try next key
    }
  }

  console.debug("[useDeviceInventoryLoader] site details fetch failed", {
    codeTried: site.code,
    idTried: site.id,
  });
  return null;
}

const reduceDeviceCounters = (
  acc: { total: number; cameras: number; intercom: number; water: number; electric: number; air: number; iot: number },
  item: any | null
) => {
  if (!item) return acc;
  const counters = (item?.counters ?? {}) as Record<string, any>;
  return {
    total: acc.total + Number(counters.devices_total ?? 0),
    cameras: acc.cameras + Number(counters.devices_camera ?? 0),
    intercom: acc.intercom + Number(counters.devices_intercom ?? 0),
    water: acc.water + Number(counters.devices_water ?? 0),
    electric: acc.electric + Number(counters.devices_electric ?? 0),
    air: acc.air + Number(counters.devices_air ?? 0),
    iot: acc.iot + Number(counters.devices_iot ?? 0),
  };
};

export function useDeviceInventoryLoader({
  selectedSiteCode,
  accessibleSites,
  enabled = true,
}: Options = {}) {
  const [counts, setCountsState] = React.useState<DeviceCounts>({});
  const [totals, setTotalsState] = React.useState<DeviceTotals>(EMPTY_TOTALS);
  const [loading, setLocalLoading] = React.useState<boolean>(false);
  const { setCounts, setLoading } = useDeviceInventory();

  const sitesCacheRef = React.useRef<SiteSummary[] | null>(null);

  const accessDigest = React.useMemo(() => {
    if (!Array.isArray(accessibleSites)) return "null";
    try {
      return JSON.stringify(
        accessibleSites
          .map((s) => (s ? { code: s.code ?? null, id: s.id ?? null } : null))
          .filter(Boolean)
      );
    } catch (_err) {
      return String(accessibleSites.length);
    }
  }, [accessibleSites]);

  const selectedKey = React.useMemo(() => {
    const raw = selectedSiteCode == null ? "" : String(selectedSiteCode).trim();
    if (!raw || raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") return "";
    return raw;
  }, [selectedSiteCode]);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const resolveSites = async (): Promise<SiteSummary[]> => {
      if (Array.isArray(accessibleSites) && accessibleSites.length > 0) {
        const normalized = accessibleSites.map(normalizeSite);
        sitesCacheRef.current = normalized;
        return normalized;
      }
      if (sitesCacheRef.current) {
        return sitesCacheRef.current;
      }
      try {
        const resp = await listSites();
        const items = Array.isArray(resp?.items)
          ? resp.items
          : Array.isArray(resp)
            ? resp
            : [];
        const normalized = items.map(normalizeSite);
        sitesCacheRef.current = normalized;
        return normalized;
      } catch (e) {
        console.debug("[useDeviceInventoryLoader] listSites failed", e);
        return [];
      }
    };

    const syncCounts = async () => {
      setLocalLoading(true);
      setLoading(true);
      try {
        const allSites = await resolveSites();
        const validSites = allSites.filter((s) => s.code || s.id);

        const targetSites =
          !selectedKey || selectedKey === "all"
            ? validSites
            : validSites.filter((s) => s.code === selectedKey || s.id === selectedKey);

        if (targetSites.length === 0) {
          if (!cancelled) {
            setCountsState({});
            setTotalsState(EMPTY_TOTALS);
            setCounts(() => ({}));
          }
          return;
        }

        const detailsList = await Promise.all(
          targetSites.map((site) => fetchSiteDetailsFor(site))
        );

        const aggregated = detailsList.reduce(
          reduceDeviceCounters,
          { total: 0, cameras: 0, intercom: 0, water: 0, electric: 0, air: 0, iot: 0 }
        );

        // Fetch real IoT count
        try {
          const iotDevices = await getIoTDevices();
          if (Array.isArray(iotDevices)) {
            aggregated.iot = iotDevices.length;

            // Count devices that look like Air Sensors (have pm25 or eco2 in snapshot)
            const airCount = iotDevices.filter(d =>
              d.snapshot && (d.snapshot.pm25 !== undefined || d.snapshot.eco2 !== undefined)
            ).length;

            if (airCount > 0) {
              aggregated.air = airCount;
            }
          }
        } catch (iotErr) {
          console.debug("Failed to sync IoT count", iotErr);
          // keep default aggregated.iot (from sites) if fail, or set to 0?
          // User prefers real data, so if fail, maybe 0 or keep static. 
          // Let's keep existing aggregation as fallback or just log error.
        }

        if (cancelled) return;

        const nextCounts: DeviceCounts = {
          cameras: aggregated.cameras,
          intercom: aggregated.intercom,
          waterMeter: aggregated.water,
          electricMeter: aggregated.electric,
          airSensor: aggregated.air,
          iot: aggregated.iot,
        };

        const nextTotals: DeviceTotals = {
          online: aggregated.total,
          offline: 0,
        };

        setCountsState(nextCounts);
        setTotalsState(nextTotals);
        setCounts((prev) => ({
          ...prev,
          ...nextCounts,
          zyta: Number(prev?.zyta ?? 0),
        }));
      } catch (error) {
        console.debug("[useDeviceInventoryLoader] sync failed", error);
        if (!cancelled) {
          // keep previous state
          setCountsState((prev) => prev);
          setTotalsState((prev) => prev);
          setCounts((prev) => prev);
        }
      } finally {
        if (!cancelled) {
          setLocalLoading(false);
          setLoading(false);
        }
      }
    };

    syncCounts();
    // Poll every 3 seconds for real-time updates
    const interval = setInterval(syncCounts, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [accessDigest, selectedKey, enabled, setCounts, setLoading, accessibleSites]);

  return { counts, totals, loading };
}
