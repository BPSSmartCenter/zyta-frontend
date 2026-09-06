import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import SearchInput from "../../SearchInput";
import {
  DeviceTabStrip,
  OVERVIEW_DEVICE_TAB,
  type DeviceTabOption,
} from "../../UtilityDashboard/DeviceTabStrip";
import {
  UtilitySectionTitle,
  UtilitySurface,
} from "../../UtilityDashboard/UtilityDashboardLayout";
import phWaterDrop from "../../../assets/phWaterDrop.png";
import waterIcon from "../../../assets/Water.png";
import TDSIcon from "../../../assets/TDS.png";
import waterDrop from "../../../assets/waterDrop.png";
import { getWaterDevices, type WaterDeviceRecord } from "../../../features/devices";
import { useFilters } from "../../../context/FiltersContext";
import { useNotisFeed } from "../../../context/NotisContext";
import type { Noti } from "../../../data/Dashboard/notis";
import { buildNotiKeywordBag, notiSeverity } from "../../../utils/notis";

type Props = {
  timeRange?: { from: string; to: string };
  siteCode?: string;
};

type WaterTotalsTriple = { today: number; month: number; year: number };

type WaterSectionSnapshot = {
  ph: number | null;
  flowRateLpm: number | null;
  tdsPpm: number | null;
  consumptionLiters: number | null;
  maxLabel?: string;
};

type WaterSeries = { name: string; data: number[] };

type WaterSnapshot = {
  timestamp: string | null;
  domestic: WaterSectionSnapshot;
  drinking: WaterSectionSnapshot;
  totals: {
    drinking: WaterTotalsTriple;
    domestic: WaterTotalsTriple;
  };
  stacked?: { categories?: string[]; series: WaterSeries[] };
  radial?: { total?: number | string; values: number[]; labels: string[] };
  usage?: { categories?: string[]; series: WaterSeries[] };
  /** which kinds have at least one meter (absent when the API does not say) */
  kinds?: { domestic: boolean; drinking: boolean };
};

const GRID_BY_COUNT: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};
const gridColsFor = (count: number) => GRID_BY_COUNT[Math.max(1, Math.min(6, count))];

type WaterAlertRow = {
  id: string;
  site: string;
  event: string;
  meter: string;
  status: "crit" | "warn" | "ok";
  timestamp: string;
};

