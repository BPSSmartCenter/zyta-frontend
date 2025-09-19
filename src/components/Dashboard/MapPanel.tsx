import Dropdown from "../Dropdown";
import Map from "../Map/Map";
import {
  EVENT_OPTIONS,
  SEVERITY_OPTIONS,
  LOCATION_OPTIONS,
} from "../Dashboard/dashboard.constants";
import { notis, wellBeingNotis } from "../../data/Dashboard/notis";
import type { Noti, Severity } from "../../data/Dashboard/notis";
import { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

const toEventKey = (n: Noti): string => {
  const k = n.titleKey || "";
  if (k.includes("fireDetected")) return "fire";
  if (k.includes("motionDetected")) return "motion";
  if (k.includes("cameraOffline")) return "offline";
  if (k.includes("fallDetected")) return "fall";
  if (k.includes("sleepingLong")) return "sleeping";
  if (k.includes("faceDetected")) return "face";
  if (k.includes("plateDetected")) return "plate";
  // fallback เผื่อรายการไหนไม่มี titleKey
  const t = (n.title || "").toLowerCase();
  if (t.includes("fire")) return "fire";
  if (t.includes("motion")) return "motion";
  if (t.includes("offline")) return "offline";
  if (t.includes("fall")) return "fall";
  if (t.includes("sleep")) return "sleeping";
  if (t.includes("face")) return "face";
  if (t.includes("plate")) return "plate";
  return "unknown";
};

type WithGroup = Noti & { _group: "notis" | "wellbeing" };

const toSeverity = (v: string | undefined | null): Severity | "all" => {
  return v === "low" || v === "medium" || v === "critical" || v === "all"
    ? (v as any)
    : "all";
};

type Props = {
  selectedEvents: string[];
  buttonLabel: string;
  toggleEvent: (v: string) => void;
  site: string;
  setSite: (v: string) => void;
  province: string;
  setProvince: (v: string) => void;
};

export default function MapPanel({
  selectedEvents,
  buttonLabel,
  toggleEvent,
  site,
  setSite,
  province,
  setProvince,
}: Props) {
  const { t } = useTranslation(["dashboard"]);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mapVersion, setMapVersion] = useState(0);

  const allTagged: WithGroup[] = useMemo(() => {
    const a = notis.map((n) => ({ ...n, _group: "notis" } as WithGroup));
    const b = wellBeingNotis.map(
      (n) => ({ ...n, _group: "wellbeing" } as WithGroup)
    );
    return [...a, ...b];
  }, []);

  const eventsSet = useMemo(() => {
    return new Set(selectedEvents.includes("all") ? ["all"] : selectedEvents);
  }, [selectedEvents]);

  const byEvents: WithGroup[] = useMemo(() => {
    if (eventsSet.has("all")) return allTagged;
    return allTagged.filter((n) => eventsSet.has(toEventKey(n)));
  }, [allTagged, eventsSet]);

  const notisForMap: Noti[] = useMemo(() => {
    return byEvents
      .map((x) => ({ ...x } as Noti)) // extra field _group ไม่กระทบ Map
      .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
  }, [byEvents]);

  // re-mount map เมื่อ container resize
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
    const ro = new ResizeObserver(() => onSize(el.clientWidth || 0));
    ro.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    console.log(
      "[MapPanel] events =",
      selectedEvents,
      " severity =",
      site,
      " totalAfterEvents =",
      byEvents.length,
      " pushToMap =",
      notisForMap.length
    );
  }, [selectedEvents, site, byEvents, notisForMap]);

  const getEventLabel = (val: string, fallback: string) =>
    t(`events.${val}`, { defaultValue: fallback });

  const getSeverityLabel = (val: string, fallback: string) => {
    if (val === "all") return t("map.anySeverity", { defaultValue: fallback });
    return t(`map.severity.${val}`, { defaultValue: fallback });
  };

  const getLocationLabel = (value: string, label: string) =>
    value === "all"
      ? t("map.allLocation", { defaultValue: "All Location" })
      : label; // จังหวัดไม่ต้องแปล

  // เมื่อผู้ใช้เลือกจังหวัด/ทุกพื้นที่จากเมนู
  const onSelectProvince = (val: string) => {
    setProvince(val); // ถ้า "all" → Map จะซูมออก (ดู Map.tsx)
  };

  return (
    <div
      className="flex flex-col justify-center py-2 px-0 md:px-3 gap-3"
      ref={wrapperRef}
    >
      <h1 className="text-[22px] font-inter font-semibold text-[#1E1E1E]">
        {t("map.title", { defaultValue: "MAP" })}
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
                    : t("map.anySeverity", { defaultValue: "Any Severity" })}
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

        {/* All Location / ทุกพื้นที่ */}
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
                    ? getLocationLabel(selected.value, selected.label)
                    : t("map.allLocation", { defaultValue: "All Location" })}
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
                    {getLocationLabel(opt.value, opt.label)}
                  </button>
                ))}
              </div>
            </>
          )}
        </Dropdown>
      </div>

      {/* แผนที่ */}
      <div className="mt-3" key={mapVersion}>
        <Map
          notis={notisForMap}
          showPins={true}
          aggregateBySite={false}
          severityFilter={toSeverity(site)}
          focusProvince={province && province !== "all" ? province : null}
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
