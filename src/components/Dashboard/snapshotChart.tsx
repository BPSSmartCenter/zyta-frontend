// src/components/Dashboard/snapshotChart.tsx
import React from "react";
import Dropdown from "../../components/Dropdown";
import WeeklySnapshotChart from "../../components/Chart";
import {
  EVENT_OPTIONS,
  getSeriesByPeriod,
  niceUp,
} from "./dashboard.constants";

type Props = {
  buttonLabel: string;
  selectedEvents: string[];
  toggleEvent: (v: string) => void;
};

type AnySeries = { name?: string; data?: any[]; [k: string]: any };

/** ทำซีรีส์ให้ยาวเท่ากับจำนวน categories เสมอ (pad ด้วย null) */
function normalizeSeriesToCategories(
  input: AnySeries[] | undefined,
  categories: any[]
): AnySeries[] {
  const safe = Array.isArray(input) ? input : [];
  return safe
    .filter((s) => Array.isArray(s?.data))
    .map((s) => {
      const src = (s.data as any[]) ?? [];
      const data = Array.from({ length: categories.length }, (_, i) => {
        const v = src[i];
        return typeof v === "number" && Number.isFinite(v) ? v : null;
      });
      return { ...s, data };
    });
}

// breakpoint helper (เดิม)
function useBreakpoint() {
  const get = () => {
    if (typeof window === "undefined") return "desktop";
    const isLg = window.matchMedia("(min-width:1024px)").matches;
    const isSm = window.matchMedia("(max-width:639.98px)").matches;
    if (isLg) return "desktop";
    if (isSm) return "mobile";
    return "tablet";
  };
  const [bp, setBp] = React.useState<string>(get);
  React.useEffect(() => {
    const on = () => setBp(get());
    const mqls = [
      window.matchMedia("(min-width:1024px)"),
      window.matchMedia("(max-width:639.98px)"),
    ];
    mqls.forEach((m) => m.addEventListener?.("change", on));
    window.addEventListener("resize", on);
    return () => {
      mqls.forEach((m) => m.removeEventListener?.("change", on));
      window.removeEventListener("resize", on);
    };
  }, []);
  return bp;
}

