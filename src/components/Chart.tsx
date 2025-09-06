// src/components/Chart.tsx
import React from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

// ดึง helpers + data series
import {
  getSeriesByPeriod,
  niceUp,
  EVENT_OPTIONS,
} from "./Dashboard/dashboard.constants";

import Dropdown from "./Dropdown";
import { useTranslation } from "react-i18next";

/* ============================ Types & Utils ============================ */

type Series = { name: string; data: number[] };

type Props = {
  buttonLabel: string;
  selectedEvents: string[]; // ["all"] หรือรายการ event ที่เลือก
  toggleEvent: (value: string) => void; // สลับเลือก event
};

function useLocaleFromI18n(i18nLang: string | undefined) {
  return (i18nLang || "").startsWith("th") ? "th-TH-u-nu-latn" : "en-GB";
}

/** ให้ series ยาวเท่าจำนวน category เสมอ และ clone data เพื่อกัน mutate */
function normalizeSeriesToCategories(
  series: Series[],
  categories: string[]
): Series[] {
  return (series ?? []).map((s, idx) => {
    const src = Array.isArray(s.data) ? s.data : [];
    const data = Array.from({ length: categories.length }, (_, i) => {
      const v = src[i];
      return typeof v === "number" && Number.isFinite(v) ? v : 0;
    });
    return { name: s.name ?? `Series ${idx + 1}`, data };
  });
}

/** breakpoint: true ถ้าเป็นจอ lg (min-width: 1024px) */
function useIsLg() {
  const get = () =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width:1024px)").matches;
  const [isLg, setIsLg] = React.useState(get);
  React.useEffect(() => {
    const mql = window.matchMedia("(min-width:1024px)");
    const on = () => setIsLg(mql.matches);
    mql.addEventListener?.("change", on);
    return () => mql.removeEventListener?.("change", on);
  }, []);
  return isLg;
}

/** borderRadius responsive:
 * - daily/weekly: sm=3, md=10, lg=15
 * - monthly:      sm=0.5, md=4,  lg=6
 */
function useBorderRadiusByBreakpoint(period: "daily" | "weekly" | "monthly") {
  const compute = React.useCallback(() => {
    if (typeof window === "undefined") {
      return period === "monthly" ? 6 : 6;
    }
    const isLg = window.matchMedia("(min-width:1024px)").matches;
    const isMd = window.matchMedia("(min-width:640px)").matches;
    if (period === "monthly") return isLg ? 6 : isMd ? 4 : 0.5;
    return isLg ? 15 : isMd ? 10 : 3;
  }, [period]);

  const [radius, setRadius] = React.useState<number>(compute);

  React.useEffect(() => setRadius(compute()), [compute]);

  React.useEffect(() => {
    const mqlLg = window.matchMedia("(min-width:1024px)");
    const mqlMd = window.matchMedia("(min-width:640px)");
    const onChange = () => setRadius(compute());
    mqlLg.addEventListener?.("change", onChange);
    mqlMd.addEventListener?.("change", onChange);
    return () => {
      mqlLg.removeEventListener?.("change", onChange);
      mqlMd.removeEventListener?.("change", onChange);
    };
  }, [compute]);

  return radius;
}

/** ป้ายวัน (Mon..Sun) แบบย่อ ตาม locale ปัจจุบัน เริ่มจันทร์ */
function useWeekdayShortLabels(locale: string) {
  return React.useMemo(() => {
    const startMon = new Date(2024, 0, 1); // 1 ม.ค. 2024 = จันทร์
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startMon);
      d.setDate(startMon.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: "short" });
    });
  }, [locale]);
}

/** ป้ายเดือน (Jan..Dec) แบบย่อ ตาม locale ปัจจุบัน */
function useMonthShortLabels(locale: string) {
  return React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(2024, i, 1).toLocaleDateString(locale, { month: "short" })
      ),
    [locale]
  );
}

/* ============================ Component ============================ */

