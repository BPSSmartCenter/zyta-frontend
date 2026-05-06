// src/components/Dashboard/ContentLayout.tsx
import AlertEvents from "./AlertEvents";
import WellBeingEvents from "./WellBeingEvents";
import MapPanel from "./MapPanel";
import UserManagement from "./UserManagement";
import {
  regionLabels,
  regionColors,
  roleLabels,
  roleColors,
} from "./dashboard.constants";
import { getUserStats } from "../../api/user";
import DeviceCount from "./DeviceCount";
import { useDeviceInventoryLoader } from "../../hooks/useDeviceInventoryLoader";
import FaceRecognize from "./FaceRecognize";
import ZYTAEvents from "./ZYTAEvents";
import UtilityOverview from "./UtilityOverview";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useUserPath } from "../../routes/useUserPath";
import { me as apiMe } from "../../api/user";
import SnapshotChartSection from "../Chart";
import Switch from "../Switch";
import type { Noti } from "../../data/Dashboard/notis";
import {
  combineDashboardNotis,
  filterDashboardAlertEvents,
  filterDashboardFaceRecognizeItems,
  filterDashboardWellBeingEvents,
  filterDashboardZytaEvents,
} from "../../features/dashboardNotis";

const MASTER_EMAIL = "smartechcenter@bpstechthai.com";

type DashboardRole = "admin" | "manager" | "officer" | "user";

type DashboardSiteSummary = {
  id?: string;
  code?: string;
  name?: string;
  province_code?: string;
  lat?: number;
  lng?: number;
  utility?: string;
  groupSite?: string;
};

const SURFACE_CARD_CLASS =
  "rounded-[10px] border border-white/80 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]";

function DashboardSurface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={[SURFACE_CARD_CLASS, className].join(" ")}>{children}</section>;
}

function RailCard({
  title,
  count,
  className = "",
  bodyClassName = "",
  children,
}: {
  title: string;
  count?: number;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <DashboardSurface className={["p-4", className].join(" ")}>
      <div className="flex items-center justify-between gap-3 px-2 pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-900">
          {title}
        </h2>
        {typeof count === "number" ? (
          <span className="inline-flex min-w-[32px] items-center justify-center rounded-full bg-[#F3F0FF] px-2 py-1 text-xs font-semibold text-[#4A3AFF]">
            {count}
          </span>
        ) : null}
      </div>
      <div className={["rounded-[22px] bg-[#F8FBFE]", bodyClassName].join(" ")}>
        {children}
      </div>
    </DashboardSurface>
  );
}

type AlertRailMode = "alert-events" | "special-events";

type Props = {
  // left column
  searchEvent: string;
  setSearchEvent: (v: string) => void;
  alertEvents: ReadonlyArray<Noti>;
  searchWB: string;
  setSearchWB: (v: string) => void;
  wellBeingEvents: ReadonlyArray<Noti>;
  // middle
  selectedEvents: string[];
  buttonLabel: string;
  toggleEvent: (v: string) => void;
  site: string;
  setSite: (v: string) => void;
  province: string;
  setProvince: (v: string) => void;
  mapNotis?: any[];
  // right
  searchFR: string;
  setSearchFR: (v: string) => void;
  faceRecognizeItems: ReadonlyArray<Noti>;

  searchZYTA: string;
  setSearchZYTA: (v: string) => void;
  zytaItems: ReadonlyArray<Noti>;
  notisLoading?: boolean;
  selectedSiteCode?: string;
  accessibleSites?: DashboardSiteSummary[];
  role?: DashboardRole | null;
  rawNotis?: ReadonlyArray<Noti>;
};

