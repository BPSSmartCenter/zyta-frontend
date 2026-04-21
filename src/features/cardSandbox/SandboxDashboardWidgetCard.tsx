import React from "react";
import SnapshotChartSection from "../../components/Chart";
import DeviceCount from "../../components/Dashboard/DeviceCount";
import FaceRecognize from "../../components/Dashboard/FaceRecognize";
import UserManagement from "../../components/Dashboard/UserManagement";
import ZYTAEvents from "../../components/Dashboard/ZYTAEvents";
import {
  regionColors,
  regionLabels,
  roleColors,
  roleLabels,
} from "../../components/Dashboard/dashboard.constants";
import { listSites } from "../../api/sites";
import { getUserStats, me as apiMe } from "../../api/user";
import { useFilters } from "../../context/FiltersContext";
import { useNotisFeed } from "../../context/NotisContext";
import { notis as mockNotis, type Noti } from "../../data/Dashboard/notis";
import { useDeviceInventoryLoader } from "../../hooks/useDeviceInventoryLoader";
import {
  decorateNotiForDisplay,
  matchesSite,
  sortByNewest,
  toDateKey,
} from "../../utils/notis";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectSandboxEventPanels, selectSandboxMapPanel } from "./cardSandboxSelectors";
import { cardSandboxActions } from "./cardSandboxSlice";

type DashboardRole = "admin" | "manager" | "officer" | "user";

type SandboxSite = {
  id?: string;
  code?: string;
  name?: string;
  province_code?: string;
  lat?: number;
  lng?: number;
  utility?: string;
  groupSite?: string;
};

type Props = {
  variant: "zyta" | "facerec" | "devices" | "users" | "snapshot";
};

type FaceRecognizeItem = React.ComponentProps<
  typeof FaceRecognize
>["items"][number] & {
  id?: string;
  occurredAt?: string;
  createdAt?: string;
  screenshot?: string;
  deviceId?: string;
  deviceModel?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeRole(value: unknown): DashboardRole {
  const role = String(value || "user").toLowerCase();
  if (
    role === "admin" ||
    role === "manager" ||
    role === "officer" ||
    role === "user"
  ) {
    return role;
  }
  return "user";
}

function normalizeSiteList(value: unknown): SandboxSite[] {
  const list = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.items)
    ? value.items
    : [];

  return list
    .filter(isRecord)
    .map((site) => ({
      id: optionalString(site.id),
      code: optionalString(site.code),
      name: optionalString(site.name),
      province_code: optionalString(site.province_code),
      lat: optionalNumber(site.lat),
      lng: optionalNumber(site.lng),
      utility: optionalString(
        isRecord(site.utility) ? site.utility.name : site.utility
      ),
      groupSite: optionalString(
        site.groupSite ??
          site.group_site ??
          site.site_group_name ??
          (isRecord(site.site_group) ? site.site_group.name : undefined)
      ),
    }))
    .filter((site) => Boolean(site.id || site.code || site.name));
}

function mergeSiteMetadata(
  assignedSites: SandboxSite[],
  catalogSites: SandboxSite[]
) {
  const catalogByKey = new Map<string, SandboxSite>();
  for (const site of catalogSites) {
    [site.code, site.id, site.name]
      .filter(Boolean)
      .map(String)
      .forEach((key) => catalogByKey.set(key.toLowerCase(), site));
  }

  return assignedSites.map((site) => {
    const catalog =
      [site.code, site.id, site.name]
        .filter(Boolean)
        .map(String)
        .map((key) => catalogByKey.get(key.toLowerCase()))
        .find(Boolean) ?? null;
    if (!catalog) return site;
    return {
      ...site,
      province_code: site.province_code ?? catalog.province_code,
      lat: site.lat ?? catalog.lat,
      lng: site.lng ?? catalog.lng,
      utility: site.utility ?? catalog.utility,
      groupSite: site.groupSite ?? catalog.groupSite,
    };
  });
}

function isZytaNoti(noti: Noti): boolean {
  const key = String(noti.titleKey || "").toLowerCase();
  return key.startsWith("zytanotis.");
}

