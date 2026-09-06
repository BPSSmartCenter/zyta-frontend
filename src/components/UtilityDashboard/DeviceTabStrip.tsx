import React from "react";
import { UtilitySurface } from "./UtilityDashboardLayout";

/** Selected value that means "every device in scope". */
export const OVERVIEW_DEVICE_TAB = "__OVERVIEW__";

export type DeviceTabOption = {
  value: string;
  label: string;
  /** shown with a red dot, like the electric page's offline meters */
  offline?: boolean;
};

type Props = {
  /** eyebrow, e.g. "Device" */
  title: string;
  overviewLabel: string;
  options: DeviceTabOption[];
  selected: string;
  onSelect: (value: string) => void;
  emptyText: string;
  loading?: boolean;
  loadingText?: string;
  /** optional block on the right (the electric page puts its time range there) */
  trailing?: React.ReactNode;
};

// Same breakpoints as the electric page's strip so the three device pages behave alike.
function useTabsPerPage(): number {
  const [perPage, setPerPage] = React.useState(8);
  React.useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      const width = window.innerWidth;
      setPerPage(
        width >= 1800 ? 9 : width >= 1536 ? 8 : width >= 1280 ? 7 : width >= 1024 ? 6 : width >= 768 ? 4 : 2
      );
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return perPage;
}

const NAV_BUTTON =
  "grid h-11 w-11 place-items-center text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35";

/**
 * "Overview | device | device …" selector with first/previous/next/last buttons, a window of
 * tabs sized to the viewport, and the selected tab kept in view. Mirrors the electric page.
 */
export const DeviceTabStrip: React.FC<Props> = ({
  title,
  overviewLabel,
  options,
  selected,
  onSelect,
  emptyText,
  loading = false,
  loadingText,
  trailing,
}) => {
  const perPage = useTabsPerPage();
  const all = React.useMemo<DeviceTabOption[]>(
    () => [{ value: OVERVIEW_DEVICE_TAB, label: overviewLabel }, ...options],
    [options, overviewLabel]
  );
  const selectedIndex = Math.max(0, all.findIndex((opt) => opt.value === selected));
  const windowStart = React.useMemo(() => {
    if (all.length <= perPage) return 0;
    const half = Math.floor(perPage / 2);
    return Math.max(0, Math.min(selectedIndex - half, all.length - perPage));
  }, [all.length, perPage, selectedIndex]);
  const visible = all.slice(windowStart, windowStart + perPage);
  const atFirst = selectedIndex <= 0;
  const atLast = selectedIndex >= all.length - 1;

  return (
    <UtilitySurface>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {title}
            </span>
            {options.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="inline-flex shrink-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => onSelect(all[0].value)}
                    disabled={atFirst}
                    className={`${NAV_BUTTON} border-r border-slate-200`}
                    aria-label="First device"
                  >
                    <span className="material-icons text-[20px]">keyboard_double_arrow_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect(all[Math.max(0, selectedIndex - 1)].value)}
                    disabled={atFirst}
                    className={NAV_BUTTON}
                    aria-label="Previous device"
                  >
                    <span className="material-icons text-[20px]">chevron_left</span>
                  </button>
                </div>

                <div className="flex min-w-0 flex-1 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
                  {visible.map((opt) => {
                    const active = opt.value === selected;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onSelect(opt.value)}
                        className={[
                          "inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 border-r border-slate-200 px-4 py-3 text-sm font-medium transition last:border-r-0",
                          active ? "bg-[#4A90E2] text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                          opt.offline && !active ? "text-rose-600" : "",
                        ].join(" ")}
                        title={opt.label}
                      >
                        <span className="truncate">{opt.label}</span>
                        {opt.offline ? (
                          <span
                            className={`inline-flex h-2.5 w-2.5 rounded-full ${active ? "bg-white/90" : "bg-rose-500"}`}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="inline-flex shrink-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => onSelect(all[Math.min(all.length - 1, selectedIndex + 1)].value)}
                    disabled={atLast}
                    className={`${NAV_BUTTON} border-r border-slate-200`}
                    aria-label="Next device"
                  >
                    <span className="material-icons text-[20px]">chevron_right</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect(all[all.length - 1].value)}
                    disabled={atLast}
                    className={NAV_BUTTON}
                    aria-label="Last device"
                  >
                    <span className="material-icons text-[20px]">keyboard_double_arrow_right</span>
                  </button>
                </div>
              </div>
            ) : (
              <span className="inline-flex items-center self-start rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-400">
                {loading ? loadingText ?? emptyText : emptyText}
              </span>
            )}
          </div>
        </div>
        {trailing}
      </div>
    </UtilitySurface>
  );
};