export default function ContentLayout(props: Props) {
  const {
    // left
    searchEvent,
    setSearchEvent,
    alertEvents,
    searchWB,
    setSearchWB,
    wellBeingEvents,
    // middle
    selectedEvents,
    buttonLabel,
    toggleEvent,
    site,
    setSite,
    province,
    setProvince,
    // right
    searchFR,
    setSearchFR,
    faceRecognizeItems,
    searchZYTA,
    setSearchZYTA,
    zytaItems,
    notisLoading = false,
  } = props;

  const navigate = useNavigate();
  const [isMaster, setIsMaster] = React.useState(false);
  const [alertRailMode, setAlertRailMode] =
    React.useState<AlertRailMode>("alert-events");
  const alertAsideRef = React.useRef<HTMLElement | null>(null);
  const mapSurfaceRef = React.useRef<HTMLDivElement | null>(null);
  const [mapSurfaceHeight, setMapSurfaceHeight] = React.useState<number | null>(
    null
  );
  const [alertViewportHeight, setAlertViewportHeight] =
    React.useState<number | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const me = await apiMe();
        setIsMaster(String(me?.email || "").toLowerCase() === MASTER_EMAIL);
      } catch {
        setIsMaster(false);
      }
    })();
  }, []);
  React.useEffect(() => {
    const node = mapSurfaceRef.current;
    if (!node) return;

    const updateHeight = () => {
      const nextHeight = Math.round(node.getBoundingClientRect().height);
      setMapSurfaceHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }

    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  React.useEffect(() => {
    const node = alertAsideRef.current;
    if (!node) return;

    const updateHeight = () => {
      const absoluteTop = node.getBoundingClientRect().top + window.scrollY;
      const viewportHeight = window.innerHeight;
      const nextHeight = Math.max(0, Math.floor(viewportHeight - absoluteTop - 16));
      setAlertViewportHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    updateHeight();
    const rafId = window.requestAnimationFrame(updateHeight);
    window.addEventListener("resize", updateHeight);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateHeight);
    };
  }, [alertRailMode]);

  const { abs } = useUserPath();

  const filteredAlertEvents = React.useMemo(
    () => filterDashboardAlertEvents(alertEvents as any[], searchEvent),
    [alertEvents, searchEvent]
  );

  const filteredWellBeingItems = React.useMemo(
    () => filterDashboardWellBeingEvents(wellBeingEvents as any[], searchWB),
    [searchWB, wellBeingEvents]
  );

  const filteredFaceRecognizeItems = React.useMemo(
    () =>
      filterDashboardFaceRecognizeItems(faceRecognizeItems as any[], searchFR),
    [faceRecognizeItems, searchFR]
  );

  const filteredZytaItems = React.useMemo(
    () => filterDashboardZytaEvents(zytaItems as any[], searchZYTA),
    [searchZYTA, zytaItems]
  );

  const mapBaseItems = React.useMemo(
    () => combineDashboardNotis(alertEvents as any[], filteredWellBeingItems),
    [alertEvents, filteredWellBeingItems]
  );

  // ลิสต์ “ผลลัพธ์จาก search ของ AlertEvents”
  const filteredAllForSearch = React.useMemo(() => {
    return filterDashboardAlertEvents(mapBaseItems as any[], searchEvent);
  }, [mapBaseItems, searchEvent]);

  // Compute region-site counts from accessibleSites
  const regionSeriesFromSites = React.useMemo(() => {
    const counts = [0, 0, 0, 0]; // [north, northeast, south, central]
    const map: Record<string, number> = {
      // Central
      "10": 2, // กรุงเทพมหานคร
      "73": 3, // นครปฐม
    };
    const sites = props.accessibleSites ?? [];
    for (const s of sites) {
      const code = String(s?.province_code ?? "").trim();
      const idx = map[code] ?? 3; // default central if unknown
      counts[idx] += 1;
    }
    return counts;
  }, [JSON.stringify(props.accessibleSites)]);

  const { counts: liveDeviceCounts, totals: liveDeviceTotals } =
    useDeviceInventoryLoader({
      selectedSiteCode: props.selectedSiteCode,
      accessibleSites: props.accessibleSites,
    });
  const deviceCounts = liveDeviceCounts;
  const deviceTotals = liveDeviceTotals;

  // Fetch role stats (จำนวน user ที่ใช้งาน) for the selected site
  // กรณีเลือกไซต์เฉพาะ: ใช้ officer/user จากไซต์นั้น + admin จาก global (เห็นได้ทุกไซต์)
  const [roleSeriesFromApi, setRoleSeriesFromApi] = React.useState<
    number[] | null
  >(null);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = (props.selectedSiteCode ?? "").toString().trim();
        const isAll = !raw || raw === "all";
        const role = String(props.role || "").toLowerCase();
        const hasAnySite = Array.isArray(props.accessibleSites) && props.accessibleSites.length > 0;

        // Wait for sites to load before deciding; avoid showing 0 on first paint
        if (props.accessibleSites == null) return;

        // If non-admin and no accessible sites, don't fetch; show zeros
        if (role !== "admin" && !hasAnySite) {
          if (!cancelled) setRoleSeriesFromApi([0, 0, 0]);
          return;
        }

        if (isAll) {
          if (role === "admin") {
            // Admin: use global stats directly (all sites)
            const global = await getUserStats();
            const series = [
              global.byRole.officer ?? 0,
              global.byRole.user ?? 0,
              global.byRole.admin ?? 0,
            ];
            if (!cancelled) setRoleSeriesFromApi(series);
            return;
          }
          // Non-admin: aggregate across accessible sites
          const codes = (props.accessibleSites || [])
            .map((s: any) => String(s.code || "").trim())
            .filter(Boolean);
          if (codes.length === 0) {
            if (!cancelled) setRoleSeriesFromApi([0, 0, 0]);
            return;
          }
          const results = await Promise.all(
            codes.map(async (c) => {
              try {
                return await getUserStats(c);
              } catch {
                return { byRole: { admin: 0, officer: 0, user: 0 } } as any;
              }
            })
          );
          const sum = results.reduce(
            (acc, r: any) => ({
              admin: acc.admin + (r?.byRole?.admin ?? 0),
              officer: acc.officer + (r?.byRole?.officer ?? 0),
              user: acc.user + (r?.byRole?.user ?? 0),
            }),
            { admin: 0, officer: 0, user: 0 }
          );
          if (!cancelled)
            setRoleSeriesFromApi([sum.officer, sum.user, sum.admin]);
          return;
        }

        // Specific site: always use that site's stats for all roles
        console.debug("[UserMgmt] fetch site /users/stats?site=", raw);
        const site = await getUserStats(raw);
        const series = [
          site.byRole.officer ?? 0,
          site.byRole.user ?? 0,
          site.byRole.admin ?? 0,
        ];
        console.debug(
          "[UserMgmt] composed series [officer,user,admin] =",
          series
        );
        if (!cancelled) setRoleSeriesFromApi(series);
      } catch (e) {
        console.debug("[UserMgmt] fetch stats failed", e);
        if (!cancelled) setRoleSeriesFromApi(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    props.selectedSiteCode,
    props.role,
    JSON.stringify(props.accessibleSites),
  ]);

  const specialAlertCount =
    filteredFaceRecognizeItems.length +
    filteredZytaItems.length +
    filteredWellBeingItems.length;
  const activeAlertCount =
    alertRailMode === "alert-events"
      ? filteredAlertEvents.length
      : specialAlertCount;
  const alertAsideStyle = mapSurfaceHeight
    ? ({
        "--dashboard-map-card-height": `${mapSurfaceHeight}px`,
        "--dashboard-alert-viewport-height": alertViewportHeight
          ? `${alertViewportHeight}px`
          : undefined,
      } as React.CSSProperties)
    : alertViewportHeight
      ? ({
          "--dashboard-alert-viewport-height": `${alertViewportHeight}px`,
        } as React.CSSProperties)
      : undefined;

  return (
    <div className="grid grid-cols-1 gap-5 xl:[grid-template-columns:minmax(0,1fr)_348px] 2xl:[grid-template-columns:minmax(0,1fr)_368px]">
      <div className="flex min-w-0 flex-col gap-5">
        <div ref={mapSurfaceRef}>
          <DashboardSurface className="p-1">
            <MapPanel
              selectedEvents={selectedEvents}
              buttonLabel={buttonLabel}
              toggleEvent={toggleEvent}
              site={site}
              setSite={setSite}
              province={province}
              setProvince={setProvince}
              selectedSiteCode={props.selectedSiteCode}
              accessibleSites={props.accessibleSites}
              role={props.role}
              overrideNotis={filteredAllForSearch as any[]}
            />
          </DashboardSurface>
        </div>

        <DashboardSurface className="p-5">
          <UtilityOverview selectedSiteCode={props.selectedSiteCode} />
        </DashboardSurface>

        <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.08fr)]">
          <DashboardSurface className="p-6">
            <DeviceCount
              siteCode={props.selectedSiteCode}
              counts={deviceCounts as any}
              onlineCount={deviceTotals.online}
              offlineCount={deviceTotals.offline}
            />
          </DashboardSurface>

          <DashboardSurface
            className={[
              "p-6",
              isMaster ? "cursor-pointer transition hover:-translate-y-0.5" : "opacity-95",
            ].join(" ")}
          >
            <div
              onClick={() => {
                try {
                  if (isMaster) {
                    navigate(abs("/usermanage"));
                  }
                } catch {
                  /* no-op */
                }
              }}
              aria-disabled={!isMaster}
            >
              <UserManagement
                regionSeries={regionSeriesFromSites}
                regionLabels={regionLabels}
                regionColors={regionColors}
                roleSeries={roleSeriesFromApi ?? undefined}
                roleLabels={roleLabels}
                roleColors={roleColors}
              />
            </div>
          </DashboardSurface>
        </div>

        <div className="overflow-hidden rounded-[10px]">
          <SnapshotChartSection
            buttonLabel={buttonLabel}
            selectedEvents={selectedEvents}
            toggleEvent={toggleEvent}
            items={props.rawNotis}
          />
        </div>
      </div>

      <aside
        ref={alertAsideRef}
        className={[
          "flex min-w-0 flex-col gap-5",
          alertRailMode === "alert-events"
            ? "min-h-0 xl:h-[var(--dashboard-alert-viewport-height)]"
            : "min-h-0 xl:h-[var(--dashboard-alert-viewport-height)]",
        ].join(" ")}
        style={alertAsideStyle}
      >
        <div className="flex items-end justify-between gap-3 bg-white/90 rounded-[10px] py-2 px-3 pl-6">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-950">ALERTS</h2>
            <p className="text-sm text-slate-500">
              {activeAlertCount} recent events
            </p>
          </div>

          <div className="flex flex-row items-center gap-2 rounded-full p-2 ">
            <span
              className={[
                "text-xs font-semibold transition",
                alertRailMode === "alert-events"
                  ? "text-slate-950"
                  : "text-slate-400",
              ].join(" ")}
            >
              All alert events
            </span>
            <Switch
              checked={alertRailMode === "alert-events"}
              onChange={(event) =>
                setAlertRailMode(
                  // event.target.checked ? "special-events" : "alert-events"
                  event.target.checked ? "alert-events" : "special-events"
                )
              }
              aria-label="Toggle alert rail mode"
            />

          </div>
        </div>

        {alertRailMode === "alert-events" ? (
          <RailCard
            title="Alert Events"
            count={filteredAlertEvents.length}
            className="flex min-h-0 flex-1 flex-col"
            bodyClassName="flex min-h-0 flex-1 flex-col"
          >
            <AlertEvents
              search={searchEvent}
              setSearch={setSearchEvent}
              items={filteredAlertEvents as any[]}
              loading={notisLoading}
              fillAvailableHeight
            />
          </RailCard>
        ) : (
          <>
            <RailCard
              title="Face Recognize / License Plates"
              count={filteredFaceRecognizeItems.length}
              className="flex min-h-0 flex-1 flex-col"
              bodyClassName="flex min-h-0 flex-1 flex-col"
            >
              <FaceRecognize
                search={searchFR}
                setSearch={setSearchFR}
                items={filteredFaceRecognizeItems as any[]}
                loading={notisLoading}
                showTitle={false}
                fillAvailableHeight
              />
            </RailCard>

            <RailCard
              title="ZYTA Security Alert"
              count={filteredZytaItems.length}
              className="flex min-h-0 flex-1 flex-col"
              bodyClassName="flex min-h-0 flex-1 flex-col"
            >
              <ZYTAEvents
                search={searchZYTA}
                setSearch={setSearchZYTA}
                items={filteredZytaItems as any[]}
                loading={notisLoading}
                showTitle={false}
                fillAvailableHeight
              />
            </RailCard>

            <RailCard
              title="Well-being Events"
              count={filteredWellBeingItems.length}
              className="flex min-h-0 flex-1 flex-col"
              bodyClassName="flex min-h-0 flex-1 flex-col"
            >
              <WellBeingEvents
                search={searchWB}
                setSearch={setSearchWB}
                items={filteredWellBeingItems as any[]}
                loading={notisLoading}
                showTitle={false}
                fillAvailableHeight
              />
            </RailCard>
          </>
        )}
      </aside>
    </div>
  );
}
