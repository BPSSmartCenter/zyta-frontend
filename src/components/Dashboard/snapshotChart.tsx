// src/components/Dashboard/snapshotChart.tsx
import React from "react";
import Dropdown from "../../components/Dropdown";
import WeeklySnapshotChart from "../../components/Chart";
import {
  EVENT_OPTIONS,
  chartSeries,
  avgOfSeriesMax,
  niceUp,
} from "./dashboard.constants";

type Props = {
  buttonLabel: string;
  selectedEvents: string[];
  toggleEvent: (v: string) => void;
};

// breakpoint helper
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

export default function SnapshotChartSection({
  buttonLabel,
  selectedEvents,
  toggleEvent,
}: Props) {
  const bp = useBreakpoint();

  // ✅ ใช้ ref เพื่อตรวจจับการเปลี่ยนขนาดคอนเทนเนอร์ แล้ว trigger resize ให้กราฟ reflow
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!containerRef.current) return;
    if (typeof (window as any).ResizeObserver === "undefined") return;
    const ro = new (window as any).ResizeObserver(() => {
      window.dispatchEvent(new Event("resize"));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const isDesktop = bp === "desktop";
  const chartHeight = isDesktop ? 600 : bp === "tablet" ? 420 : 280;
  const columnWidthPercent = isDesktop ? 38 : bp === "tablet" ? 55 : 65;

  // Legend policy:
  // - Desktop: ปิด legend ของกราฟ → ใช้ Custom Legend (คอลัมน์ขวา)
  // - Tablet/Mobile: เปิด legend ของกราฟ → ให้ไปอยู่ด้านล่าง-กึ่งกลาง
  const useChartLegend = !isDesktop;

  return (
    <div className="px-6 flex w-full rounded-md flex-col gap-3 bg-white">
      <form
        action=""
        className="flex flex-col lg:flex-row lg:items-start lg:justify-between p-6 gap-6"
      >
        {/* =================== Left: header + chart =================== */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header + filter (คงเดิม) */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-gray-400 text-[18px] lg:text-[20px]">Statistics</h1>
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-[20px] lg:text-[25px] font-bold">Total summary of snapshot</h1>

                {/* Multi-select dropdown */}
                <Dropdown options={EVENT_OPTIONS} value="__multi__" onChange={() => {}}>
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

            {/* Daily / Weekly / Monthly (คงเดิม) */}
            <div className="flex justify-center items-center lg:w-[350px] lg:mr-10">
              <div className="bg-[#F8F8FF] rounded-2xl">
                <div className="p-2 lg:p-4 gap-2 lg:gap-4 inline-flex rounded-lg ">
                  <button
                    type="button"
                    className="py-2 px-3 lg:px-4 inline-flex items-center gap-x-2 -ms-px rounded-2xl first:ms-0 text-sm font-medium focus:z-10 bg-[#F8F8FF] text-gray-800 hover:bg-[#D1CEE8] hover:cursor-pointer focus:text-white focus:bg-[#1E1B39] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    className="py-2 px-3 lg:px-4 inline-flex items-center gap-x-2 -ms-px rounded-2xl first:ms-0 text-sm font-medium focus:z-10 bg-[#F8F8FF] text-gray-800 hover:bg-[#D1CEE8] hover:cursor-pointer focus:text-white focus:bg-[#1E1B39] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    className="py-2 px-3 lg:px-4 inline-flex items-center gap-x-2 -ms-px rounded-2xl first:ms-0 text-sm font-medium focus:z-10 bg-[#F8F8FF] text-gray-800 hover:bg-[#D1CEE8] hover:cursor-pointer focus:text-white focus:bg-[#1E1B39] disabled:opacity-50 disabled:pointer-events-none"
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
              key={`${bp}-${useChartLegend}-${columnWidthPercent}`} // ✅ re-mount เมื่อ layout/legend เปลี่ยน
              title=""
              subtitle=""
              height={chartHeight}
              categories={["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]}
              series={chartSeries}
              colors={["#4A3AFF", "#39B8EE", "#D3F7FF"]}
              legendPosition={useChartLegend ? "bottom" : "right"} // มือถือ/แท็บเล็ต → bottom
              legendAlign="center"                                  // ให้อยู่กึ่งกลางด้านล่าง
              showGridY={true}
              showGridX={false}
              columnWidthPercent={columnWidthPercent}
              showDataLabels={false}
              tooltipValueFormatter={(v) => `${v} ครั้ง`}
              optionsOverride={{
                chart: { dropShadow: { enabled: false } },
                yaxis: { tickAmount: 5, max: niceUp(avgOfSeriesMax * 1.1, 10) },
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

        {/* =================== Custom legend (Desktop เท่านั้น — คงตำแหน่งเดิม) =================== */}
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
