import React from "react";
import { useDeviceInventory } from "../context/DeviceInventoryContext";
import { useFilters } from "../context/FiltersContext";
import { useAppSelector } from "../store/hooks";
import { selectAuthSites } from "../features/auth";
import type { MeSite } from "../features/users";
import type { SiteOption } from "../components/Shared/SiteDropdownGrouped";

type DeviceCounts = Partial<{
  cameras: number;
  intercom: number;
  waterMeter: number;
  electricMeter: number;
  electricOnline: number;
  electricOffline: number;
  airSensor: number;
  zyta: number;
  iot: number;
  iotOffline: number;
  medical: number;
  medicalOffline: number;
  caregiver: number;
  caregiverOffline: number;
}>;

type DeviceTotals = { online: number; offline: number };

type DeviceAggregate = {
  total: number;
  cameras: number;
  intercom: number;
  water: number;
  electric: number;
  electricOnline: number;
  electricOffline: number;
  air: number;
  iot: number;
  iotOffline: number;
  medical: number;
  medicalOffline: number;
  caregiver: number;
  caregiverOffline: number;
  zyta: number;
  online: number;
  offline: number;
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

function createEmptyAggregate(): DeviceAggregate {
  return {
    total: 0,
    cameras: 0,
    intercom: 0,
    water: 0,
    electric: 0,
    electricOnline: 0,
    electricOffline: 0,
    air: 0,
    iot: 0,
    iotOffline: 0,
    medical: 0,
    medicalOffline: 0,
    caregiver: 0,
    caregiverOffline: 0,
    zyta: 0,
    online: 0,
    offline: 0,
  };
}

function addSiteToAggregate(acc: DeviceAggregate, site: MeSite): DeviceAggregate {
  const c = site.counters;
  const medicalCount = Number((c as any).devices_medical ?? c.devices_caregiver ?? 0);
  const onlineCount = Number((c as any).devices_online ?? 0);
  const offlineCount = Number((c as any).devices_offline ?? 0);
  return {
    ...acc,
    total: acc.total + c.devices_total,
    cameras: acc.cameras + c.devices_camera,
    intercom: acc.intercom + c.devices_intercom,
    water: acc.water + c.devices_water,
    electric: acc.electric + c.devices_electric,
    electricOnline: acc.electricOnline + c.devices_electric_online,
    electricOffline: acc.electricOffline + c.devices_electric_offline,
    air: acc.air + c.devices_air,
    iot: acc.iot + c.devices_iot,
    medical: acc.medical + medicalCount,
    caregiver: acc.caregiver + c.devices_caregiver,
    online: acc.online + onlineCount,
    offline: acc.offline + offlineCount,
  };
}

/**
 * Aggregate device counters across the user's accessible sites.
 *
 * Counters are pre-computed by backend and shipped inside `/users/me`
 * (one request, no N+1). This hook reads from `selectAuthSites`, applies
 * site/utility/group filters, and returns the rolled-up totals.
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

      const aggregated = targetSites.reduce(
        addSiteToAggregate,
        createEmptyAggregate()
      );

      const nextCounts: DeviceCounts = {
        cameras: aggregated.cameras,
        intercom: aggregated.intercom,
        waterMeter: aggregated.water,
        electricMeter: aggregated.electric,
        electricOnline: aggregated.electricOnline,
        electricOffline: aggregated.electricOffline,
        airSensor: aggregated.air,
        iot: aggregated.iot,
        iotOffline: 0,
        medical: aggregated.medical,
        medicalOffline: 0,
        caregiver: aggregated.caregiver,
        caregiverOffline: 0,
      };

      const hasLifecycleTotals = aggregated.online > 0 || aggregated.offline > 0;
      const fallbackOffline = aggregated.electricOffline;
      const nextTotals: DeviceTotals = {
        online: hasLifecycleTotals
          ? Math.max(0, aggregated.online)
          : Math.max(0, aggregated.total - fallbackOffline),
        offline: hasLifecycleTotals
          ? Math.max(0, aggregated.offline)
          : fallbackOffline,
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
