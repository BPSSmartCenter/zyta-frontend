import MapView from "../Map/Map";
import type { Noti, Severity } from "../../data/Dashboard/notis";
import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { useNotisFeed } from "../../context/NotisContext";
import { notiSeverity, resolveAlertEventKey } from "../../utils/notis";
import { useFilters } from "../../context/FiltersContext";
import type { SitePoint, SitePinStatus } from "../Map/MapTypes";
import { getSiteDetails } from "../../api/sites";

/* ---------- helpers ---------- */
const toEventKey = (n: Noti): string => {
  const detected = resolveAlertEventKey(n);
  if (!detected) return "unknown";
  return detected === "sleep" ? "sleeping" : detected;
};

type WithGroup = Noti & { _group: "notis" | "wellbeing" };

const toSeverity = (v: string | undefined | null): Severity | "all" => {
  return v === "low" || v === "medium" || v === "critical" || v === "all"
    ? (v as any)
    : "all";
};

// map noti -> severity ("low" | "medium" | "critical")
const normalizeSeverity = (n: any): Severity => {
  const s = (n?.severity ?? "").toString().toLowerCase();
  if (s === "low" || s === "medium" || s === "critical") return s as Severity;
  const t = (n?.type ?? "").toString().toLowerCase();
  if (t === "alert" || t === "critical" || t === "danger") return "critical";
  if (t === "warning" || t === "medium") return "medium";
  return "low";
};

/* ---------- props ---------- */
type Props = {
  selectedEvents: string[];
  buttonLabel: string;
  toggleEvent: (v: string) => void;

  // หมายเหตุ: prop ชื่อ site ใช้เก็บ "severity" ตามโค้ดเดิม
  site: string;
  setSite: (v: string) => void;

  // province: "all" | ชื่อจังหวัด (ไทย)
  province: string;
  setProvince: (v: string) => void;

  overrideNotis?: Noti[];
  selectedSiteCode?: string;
  role?: "admin" | "manager" | "officer" | "user" | null;
  accessibleSites?: Array<{
    id?: string;
    code?: string;
    name?: string;
    province_code?: string;
    lat?: number;
    lng?: number;
    utility?: string;
    groupSite?: string;
  }>;
};

