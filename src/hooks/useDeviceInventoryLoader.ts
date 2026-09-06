import React from "react";
import {
  useDeviceInventory,
  type DeviceCounts,
} from "../context/DeviceInventoryContext";
import { useFilters } from "../context/FiltersContext";
import { useAppSelector } from "../store/hooks";
import { selectAuthSites } from "../features/auth";
import type { MeSite, MeSiteCounters } from "../features/users/usersTypes";
import type { SiteOption } from "../components/Shared/SiteDropdownGrouped";

type DeviceTotals = { online: number; offline: number };

/** Per-type tally: total counted devices and how many of them are Online. */
type TypeTally = { total: number; online: number };

type DeviceAggregate = {
  total: number;
  online: number;
  cameras: TypeTally;
  intercom: TypeTally;
  water: TypeTally;
  electric: TypeTally;
  air: TypeTally;
  iot: TypeTally;
  medical: TypeTally;
  caregiver: number;
};

type SiteSummary = {
  id?: string;
  code?: string;
  name?: string;
  province_code?: string;
};

type Options = {
  selectedSiteCode?: string | null;
  accessibleSites?: Array<SiteSummary | null | undefined> | null;
  selectedUtility?: { id: string; label: string } | null;
  selectedGroupSite?: { id: string; label: string } | null;
  siteOptions?: SiteOption[] | null;
  enabled?: boolean;
};

const EMPTY_TOTALS: DeviceTotals = { online: 0, offline: 0 };

function emptyTally(): TypeTally {
  return { total: 0, online: 0 };
}