// ===== Labels =====
const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export default function SnapshotChartSection({
  buttonLabel,
  selectedEvents,
  toggleEvent,
}: Props) {
  const bp = useBreakpoint();
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const isDesktop = bp === "desktop";
  const chartHeight = isDesktop ? 600 : bp === "tablet" ? 420 : 280;

  // ลด columnWidth เล็กน้อยเพื่อให้แท่งในคลัสเตอร์ห่างกันขึ้น
  const columnWidthPercent = isDesktop ? 32 : bp === "tablet" ? 50 : 60;
  const useChartLegend = !isDesktop;

  // ====== ช่วงเวลา (Default: Weekly) ======
  const [period, setPeriod] = React.useState<"daily" | "weekly" | "monthly">(
    "weekly"
  );

  // categories ของช่วงที่เลือก (Daily/Weekly ใช้ 7 วันเหมือนกัน)
  const baseCategories = React.useMemo(
    () => (period === "monthly" ? MONTH_LABELS : DAY_LABELS),
    [period]
  );

  // ดึงชุดข้อมูลตามช่วง (ถ้ายังไม่ได้กรองตาม event จริง ให้คง logic เดิม)
  const rawSeries = getSeriesByPeriod(period);

  // ปรับซีรีส์ให้ยาวเท่ากับจำนวน categories
  const safeSeries = React.useMemo(
    () => normalizeSeriesToCategories(rawSeries as any, baseCategories),
    [rawSeries, baseCategories]
  );

  // ใช้ค่าสูงสุดของ “ข้อมูลช่วงนั้น” มาคำนวณ y-axis เพื่อให้แท่งดูเต็ม
  const currentMax = React.useMemo(
    () =>
      safeSeries.reduce((mx, s: any) => {
        const vals = (s.data ?? []).filter(
          (v: any) => typeof v === "number"
        ) as number[];
        return Math.max(mx, ...(vals.length ? vals : [0]));
      }, 0),
    [safeSeries]
  );

  // ========== KEY สำหรับรี-mount กราฟเมื่อ event/series/period เปลี่ยน ==========
  const seriesFingerprint = React.useMemo(
    () =>
      safeSeries
        .map((s) => `${s.name ?? ""}:${(s.data ?? []).join("|")}`)
        .join(";;"),
    [safeSeries]
  );

  const chartKey = React.useMemo(
    () =>
      [
        bp,
        useChartLegend,
        columnWidthPercent,
        period,
        selectedEvents.join(","), // เลือก event → key เปลี่ยน
        seriesFingerprint, // ข้อมูลเปลี่ยน → key เปลี่ยน
      ].join("|"),
    [
      bp,
      useChartLegend,
      columnWidthPercent,
      period,
      selectedEvents,
      seriesFingerprint,
    ]
  );

  // ให้ ResizeObserver ข้ามตอนยังไม่มี container หรือมี overlay ของ Preline
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || !(window as any).ResizeObserver) return;

    let raf = 0;
    const ro = new (window as any).ResizeObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const overlayOpen = !!document.querySelector(".hs-overlay.open");
        if (!document.body.contains(el) || overlayOpen) return;
        window.dispatchEvent(new Event("resize"));
      });
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

  return (
    <div className="px-6 flex w-full rounded-md flex-col gap-3 bg-white">
      <form className="flex flex-col lg:flex-row lg:items-start lg:justify-between p-6 gap-6">
        {/* =================== Left: header + chart =================== */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header + filter */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-gray-400 text-[18px] lg:text-[20px]">
                Statistics
              </h1>
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-[20px] lg:text-[25px] font-bold">
                  Total summary of snapshot
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
                            "inline-flex h-10 w-[120px] items-center justify-around rounded-md border border-gray-300 px-2 text-sm hover:cursor-pointer focus:bg-gray-50",
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
                            "absolute left-0 top-full mt-2 min-w-[100px] rounded-md",
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
                              <span className="text-gray-800">{opt.label}</span>
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
                    Daily
                  </button>
                  <button
                    type="button"
                    aria-pressed={period === "weekly"}
                    onClick={() => setPeriod("weekly")}
                    className={btnClass(period === "weekly")}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    aria-pressed={period === "monthly"}
                    onClick={() => setPeriod("monthly")}
                    className={btnClass(period === "monthly")}
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div ref={containerRef} className="mt-3">
            <WeeklySnapshotChart
              key={chartKey} // ← รี-mount เมื่อ event/series/period เปลี่ยน
              title=""
              subtitle=""
              height={chartHeight}
              categories={baseCategories}
              series={safeSeries as any}
              colors={["#4A3AFF", "#39B8EE", "#D3F7FF"]}
              legendPosition={useChartLegend ? "bottom" : "right"}
              legendAlign="center"
              showGridY={true}
              showGridX={false}
              columnWidthPercent={columnWidthPercent}
              showDataLabels={false}
              tooltipValueFormatter={(v) => `${v} ครั้ง`}
              optionsOverride={{
                chart: { dropShadow: { enabled: false } },
                yaxis: {
                  tickAmount: 5,
                  max: niceUp(currentMax * 1.1, 10),
                },
                legend: {
                  show: useChartLegend,
                  position: "bottom",
                  horizontalAlign: "center",
                  floating: false,
                  offsetY: 8,
                },
                stroke: { width: 0 },
                tooltip: { enabled: true, shared: false },
              }}
            />
          </div>
        </div>

        {/* Custom legend (Desktop เท่านั้น) */}
        <div className="hidden lg:flex flex-col justify-center items-center flex-none w-[220px] h-[600px]">
          <ul className="flex flex-col gap-8">
            <li className="flex gap-2 items-center">
              <div className="rounded-full bg-[#4A3AFF] w-[20px] h-[20px]" />
              <span className="min-w-[60px]">08:00 - 16:00 น.</span>
            </li>
            <li className="flex gap-2 items-center">
              <div className="rounded-full bg-[#39B8EE] w-[20px] h-[20px]" />
              <span>16:00 - 24:00 น.</span>
            </li>
            <li className="flex gap-2 items-center">
              <div className="rounded-full bg-[#D3F7FF] w-[20px] h-[20px]" />
              <span>24:00 - 08:00 น.</span>
            </li>
          </ul>
        </div>
      </form>
    </div>
  );
}