export default function Chart({
  buttonLabel,
  selectedEvents,
  toggleEvent,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const locale = useLocaleFromI18n(i18n.language);

  // เปลี่ยนช่วงเวลา (Daily ใช้ข้อมูลเดียวกับ Weekly)
  const [period, setPeriod] = React.useState<"daily" | "weekly" | "monthly">(
    "weekly"
  );
  const isLg = useIsLg(); // คุม legend Apex (ซ่อนบนจอใหญ่)
  const borderRadius = useBorderRadiusByBreakpoint(period); // radius ตาม breakpoint + period

  // ป้ายแกน X ตามภาษา
  const dayLabels = useWeekdayShortLabels(locale);
  const monthLabels = useMonthShortLabels(locale);
  const categories = React.useMemo<string[]>(
    () => (period === "monthly" ? monthLabels : dayLabels),
    [period, dayLabels, monthLabels]
  );

  // เลือกชุดข้อมูลตามช่วงเวลา (daily alias weekly)
  const raw = React.useMemo<Series[]>(
    () => getSeriesByPeriod(period) as unknown as Series[],
    [period]
  );

  // ทำให้ series สอดคล้องกับจำนวน category และกัน mutate
  const series = React.useMemo<Series[]>(
    () => normalizeSeriesToCategories(raw, categories),
    [raw, categories]
  );

  // y-axis max ที่สวยขึ้น
  const maxVal = React.useMemo(() => {
    let m = 0;
    for (const s of series) for (const v of s.data) if (v > m) m = v;
    return niceUp(m * 1.1, 10);
  }, [series]);

  // กัน layout กระตุก: ยิง resize หลัง chart mount
  const rafId = React.useRef<number | null>(null);
  const scheduleReflow = React.useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      rafId.current = null;
    });
  }, []);

  // ตัวเลือก Apex (memo) — รวม i18n
  const options = React.useMemo<ApexOptions>(() => {
    return {
      chart: {
        id: "snapshot-chart",
        type: "bar",
        animations: {
          enabled: true,
          speed: 140,
          animateGradually: { enabled: false },
          dynamicAnimation: { enabled: false },
        },
        toolbar: { show: false },
        fontFamily: "Inter, ui-sans-serif, system-ui",
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
        events: { mounted: scheduleReflow },
      },
      colors: ["#4A3AFF", "#39B8EE", "#D3F7FF"],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: period === "monthly" ? "40%" : "55%",
          borderRadius,
          borderRadiusApplication: "end",
          dataLabels: { position: "top" },
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: false },
      grid: {
        borderColor: "#EEF2F7",
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { left: 8, right: 8 },
      },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: "#94A3B8", fontSize: "12px", fontWeight: 500 },
        },
      },
      yaxis: {
        min: 0,
        max: maxVal,
        tickAmount: 5,
        labels: {
          style: { colors: "#94A3B8", fontSize: "12px", fontWeight: 500 },
        },
      },
      legend: {
        show: !isLg, // ซ่อนบนจอ ≥ lg (มี custom legend), แสดงบนจอ < lg
        position: "bottom",
        horizontalAlign: "center",
        fontSize: "12px",
        markers: { radius: 6, width: 10, height: 10 } as any,
        itemMargin: { vertical: 6 },
        offsetY: 8,
      },
      tooltip: {
        theme: "light",
        shared: false,
        y: {
          formatter: (v: number) =>
            t("chart.countSuffix", {
              count: v,
              defaultValue: `${v} times`,
            }),
        },
      },
    };
  }, [
    categories,
    maxVal,
    period,
    scheduleReflow,
    isLg,
    borderRadius,
    t,
    locale,
  ]);

  // ResizeObserver เพื่ออัปเดตกราฟเมื่อ container เปลี่ยนขนาด
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || !(window as any).ResizeObserver) return;

    let raf = 0;
    const ro = new (window as any).ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        window.dispatchEvent(new Event("resize"))
      );
    });

    ro.observe(el);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      try {
        ro.unobserve(el);
      } catch {}
      ro.disconnect();
    };
  }, []);

  const btnClass = (active: boolean) =>
    [
      "py-2 px-3 lg:px-4 inline-flex items-center gap-x-2 -ms-px rounded-2xl first:ms-0 text-sm font-medium focus:z-10",
      "text-gray-800 hover:bg-[#D1CEE8] hover:cursor-pointer",
      active
        ? "text-white bg-[#1E1B39]"
        : "focus:text-white focus:bg-[#1E1B39]",
      "disabled:opacity-50 disabled:pointer-events-none",
    ].join(" ");

  const getEventLabel = (val: string, fallback: string) =>
    t(`events.${val}`, { defaultValue: fallback });

  return (
    <div className="px-6 flex w-full rounded-md flex-col gap-3 bg-white">
      <form className="flex flex-col lg:flex-row lg:items-start lg:justify-between p-6 gap-6">
        {/* =================== Left: header + chart =================== */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header + filter */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-gray-400 text-[18px] lg:text-[20px]">
                {t("chart.statisticsTitle", { defaultValue: "Statistics" })}
              </h1>

              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-[20px] lg:text-[25px] font-bold">
                  {t("chart.totalSummary", {
                    defaultValue: "Total summary of snapshot",
                  })}
                </h1>

                {/* Multi-select dropdown */}
                <Dropdown
                  options={EVENT_OPTIONS}
                  value="__multi__"
                  onChange={() => {}}
                >
                  {({ open, getButtonProps, getMenuProps }) => (
                    <div className="relative inline-block ml-3">
                      <button
                        {...getButtonProps({
                          type: "button",
                          className:
                            "inline-flex h-10 min-w-[140px] items-center justify-around rounded-md border border-gray-300 px-2 text-sm hover:cursor-pointer focus:bg-gray-50",
                        })}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <span className="truncate">{buttonLabel}</span>
                        <i className="material-icons leading-none">
                          {open ? "arrow_drop_up" : "arrow_drop_down"}
                        </i>
                      </button>

                      <div
                        {...getMenuProps({
                          className: [
                            "absolute left-0 top-full mt-2 min-w-[160px] rounded-md",
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
                        {EVENT_OPTIONS.map((opt: any) => {
                          const checked = selectedEvents.includes("all")
                            ? opt.value === "all"
                            : selectedEvents.includes(opt.value);
                          return (
                            <label
                              key={opt.value}
                              className={[
                                "flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-gray-50 hover:cursor-pointer whitespace-nowrap",
                                checked ? "bg-gray-50" : "",
                              ].join(" ")}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 !ring-0 !ring-offset-0 hover:cursor-pointer"
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
              </div>
            </div>

            {/* Daily / Weekly / Monthly */}
            <div className="flex justify-center items-center lg:w-[350px] lg:mr-10">
              <div className="bg-[#F8F8FF] rounded-2xl">
                <div className="p-2 lg:p-4 gap-2 lg:gap-4 inline-flex rounded-lg ">
                  <button
                    type="button"
                    aria-pressed={period === "daily"}
                    onClick={() => setPeriod("daily")}
                    className={btnClass(period === "daily")}
                  >
                    {t("chart.daily", { defaultValue: "Daily" })}
                  </button>
                  <button
                    type="button"
                    aria-pressed={period === "weekly"}
                    onClick={() => setPeriod("weekly")}
                    className={btnClass(period === "weekly")}
                  >
                    {t("chart.weekly", { defaultValue: "Weekly" })}
                  </button>
                  <button
                    type="button"
                    aria-pressed={period === "monthly"}
                    onClick={() => setPeriod("monthly")}
                    className={btnClass(period === "monthly")}
                  >
                    {t("chart.monthly", { defaultValue: "Monthly" })}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div ref={containerRef} className="mt-3">
            <ReactApexChart
              key={`${period}-${categories.length}-${i18n.language}`} // รีเฟรชเมื่อเปลี่ยนภาษา/period
              type="bar"
              series={series}
              options={options}
              height={period === "monthly" ? 520 : 480}
            />
          </div>
        </div>

        {/* Custom legend (Desktop เท่านั้น) */}
        <div className="hidden lg:flex flex-col justify-center items-center flex-none w-[220px] h-[600px]">
          <ul className="flex flex-col gap-8">
            <li className="flex gap-2 items-center">
              <div className="rounded-full bg-[#4A3AFF] w-[20px] h-[20px]" />
              <span className="min-w-[60px]">
                {t("chart.legend.shift1", {
                  defaultValue: "08:00 - 16:00",
                })}
              </span>
            </li>
            <li className="flex gap-2 items-center">
              <div className="rounded-full bg-[#39B8EE] w-[20px] h-[20px]" />
              <span>
                {t("chart.legend.shift2", {
                  defaultValue: "16:00 - 24:00",
                })}
              </span>
            </li>
            <li className="flex gap-2 items-center">
              <div className="rounded-full bg-[#D3F7FF] w-[20px] h-[20px]" />
              <span>
                {t("chart.legend.shift3", {
                  defaultValue: "24:00 - 08:00",
                })}
              </span>
            </li>
          </ul>
        </div>
      </form>
    </div>
  );
}

/* ============================ Notes ============================
- Daily = Weekly (ตาม helper getSeriesByPeriod)
- ใช้ normalizeSeriesToCategories เพื่อกันกรณี categories/series ยาวไม่เท่ากัน
- key บน ReactApexChart รวมภาษา เพื่อรีเฟรชกราฟเมื่อเปลี่ยนภาษา
- Tooltip ใช้คีย์ i18n: chart.countSuffix (e.g., "{{count}} ครั้ง"/"{{count}} times")
- ป้ายแกน X (วัน/เดือน) ดึงจาก locale ปัจจุบัน: th-TH-u-nu-latn / en-GB
================================================================ */
