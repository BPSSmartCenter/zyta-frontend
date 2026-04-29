// src/components/Chart.tsx
import React from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { AxisSeries } from "../types/apexSeries";

// ดึง helpers + data series
import { niceUp, EVENT_OPTIONS } from "./Dashboard/dashboard.constants";

import Dropdown from "./Dropdown";
import { useTranslation } from "react-i18next";
import { useNotisFeed } from "../context/NotisContext";
import type { Noti } from "../data/Dashboard/notis";

/* ============================ Types & Utils ============================ */

type Series = { name: string; data: number[] };

type Props = {
  buttonLabel: string;
  selectedEvents: string[]; // ["all"] หรือรายการ event ที่เลือก
  toggleEvent: (value: string) => void; // สลับเลือก event
  items?: ReadonlyArray<Noti>;
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

const DAILY_BUCKETS = [
  { label: "00:00", startHour: 0, endHour: 4 },
  { label: "04:00", startHour: 4, endHour: 8 },
  { label: "08:00", startHour: 8, endHour: 12 },
  { label: "12:00", startHour: 12, endHour: 16 },
  { label: "16:00", startHour: 16, endHour: 20 },
  { label: "20:00", startHour: 20, endHour: 24 },
];

type ShiftDefinition = {
  labelKey: string;
  defaultLabel: string;
  startHour: number;
  endHour: number;
};

const SHIFT_DEFINITIONS: ShiftDefinition[] = [
  {
    labelKey: "chart.legend.shift1",
    defaultLabel: "08:00 - 16:00",
    startHour: 8,
    endHour: 16,
  },
  {
    labelKey: "chart.legend.shift2",
    defaultLabel: "16:00 - 24:00",
    startHour: 16,
    endHour: 24,
  },
  {
    labelKey: "chart.legend.shift3",
    defaultLabel: "24:00 - 08:00",
    startHour: 0,
    endHour: 8,
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LENGTHS: Record<Period, number> = {
  daily: DAILY_BUCKETS.length,
  weekly: 7,
  monthly: 12,
};

type SnapshotSeriesMap = Record<Period, Series[]>;

function useDailyTimeLabels() {
  return React.useMemo(() => DAILY_BUCKETS.map((bucket) => bucket.label), []);
}

function getShiftIndex(minuteOfDay: number): number {
  for (let idx = 0; idx < SHIFT_DEFINITIONS.length; idx++) {
    const def = SHIFT_DEFINITIONS[idx];
    const start = def.startHour * 60;
    const end = def.endHour * 60;
    if (minuteOfDay >= start && minuteOfDay < end) {
      return idx;
    }
  }
  return -1;
}

function getDailyBucketIndex(minuteOfDay: number): number {
  for (let idx = 0; idx < DAILY_BUCKETS.length; idx++) {
    const bucket = DAILY_BUCKETS[idx];
    const start = bucket.startHour * 60;
    const end = bucket.endHour * 60;
    if (minuteOfDay >= start && minuteOfDay < end) {
      return idx;
    }
  }
  return -1;
}

function parseNotiDate(noti: Noti): Date | null {
  const raw = noti.occurredAt ?? noti.date;
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildSnapshotSeries(
  items: ReadonlyArray<Noti>,
  shiftLabels: string[]
): SnapshotSeriesMap {
  const shiftCount = SHIFT_DEFINITIONS.length;
  const dailyCounts = Array.from({ length: shiftCount }, () =>
    Array(PERIOD_LENGTHS.daily).fill(0)
  );
  const weeklyCounts = Array.from({ length: shiftCount }, () =>
    Array(PERIOD_LENGTHS.weekly).fill(0)
  );
  const monthlyCounts = Array.from({ length: shiftCount }, () =>
    Array(PERIOD_LENGTHS.monthly).fill(0)
  );

  const now = Date.now();
  const dailyBoundary = now - DAY_MS;
  const weeklyBoundary = now - WEEK_MS;
  const yearlyBoundary = now - YEAR_MS;

  for (const noti of items ?? []) {
    const dt = parseNotiDate(noti);
    if (!dt) continue;
    const ts = dt.getTime();
    const minuteOfDay = dt.getHours() * 60 + dt.getMinutes();
    const shiftIdx = getShiftIndex(minuteOfDay);
    if (shiftIdx < 0) continue;

    if (ts >= dailyBoundary) {
      const bucket = getDailyBucketIndex(minuteOfDay);
      if (bucket >= 0) {
        dailyCounts[shiftIdx][bucket] += 1;
      }
    }

    if (ts >= weeklyBoundary) {
      const weekday = ((dt.getDay() + 6) % 7);
      weeklyCounts[shiftIdx][weekday] += 1;
    }

    if (ts >= yearlyBoundary) {
      const month = dt.getMonth();
      monthlyCounts[shiftIdx][month] += 1;
    }
  }

  const mapSeries = (counts: number[][]): Series[] =>
    counts.map((data, idx) => ({
      name: shiftLabels[idx] ?? SHIFT_DEFINITIONS[idx].defaultLabel,
      data,
    }));

  return {
    daily: mapSeries(dailyCounts),
    weekly: mapSeries(weeklyCounts),
    monthly: mapSeries(monthlyCounts),
  };
}

function getEmptySeries(period: Period, shiftLabels: string[]): Series[] {
  return SHIFT_DEFINITIONS.map((shift, idx) => ({
    name: shiftLabels[idx] ?? shift.defaultLabel,
    data: Array(PERIOD_LENGTHS[period]).fill(0),
  }));
}

/* ============================ DEFAULT (เดิม) — ห้ามแตะ ============================ */

export default function Chart({
  buttonLabel,
  selectedEvents,
  toggleEvent,
  items,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const locale = useLocaleFromI18n(i18n.language);
  const { t: tDash } = useTranslation(["dashboard"]);
  const { items: liveNotis } = useNotisFeed();
  const sourceItems = items ?? liveNotis;

  // Align event multi-select label with MapPanel behavior
  const multiEventLabel = React.useMemo(() => {
    if (selectedEvents.includes("all")) {
      return t("map.allEvents", { defaultValue: "เหตุการณ์ทั้งหมด" });
    }
    const count = selectedEvents.length;
    if (count > 1) {
      return t("map.selectedCount", { count, defaultValue: `เลือก ${count}` });
    }
    if (count === 1) {
      const single = selectedEvents[0];
      const opt = EVENT_OPTIONS.find((o) => o.value === single);
      return opt ? t(`events.${opt.value}`, { defaultValue: opt.label }) : single;
    }
    return t("map.allEvents", { defaultValue: "เหตุการณ์ทั้งหมด" });
  }, [selectedEvents, t]);
  const labelForButton = multiEventLabel || buttonLabel;
  const shiftLabels = React.useMemo(
    () =>
      SHIFT_DEFINITIONS.map((shift) =>
        tDash(shift.labelKey, { defaultValue: shift.defaultLabel })
      ),
    [tDash]
  );
  const snapshotSeries = React.useMemo(
    () => buildSnapshotSeries(sourceItems, shiftLabels),
    [shiftLabels, sourceItems]
  );

  // เปลี่ยนช่วงเวลา (Daily ใช้ข้อมูลเดียวกับ Weekly)
  const [period, setPeriod] = React.useState<"daily" | "weekly" | "monthly">(
    "weekly"
  );
  const isLg = useIsLg(); // คุม legend Apex (ซ่อนบนจอใหญ่)
  const borderRadius = useBorderRadiusByBreakpoint(period); // radius ตาม breakpoint + period

  // ป้ายแกน X ตามภาษา
  const dayLabels = useWeekdayShortLabels(locale);
  const monthLabels = useMonthShortLabels(locale);
  const dailyTimeLabels = useDailyTimeLabels();
  const categories = React.useMemo<string[]>(() => {
    if (period === "monthly") return monthLabels;
    if (period === "daily") return dailyTimeLabels;
    return dayLabels;
  }, [period, dayLabels, monthLabels, dailyTimeLabels]);

  // เลือกชุดข้อมูลตามช่วงเวลา (อิงจาก notis จริง; fallback เป็น 0 เมื่อยังไม่มีข้อมูล)
  const raw = React.useMemo<Series[]>(() => {
    const next = snapshotSeries[period];
    if (Array.isArray(next) && next.length) return next;
    return getEmptySeries(period, shiftLabels);
  }, [period, snapshotSeries, shiftLabels]);

  // ทำให้ series สอดคล้องกับจำนวน category และกัน mutate
  const series = React.useMemo<Series[]>(
    () => normalizeSeriesToCategories(raw, categories),
    [raw, categories]
  );

  // y-axis max ที่สวยขึ้น
  const maxVal = React.useMemo(() => {
    let m = 0;
    for (const s of series) for (const v of s.data) if (v > m) m = v;
    const up = niceUp(m * 1.1, 10);
    return up > 0 ? up : 5; // ป้องกัน max=0 เมื่อไม่มีข้อมูล
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
  }, [categories, maxVal, period, scheduleReflow, isLg, borderRadius, t]);

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
      } catch { }
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
    tDash(`events.${val}`, { defaultValue: fallback });

  return (
    <div className="px-6 flex w-full rounded-md flex-col gap-3 bg-white">
      <form className="flex flex-col lg:flex-row lg:items-start lg:justify-between p-6 gap-6">
        {/* =================== Left: header + chart =================== */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header + filter */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-gray-400 text-[18px] lg:text-[20px]">
                {tDash("chart.statisticsTitle", { defaultValue: "Statistics" })}
              </h1>

              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-[20px] lg:text-[25px] font-bold">
                  {tDash("chart.totalSummary", {
                    defaultValue: "Total summary of snapshot",
                  })}
                </h1>

                {/* Multi-select dropdown */}
                <Dropdown
                  options={EVENT_OPTIONS}
                  value="__multi__"
                  onChange={() => { }}
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
                        <span className="truncate">{labelForButton}</span>
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
                    {tDash("chart.daily", { defaultValue: "Daily" })}
                  </button>
                  <button
                    type="button"
                    aria-pressed={period === "weekly"}
                    onClick={() => setPeriod("weekly")}
                    className={btnClass(period === "weekly")}
                  >
                    {tDash("chart.weekly", { defaultValue: "Weekly" })}
                  </button>
                  <button
                    type="button"
                    aria-pressed={period === "monthly"}
                    onClick={() => setPeriod("monthly")}
                    className={btnClass(period === "monthly")}
                  >
                    {tDash("chart.monthly", { defaultValue: "Monthly" })}
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
                {tDash("chart.legend.shift1", {
                  defaultValue: "08:00 - 16:00",
                })}
              </span>
            </li>
            <li className="flex gap-2 items-center">
              <div className="rounded-full bg-[#39B8EE] w-[20px] h-[20px]" />
              <span>
                {tDash("chart.legend.shift2", {
                  defaultValue: "16:00 - 24:00",
                })}
              </span>
            </li>
            <li className="flex gap-2 items-center">
              <div className="rounded-full bg-[#D3F7FF] w-[20px] h-[20px]" />
              <span>
                {tDash("chart.legend.shift3", {
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

/* ============================ NEW (Water) — คอมโพเนนต์เสริม ============================ */

// ── 1) Stacked Columns (เดิม)
export type WaterStackedProps = {
  categories?: string[];
  series?: AxisSeries;
  height?: number | string;
  title?: string;
};

export function WaterStackedChart({
  categories,
  series,
  height = 260,
  title = "ปริมาณน้ำ",
}: WaterStackedProps) {
  const cats = categories ?? [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const data: AxisSeries = series ?? [
    {
      name: "Series 1",
      data: [340, 400, 280, 300, 360, 390, 350, 360, 340, 380, 420, 320],
    },
    {
      name: "Series 2",
      data: [260, 320, 240, 210, 220, 280, 300, 310, 330, 340, 360, 300],
    },
    {
      name: "Series 3",
      data: [290, 360, 260, 230, 190, 360, 330, 320, 350, 360, 380, 290],
    },
  ];

  // คำนวณ max รวมแบบ stacked แล้วล็อกฐาน 0
  const stackedMax = (() => {
    const sums = Array.from({ length: cats.length }, () => 0);
    data.forEach((s) =>
      s.data.forEach((v, i) => (sums[i] += typeof v === "number" ? v : 0))
    );
    return Math.max(...sums);
  })();
  const stepCandidates = [100, 150, 200, 250, 300];
  const pickStep = stepCandidates.find((st) => stackedMax / st <= 6) || 300;
  const maxY = Math.ceil(stackedMax / pickStep) * pickStep;
  const ticks = Math.min(6, Math.max(3, Math.round(maxY / pickStep)));

  const options: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      animations: { enabled: true },
    },
    title: {
      text: title,
      align: "left",
      style: { fontSize: "14px", fontWeight: 600, color: "#374151" },
    },
    colors: ["#22A9E0", "#6FD7FF", "#CDEFFF"],
    plotOptions: {
      bar: { horizontal: false, columnWidth: "45%", borderRadius: 8 },
    },
    dataLabels: { enabled: false },
    stroke: { show: false },
    xaxis: {
      categories: cats,
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: { style: { fontSize: "12px", colors: "#94A3B8" } },
    },
    yaxis: {
      min: 0,
      max: maxY,
      tickAmount: ticks,
      decimalsInFloat: 0,
      floating: false,
      forceNiceScale: false,
      labels: { style: { fontSize: "12px", colors: "#94A3B8" } },
    },
    grid: {
      borderColor: "rgba(0,0,0,0.06)",
      strokeDashArray: 3,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { left: 10, right: 10, bottom: 0, top: 0 },
    },
    legend: { show: false },
    tooltip: { y: { formatter: (val: number) => val.toLocaleString() } },
    responsive: [
      {
        breakpoint: 1024,
        options: { yaxis: { min: 0, max: maxY, tickAmount: ticks } },
      },
      {
        breakpoint: 640,
        options: {
          yaxis: { min: 0, max: maxY, tickAmount: Math.min(ticks, 4) },
          plotOptions: { bar: { columnWidth: "65%" } },
        },
      },
    ],
  };

  return (
    <ReactApexChart
      type="bar"
      height={height}
      options={options}
      series={data}
    />
  );
}

/* ── 2) NEW: Stacked Area Chart (สำหรับ Water) */
export type WaterAreaStackedProps = {
  categories?: string[];
  series?: AxisSeries;
  height?: number | string;
  yTitle?: string;
  xTitle?: string;
};

export function WaterAreaStackedChart({
  categories,
  series,
  height = 260,
  yTitle = "ปริมาณน้ำ",
  xTitle = "Month",
}: WaterAreaStackedProps) {
  const cats = categories ?? [];
  const data: AxisSeries = series ?? [];

  // คิด max แบบ "ไม่ลอย" (ฐาน 0 ตลอด)
  const stackedMax = (() => {
    const sums = Array.from({ length: cats.length }, () => 0);
    data.forEach((s) =>
      s.data.forEach((v, i) => (sums[i] += typeof v === "number" ? v : 0))
    );
    return sums.length ? Math.max(...sums) : 0;
  })();
  const stepCandidates = [100, 200];
  const pickStep = stepCandidates.find((st) => stackedMax / st <= 6) || 200;
  const maxY = Math.max(pickStep, Math.ceil(stackedMax / pickStep) * pickStep);
  const ticks = Math.min(6, Math.max(3, Math.round(maxY / pickStep)));

  const options: ApexOptions = {
    chart: {
      type: "area",
      stacked: true,
      toolbar: { show: false },
      animations: { enabled: true },
      fontFamily: "Inter, ui-sans-serif, system-ui",
    },
    colors: ["#22A9E0", "#BFEFFF", "#EAF8FF"], // เส้นเข้ม + แถบอ่อนๆ
    stroke: {
      curve: "smooth",
      width: [3, 2, 2],
      colors: ["#22A9E0", "#8DDCFF", "#CFEFFF"],
    },
    fill: {
      type: "solid",
      opacity: [0.25, 0.18, 0.12], // เฉดอ่อนใกล้ภาพ
    },
    markers: { size: 0 },
    dataLabels: { enabled: false },
    xaxis: {
      categories: cats,
      tickPlacement: "between",
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: { style: { colors: "#9CA3AF", fontSize: "12px" } },
      title: {
        text: xTitle,
        offsetY: 8,
        style: { color: "#9CA3AF", fontWeight: 500 },
      },
    },
    yaxis: {
      min: 0,
      max: maxY,
      tickAmount: ticks,
      decimalsInFloat: 0,
      labels: { style: { colors: "#9CA3AF", fontSize: "12px" } },
      title: {
        text: yTitle,
        rotate: 0,
        offsetX: -10,
        style: { color: "#9CA3AF", fontWeight: 500 },
      },
    },
    grid: {
      borderColor: "rgba(0,0,0,0.06)",
      strokeDashArray: 3,
      padding: { left: 10, right: 10 },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      labels: { colors: "#9CA3AF" },
      offsetY: 0,
    },
    tooltip: { shared: true, y: { formatter: (v) => v.toLocaleString() } },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          yaxis: { min: 0, max: maxY, tickAmount: ticks },
          legend: { position: "top", horizontalAlign: "right" },
        },
      },
      {
        breakpoint: 640,
        options: {
          yaxis: { min: 0, max: maxY, tickAmount: Math.min(4, ticks) },
        },
      },
    ],
  };

  return (
    <ReactApexChart
      type="area"
      height={height}
      options={options}
      series={data}
    />
  );
}

/* ============================ NEW (Electric) ============================ */
/** Basic Line Chart สำหรับ Electric (2 เส้น, โทนฟ้า/เขียว, smooth, grid จาง) */
export type ElectricLineBasicProps = {
  categories?: string[];
  series?: AxisSeries;
  height?: number | string;
};

export function ElectricLineBasicChart({
  categories,
  series,
  height = 320,
}: ElectricLineBasicProps) {
  const cats = categories ?? [
    "09:22",
    "10:22",
    "11:22",
    "12:22",
    "13:22",
    "14:22",
    "15:22",
    "16:22",
    "17:22",
  ];

  const data: AxisSeries = series ?? [
    {
      name: "Traffic",
      data: [120, 60, 140, 80, 180, 40, 170, 90, 160],
    },
    {
      name: "Payment",
      data: [200, 70, 260, 110, 300, 120, 330, 210, 230],
    },
  ];

  // หา max สวยๆ แล้วล็อกฐาน 0 (กันกราฟลอย)
  const rawMax = Math.max(
    ...data.flatMap((s) => s.data.map((v) => (typeof v === "number" ? v : 0)))
  );
  const maxY = niceUp(rawMax * 1.1, 10);

  const options: ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      animations: { enabled: true },
      fontFamily: "Inter, ui-sans-serif, system-ui",
    },
    colors: ["#2E90FA", "#16A34A"], // ฟ้า / เขียว
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 0 },
    dataLabels: { enabled: false },
    xaxis: {
      categories: cats,
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: { style: { colors: "#9CA3AF", fontSize: "12px" } },
    },
    yaxis: {
      min: 0,
      max: maxY,
      tickAmount: 5,
      labels: { style: { colors: "#9CA3AF", fontSize: "12px" } },
    },
    grid: {
      borderColor: "rgba(0,0,0,0.06)",
      strokeDashArray: 3,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { left: 10, right: 10 },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "center",
      fontSize: "12px",
      labels: { colors: "#9CA3AF" },
    },
    tooltip: { shared: true },
  };

  return (
    <ReactApexChart
      type="line"
      height={height}
      options={options}
      series={data}
    />
  );
}

/* ── 3) Billing Monthly line (single-series smooth line) */
export type MonthlyChartProps = {
  categories?: string[];
  series?: AxisSeries;
  height?: number | string;
  meta?: Array<{ month: string; cost?: number; usage?: number }>;
};

export function MonthlyChart({
  categories,
  series,
  height = 240,
  meta,
}: MonthlyChartProps) {
  const cats =
    categories ??
    ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];

  const data: AxisSeries =
    series ??
    [
      {
        name: "Energy",
        data: [9, 12, 8, 14, 7, 15, 9, 11, 7, 10, 9, 11],
      },
    ];

  const values = data.flatMap((s) =>
    s.data.map((v) => (typeof v === "number" ? v : 0))
  );
  const maxVal = niceUp(Math.max(...values) * 1.1, 5);

  const costMeta = meta ?? [];
  const options: ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      animations: { enabled: true },
      fontFamily: "Inter, ui-sans-serif, system-ui",
    },
    colors: ["#3B82F6"],
    stroke: { curve: "smooth", width: 3 },
    markers: {
      size: 5,
      strokeColors: "#ffffff",
      strokeWidth: 2,
      hover: { sizeOffset: 2 },
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.7,
        stops: [0, 0, 0],
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: cats,
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: { style: { colors: "#94A3B8", fontSize: "12px" } },
    },
    yaxis: {
      min: 0,
      max: maxVal,
      tickAmount: 5,
      labels: { style: { colors: "#94A3B8", fontSize: "12px" } },
    },
    grid: {
      borderColor: "rgba(0,0,0,0.08)",
      strokeDashArray: 3,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { left: 10, right: 10 },
    },
    tooltip: {
      theme: "light",
      shared: false,
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const month = w.globals.categoryLabels[dataPointIndex];
        const value = series[seriesIndex][dataPointIndex];
        const metaEntry = costMeta[dataPointIndex];
        const costValue =
          typeof metaEntry?.cost === "number" ? metaEntry.cost : null;
        const usageLabel =
          typeof value === "number"
            ? `${value.toFixed(2)} kWh`
            : "0 kWh";
        const costLabel =
          costValue !== null
            ? `${costValue.toLocaleString("th-TH", {
              style: "currency",
              currency: "THB",
              minimumFractionDigits: 2,
            })}`
            : "";
        return `<div style="padding:8px 12px;font-size:12px;color:#0f172a">${month}<br/>${usageLabel}${costLabel ? `<br/>${costLabel}` : ""
          }</div>`;
      },
    },
    legend: { show: false },
  };

  return (
    <ReactApexChart
      type="line"
      height={height}
      options={options}
      series={data}
    />
  );
}

