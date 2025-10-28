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
import { getElectricDevices } from "../../api/electric";
import FaceRecognize from "./FaceRecognize";
import ZYTAEvents from "./ZYTAEvents";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useUserPath } from "../../routes/useUserPath";

type Props = {
  // left column
  searchEvent: string;
  setSearchEvent: (v: string) => void;
  filteredNotis: ReadonlyArray<any>;
  searchWB: string;
  setSearchWB: (v: string) => void;
  filteredWellBeginNotis: ReadonlyArray<any>;
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
  filteredRecognize: ReadonlyArray<any>;

  searchZYTA: string;
  setSearchZYTA: (v: string) => void;
  filterZYTA: ReadonlyArray<any>;
  selectedSiteCode?: string;
  accessibleSites?: Array<{
    id?: string;
    code?: string;
    name?: string;
    province_code?: string;
    lat?: number;
    lng?: number;
  }>;
};

export default function ContentLayout(props: Props) {
  const {
    // left
    searchEvent,
    setSearchEvent,
    filteredNotis,
    searchWB,
    setSearchWB,
    filteredWellBeginNotis,
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
    filteredRecognize,
    searchZYTA,
    setSearchZYTA,
    filterZYTA,
  } = props;

  const navigate = useNavigate();

  const { abs } = useUserPath();
  const allItems = React.useMemo(
    () =>
      [...filteredNotis, ...filteredWellBeginNotis].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [filteredNotis, filteredWellBeginNotis]
  );

  const bag = (n: any) =>
    [n?.event, n?.titleKey, n?.title, n?.site, n?.type, n?.date]
      .filter(Boolean)
      .map((x: any) => String(x).toLowerCase().trim())
      .join(" ");

  // ลิสต์ “ผลลัพธ์จาก search ของ AlertEvents”
  const filteredAllForSearch = React.useMemo(() => {
    const q = (searchEvent || "").toLowerCase().trim();
    if (!q) return allItems;
    return allItems.filter((n: any) => bag(n).includes(q));
  }, [allItems, searchEvent]);

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

  // ----- Device inventory counts (inverters only for electric) -----
  const [deviceCounts, setDeviceCounts] = React.useState<
    Partial<{ cameras: number; intercom: number; waterMeter: number; electricMeter: number; airSensor: number; zyta: number }>
  >({});
  const [deviceTotals, setDeviceTotals] = React.useState<{ online: number; offline: number }>({ online: 0, offline: 0 });

  React.useEffect(() => {
    (async () => {
      try {
        // const role = String((props as any)?.role || "").toLowerCase();
        const sites = Array.isArray(props.accessibleSites) ? props.accessibleSites : [];
        const selected = String(props.selectedSiteCode || "");

        // Resolve site IDs to fetch: single site, or aggregate across accessible sites
        let siteIds: string[] = [];
        if (!selected || selected === "all") {
          // Admin: aggregate across all sites; others: aggregate across only accessible sites (could be empty)
          // Use site.code as external SiteId for inventory endpoint
          siteIds = sites.map((s: any) => String(s.code ?? s.id)).filter(Boolean);
        } else {
          const s = sites.find((x: any) => String(x.code) === selected);
          if (s?.code || s?.id) siteIds = [String(s.code ?? s.id)];
        }

        if (siteIds.length === 0) {
          console.debug("[DeviceCount] no siteIds resolved for inventory", {
            selected,
            sitesCount: sites.length,
          });
          setDeviceCounts({});
          setDeviceTotals({ online: 0, offline: 0 });
          return;
        }

        // Fetch electric devices in parallel and aggregate inverter count
        const results = await Promise.all(
          sites
            .filter((s: any) => siteIds.includes(String(s.code ?? s.id)))
            .map(async (s: any) => {
              const id1 = String(s.code ?? "");
              const id2 = String(s.id ?? "");
              // Try with code first (backend accepts code or id)
              try {
                const resp = await getElectricDevices(id1);
                const items = Array.isArray(resp?.items) ? resp.items : [];
                const count = items.filter((it: any) => {
                  const cat = (it?.meta?.deviceCategory || it?.meta?.details?.deviceCategory || "").toString();
                  const model = (it?.model || "").toString();
                  return cat === "INVERTER" || model.startsWith("INVERTER:");
                }).length;
                return count as number;
              } catch (e1) {
                try {
                  const resp2 = await getElectricDevices(id2);
                  const items2 = Array.isArray(resp2?.items) ? resp2.items : [];
                  const count2 = items2.filter((it: any) => {
                    const cat = (it?.meta?.deviceCategory || it?.meta?.details?.deviceCategory || "").toString();
                    const model = (it?.model || "").toString();
                    return cat === "INVERTER" || model.startsWith("INVERTER:");
                  }).length;
                  return count2 as number;
                } catch (e2) {
                  console.debug("[DeviceCount] inventory fetch failed for site", {
                    siteCode: s.code,
                    siteId: s.id,
                  });
                  return 0;
                }
              }
            })
        );

        const totalInverters = results.reduce((a, b) => a + b, 0);
        console.debug("[DeviceCount] aggregated inverters", {
          selected,
          siteIds,
          totalInverters,
        });
        setDeviceCounts({ electricMeter: totalInverters });
        // Until we have online/offline status per device, treat counted devices as online
        setDeviceTotals({ online: totalInverters, offline: 0 });
      } catch (e) {
        // keep previous on failure
        setDeviceCounts((prev) => prev);
        setDeviceTotals((prev) => prev);
      }
    })();
  }, [props.selectedSiteCode, JSON.stringify(props.accessibleSites)]);

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
        const role = String((props as any)?.role || "").toLowerCase();
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
    (props as any)?.role,
    JSON.stringify(props.accessibleSites),
  ]);

  return (
    <div className="flex flex-col px-6 gap-3">
      {/* 
        Responsive grid:
        - mobile: 1 col
        - tablet: 2 cols (ซ้าย + กลาง)
        - desktop+: 3 cols: [ซ้ายแคบ] [กลางกว้าง] [ขวาแคบ]
      */}
      <div
        className="
          grid gap-3
          grid-cols-1
          md:grid-cols-
          lg:[grid-template-columns:370px_minmax(0,1fr)_370px]
        "
      >
        {/* LEFT: All-time Alerts + Well-being (ซ้อนกันในกล่องเดียว) */}
        <div className="p-6 w-full flex-col lg:flex-col md:flex-row md:grid-cols-2 sm:grid-cols-1 rounded-xl flex  gap-3 bg-white">
          <div className="w-full rounded-xl bg-white">
            <AlertEvents
              search={searchEvent}
              setSearch={setSearchEvent}
              items={allItems as any[]}
            />
          </div>
          <div className="w-full rounded-xl bg-white">
            <WellBeingEvents
              search={searchWB}
              setSearch={setSearchWB}
              items={filteredWellBeginNotis as any[]}
            />
          </div>
        </div>

        {/* MIDDLE: Map ด้านบน + แถวล่าง UserManagement & Devices */}
        <div className="flex flex-col gap-3 md:col-span-1">
          {/* Map panel */}
          <div className="p-6 w-full rounded-xl bg-white">
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
              overrideNotis={filteredAllForSearch as any[]}
            />
          </div>

          {/* Bottom row under the map: User Management (ซ้าย) + Devices (ขวา)
              - บนจอเล็กให้ซ้อนลงมาเป็น 1 คอลัมน์
              - บนจอใหญ่จัด 2 คอลัมน์เคียงกันให้เหมือนภาพ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 lg-1399:grid-cols-2 gap-3">
            <div
              className="p-6 w-full rounded-xl bg-white"
              onClick={() => {
                // เปิดหน้า UserManagement เฉพาะ admin เท่านั้น
                try {
                  const role = (props as any).role as string | undefined;
                  if (String(role).toLowerCase() === "admin") {
                    navigate(abs("/usermanage"));
                  }
                } catch {
                  /* no-op */
                }
              }}
              style={{
                cursor:
                  (props as any)?.role === "admin" ? "pointer" : "default",
                opacity: (props as any)?.role === "admin" ? 1 : 0.9,
              }}
              aria-disabled={(props as any)?.role !== "admin"}
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
            <div className="p-6 w-full rounded-xl bg-white">
              <DeviceCount
                siteCode={props.selectedSiteCode}
                counts={deviceCounts as any}
                onlineCount={deviceTotals.online}
                offlineCount={deviceTotals.offline}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: ZYTA Security Alert ด้านบน + Face Recognize/License Plates ด้านล่าง */}
        <div className="flex flex-col md:flex-row lg:flex-col gap-3 grid-cols-1 md:grid-cols-2 md:col-span-1">
          <div className="p-6 w-full rounded-xl bg-white">
            <ZYTAEvents
              search={searchZYTA}
              setSearch={setSearchZYTA}
              items={filterZYTA as any[]}
            />
          </div>

          <div className="p-6 w-full rounded-xl bg-white">
            <FaceRecognize
              search={searchFR}
              setSearch={setSearchFR}
              items={filteredRecognize as any[]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
