import Dropdown from "../Dropdown";
import Map from "../Map";
import {
  EVENT_OPTIONS,
  SEVERITY_OPTIONS,
  LOCATION_OPTIONS,
} from "../Dashboard/dashboard.constants";
import { notis } from "../../data/Dashboard/notis";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  selectedEvents: string[];
  buttonLabel: string;
  toggleEvent: (v: string) => void;
  site: string; // severity filter value
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

  // ให้ Map render ใหม่เฉพาะตัว เมื่อความกว้าง container เปลี่ยน
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let timer: number | null = null;
    let lastW = el.clientWidth;

    const onSize = (w: number) => {
      if (timer) (globalThis as any).clearTimeout?.(timer);
      timer = (globalThis as any).setTimeout?.(() => {
        if (Math.abs(w - lastW) >= 1) {
          lastW = w;
          setMapVersion((v) => v + 1); // remount เฉพาะ <Map>
        }
      }, 120) as unknown as number;
    };

    // ใช้ ResizeObserver ถ้ามี
    if (typeof (globalThis as any).ResizeObserver !== "undefined") {
      const ro = new (globalThis as any).ResizeObserver(() =>
        onSize(el.clientWidth || 0)
      );
      ro.observe(el);
      return () => {
        if (timer) (globalThis as any).clearTimeout?.(timer);
        ro.disconnect();
      };
    }

    // ไม่มี ResizeObserver → fallback ด้วย window ของจริงแบบ type-safe
    const wnd: (Window & typeof globalThis) | undefined =
      typeof globalThis !== "undefined" &&
      typeof (globalThis as any).addEventListener === "function"
        ? (globalThis as unknown as Window & typeof globalThis)
        : undefined;

    const onResize = () => onSize(el.clientWidth || 0);

    if (wnd) {
      wnd.addEventListener("resize", onResize);
      wnd.addEventListener("orientationchange", onResize);
    }

    return () => {
      if (timer) (globalThis as any).clearTimeout?.(timer);
      if (wnd) {
        wnd.removeEventListener("resize", onResize);
        wnd.removeEventListener("orientationchange", onResize);
      }
    };
  }, []);

  const getEventLabel = (val: string, fallback: string) =>
    t(`events.${val}`, { defaultValue: fallback });

  const getSeverityLabel = (val: string, fallback: string) => {
    if (val === "all") return t("map.anySeverity", { defaultValue: fallback });
    return t(`map.severity.${val}`, { defaultValue: fallback });
  };

  return (
    <form className="flex flex-col justify-center py-2 px-3 gap-3">
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
                    "inline-flex h-8 w-[140px] items-center justify-around rounded-md border border-cyan-500 px-2 text-sm hover:cursor-pointer focus:bg-gray-50 text-cyan-500",
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

        {/* All Location */}
        <Dropdown
          options={LOCATION_OPTIONS}
          value={province}
          onChange={setProvince}
        >
          {({
            open,
            selected,
            options,
            getButtonProps,
            getMenuProps,
            getItemProps,
          }) => (
            <div className="relative inline-block">
              <button
                {...getButtonProps({
                  type: "button",
                  className:
                    "inline-flex h-8 min-w-[90px] items-center justify-between rounded-md border border-cyan-500 px-2 text-sm hover:cursor-pointer focus:bg-gray-50",
                })}
              >
                <span className="truncate text-cyan-500">
                  {selected?.value === "all"
                    ? t("map.allLocation", { defaultValue: "All Location" })
                    : selected?.label ??
                      t("map.allLocation", { defaultValue: "All Location" })}
                </span>
                <i className="material-icons arrow-icon leading-none text-cyan-500">
                  {open ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                </i>
              </button>

              <div
                {...getMenuProps({
                  className: [
                    "absolute left-0 top-full mt-2 min-w-[150px] rounded-xl",
                    "border border-gray-300 bg-white p-1 shadow-md",
                    "max-h-80 overflow-y-auto z-50",
                    "transition-all duration-150",
                    open
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 -translate-y-1 pointer-events-none",
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
                      {opt.value === "all"
                        ? t("map.allLocation", { defaultValue: opt.label })
                        : opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Dropdown>
      </div>

      {/* Wrapper ของ Map: ไม่แตะ class เดิม เพิ่มแค่ ref เพื่อสังเกตความกว้าง */}
      <div
        ref={wrapperRef}
        className="w-full rounded-lg flex items-center justify-center"
        style={{ minHeight: 680, flexShrink: 0 }}
      >
        {/* เปลี่ยน key → remount เฉพาะ Map เมื่อ width เปลี่ยน */}
        <Map key={`map-${mapVersion}`} notis={notis} severityFilter={site} />
      </div>
    </form>
  );
}