const ZERO_TOTALS: WaterTotalsTriple = { today: 0, month: 0, year: 0 };
const DEFAULT_SITE_CODE = "3078000";
const DEFAULT_MONTH_CATEGORIES = [
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
const WATER_ALERT_KEYWORDS = [
  "water",
  "water meter",
  "watermeter",
  "domestic",
  "drinking",
  "leak",
  "flow",
  "pressure",
  "pipe",
  "pump",
  "ph",
  "tds",
  "hydrant",
  "reservoir",
  "tank",
];

const safeObject = (value: unknown): Record<string, any> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const normalizeTotalsTriple = (
  source: Record<string, any> | null | undefined
): WaterTotalsTriple => ({
  today: coerceNumber(source?.today) ?? 0,
  month: coerceNumber(source?.month) ?? 0,
  year: coerceNumber(source?.year) ?? 0,
});

const normalizeSectionSnapshot = (
  source: Record<string, any> | null | undefined
): WaterSectionSnapshot => ({
  ph: coerceNumber(source?.ph ?? source?.pH),
  flowRateLpm: coerceNumber(
    source?.flowRateLpm ?? source?.flowRate ?? source?.flow_rate_lpm
  ),
  tdsPpm: coerceNumber(source?.tdsPpm ?? source?.tds ?? source?.tds_ppm),
  consumptionLiters:
    coerceNumber(
      source?.consumptionLiters ??
        source?.consumption ??
        source?.liters ??
        source?.value
    ) ?? 0,
  maxLabel:
    typeof source?.maxLitersLabel === "string" ? source.maxLitersLabel : undefined,
});

const normalizeSeries = (
  source: unknown,
  fallbackPrefix: string
): WaterSeries[] => {
  if (!Array.isArray(source)) return [];
  return source.map((entry: any, idx: number) => ({
    name:
      typeof entry?.name === "string" && entry.name.trim().length
        ? entry.name.trim()
        : `${fallbackPrefix} ${idx + 1}`,
    data: Array.isArray(entry?.data)
      ? entry.data.map((value: any) => coerceNumber(value) ?? 0)
      : [],
  }));
};

const extractWaterSnapshot = (device: WaterDeviceRecord | null): WaterSnapshot | null => {
  if (!device) return null;
  const meta = safeObject(device.meta);
  const waterMeta = safeObject(meta?.water);
  const lastReading = safeObject(waterMeta?.lastReading);
  if (!waterMeta || !lastReading) return null;

  const domestic = normalizeSectionSnapshot(safeObject(lastReading.domestic));
  const drinking = normalizeSectionSnapshot(safeObject(lastReading.drinking));
  const totalsRaw = safeObject(waterMeta.totals);
  const charts = safeObject(waterMeta.charts);

  const stackedRaw = safeObject(charts?.stackedSeries);
  const stackedSeries = normalizeSeries(stackedRaw?.series, "Series");
  const stacked =
    stackedSeries.length > 0
      ? {
          categories: Array.isArray(stackedRaw?.categories)
            ? stackedRaw.categories.map((value: any) => String(value))
            : undefined,
          series: stackedSeries,
        }
      : undefined;

  const usageRaw = charts?.usageTimeline;
  const usageSource =
    Array.isArray((usageRaw as any)?.series) || Array.isArray((usageRaw as any)?.categories)
      ? usageRaw
      : Array.isArray(usageRaw)
        ? { series: usageRaw }
        : undefined;
  const usageSeries = normalizeSeries((usageSource as any)?.series, "Series");
  const usage =
    usageSeries.length > 0
      ? {
          categories: Array.isArray((usageSource as any)?.categories)
            ? (usageSource as any).categories.map((value: any) => String(value))
            : undefined,
          series: usageSeries,
        }
      : undefined;

  const radialRaw = safeObject(charts?.radial);
  const radial = radialRaw
    ? {
        total:
          coerceNumber(radialRaw.totalLiters ?? radialRaw.total) ??
          radialRaw.totalLiters ??
          radialRaw.total,
        values: Array.isArray(radialRaw.values)
          ? radialRaw.values.map((value: any) => coerceNumber(value) ?? 0)
          : [],
        labels: Array.isArray(radialRaw.labels)
          ? radialRaw.labels.map((value: any) => String(value))
          : [],
      }
    : undefined;

  const timestamp =
    typeof lastReading.timestamp === "string"
      ? lastReading.timestamp
      : typeof lastReading.capturedAt === "string"
        ? lastReading.capturedAt
        : null;

  const deviceCounts = safeObject(waterMeta.deviceCounts);
  const kinds = deviceCounts
    ? {
        domestic: (coerceNumber(deviceCounts.domestic) ?? 0) > 0,
        drinking: (coerceNumber(deviceCounts.drinking) ?? 0) > 0,
      }
    : undefined;

  return {
    timestamp,
    kinds,
    domestic,
    drinking,
    totals: {
      domestic: normalizeTotalsTriple(safeObject(totalsRaw?.domestic)),
      drinking: normalizeTotalsTriple(safeObject(totalsRaw?.drinking)),
    },
    stacked,
    radial,
    usage,
  };
};

const sumSectionField = (
  sections: WaterSectionSnapshot[],
  pick: (section: WaterSectionSnapshot) => number | null
): number | null => {
  const values = sections.map(pick).filter((value): value is number => typeof value === "number");
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const mergeSeriesByIndex = (
  lists: Array<{ categories?: string[]; series: WaterSeries[] } | undefined>
): { categories?: string[]; series: WaterSeries[] } | undefined => {
  const present = lists.filter((entry): entry is { categories?: string[]; series: WaterSeries[] } => !!entry && entry.series.length > 0);
  if (!present.length) return undefined;
  const categories = present.find((entry) => entry.categories?.length)?.categories;
  const length = categories?.length ?? Math.max(...present.map((entry) => Math.max(...entry.series.map((s) => s.data.length))));
  const names = present[0].series.map((s) => s.name);
  const series = names.map((name, seriesIndex) => ({
    name,
    data: Array.from({ length }, (_, index) =>
      present.reduce((sum, entry) => sum + Number(entry.series[seriesIndex]?.data[index] || 0), 0)
    ),
  }));
  return { categories, series };
};

/**
 * One snapshot per site comes back from the API; the page shows the selected scope, which may be
 * several sites (a main location or "all"). Usage figures are summed, quality readings averaged.
 */
const mergeWaterSnapshots = (snapshots: WaterSnapshot[]): WaterSnapshot | null => {
  if (!snapshots.length) return null;
  if (snapshots.length === 1) return snapshots[0];
  const timestamp =
    snapshots
      .map((snapshot) => snapshot.timestamp)
      .filter((value): value is string => !!value)
      .sort()
      .pop() ?? null;
  const mergeSection = (pick: (snapshot: WaterSnapshot) => WaterSectionSnapshot): WaterSectionSnapshot => {
    const sections = snapshots.map(pick);
    return {
      ph: sumSectionField(sections, (section) => section.ph),
      flowRateLpm: sumSectionField(sections, (section) => section.flowRateLpm),
      tdsPpm: sumSectionField(sections, (section) => section.tdsPpm),
      consumptionLiters: sections.reduce((sum, section) => sum + Number(section.consumptionLiters ?? 0), 0),
    };
  };
  const mergeTotals = (pick: (snapshot: WaterSnapshot) => WaterTotalsTriple): WaterTotalsTriple =>
    snapshots.reduce(
      (acc, snapshot) => {
        const totals = pick(snapshot);
        return { today: acc.today + totals.today, month: acc.month + totals.month, year: acc.year + totals.year };
      },
      { ...ZERO_TOTALS }
    );
  const knownKinds = snapshots.map((snapshot) => snapshot.kinds).filter((kinds): kinds is NonNullable<WaterSnapshot["kinds"]> => !!kinds);
  return {
    timestamp,
    kinds: knownKinds.length
      ? {
          domestic: knownKinds.some((kinds) => kinds.domestic),
          drinking: knownKinds.some((kinds) => kinds.drinking),
        }
      : undefined,
    domestic: mergeSection((snapshot) => snapshot.domestic),
    drinking: mergeSection((snapshot) => snapshot.drinking),
    totals: {
      domestic: mergeTotals((snapshot) => snapshot.totals.domestic),
      drinking: mergeTotals((snapshot) => snapshot.totals.drinking),
    },
    stacked: mergeSeriesByIndex(snapshots.map((snapshot) => snapshot.stacked)),
    usage: mergeSeriesByIndex(snapshots.map((snapshot) => snapshot.usage)),
    radial: undefined,
  };
};

const formatWithComma = (value: number | string, digits = 0) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const formatDecimal = (value: number | null | undefined, digits = 2) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toFixed(digits);
};

const formatLastSync = (timestamp: string | null, locale: string) => {
  if (!timestamp) return "No recent sync";
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return timestamp;
  const diffMinutes = Math.max(0, Math.round((Date.now() - parsed) / 60_000));
  if (diffMinutes <= 1) return "Last sync just now";
  if (diffMinutes < 60) return `Last sync ${diffMinutes} min ago`;
  return `Last sync ${new Date(parsed).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const parseMaxLabelNumber = (label?: string) => {
  if (!label) return null;
  const match = label.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeSeriesName = (
  name: string,
  index: number,
  fallbackNames: string[]
) => {
  const generic = /^(series\s*\d+|[a-z])$/i.test(name.trim());
  if (generic && fallbackNames[index]) return fallbackNames[index];
  return name;
};

const niceAxisMax = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
};

const sumSeriesByIndex = (series: WaterSeries[], length: number) =>
  Array.from({ length }, (_, index) =>
    series.reduce((sum, entry) => sum + Number(entry.data[index] || 0), 0)
  );

const resolveScopeWindow = (range: "30d" | "90d" | "1y", size: number) => {
  if (size <= 0) return 0;
  if (size <= 12) {
    if (range === "30d") return Math.min(4, size);
    if (range === "90d") return Math.min(8, size);
    return size;
  }
  if (range === "30d") return Math.min(30, size);
  if (range === "90d") return Math.min(90, size);
  return Math.min(365, size);
};

const describePh = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) {
    return { label: "No data", tone: "slate" as const };
  }
  if (value < 6.5) return { label: "slightly acidic", tone: "amber" as const };
  if (value > 8.5) return { label: "alkaline", tone: "sky" as const };
  return { label: "neutral", tone: "sky" as const };
};

const describeTds = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "No data";
  if (value <= 300) return "drinking";
  if (value <= 600) return "acceptable";
  return "elevated";
};

const buildSiteCandidates = (item: Noti) =>
  [
    item.siteCode,
    item.siteId,
    item.siteName,
    item.site,
    (item as Record<string, any>).site_code,
    (item as Record<string, any>).site_id,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim());

const matchesSiteTargets = (item: Noti, siteTargets: string[]) => {
  if (!siteTargets.length) return true;
  const siteSet = new Set(siteTargets.map((value) => value.trim()));
  return buildSiteCandidates(item).some((value) => siteSet.has(value));
};

const isWaterRelatedNoti = (item: Noti) => {
  const extra = [
    item.deviceModel,
    item.deviceId,
    (item.meta as any)?.device?.model,
    (item.meta as any)?.deviceModel,
    (item.meta as any)?.deviceName,
    (item.meta as any)?.device?.name,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(" ");
  const bag = `${buildNotiKeywordBag(item)} ${extra}`;
  return WATER_ALERT_KEYWORDS.some((keyword) => bag.includes(keyword));
};

const alertEventLabel = (item: Noti) => {
  const meta = safeObject(item.meta);
  const candidates = [
    item.title,
    meta?.label,
    meta?.event,
    meta?.alertType,
    item.titleKey,
    item.type,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length) {
      return candidate.trim();
    }
  }
  return "Alert";
};

const alertMeterLabel = (item: Noti) => {
  const meta = safeObject(item.meta);
  const candidates = [
    meta?.deviceName,
    meta?.device?.name,
    item.deviceModel,
    meta?.deviceModel,
    item.deviceId,
    meta?.deviceId,
    meta?.device?.id,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length) {
      return candidate.trim();
    }
  }
  return "--";
};

const toAlertRow = (item: Noti, index: number): WaterAlertRow => {
  const severity = notiSeverity(item);
  return {
    id:
      item.id ??
      `${item.titleKey ?? item.title ?? "water-alert"}-${item.date}-${index}`,
    site: item.siteName ?? item.site ?? item.siteCode ?? item.siteId ?? "-",
    event: alertEventLabel(item),
    meter: alertMeterLabel(item),
    status:
      severity === "critical" ? "crit" : severity === "medium" ? "warn" : "ok",
    timestamp: item.occurredAt ?? item.createdAt ?? item.date,
  };
};

function WaterHeroCard({
  title,
  value,
  subValue,
  progress,
  syncText,
  accent,
  progressColor,
}: {
  title: string;
  value: string;
  subValue: string;
  progress: number;
  syncText: string;
  accent: "domestic" | "drinking";
  progressColor: string;
}) {
  const safeProgress = Math.max(0, Math.min(100, progress));
  const heroClass =
    accent === "domestic"
      ? "from-[#ffffff] via-[#fbfdff] to-[#eef8ff]"
      : "from-[#ffffff] via-[#fbfdff] to-[#f2fbff]";

  return (
    <UtilitySurface className={`overflow-hidden bg-gradient-to-br ${heroClass} p-6`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div
          className="grid h-[118px] w-[118px] shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${progressColor} ${safeProgress * 3.6}deg, rgba(226,232,240,0.9) 0deg)`,
          }}
        >
          <div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-white">
            <div className="text-center leading-tight">
              <div className="text-[28px] font-semibold leading-none text-slate-900">
                {value}
              </div>
              <div className="mt-1 text-[16px] font-medium text-slate-400">
                {subValue}
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F0F9FF]">
              <img src={waterDrop} alt="" className="h-4 w-4 object-contain" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-[#8AA0C5]">
                Tank level
              </div>
              <div className="text-[22px] font-semibold leading-tight text-slate-900">
                {title}
              </div>
              <div className="mt-3 text-sm text-[#8AA0C5]">{syncText}</div>
            </div>
          </div>
        </div>
      </div>
    </UtilitySurface>
  );
}

function WaterStatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <UtilitySurface className="rounded-[20px] p-5">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-[#F1FAFF]">
        <img src={icon} alt="" className="h-4 w-4 object-contain" />
      </div>
      <div className="mt-4 text-[13px] font-medium text-[#8AA0C5]">{label}</div>
      <div className="mt-1 text-[22px] font-semibold leading-tight text-slate-900">
        {value}
      </div>
    </UtilitySurface>
  );
}

function WaterMetricBand({
  icon,
  value,
  unit,
  title,
  subtitle,
  tone = "sky",
}: {
  icon: string;
  value: string;
  unit?: string;
  title: string;
  subtitle: string;
  tone?: "sky" | "amber";
}) {
  const accent =
    tone === "amber"
      ? {
          wrap: "border-[#FDE7C7] bg-[#FFF8EA]",
          bubble: "bg-white text-[#D97706]",
        }
      : {
          wrap: "border-[#D6ECFA] bg-[#F4FAFF]",
          bubble: "bg-white text-[#0284C7]",
        };

  return (
    <UtilitySurface className={`rounded-[22px] border ${accent.wrap} p-5`}>
      <div className="flex items-center gap-4">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${accent.bubble}`}>
          <img src={icon} alt="" className="h-5 w-5 object-contain" />
        </div>
        <div className="min-w-0">
          <div className="flex items-end gap-1">
            <span className="text-[22px] font-semibold leading-none text-slate-900">
              {value}
            </span>
            {unit ? (
              <span className="text-[14px] font-medium text-[#64748B]">{unit}</span>
            ) : null}
          </div>
          <div className="mt-1 text-[13px] font-medium text-[#64748B]">{title}</div>
          <div className="text-[12px] text-[#8AA0C5]">{subtitle}</div>
        </div>
      </div>
    </UtilitySurface>
  );
}

function TodayTotalCard({
  total,
  domestic,
  drinking,
  radialItems,
  unitLabel,
  totalUnitLabel,
  domesticLabel,
  drinkingLabel,
}: {
  total: number;
  domestic: number;
  drinking: number;
  radialItems: Array<{ label: string; value: string }>;
  unitLabel: string;
  totalUnitLabel: string;
  domesticLabel: string;
  drinkingLabel: string;
}) {
  return (
    <UtilitySurface className="h-full">
      <UtilitySectionTitle
        title="Today's total"
        subtitle="Real-time usage"
      />

      <div className="flex flex-col items-center">
        <div
          className="grid h-[216px] w-[216px] place-items-center rounded-full"
          style={{
            background:
              "conic-gradient(#39B8EE 0deg 310deg, rgba(207,234,250,0.9) 310deg 360deg)",
          }}
        >
          <div className="grid h-[176px] w-[176px] place-items-center rounded-full bg-white">
            <div
              className="grid h-[144px] w-[144px] place-items-center rounded-full border-[12px] border-[#BFE7FB] border-t-[#7DD3FC] border-r-[#7DD3FC]"
            >
              <div className="text-center leading-tight">
                <div className="text-[40px] font-semibold text-slate-900">
                  {formatWithComma(total)}
                </div>
                <div className="mt-1 text-[15px] text-[#8AA0C5]">{totalUnitLabel}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid w-full grid-cols-2 gap-6 text-center">
          <div>
            <div className="text-[13px] font-medium text-[#8AA0C5]">{domesticLabel}</div>
            <div className="mt-1 text-[18px] font-semibold text-[#0284C7]">
              {formatWithComma(domestic)} {unitLabel}
            </div>
          </div>
          <div>
            <div className="text-[13px] font-medium text-[#8AA0C5]">{drinkingLabel}</div>
            <div className="mt-1 text-[18px] font-semibold text-[#0EA5E9]">
              {formatWithComma(drinking)} {unitLabel}
            </div>
          </div>
        </div>

        {radialItems.length ? (
          <div className="mt-5 grid w-full gap-2">
            {radialItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[14px] bg-[#F8FBFE] px-4 py-3 text-sm"
              >
                <span className="text-[#8AA0C5]">{item.label}</span>
                <span className="font-semibold text-slate-700">{item.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </UtilitySurface>
  );
}

function MonthlyConsumptionChart({
  categories,
  series,
  unitLabel,
}: {
  categories: string[];
  series: WaterSeries[];
  unitLabel: string;
}) {
  const maxValue = Math.max(
    1,
    ...series.flatMap((entry) => entry.data.map((value) => Number(value || 0)))
  );
  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "Inter, ui-sans-serif, system-ui",
      },
      colors: ["#1D9BF0", "#7DD3FC", "#CDEFFF", "#F59E0B"],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: series.length > 1 ? "58%" : "42%",
          borderRadius: 6,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: false },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "right",
        fontSize: "12px",
        labels: { colors: "#64748B" },
      },
      grid: {
        borderColor: "rgba(148,163,184,0.18)",
        strokeDashArray: 4,
        padding: { left: 8, right: 8, bottom: 0 },
      },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { fontSize: "12px", colors: "#94A3B8" },
        },
      },
      yaxis: {
        min: 0,
        max: niceAxisMax(maxValue * 1.15),
        tickAmount: 4,
        labels: {
          formatter: (value) => `${Math.round(value)}`,
          style: { fontSize: "12px", colors: "#94A3B8" },
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (value: number) => `${formatWithComma(value)} ${unitLabel}`,
        },
      },
    }),
    [categories, maxValue, series.length, unitLabel]
  );

  return <ReactApexChart type="bar" height={320} options={options} series={series} />;
}

function WaterTrendChart({
  categories,
  values,
  unitLabel,
}: {
  categories: string[];
  values: number[];
  unitLabel: string;
}) {
  const maxValue = Math.max(1, ...values.map((value) => Number(value || 0)));
  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "Inter, ui-sans-serif, system-ui",
      },
      colors: ["#0B6FAE"],
      stroke: {
        curve: "smooth",
        width: 3,
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.04,
          stops: [0, 90, 100],
        },
      },
      dataLabels: { enabled: false },
      markers: { size: 0 },
      grid: {
        borderColor: "rgba(148,163,184,0.18)",
        strokeDashArray: 4,
        padding: { left: 8, right: 8, bottom: 0 },
      },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { fontSize: "12px", colors: "#94A3B8" },
        },
      },
      yaxis: {
        min: 0,
        max: niceAxisMax(maxValue * 1.15),
        tickAmount: 4,
        labels: {
          formatter: (value) => `${Math.round(value)}`,
          style: { fontSize: "12px", colors: "#94A3B8" },
        },
      },
      legend: { show: false },
      tooltip: {
        y: {
          formatter: (value: number) => `${formatWithComma(value)} ${unitLabel}`,
        },
      },
    }),
    [categories, maxValue, unitLabel]
  );

  return (
    <ReactApexChart
      type="area"
      height={340}
      options={options}
      series={[{ name: "Water volume", data: values }]}
    />
  );
}

function WaterAlertTable({
  rows,
  locale,
  emptyText,
}: {
  rows: WaterAlertRow[];
  locale: string;
  emptyText: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows;
    const lowered = query.toLowerCase();
    return rows.filter((row) =>
      `${row.site} ${row.event} ${row.meter}`.toLowerCase().includes(lowered)
    );
  }, [query, rows]);

  useEffect(() => {
    setPage(1);
  }, [query, rows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );

  return (
    <UtilitySurface>
      <UtilitySectionTitle
        title="Consolidated Alert Log"
        subtitle="Water meter events across this scope"
        right={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search event..."
            className="w-full min-w-[280px] md:w-[320px]"
            inputClassName="!h-11 !rounded-[16px] !border-[#E5ECF5] !bg-[#F8FBFE] !pl-10 !text-sm !text-slate-700 placeholder:!text-[#94A3B8] focus:!ring-[#39B8EE]/15"
          />
        }
      />

      <div className="overflow-x-auto rounded-[18px] border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              <th className="px-5 py-4">No</th>
              <th className="px-5 py-4">Site</th>
              <th className="px-5 py-4">Event</th>
              <th className="px-5 py-4">Meter</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
            {pageRows.length ? (
              pageRows.map((row, index) => (
                <tr key={row.id}>
                  <td className="px-5 py-4">
                    {String((clampedPage - 1) * pageSize + index + 1).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-4">{row.site}</td>
                  <td className="px-5 py-4">{row.event}</td>
                  <td className="px-5 py-4">{row.meter}</td>
                  <td className="px-5 py-4">
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        row.status === "crit"
                          ? "bg-[#FFF1F4] text-[#FF285B]"
                          : row.status === "warn"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700",
                      ].join(" ")}
                    >
                      {row.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {new Date(row.timestamp).toLocaleString(locale)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-5 py-12 text-center text-sm text-slate-400"
                  colSpan={6}
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Page {clampedPage} of {pageCount}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={clampedPage <= 1}
              className="rounded-[12px] border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={clampedPage >= pageCount}
              className="rounded-[12px] border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </UtilitySurface>
  );
}

export default function WaterMeterPanel({ siteCode }: Props) {
  const { t, i18n } = useTranslation("devices");
  const locale = i18n.language?.toLowerCase().startsWith("th") ? "th-TH" : "en-US";
  const { selectedSite, selectedUtility, selectedGroupSite, siteOptions } =
    useFilters();
  const { items: notisItems } = useNotisFeed();

  const normalizedSiteCode = siteCode?.trim();
  const normalizedSelectedSite = selectedSite?.trim();
  const normalizedSiteOptions = useMemo(() => {
    let filtered = siteOptions;
    if (selectedUtility?.id) {
      filtered = filtered.filter((option) => option.utilityId === selectedUtility.id);
    }
    if (selectedGroupSite?.id) {
      filtered = filtered.filter(
        (option) =>
          option.groupId === selectedGroupSite.id ||
          option.groupLabel === selectedGroupSite.label
      );
    }
    return filtered
      .map((option) => (option.value ? String(option.value).trim() : ""))
      .filter(
        (value, index, array) =>
          value && value.toLowerCase() !== "all" && array.indexOf(value) === index
      );
  }, [selectedGroupSite, selectedUtility, siteOptions]);

  const siteTargets = useMemo(() => {
    const targets = new Set<string>();
    if (normalizedSiteCode) targets.add(normalizedSiteCode);
    if (normalizedSelectedSite && normalizedSelectedSite.toLowerCase() !== "all") {
      targets.add(normalizedSelectedSite);
    }
    if (!targets.size || normalizedSelectedSite?.toLowerCase() === "all") {
      normalizedSiteOptions.forEach((value) => targets.add(value));
    }
    if (!targets.size) targets.add(DEFAULT_SITE_CODE);
    return Array.from(targets);
  }, [normalizedSelectedSite, normalizedSiteCode, normalizedSiteOptions]);

  const siteTargetsKey = siteTargets.join("|");
  const [waterItems, setWaterItems] = useState<WaterDeviceRecord[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(OVERVIEW_DEVICE_TAB);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<"30d" | "90d" | "1y">("1y");

  useEffect(() => {
    setWaterItems([]);
    setSelectedDeviceId(OVERVIEW_DEVICE_TAB);
    setLoading(true);
  }, [siteTargetsKey]);

  // Every item carries its own snapshot; the page shows one device or the sum of all in scope.
  // Meters that never reported (no reading timestamp) are left out entirely.
  const itemsWithData = useMemo(
    () => waterItems.filter((item) => !!extractWaterSnapshot(item)?.timestamp),
    [waterItems]
  );
  const deviceOptions = useMemo<DeviceTabOption[]>(
    () =>
      itemsWithData.map((item) => ({
        value: String(item.id),
        label:
          [item.site_name, item.name]
            .filter((part) => typeof part === "string" && part.trim().length > 0)
            .join(" / ") || `#${item.id}`,
        offline: String(item.status || "").toLowerCase() !== "online",
      })),
    [itemsWithData]
  );
  useEffect(() => {
    if (
      selectedDeviceId !== OVERVIEW_DEVICE_TAB &&
      !deviceOptions.some((opt) => opt.value === selectedDeviceId)
    ) {
      setSelectedDeviceId(OVERVIEW_DEVICE_TAB);
    }
  }, [deviceOptions, selectedDeviceId]);
  const location = useLocation();
  // Opened from the IoT list with ?deviceId=…: preselect that device once its option exists.
  const urlDeviceId = useMemo(
    () => new URLSearchParams(location.search).get("deviceId") || "",
    [location.search]
  );
  const appliedUrlDeviceRef = useRef<string>("");
  useEffect(() => {
    if (!urlDeviceId || appliedUrlDeviceRef.current === urlDeviceId) return;
    if (deviceOptions.some((opt) => opt.value === urlDeviceId)) {
      appliedUrlDeviceRef.current = urlDeviceId;
      setSelectedDeviceId(urlDeviceId);
    }
  }, [deviceOptions, urlDeviceId]);

  const snapshot = useMemo(() => {
    const scoped =
      selectedDeviceId === OVERVIEW_DEVICE_TAB
        ? itemsWithData
        : itemsWithData.filter((item) => String(item.id) === selectedDeviceId);
    return mergeWaterSnapshots(
      scoped
        .map((item) => extractWaterSnapshot(item))
        .filter((entry): entry is WaterSnapshot => !!entry)
    );
  }, [itemsWithData, selectedDeviceId]);

  useEffect(() => {
    if (!siteTargets.length) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchDevices = async () => {
      try {
        const aggregated: WaterDeviceRecord[] = [];
        await Promise.all(
          siteTargets.map(async (targetSite) => {
            try {
              const response = await getWaterDevices(targetSite);
              const items: WaterDeviceRecord[] = Array.isArray((response as any)?.items)
                ? ((response as any).items as WaterDeviceRecord[])
                : Array.isArray(response)
                  ? (response as WaterDeviceRecord[])
                  : [];
              aggregated.push(...items);
            } catch (error) {
              console.error("[WaterMeterPanel] failed to load water devices", {
                site: targetSite,
                error,
              });
            }
          })
        );

        if (cancelled) return;

        if (!aggregated.length) {
          setWaterItems([]);
          setLoading(false);
          timer = window.setTimeout(fetchDevices, 5000);
          return;
        }

        setWaterItems(aggregated);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error("[WaterMeterPanel] failed to load water devices", error);
        setLoading(false);
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(fetchDevices, 5000);
        }
      }
    };

    void fetchDevices();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [siteTargetsKey, siteTargets]);

  const domesticSection = snapshot?.domestic ?? {
    ph: null,
    flowRateLpm: null,
    tdsPpm: null,
    consumptionLiters: 0,
  };
  const drinkingSection = snapshot?.drinking ?? {
    ph: null,
    flowRateLpm: null,
    tdsPpm: null,
    consumptionLiters: 0,
  };
  const domesticTotals = snapshot?.totals.domestic ?? ZERO_TOTALS;
  const drinkingTotals = snapshot?.totals.drinking ?? ZERO_TOTALS;

  const domesticLevel = Number(domesticSection.consumptionLiters ?? 0);
  const drinkingLevel = Number(drinkingSection.consumptionLiters ?? 0);
  const totalToday = domesticLevel + drinkingLevel;
  const literUnit = t("devices.waterMeter.literUnit", {
    defaultValue: "L",
  }) as string;
  const domesticWaterLabel = t("devices.waterMeter.domesticWater", {
    defaultValue: "Domestic Water",
  }) as string;
  const drinkingWaterLabel = t("devices.waterMeter.drinkingWater", {
    defaultValue: "Drinking Water",
  }) as string;
  const litersTodayLabel = t("devices.waterMeter.litersToday", {
    unit: literUnit,
    defaultValue: `${literUnit} today`,
  }) as string;
  const monthlyConsumptionSubtitle = t(
    "devices.waterMeter.monthlyConsumptionSubtitle",
    {
      unit: literUnit,
      defaultValue: `Domestic vs Drinking · ${literUnit}`,
    }
  ) as string;
  const waterVolumeTrendSubtitle = t("devices.waterMeter.waterVolumeTrendSubtitle", {
    unit: literUnit,
    defaultValue: `12-month moving average · ${literUnit}`,
  }) as string;

  const syncText = formatLastSync(snapshot?.timestamp ?? null, locale);

  const heroCards = [
    {
      key: "domestic",
      title: domesticWaterLabel,
      value: formatWithComma(domesticLevel),
      subValue: literUnit,
      progress:
        domesticLevel > 0
          ? Math.min(
              100,
              (domesticLevel /
                Math.max(parseMaxLabelNumber(domesticSection.maxLabel) ?? domesticLevel, 1)) *
                100
            )
          : 0,
      accent: "domestic" as const,
      progressColor: "#1D9BF0",
    },
    {
      key: "drinking",
      title: drinkingWaterLabel,
      value: formatWithComma(drinkingLevel),
      subValue: literUnit,
      progress:
        drinkingLevel > 0
          ? Math.min(
              100,
              (drinkingLevel /
                Math.max(parseMaxLabelNumber(drinkingSection.maxLabel) ?? drinkingLevel, 1)) *
                100
            )
          : 0,
      accent: "drinking" as const,
      progressColor: "#0EA5E9",
    },
  ];

  const totalCards = [
    {
      key: "drinking-today",
      label: t("devices.waterMeter.drinkingToday", {
        defaultValue: "Drinking water today",
      }),
      value: `${formatWithComma(drinkingTotals.today)} ${literUnit}`,
      icon: waterDrop,
    },
    {
      key: "drinking-month",
      label: t("devices.waterMeter.drinkingMonth", {
        defaultValue: "Drinking water this month",
      }),
      value: `${formatWithComma(drinkingTotals.month)} ${literUnit}`,
      icon: waterDrop,
    },
    {
      key: "drinking-year",
      label: t("devices.waterMeter.drinkingYear", {
        defaultValue: "Drinking water this year",
      }),
      value: `${formatWithComma(drinkingTotals.year)} ${literUnit}`,
      icon: waterDrop,
    },
    {
      key: "domestic-today",
      label: t("devices.waterMeter.domesticToday", {
        defaultValue: "Domestic water today",
      }),
      value: `${formatWithComma(domesticTotals.today)} ${literUnit}`,
      icon: waterDrop,
    },
    {
      key: "domestic-month",
      label: t("devices.waterMeter.domesticMonth", {
        defaultValue: "Domestic water this month",
      }),
      value: `${formatWithComma(domesticTotals.month)} ${literUnit}`,
      icon: waterDrop,
    },
    {
      key: "domestic-year",
      label: t("devices.waterMeter.domesticYear", {
        defaultValue: "Domestic water this year",
      }),
      value: `${formatWithComma(domesticTotals.year)} ${literUnit}`,
      icon: waterDrop,
    },
  ];

  // A kind with no meter at all is hidden and the other kind's cards take the room. Without kind
  // information from the API both kinds stay visible, as before.
  const showDomestic = snapshot?.kinds ? snapshot.kinds.domestic || !snapshot.kinds.drinking : true;
  const showDrinking = snapshot?.kinds ? snapshot.kinds.drinking : true;
  const showKind = (key: string) => (key.startsWith("drinking") ? showDrinking : showDomestic);
  const visibleHeroCards = heroCards.filter((card) => showKind(card.key));
  const visibleTotalCards = totalCards.filter((card) => showKind(card.key));

  const domesticPhMeta = describePh(domesticSection.ph);
  const drinkingPhMeta = describePh(drinkingSection.ph);
  const metricBands: Array<{
    key: string;
    icon: string;
    value: string;
    unit: string;
    title: string;
    subtitle: string;
    tone: "sky" | "amber";
  }> = [
    {
      key: "domestic-ph",
      icon: phWaterDrop,
      value: formatDecimal(domesticSection.ph, 2),
      unit: "pH",
      title: `${t("devices.waterMeter.domesticWater", {
        defaultValue: "Domestic",
      })} · ${domesticPhMeta.label}`,
      subtitle: t("devices.waterMeter.ph", { defaultValue: "pH" }),
      tone: domesticPhMeta.tone === "amber" ? "amber" : "sky",
    },
    {
      key: "domestic-flow",
      icon: waterIcon,
      value:
        typeof domesticSection.flowRateLpm === "number"
          ? formatWithComma(domesticSection.flowRateLpm, 2)
          : "--",
      unit: "m³/s",
      title: t("devices.waterMeter.flowRate", {
        defaultValue: "Water flow rate",
      }),
      subtitle: t("devices.waterMeter.domesticWater", {
        defaultValue: "Domestic water",
      }),
      tone: "sky" as const,
    },
    {
      key: "drinking-ph",
      icon: phWaterDrop,
      value: formatDecimal(drinkingSection.ph, 2),
      unit: "pH",
      title: `${t("devices.waterMeter.drinkingWater", {
        defaultValue: "Drinking",
      })} · ${drinkingPhMeta.label}`,
      subtitle: t("devices.waterMeter.ph", { defaultValue: "pH" }),
      tone: drinkingPhMeta.tone === "amber" ? "amber" : "sky",
    },
    {
      key: "drinking-tds",
      icon: TDSIcon,
      value:
        typeof drinkingSection.tdsPpm === "number"
          ? formatWithComma(drinkingSection.tdsPpm, 0)
          : "--",
      unit: "ppm",
      title: `TDS · ${describeTds(drinkingSection.tdsPpm)}`,
      subtitle: t("devices.waterMeter.drinkingWater", {
        defaultValue: "Drinking water",
      }),
      tone: "sky" as const,
    },
  ];
  const visibleMetricBands = metricBands.filter(
    (band) => band.value !== "--" && showKind(band.key)
  );

  const fallbackSeriesNames = [
    t("devices.waterMeter.domesticWater", { defaultValue: "Domestic" }),
    t("devices.waterMeter.drinkingWater", { defaultValue: "Drinking" }),
  ];
  const monthlyCategories =
    snapshot?.stacked?.categories?.length
      ? snapshot.stacked.categories
      : snapshot?.usage?.categories?.length
        ? snapshot.usage.categories
        : DEFAULT_MONTH_CATEGORIES;
  const rawMonthlySeries =
    snapshot?.stacked?.series?.length
      ? snapshot.stacked.series
      : snapshot?.usage?.series?.length
        ? snapshot.usage.series
        : [
            { name: fallbackSeriesNames[0], data: Array(monthlyCategories.length).fill(0) },
            { name: fallbackSeriesNames[1], data: Array(monthlyCategories.length).fill(0) },
          ];
  const monthlySeries = rawMonthlySeries.map((entry, index) => ({
    name: normalizeSeriesName(entry.name, index, fallbackSeriesNames),
    data: monthlyCategories.map((_, dataIndex) => Number(entry.data[dataIndex] || 0)),
  }));

  const trendSourceCategories =
    snapshot?.usage?.categories?.length
      ? snapshot.usage.categories
      : monthlyCategories;
  const trendSourceSeries =
    snapshot?.usage?.series?.length ? snapshot.usage.series : monthlySeries;
  const trendWindowSize = resolveScopeWindow(trendRange, trendSourceCategories.length);
  const trendCategories = trendSourceCategories.slice(-trendWindowSize);
  const trendValues = sumSeriesByIndex(
    trendSourceSeries.map((entry) => ({
      name: entry.name,
      data: entry.data.slice(-trendWindowSize),
    })),
    trendCategories.length
  );

  const radialItems = useMemo(() => {
    const labels = snapshot?.radial?.labels ?? [];
    const values = snapshot?.radial?.values ?? [];
    return labels
      .map((label, index) => ({
        label,
        value: `${formatWithComma(values[index] ?? 0)}${
          values[index] ? (values[index] > 100 ? "" : "%") : ""
        }`,
      }))
      .filter((item) => item.label.trim().length > 0)
      .slice(0, 3);
  }, [snapshot?.radial]);

  const snapshotTotalValue = coerceNumber(snapshot?.radial?.total);
  if (
    snapshotTotalValue !== null &&
    snapshotTotalValue > 0 &&
    Math.abs(snapshotTotalValue - totalToday) > 0.5
  ) {
    radialItems.unshift({
      label: "Snapshot total",
      value: `${formatWithComma(snapshotTotalValue)} ${literUnit}`,
    });
  }

  const waterAlertRows = useMemo(() => {
    const scoped = (notisItems || []).filter(
      (item) => matchesSiteTargets(item, siteTargets) && isWaterRelatedNoti(item)
    );
    return scoped
      .sort(
        (a, b) =>
          new Date(b.occurredAt ?? b.createdAt ?? b.date).getTime() -
          new Date(a.occurredAt ?? a.createdAt ?? a.date).getTime()
      )
      .map(toAlertRow);
  }, [notisItems, siteTargets]);

  return (
    <div className="space-y-5">
      <DeviceTabStrip
        title={t("devices.deviceSelector.label", { defaultValue: "Device" })}
        overviewLabel={t("devices.deviceSelector.overview", { defaultValue: "Overview" })}
        emptyText={t("devices.deviceSelector.empty", { defaultValue: "No devices" })}
        loading={loading}
        loadingText={t("devices.deviceSelector.loading", { defaultValue: "Loading devices..." })}
        options={deviceOptions}
        selected={selectedDeviceId}
        onSelect={setSelectedDeviceId}
      />

      <div className={["grid gap-4", gridColsFor(visibleHeroCards.length)].join(" ")}>
        {visibleHeroCards.map((card) => (
          <WaterHeroCard
            key={card.key}
            title={card.title}
            value={card.value}
            subValue={card.subValue}
            progress={card.progress}
            syncText={syncText}
            accent={card.accent}
            progressColor={card.progressColor}
          />
        ))}
      </div>

      <div className={["grid gap-4 md:grid-cols-2", gridColsFor(visibleTotalCards.length)].join(" ")}>
        {visibleTotalCards.map((card) => (
          <WaterStatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
          />
        ))}
      </div>

      <div
        className={["grid gap-4 md:grid-cols-2", gridColsFor(visibleMetricBands.length)].join(" ")}
        hidden={visibleMetricBands.length === 0}
      >
        {visibleMetricBands.map((card) => (
          <WaterMetricBand
            key={card.key}
            icon={card.icon}
            value={card.value}
            unit={card.unit}
            title={card.title}
            subtitle={card.subtitle}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        <UtilitySurface>
          <UtilitySectionTitle
            title="Monthly consumption"
            subtitle={monthlyConsumptionSubtitle}
          />
          <MonthlyConsumptionChart
            categories={monthlyCategories}
            series={monthlySeries}
            unitLabel={literUnit}
          />
        </UtilitySurface>

        <TodayTotalCard
          total={totalToday}
          domestic={domesticLevel}
          drinking={drinkingLevel}
          radialItems={radialItems}
          unitLabel={literUnit}
          totalUnitLabel={litersTodayLabel}
          domesticLabel={domesticWaterLabel}
          drinkingLabel={drinkingWaterLabel}
        />
      </div>

      <UtilitySurface>
        <UtilitySectionTitle
          title="Water volume trend"
          subtitle={waterVolumeTrendSubtitle}
          right={
            <div className="inline-flex overflow-hidden rounded-[16px] border border-slate-200 bg-white">
              {(["30d", "90d", "1y"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTrendRange(range)}
                  className={[
                    "px-4 py-2 text-sm font-semibold transition",
                    trendRange === range
                      ? "bg-white text-slate-900 shadow-[0_6px_18px_rgba(15,23,42,0.10)]"
                      : "bg-slate-50 text-[#64748B] hover:bg-slate-100",
                  ].join(" ")}
                >
                  {range}
                </button>
              ))}
            </div>
          }
        />

        {trendCategories.length && trendValues.some((value) => value !== 0) ? (
          <WaterTrendChart
            categories={trendCategories}
            values={trendValues}
            unitLabel={literUnit}
          />
        ) : (
          <div className="grid h-[340px] place-items-center rounded-[18px] border border-slate-200 bg-slate-50 text-sm text-slate-400">
            <div className="text-center">
              <div>
                {loading
                  ? t("devices.waterMeter.loading", {
                      defaultValue: "Loading water data...",
                    })
                  : t("devices.waterMeter.noData", {
                      defaultValue: "No water meter data for this site yet",
                    })}
              </div>
              {!loading ? <div className="mt-1">{syncText}</div> : null}
            </div>
          </div>
        )}
      </UtilitySurface>

      <WaterAlertTable
        rows={waterAlertRows}
        locale={locale}
        emptyText={t("devices.waterMeter.noAlerts", {
          defaultValue: "No active water meter alerts",
        })}
      />
    </div>
  );
}