/* ============================ Notes ============================
- DEFAULT export (Chart) ไม่ถูกแก้ไข เพื่อกันกระทบ Snapshot เดิม
- เพิ่ม named export: WaterStackedChart, WaterAreaStackedChart สำหรับ Water
  และ MonthlyChart สำหรับ Billing overview
================================================================ */

/* ── 4) NEW: Simple Line Chart (Requested for IoT) */
export type LineChartProps = {
  categories?: string[];
  series?: AxisSeries;
  height?: number | string;
  title?: string;
};

export function LineChart({
  categories,
  series,
  height = 350,
  title = "Real-time Trend",
}: LineChartProps) {
  const options: ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      animations: { enabled: true, dynamicAnimation: { enabled: false } },
      zoom: { enabled: false },
    },
    title: {
      text: title,
      align: "left",
      style: { fontSize: "14px", fontWeight: 600, color: "#374151" },
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    colors: ["#4A3AFF", "#39B8EE", "#D3F7FF", "#FF5733", "#33FF57"],
    xaxis: {
      categories: categories || [],
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: { style: { fontSize: "12px", colors: "#94A3B8" } },
      tooltip: { enabled: false },
    },
    yaxis: {
      forceNiceScale: true,
      labels: { style: { fontSize: "12px", colors: "#94A3B8" } },
    },
    grid: {
      strokeDashArray: 3,
      borderColor: "rgba(0,0,0,0.06)",
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: true } },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
    },
    tooltip: {
      y: { formatter: (val: number) => val.toLocaleString() },
    },
  };

  return (
    <ReactApexChart
      type="line"
      height={height}
      options={options}
      series={series || []}
    />
  );
}