export default function MapPanel({
  selectedEvents,
  buttonLabel: _buttonLabel,
  toggleEvent: _toggleEvent,
  site,
  setSite: _setSite,
  province,
  setProvince,
  overrideNotis,
  selectedSiteCode,
  role,
  accessibleSites,
}: Props) {
  console.log("🗺️ [MapPanel] COMPONENT RENDER", { selectedSiteCode, accessibleSites: accessibleSites?.length });
  const { items: liveNotis } = useNotisFeed();
  const {
    setSelectedSite,
    siteOptions,
    selectedGroupSite,
    selectedUtility,
  } = useFilters();

  // When a pin is clicked on the map, update the global site selection (dropdown)
  const handlePinClick = useCallback(
    (site: SitePoint) => {
      if (site.code) {
        setSelectedSite(site.code);
      }
    },
    [setSelectedSite]
  );

  // When map zooms out to country, reset site selection to "All Sites"
  const handleZoomOutToCountry = useCallback(() => {
    setSelectedSite("all");
  }, [setSelectedSite]);
  const userRole: "admin" | "manager" | "officer" | "user" = role ?? "user";
  const [pinStatusBySite, setPinStatusBySite] = useState<Record<string, SitePinStatus>>({});
  const pinStatusRequestIdRef = useRef(0);

  /* ---------- ACL sites (ใช้ object เต็มจาก accessSites) ---------- */
  type AclSite = {
    id?: string;
    code?: string;
    name?: string;
    province_code?: string;
    lat?: number;
    lng?: number;
    utility?: string;
    groupSite?: string;
  };
  const aclSites: AclSite[] = (accessibleSites ?? []) as AclSite[];

  // เดิม: โฟกัสตามจังหวัดของ site → เปลี่ยนเป็นโฟกัสตรงพิกัด lat/lng ของ site
  useEffect(() => {
    if (!selectedSiteCode) return;
    if (selectedSiteCode === "all") {
      setProvince("all");
      return;
    }
    // ยกเลิก province zoom เสมอเมื่อเลือก site เฉพาะ
    setProvince("all");
  }, [selectedSiteCode, setProvince]);

  // รองรับหลายฟิลด์ของ noti (id/code/name/site/siteId/siteCode/siteName)
  const allowedSiteKeys = useMemo(() => {
    const keys = new Set<string>();
    (aclSites || []).forEach((s) => {
      [s.id, s.code, s.name]
        .filter(Boolean)
        .map(String)
        .forEach((k) => keys.add(k));
    });
    return keys;
  }, [JSON.stringify(aclSites)]);

  const siteKeysFromNoti = (n: Noti) => {
    // รวบรวม key ทุกรูปแบบที่พบนิยม
    const raw = [
      (n as any).siteId,
      (n as any).site_id,
      (n as any).siteCode,
      (n as any).site_code,
      (n as any).siteName,
      (n as any).site_name,
      (n as any).site, // บางที่อาจเป็น code หรือ name
      (n as any)?.site?.id,
      (n as any)?.site?.code,
      (n as any)?.site?.name,
    ].filter(Boolean);

    // map “ชื่อไซต์” -> “code” เพื่อให้เทียบ selectedSiteCode ได้เสมอ
    const nameToCode = new Map(
      (accessibleSites ?? []).map((s) => [String(s.name), String(s.code)])
    );
    const withCodes = raw.flatMap((val) => {
      const s = String(val);
      const code = nameToCode.get(s);
      return code ? [s, code] : [s];
    });

    // คืนค่ารูปแบบ string ทั้งหมด (unique)
    return Array.from(new Set(withCodes));
  };

  /* ---------- container (no remount on resize; Map handles resize) ---------- */
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  /* ---------- merge notis + filter by selected events ---------- */
  const allTagged: WithGroup[] = useMemo(() => {
    const base = Array.isArray(overrideNotis) ? overrideNotis : liveNotis;
    return (base ?? []).map((n) => ({
      ...n,
      _group: notiSeverity(n) === "critical" ? ("wellbeing" as const) : ("notis" as const),
    }));
  }, [overrideNotis, liveNotis]);

  const eventsSet = useMemo(
    () => new Set(selectedEvents.includes("all") ? ["all"] : selectedEvents),
    [selectedEvents]
  );

  const byEvents: WithGroup[] = useMemo(() => {
    if (eventsSet.has("all")) return allTagged;
    return allTagged.filter((n) => eventsSet.has(toEventKey(n)));
  }, [allTagged, eventsSet]);

  const notisForMap: Noti[] = useMemo(() => {
    const usingOverride = Array.isArray(overrideNotis);
    let list = byEvents
      .map((x) => ({ ...x } as Noti))
      .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());

    if (!usingOverride && selectedSiteCode && selectedSiteCode !== "all") {
      list = list.filter((n) =>
        siteKeysFromNoti(n).includes(String(selectedSiteCode))
      );
    }

    // ⬇️ กรองตามสิทธิ์เข้าถึง Site
    if (userRole !== "admin") {
      list = list.filter((n) => {
        const keys = siteKeysFromNoti(n);
        return keys.some((k) => allowedSiteKeys.has(k));
      });
    }

    // ⬇️ กรองตาม Severity (ให้ทำงานแน่ๆ จากฝั่ง Panel)
    const want = toSeverity(site);
    if (want !== "all") {
      list = list.filter((n: any) => normalizeSeverity(n) === want);
    }

    return list;
  }, [
    byEvents,
    userRole,
    allowedSiteKeys,
    site,
    selectedSiteCode,
    overrideNotis,
  ]);

  /* ---------- auto set province for non-admin (ไม่แตะ UI) ---------- */
  // ยกเลิก auto-focus province ตาม role; ให้ผู้ใช้เลือกจังหวัดเองจาก dropdown เท่านั้น
  // ดังนั้นเมื่อกลับไป "ทั้งหมด" ให้คงเป็นระดับประเทศ (province === "all") จนกว่าผู้ใช้จะเลือกจังหวัดเอง

  /* ---------- sitePoints (พิกัดไซต์ถาวรสำหรับปักหมุด) ---------- */
  const sitePoints = useMemo(() => {
    // สร้าง map: site code/id → groupLabel จาก siteOptions (FiltersContext มี group info)
    const codeToGroup = new Map<string, string>();
    for (const opt of siteOptions) {
      if (opt.value && opt.groupLabel) {
        codeToGroup.set(opt.value, opt.groupLabel);
      }
    }

    return (accessibleSites ?? [])
      .map((s) => {
        const lat = Number((s as any)?.lat);
        const lng = Number((s as any)?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const name = String((s as any)?.name ?? (s as any)?.code ?? (s as any)?.id ?? "");
        if (!name) return null;
        const code: string | undefined = (s as any)?.code;
        const id: string | undefined = (s as any)?.id;

        // ลอง groupSite จาก API fields ก่อน, ถ้าไม่มีให้ fallback จาก siteOptions
        const groupFromApi =
          (s as any)?.site_group ??
          (s as any)?.site_groups ??
          (s as any)?.siteGroup ??
          (s as any)?.group ??
          null;
        const groupSite: string | undefined =
          groupFromApi?.name ??
          (s as any)?.site_group_name ??
          (s as any)?.siteGroupName ??
          (s as any)?.group_name ??
          (s as any)?.groupSite ??
          // fallback: ดึงจาก siteOptions (FiltersContext เคย fetch group info แล้ว)
          (code ? codeToGroup.get(code) : undefined) ??
          (id ? codeToGroup.get(id) : undefined) ??
          undefined;

        const utility: string | undefined =
          (s as any)?.utility?.name ??
          (s as any)?.utilityName ??
          (s as any)?.utility ??
          undefined;

        return {
          name,
          lat,
          lng,
          code,
          id,
          utility: utility ? String(utility) : undefined,
          groupSite: groupSite ? String(groupSite) : undefined,
        };
      })
      .filter(Boolean) as Array<{
        name: string; lat: number; lng: number;
        code?: string; id?: string;
        utility?: string; groupSite?: string;
      }>;
  }, [JSON.stringify(accessibleSites), siteOptions]);

  /* ---------- กรอง sitePoints ตามการเลือกใน Navbar ---------- */
  const visibleSitePoints = useMemo(() => {
    // เลือก Site เฉพาะ → แสดงเฉพาะ site นั้น
    if (selectedSiteCode && selectedSiteCode !== "all") {
      return sitePoints.filter(
        (s) => s.code === selectedSiteCode || s.id === selectedSiteCode
      );
    }

    // เลือก Utility → แสดง sites ภายใต้ Utility นั้น
    if (selectedUtility) {
      const siteCodes = new Set(
        siteOptions
          .filter((o) => o.utilityId === selectedUtility.id)
          .map((o) => o.value)
      );
      return sitePoints.filter((s) => s.code && siteCodes.has(s.code));
    }

    // เลือก GroupSite → แสดง sites ภายใต้ GroupSite นั้น
    if (selectedGroupSite) {
      const siteCodes = new Set(
        siteOptions
          .filter(
            (o) =>
              o.groupId === selectedGroupSite.id ||
              o.groupLabel === selectedGroupSite.label
          )
          .map((o) => o.value)
      );
      return sitePoints.filter((s) => s.code && siteCodes.has(s.code));
    }

    // ไม่ได้เลือกอะไร → แสดงทั้งหมด
    return sitePoints;
  }, [sitePoints, selectedSiteCode, selectedUtility, selectedGroupSite, siteOptions]);

  // Debug: ดูจำนวน site points ที่ส่งให้ map
  useEffect(() => {
    console.debug("[MapPanel] sitePoints:", sitePoints.length, "visible:", visibleSitePoints.length, "accessibleSites:", accessibleSites?.length);
  }, [sitePoints, visibleSitePoints, accessibleSites]);

  const refreshSitePinStatuses = useCallback(async () => {
    const requestId = ++pinStatusRequestIdRef.current;
    const sites = (accessibleSites ?? []).filter(Boolean) as Array<{
      id?: string;
      code?: string;
      name?: string;
    }>;

    if (!sites.length) {
      if (requestId === pinStatusRequestIdRef.current) {
        setPinStatusBySite({});
      }
      return;
    }

    const resolveCountersFromResponse = (raw: any) => {
      const payload = raw?.data ?? raw;
      const sitePayload = payload?.site ?? payload?.data?.site ?? payload?.data ?? payload;
      return (sitePayload?.counters ?? payload?.counters ?? {}) as Record<string, any>;
    };

    const fetchOneStatus = async (site: { id?: string; code?: string; name?: string }) => {
      const tryKeys = [site.code, site.id]
        .filter((v, idx, arr) => !!v && arr.indexOf(v) === idx)
        .map(String);

      let counters: Record<string, any> = {};
      for (const key of tryKeys) {
        try {
          const res = await getSiteDetails(key);
          counters = resolveCountersFromResponse(res);
          break;
        } catch {
          // continue
        }
      }

      const electricTotal = Number(counters.devices_electric ?? 0);
      const electricOffline = Number(counters.devices_electric_offline ?? 0);
      const electricOnlineRaw = Number(counters.devices_electric_online ?? NaN);
      const electricOnline = Number.isFinite(electricOnlineRaw)
        ? electricOnlineRaw
        : Math.max(0, electricTotal - electricOffline);

      const status: SitePinStatus = {
        electricTotal,
        electricOnline,
        electricOffline,
        hasElectric: electricTotal > 0,
      };

      return { site, status };
    };

    const selected =
      selectedSiteCode && selectedSiteCode !== "all"
        ? sites.find(
            (site) =>
              String(site.code ?? "") === String(selectedSiteCode) ||
              String(site.id ?? "") === String(selectedSiteCode)
          )
        : null;

    if (selected) {
      try {
        const selectedEntry = await fetchOneStatus(selected);
        if (requestId === pinStatusRequestIdRef.current) {
          setPinStatusBySite((prev) => {
            const next = { ...prev };
            if (selectedEntry.site.code) next[String(selectedEntry.site.code)] = selectedEntry.status;
            if (selectedEntry.site.id) next[String(selectedEntry.site.id)] = selectedEntry.status;
            if (selectedEntry.site.name) next[String(selectedEntry.site.name)] = selectedEntry.status;
            return next;
          });
        }
      } catch {
        // best effort; continue full refresh
      }
    }

    const entries = await Promise.all(sites.map((site) => fetchOneStatus(site)));
    if (requestId !== pinStatusRequestIdRef.current) return;

    const next: Record<string, SitePinStatus> = {};
    entries.forEach(({ site, status }) => {
      if (site.code) next[String(site.code)] = status;
      if (site.id) next[String(site.id)] = status;
      if (site.name) next[String(site.name)] = status;
    });

    setPinStatusBySite(next);
  }, [accessibleSites, selectedSiteCode]);

  useEffect(() => {
    void refreshSitePinStatuses();
  }, [refreshSitePinStatuses]);

  useEffect(() => {
    const onFocus = () => {
      void refreshSitePinStatuses();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshSitePinStatuses();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshSitePinStatuses]);

  /* ---------- render (UI เดิม) ---------- */
  return (
    <div
      className="flex flex-col justify-center"
      ref={wrapperRef}
    >
      {/* <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        {t("map.title", { defaultValue: "แผนที่" })}
      </h1> */}

      <div className="flex items-center flex-wrap gap-5">
        {/* All Event Map (หลายตัวเลือก) */}
        {/* <Dropdown options={EVENT_OPTIONS} value="__multi__" onChange={() => {}}>
          {({ open, getButtonProps, getMenuProps }) => (
            <div className="relative inline-block">
              <button
                {...getButtonProps({
                  type: "button",
                  className:
                    "inline-flex h-8 min-w-[120px] items-center justify-around rounded-md border border-cyan-500 px-2 text-sm hover:cursor-pointer focus:bg-gray-50",
                })}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="truncate text-cyan-500">{labelForButton}</span>
                <i className="material-icons arrow-icon leading-none text-cyan-500">
                  {open ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                </i>
              </button>

              <div
                {...getMenuProps({
                  className: [
                    "absolute left-0 top-full mt-2 min-w-[120px] whitespace-nowrap rounded-md",
                    "border border-gray-300 bg-white p-2 shadow-md",
                    "max-h-80 overflow-y-auto z-50",
                    "transition-all duration-150",
                    open
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 -translate-y-1 pointer-events-none",
                  ].join(" "),
                })}
                onMouseDown={(e) => e.preventDefault()}
              >
                {EVENT_OPTIONS.map((opt) => {
                  const checked = selectedEvents.includes("all")
                    ? opt.value === "all"
                    : selectedEvents.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className={[
                        "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-gray-50 hover:cursor-pointer",
                        checked ? "bg-gray-50" : "",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 checked:bg-cyan !ring-0 !ring-offset-0 hover:cursor-pointer"
                        checked={checked}
                        onChange={() => toggleEvent(opt.value)}
                        onMouseDown={(e) => e.preventDefault()}
                      />
                      <span className="text-gray-800">
                        {getEventLabel(opt.value, opt.label)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </Dropdown> */}

        {/* Any Severity */}
        {/* <Dropdown options={SEVERITY_OPTIONS} value={site} onChange={setSite}>
          {({
            open,
            selected,
            options,
            getButtonProps,
            getMenuProps,
            getItemProps,
          }) => (
            <>
              <button
                {...getButtonProps({
                  type: "button",
                  className:
                    "inline-flex h-8 min-w-[80px] items-center justify-around rounded-md border border-cyan-500 px-2 text-sm hover:cursor-pointer focus:bg-gray-50 text-cyan-500",
                })}
              >
                <span className="truncate">
                  {selected
                    ? getSeverityLabel(selected.value, selected.label)
                    : t("map.anySeverity", { defaultValue: "ทุกความรุนแรง" })}
                </span>
                <i className="material-icons arrow-icon leading-none text-cyan-500">
                  {open ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                </i>
              </button>

              <div
                {...getMenuProps({
                  className: [
                    "absolute z-10 mt-9 min-w-[160px] rounded-md border border-gray-300 bg-white p-1 shadow-md",
                    "transition-all duration-150",
                    open
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 -translate-y-1 pointer-events-none",
                    "max-h-80 overflow-y-auto",
                  ].join(" "),
                })}
              >
                {options.map((opt) => {
                  const active = opt.value === selected?.value;
                  return (
                    <button
                      key={opt.value}
                      {...getItemProps(opt, {
                        type: "button",
                        className: [
                          "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 hover:cursor-pointer",
                          active
                            ? "bg-gray-100 text-gray-900 font-medium"
                            : "text-gray-800",
                        ].join(" "),
                      })}
                    >
                      {getSeverityLabel(opt.value, opt.label)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Dropdown> */}

        {/* Location Dropdown → แสดงเฉพาะ admin */}
        {/* {userRole === "admin" && selectedSiteCode === "all" && (
          <Dropdown
            options={LOCATION_OPTIONS}
            value={province}
            onChange={onSelectProvince}
          >
            {({
              open,
              selected,
              options,
              getButtonProps,
              getMenuProps,
              getItemProps,
            }) => (
              <>
                <button
                  {...getButtonProps({
                    type: "button",
                    className:
                      "inline-flex h-8 min-w-[120px] items-center justify-between rounded-md border border-cyan-500 px-2 text-sm hover:cursor-pointer focus:bg-gray-50 text-cyan-500",
                  })}
                >
                  <span className="truncate">
                    {selected
                      ? selected.value === "all"
                        ? t("map.allLocation", { defaultValue: "ทุกพื้นที่" })
                        : selected.label
                      : t("map.allLocation", { defaultValue: "ทุกพื้นที่" })}
                  </span>
                  <i className="material-icons arrow-icon leading-none text-cyan-500">
                    {open ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                  </i>
                </button>

                <div
                  {...getMenuProps({
                    className: [
                      "absolute flex flex-col mt-9 max-h-80 min-w-[120px] overflow-y-auto rounded-md border border-gray-300 bg-white p-2 shadow-md z-50",
                      "transition-all duration-150",
                      open ? "opacity-100" : "opacity-0 pointer-events-none",
                    ].join(" "),
                  })}
                >
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      {...getItemProps(opt, {
                        type: "button",
                        className:
                          "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 hover:cursor-pointer",
                      })}
                    >
                      {opt.value === "all"
                        ? t("map.allLocation", { defaultValue: "ทุกพื้นที่" })
                        : opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </Dropdown>
        )} */}

      </div>

      {/* แผนที่ */}
      <div className="">
        <MapView
          notis={notisForMap}
          showPins={true}
          aggregateBySite={true}
          severityFilter={toSeverity(site)}
          sitePoints={visibleSitePoints}
          pinStatusBySite={pinStatusBySite}
          // ถ้าเลือก site เฉพาะ → โฟกัสพิกัด site โดยตรง
          focusSiteCenter={
            selectedSiteCode && selectedSiteCode !== "all"
              ? (() => {
                  const s = accessibleSites?.find((x) => x.code === selectedSiteCode);
                  const lat = Number(s?.lat);
                  const lng = Number(s?.lng);
                  return Number.isFinite(lat) && Number.isFinite(lng)
                    ? ({ lat, lng } as { lat: number; lng: number })
                    : null;
                })()
              : null
          }
          // ถ้ายังไม่เลือก site → โฟกัสจังหวัดก็ต่อเมื่อผู้ใช้เลือกเองจาก dropdown เท่านั้น
          focusProvince={
            selectedSiteCode === "all" && province !== "all" ? (province as string) : null
          }
          lockZoomOut={selectedSiteCode !== "all"}
          onProvinceChange={(val) => {
            setProvince(val);
          }}
          onPinClick={handlePinClick}
          onZoomOutToCountry={handleZoomOutToCountry}
        />
      </div>
    </div>
  );
}