function toFacePlateItem(noti: Noti): FaceRecognizeItem {
  const normalize = (value?: unknown) =>
    value === undefined || value === null ? undefined : String(value);
  const meta = isRecord(noti.meta) ? noti.meta : {};
  const row = isRecord(meta.row) ? meta.row : {};
  const faceRow = isRecord(meta.faceRow) ? meta.faceRow : {};
  const device = isRecord(meta.device) ? meta.device : {};
  const deviceHeaders = isRecord(meta.deviceHeaders)
    ? meta.deviceHeaders
    : {};
  const person = isRecord(meta.person) ? meta.person : {};
  const key = String(noti.titleKey || noti.title || "").toLowerCase();
  const isFace = key.includes("facedetected");
  const isPlate = key.includes("platedetected");
  const occurredAt = noti.occurredAt ?? noti.date ?? new Date().toISOString();
  const rawId =
    normalize(meta.rawId) ||
    normalize(row.id) ||
    normalize(faceRow.id) ||
    noti.id ||
    occurredAt;
  const cameraName =
    normalize(meta.cameraName) ??
    normalize(device.name) ??
    normalize(deviceHeaders.deviceKey);
  const siteLabel =
    noti.site ?? normalize(meta.siteName) ?? normalize(meta.siteCode) ?? "-";
  const title = isFace
    ? normalize(person.fullName) ?? noti.title ?? "Face detected"
    : normalize(meta.plateText) ?? noti.title ?? "License plate detected";
  const img = isFace
    ? normalize(meta.faceCropImg) ??
      normalize(meta.faceFullImg) ??
      normalize(meta.picture) ??
      noti.img
    : normalize(meta.platePicture) ?? normalize(meta.picture) ?? noti.img;

  return {
    ...noti,
    id: rawId ?? noti.id ?? occurredAt,
    title,
    site: siteLabel,
    occurredAt,
    date: occurredAt,
    img,
    meta: {
      ...meta,
      kind: isPlate ? "plate" : "face",
      rawId,
      cameraName,
    },
  };
}

