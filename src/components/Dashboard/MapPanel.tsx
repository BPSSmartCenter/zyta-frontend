import Dropdown from "../Dropdown";
import MapView from "../Map/Map";
import {
  EVENT_OPTIONS,
  SEVERITY_OPTIONS,
  LOCATION_OPTIONS,
} from "../Dashboard/dashboard.constants";
import { notis, wellBeingNotis } from "../../data/Dashboard/notis";
import type { Noti, Severity } from "../../data/Dashboard/notis";
import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { me } from "../../data/Dashboard/auth";

/* ---------- helpers ---------- */
const toEventKey = (n: Noti): string => {
  const k = n.titleKey || "";
  if (k.includes("fireDetected")) return "fire";
  if (k.includes("motionDetected")) return "motion";
  if (k.includes("cameraOffline") || k.includes("deviceOffline"))
    return "offline";
  if (k.includes("fallDetected")) return "fall";
  if (k.includes("sleepDetected") || k.includes("sleepingLong"))
    return "sleeping";
  const t = (n.title || "").toLowerCase();
  if (t.includes("fire")) return "fire";
  if (t.includes("motion")) return "motion";
  if (t.includes("offline")) return "offline";
  if (t.includes("fall")) return "fall";
  if (t.includes("sleep")) return "sleeping";
  return "unknown";
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
  accessibleSites?: Array<{
    id?: string;
    code?: string;
    name?: string;
    province_code?: string;
    lat?: number;
    lng?: number;
  }>;
};

export default function MapPanel({
  selectedEvents,
  buttonLabel,
  toggleEvent,
  site,
  setSite,
  province,
  setProvince,
  overrideNotis,
  selectedSiteCode,
  accessibleSites,
}: Props) {
  const { t } = useTranslation(["dashboard"]);
  const userRole: "admin" | "officer" | "user" = (me()?.role as any) || "admin";

  /* ---------- ACL sites (ใช้ object เต็มจาก accessSites) ---------- */
  type AclSite = {
    id?: string;
    code?: string;
    name?: string;
    province_code?: string;
    lat?: number;
    lng?: number;
  };
  const aclSites: AclSite[] = (accessibleSites ?? []) as AclSite[];

  // เดิม: โฟกัสตามจังหวัดของ site → เปลี่ยนเป็นโฟกัสตรงพิกัด lat/lng ของ site
  useEffect(() => {
    if (!selectedSiteCode) return;
    if (selectedSiteCode === "all") {
      setProvince("all");
      // บังคับ remount map หนึ่งครั้ง เมื่อละทิ้งโหมด Site → ป้องกัน layer ค้าง
      // (Map.tsx จะ init overlays ใหม่ในสถานะประเทศ)
      setMapVersion((v) => v + 1);
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

  /* ---------- container + remount on resize (ของเดิม) ---------- */
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let timer: number | null = null;
    let lastW = el.clientWidth;
    const onSize = (w: number) => {
      if (timer) clearTimeout(timer!);
      timer = window.setTimeout(() => {
        if (Math.abs(w - lastW) >= 1) {
          lastW = w;
          setMapVersion((v) => v + 1);
        }
      }, 120);
    };
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) onSize(entry.contentRect.width);
    });
    ro.observe(el);
    return () => {
      if (timer) clearTimeout(timer!);
      ro.disconnect();
    };
  }, []);

  /* ---------- merge notis + filter by selected events ---------- */
  const allTagged: WithGroup[] = useMemo(() => {
    if (Array.isArray(overrideNotis)) {
      // ใช้ชุดที่มาจาก Dashboard โดยตรง (กรองตาม Site/ACL แล้ว)
      return overrideNotis.map((n) => ({ ...n, _group: "notis" as const }));
    }
    const a = notis.map((n) => ({ ...n, _group: "notis" as const }));
    const b = wellBeingNotis.map((n) => ({
      ...n,
      _group: "wellbeing" as const,
    }));
    return [...a, ...b];
  }, [overrideNotis]);

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

  /* ---------- i18n helpers ---------- */
  const getEventLabel = (val: string, fallback: string) =>
    t(`events.${val}`, { defaultValue: fallback });

  const getSeverityLabel = (val: string, fallback: string) => {
    if (val === "all") return t("map.anySeverity", { defaultValue: fallback });
    return t(`map.severity.${val}`, { defaultValue: fallback });
  };

  const onSelectProvince = (val: string) => setProvince(val);

  /* ---------- render (UI เดิม) ---------- */
  return (
    <div
      className="flex flex-col justify-center py-2 px-0 md:px-3 gap-3"
      ref={wrapperRef}
    >
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        {t("map.title", { defaultValue: "แผนที่" })}
      </h1>

      <div className="flex items-center flex-wrap gap-5">
        {/* All Event Map (หลายตัวเลือก) */}
        <Dropdown options={EVENT_OPTIONS} value="__multi__" onChange={() => {}}>
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
                <span className="truncate text-cyan-500">{buttonLabel}</span>
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
        </Dropdown>

        {/* Any Severity */}
        <Dropdown options={SEVERITY_OPTIONS} value={site} onChange={setSite}>
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
        </Dropdown>

        {/* Location Dropdown → แสดงเฉพาะ admin */}
        {userRole === "admin" && selectedSiteCode === "all" && (
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
        )}
      </div>

      {/* แผนที่ */}
      <div className="mt-3" key={mapVersion}>
        <MapView
          notis={notisForMap}
          showPins={true}
          aggregateBySite={true}
          severityFilter={toSeverity(site)}
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
            if (val === "all") {
              setMapVersion((v) => v + 1);
            }
          }}
        />
      </div>
    </div>
  );
}