function createEmptyAggregate(): DeviceAggregate {
  return {
    total: 0,
    online: 0,
    cameras: emptyTally(),
    intercom: emptyTally(),
    water: emptyTally(),
    electric: emptyTally(),
    air: emptyTally(),
    iot: emptyTally(),
    medical: emptyTally(),
    caregiver: 0,
  };
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addTally(acc: TypeTally, total: unknown, online: unknown): TypeTally {
  const t = Math.max(0, num(total));
  return {
    total: acc.total + t,
    // A site can never report more online devices of a type than it has.
    online: acc.online + Math.min(t, Math.max(0, num(online))),
  };
}

function addSiteToAggregate(acc: DeviceAggregate, site: MeSite): DeviceAggregate {
  const c: MeSiteCounters = site.counters;
  const total = Math.max(0, num(c.devices_total));
  return {
    total: acc.total + total,
    online: acc.online + Math.min(total, Math.max(0, num(c.devices_online))),
    cameras: addTally(acc.cameras, c.devices_camera, c.devices_camera_online),
    intercom: addTally(acc.intercom, c.devices_intercom, c.devices_intercom_online),
    water: addTally(acc.water, c.devices_water, c.devices_water_online),
    electric: addTally(acc.electric, c.devices_electric, c.devices_electric_online),
    air: addTally(acc.air, c.devices_air, c.devices_air_online),
    iot: addTally(acc.iot, c.devices_iot, c.devices_iot_online),
    medical: addTally(acc.medical, c.devices_medical, c.devices_medical_online),
    caregiver: acc.caregiver + num(c.devices_caregiver),
  };
}

/**
 * Aggregate device counters across the user's accessible sites.
 *
 * Counters are pre-computed by backend and shipped inside `/users/me`
 * (one request, no N+1). Backend already applies the dashboard rules:
 * Deleted and Disabled devices are not counted, "online" is exactly the
 * Online status, and everything else counted is "offline". This hook reads
 * from `selectAuthSites`, applies site/utility/group filters, and returns the
 * rolled-up totals.
 *
 * Re-runs synchronously whenever filter deps change; no polling.
 */
export function useDeviceInventoryLoader({
  selectedSiteCode,
  accessibleSites,
  selectedUtility: selectedUtilityOverride,
  selectedGroupSite: selectedGroupSiteOverride,
  siteOptions: siteOptionsOverride,
  enabled = true,
}: Options = {}) {
  const [counts, setCountsState] = React.useState<DeviceCounts>({});
  const [totals, setTotalsState] = React.useState<DeviceTotals>(EMPTY_TOTALS);
  const { setCounts, setLoading } = useDeviceInventory();
  const {
    selectedUtility: contextSelectedUtility,
    selectedGroupSite: contextSelectedGroupSite,
    siteOptions: contextSiteOptions,
  } = useFilters();
  const selectedUtility =
    selectedUtilityOverride === undefined
      ? contextSelectedUtility
      : selectedUtilityOverride;
  const selectedGroupSite =
    selectedGroupSiteOverride === undefined
      ? contextSelectedGroupSite
      : selectedGroupSiteOverride;
  const siteOptions = React.useMemo(
    () =>
      siteOptionsOverride === undefined
        ? contextSiteOptions
        : siteOptionsOverride ?? [],
    [contextSiteOptions, siteOptionsOverride]
  );

  // Source of truth: full /me sites with embedded counters
  const authSites = useAppSelector(selectAuthSites);

  const selectedKey = React.useMemo(() => {
    const raw = selectedSiteCode == null ? "" : String(selectedSiteCode).trim();
    if (!raw || raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") return "";
    return raw;
  }, [selectedSiteCode]);

  // If caller provided `accessibleSites`, use it as a key/id filter against
  // authSites. Otherwise default to every authSite the user can see.
  const accessibleKey = React.useMemo(() => {
    if (!Array.isArray(accessibleSites)) return null;
    const keys = new Set<string>();
    for (const site of accessibleSites) {
      if (!site) continue;
      if (site.code) keys.add(String(site.code).toLowerCase());
      if (site.id) keys.add(String(site.id).toLowerCase());
    }
    return keys;
  }, [accessibleSites]);

  React.useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    try {
      const source = accessibleKey
        ? authSites.filter(
            (s) =>
              accessibleKey.has(s.code.toLowerCase()) ||
              accessibleKey.has(s.id.toLowerCase())
          )
        : authSites;

      // Filter by selected single site
      let targetSites =
        !selectedKey || selectedKey === "all"
          ? source
          : source.filter(
              (s) => s.code === selectedKey || s.id === selectedKey
            );

      // When viewing all sites, filter by utility/group scope if active
      if (
        (!selectedKey || selectedKey === "all") &&
        (selectedUtility?.id || selectedGroupSite?.id)
      ) {
        const scopedCodes = new Set<string>();
        for (const opt of siteOptions) {
          const code = String(opt.value || "").trim();
          if (!code || code.toLowerCase() === "all") continue;
          if (selectedUtility?.id && opt.utilityId !== selectedUtility.id) continue;
          if (selectedGroupSite?.id) {
            const gId = opt.groupId;
            const gLabel = opt.groupLabel;
            if (gId !== selectedGroupSite.id && gLabel !== selectedGroupSite.label)
              continue;
          }
          scopedCodes.add(code);
        }
        targetSites = targetSites.filter(
          (s) =>
            scopedCodes.has(String(s.code ?? "")) ||
            scopedCodes.has(String(s.id ?? ""))
        );
      }

      const a = targetSites.reduce(addSiteToAggregate, createEmptyAggregate());
      const offlineOf = (t: TypeTally) => Math.max(0, t.total - t.online);

      const nextCounts: DeviceCounts = {
        cameras: a.cameras.total,
        camerasOnline: a.cameras.online,
        camerasOffline: offlineOf(a.cameras),
        intercom: a.intercom.total,
        intercomOnline: a.intercom.online,
        intercomOffline: offlineOf(a.intercom),
        waterMeter: a.water.total,
        waterMeterOnline: a.water.online,
        waterMeterOffline: offlineOf(a.water),
        electricMeter: a.electric.total,
        electricOnline: a.electric.online,
        electricOffline: offlineOf(a.electric),
        airSensor: a.air.total,
        airSensorOnline: a.air.online,
        airSensorOffline: offlineOf(a.air),
        iot: a.iot.total,
        iotOnline: a.iot.online,
        iotOffline: offlineOf(a.iot),
        medical: a.medical.total,
        medicalOnline: a.medical.online,
        medicalOffline: offlineOf(a.medical),
        caregiver: a.caregiver,
        caregiverOffline: 0,
      };

      const nextTotals: DeviceTotals = {
        online: a.online,
        offline: Math.max(0, a.total - a.online),
      };

      setCountsState(nextCounts);
      setTotalsState(nextTotals);
      setCounts((prev) => ({
        ...prev,
        ...nextCounts,
        zyta: Number(prev?.zyta ?? 0),
      }));
    } finally {
      setLoading(false);
    }
  }, [
    enabled,
    authSites,
    accessibleKey,
    selectedKey,
    selectedUtility?.id,
    selectedUtility?.label,
    selectedGroupSite?.id,
    selectedGroupSite?.label,
    siteOptions,
    setCounts,
    setLoading,
  ]);

  return { counts, totals, loading: false };
}