function useSandboxAccessibleSites() {
  const [role, setRole] = React.useState<DashboardRole | null>(null);
  const [accessibleSites, setAccessibleSites] = React.useState<SandboxSite[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const currentUser = await apiMe();
        const nextRole = normalizeRole(currentUser?.role);
        const assignedSites = normalizeSiteList(currentUser?.sites);
        let catalogSites: SandboxSite[] = [];
        try {
          catalogSites = normalizeSiteList(await listSites());
        } catch {
          catalogSites = [];
        }

        const nextSites =
          nextRole === "admin"
            ? catalogSites
            : assignedSites.length
            ? mergeSiteMetadata(assignedSites, catalogSites)
            : [];
        if (!cancelled) {
          setRole(nextRole);
          setAccessibleSites(nextSites);
        }
      } catch {
        if (!cancelled) {
          setRole("user");
          setAccessibleSites([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { accessibleSites, role };
}

function useSandboxScopedNotis() {
  const { date, selectedSite } = useFilters();
  const { items: liveNotis } = useNotisFeed();
  const selectedDateKey = React.useMemo(() => toDateKey(date), [date]);
  const matchGlobalDate = React.useCallback(
    (value: string) => {
      if (!selectedDateKey) return true;
      return toDateKey(value) === selectedDateKey;
    },
    [selectedDateKey]
  );

  const baseNotis = React.useMemo<Noti[]>(() => {
    if (Array.isArray(liveNotis) && liveNotis.length) return liveNotis;
    return ((mockNotis as Noti[]) ?? []).map((noti) =>
      decorateNotiForDisplay(noti)
    );
  }, [liveNotis]);

  return React.useMemo(() => {
    const siteScoped =
      !selectedSite || selectedSite === "all"
        ? sortByNewest(baseNotis)
        : sortByNewest(baseNotis.filter((noti) => matchesSite(noti, selectedSite)));
    return siteScoped.filter((noti) => matchGlobalDate(noti?.date));
  }, [baseNotis, matchGlobalDate, selectedSite]);
}

export default function SandboxDashboardWidgetCard({ variant }: Props) {
  const dispatch = useAppDispatch();
  const mapPanel = useAppSelector(selectSandboxMapPanel);
  const { faceSearch, zytaSearch } = useAppSelector(selectSandboxEventPanels);
  const { selectedSite } = useFilters();
  const { accessibleSites, role } = useSandboxAccessibleSites();
  const dateScopedNotis = useSandboxScopedNotis();

  const faceRecognizeItems = React.useMemo(
    () =>
      dateScopedNotis
        .filter((noti) => {
          const key = String(noti.titleKey || "").toLowerCase();
          return key === "notis.facedetected" || key === "notis.platedetected";
        })
        .map(toFacePlateItem),
    [dateScopedNotis]
  );

  const filteredRecognize = React.useMemo(() => {
    const query = faceSearch.toLowerCase().trim();
    return faceRecognizeItems.filter((noti) =>
      query ? JSON.stringify(noti).toLowerCase().includes(query) : true
    );
  }, [faceRecognizeItems, faceSearch]);

  const filteredZyta = React.useMemo(() => {
    const query = zytaSearch.toLowerCase().trim();
    return dateScopedNotis
      .filter(isZytaNoti)
      .filter((noti) =>
        query ? JSON.stringify(noti).toLowerCase().includes(query) : true
      );
  }, [dateScopedNotis, zytaSearch]);

  const regionSeriesFromSites = React.useMemo(() => {
    const counts = [0, 0, 0, 0];
    const map: Record<string, number> = {
      "10": 2,
      "73": 3,
    };
    for (const site of accessibleSites) {
      const code = String(site?.province_code ?? "").trim();
      const idx = map[code] ?? 3;
      counts[idx] += 1;
    }
    return counts;
  }, [accessibleSites]);

  const { counts: deviceCounts, totals: deviceTotals } =
    useDeviceInventoryLoader({
      selectedSiteCode: selectedSite,
      accessibleSites,
      enabled: variant === "devices",
    });

  const [roleSeriesFromApi, setRoleSeriesFromApi] = React.useState<
    number[] | null
  >(null);

  React.useEffect(() => {
    if (variant !== "users") return;
    let cancelled = false;
    (async () => {
      try {
        const raw = String(selectedSite ?? "").trim();
        const isAll = !raw || raw === "all";
        const hasAnySite = accessibleSites.length > 0;

        if (role !== "admin" && !hasAnySite) {
          if (!cancelled) setRoleSeriesFromApi([0, 0, 0]);
          return;
        }

        if (isAll) {
          if (role === "admin") {
            const global = await getUserStats();
            if (!cancelled) {
              setRoleSeriesFromApi([
                global.byRole.officer ?? 0,
                global.byRole.user ?? 0,
                global.byRole.admin ?? 0,
              ]);
            }
            return;
          }

          const codes = accessibleSites
            .map((site) => String(site.code || "").trim())
            .filter(Boolean);
          if (codes.length === 0) {
            if (!cancelled) setRoleSeriesFromApi([0, 0, 0]);
            return;
          }

          const results = await Promise.all(
            codes.map(async (code) => {
              try {
                return await getUserStats(code);
              } catch {
                return { byRole: { admin: 0, officer: 0, user: 0 } };
              }
            })
          );
          const sum = results.reduce(
            (acc, item) => ({
              admin: acc.admin + (item?.byRole?.admin ?? 0),
              officer: acc.officer + (item?.byRole?.officer ?? 0),
              user: acc.user + (item?.byRole?.user ?? 0),
            }),
            { admin: 0, officer: 0, user: 0 }
          );
          if (!cancelled) {
            setRoleSeriesFromApi([sum.officer, sum.user, sum.admin]);
          }
          return;
        }

        const site = await getUserStats(raw);
        if (!cancelled) {
          setRoleSeriesFromApi([
            site.byRole.officer ?? 0,
            site.byRole.user ?? 0,
            site.byRole.admin ?? 0,
          ]);
        }
      } catch {
        if (!cancelled) setRoleSeriesFromApi(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessibleSites, role, selectedSite, variant]);

  const buttonLabel = React.useMemo(
    () =>
      mapPanel.selectedEvents.includes("all")
        ? "all"
        : mapPanel.selectedEvents.join(", "),
    [mapPanel.selectedEvents]
  );

  if (variant === "zyta") {
    return (
      <ZYTAEvents
        search={zytaSearch}
        setSearch={(value) => dispatch(cardSandboxActions.setZytaSearch(value))}
        items={filteredZyta}
      />
    );
  }

  if (variant === "facerec") {
    return (
      <FaceRecognize
        search={faceSearch}
        setSearch={(value) => dispatch(cardSandboxActions.setFaceSearch(value))}
        items={filteredRecognize}
      />
    );
  }

  if (variant === "devices") {
    return (
      <DeviceCount
        siteCode={selectedSite}
        counts={deviceCounts}
        onlineCount={deviceTotals.online}
        offlineCount={deviceTotals.offline}
      />
    );
  }

  if (variant === "users") {
    return (
      <UserManagement
        regionSeries={regionSeriesFromSites}
        regionLabels={regionLabels}
        regionColors={regionColors}
        roleSeries={roleSeriesFromApi ?? undefined}
        roleLabels={roleLabels}
        roleColors={roleColors}
      />
    );
  }

  return (
    <SnapshotChartSection
      buttonLabel={buttonLabel}
      selectedEvents={mapPanel.selectedEvents}
      toggleEvent={(value) => dispatch(cardSandboxActions.toggleMapEvent(value))}
    />
  );
}
