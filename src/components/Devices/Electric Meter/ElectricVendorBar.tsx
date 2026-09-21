import React from "react";
import {
  ALL_VENDORS,
  type ElectricVendorFilter,
  type ElectricVendorKey,
} from "../../../features/electric/electricVendor";

export type ElectricVendorTab = {
  key: ElectricVendorKey;
  label: string;
  /** devices of this maker in the current site / group scope */
  count: number;
};

type Props = {
  /** eyebrow, e.g. "Brand" */
  title: string;
  allLabel: string;
  tabs: ElectricVendorTab[];
  selected: ElectricVendorFilter;
  onSelect: (value: ElectricVendorFilter) => void;
};

/**
 * "All | Huawei Solar | Sigenergy | Tuya …" pill row that sits above the device strip on the
 * electric page. Picking a maker narrows both the device tabs and the Overview to that maker.
 */
export const ElectricVendorBar: React.FC<Props> = ({
  title,
  allLabel,
  tabs,
  selected,
  onSelect,
}) => {
  const total = tabs.reduce((sum, tab) => sum + tab.count, 0);
  const options: Array<{ key: ElectricVendorFilter; label: string; count: number }> = [
    { key: ALL_VENDORS, label: allLabel, count: total },
    ...tabs,
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
        {title}
      </span>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={title}>
        {options.map((opt) => {
          const active = opt.key === selected;
          return (
            <button
              key={opt.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(opt.key)}
              className={[
                "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
                active
                  ? "border-[#2F3E56] bg-[#2F3E56] text-white shadow-[0_8px_20px_rgba(47,62,86,0.18)]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              <span>{opt.label}</span>
              <span
                className={[
                  "inline-flex min-w-[22px] justify-center rounded-full px-1.5 text-[11px] font-semibold leading-5",
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
