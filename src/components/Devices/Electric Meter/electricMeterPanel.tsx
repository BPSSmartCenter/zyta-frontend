import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ElectricLineBasicChart } from "../../Chart";
import { useFilters } from "../../../context/FiltersContext";
import {
  getElectricOverview,
  getElectricDevices,
} from "../../../features/electric";
import {
  UtilityHeroCard,
  UtilityMetricTile,
  UtilitySectionTitle,
  UtilitySurface,
} from "../../UtilityDashboard/UtilityDashboardLayout";

type Props = {
  siteCode?: string;
  timeRange?: { from: string; to: string };
};

type ComparisonItem = {
  key: string;
  label: string;
  displayDate: string;
  percentage: number;
  percentLabel: string;
  previousKwh: number;
  todayKwh: number;
  series: number[];
};

type DeviceCategory = "INVERTER" | "METER" | "GATEWAY" | "SENSOR";

type ElectricDeviceOption = {
  id: string;
  label: string;
  sn: string;
  category: DeviceCategory;
  siteIdOrCode?: string;
  siteLabel?: string;
  status?: string | null;
};

const DEVICE_CATEGORY_SET: ReadonlySet<DeviceCategory> = new Set([
  "INVERTER",
  "METER",
  "GATEWAY",
  "SENSOR",
]);

const DEFAULT_INVERTER_SN = "7B0C44D5-A0";
const OVERVIEW_DEVICE_ID = "__OVERVIEW__";
const UNGROUPED_GROUP_OPTION_ID = "__UNGROUPED_GROUP__";
const TELEMETRY_CACHE_TTL_MS = 10 * 60 * 1000;

const readSessionJson = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeSessionJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const capped = Math.max(1, Math.floor(limit || 1));
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(capped, items.length) }, async () => {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= items.length) return;
      try {
        const value = await task(items[idx]);
        results[idx] = { status: "fulfilled", value };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function normalizeElectricDeviceOptions(items: any[]): ElectricDeviceOption[] {
  if (!Array.isArray(items)) return [];
  const options: ElectricDeviceOption[] = [];
  for (const item of items) {
    const rawModel = typeof item?.model === "string" ? item.model : "";
    let modelCategory: string | null = null;
    let modelIdentifier: string | null = null;
    if (rawModel.includes(":")) {
      const [left, right] = rawModel.split(":", 2);
      modelCategory = left;
      modelIdentifier = right;
    } else if (rawModel) {
      modelIdentifier = rawModel;
    }
    const detailName = String(item?.meta?.details?.name ?? "");
    const detailModel = String(item?.meta?.details?.model ?? "");
    const gatewayHint = `${detailName} ${detailModel} ${rawModel}`.toUpperCase();
    const forcedGateway =
      gatewayHint.includes("GATEWAY") ||
      gatewayHint.includes("SE1000-CCG") ||
      gatewayHint.includes("SE1000-FFG");

    const rawCategory =
      item?.meta?.deviceCategory ??
      item?.meta?.device_category ??
      item?.category ??
      modelCategory;
    const categoryUpper =
      typeof rawCategory === "string" ? rawCategory.trim().toUpperCase() : "";
    const normalizedCategory = forcedGateway ? "GATEWAY" : categoryUpper;
    if (!DEVICE_CATEGORY_SET.has(normalizedCategory as DeviceCategory)) continue;

    const snCandidates = [
      item?.meta?.details?.serialNumber,
      item?.meta?.details?.sn,
      item?.meta?.details?.raw?.SN,
      item?.sn,
      modelIdentifier,
    ];
    const sn =
      snCandidates
        .map((candidate) =>
          typeof candidate === "string" ? candidate.trim() : ""
        )
        .find((value) => value.length > 0) ?? "";
    if (!sn) continue;

    const labelCandidates = [
      item?.name,
      item?.label,
      item?.meta?.details?.name,
      item?.meta?.details?.model,
      sn,
    ];
    const label =
      labelCandidates
        .map((candidate) =>
          typeof candidate === "string" ? candidate.trim() : ""
        )
        .find((value) => value.length > 0) || `${normalizedCategory} ${sn}`;
    const id =
      typeof item?.id === "string" && item.id.trim().length > 0
        ? item.id
        : `${normalizedCategory}:${sn}`.toUpperCase();

    options.push({
      id,
      label,
      sn,
      category: normalizedCategory as DeviceCategory,
      status: item?.status ?? null,
    });
  }
  return options;
}

function extractInverterNumber(label: string, sn: string): number | null {
  const fromLabel = /inverter\s*([0-9]+)/i.exec(label || "");
  if (fromLabel) return Number(fromLabel[1]);
  const fromSn = /([0-9]+)[^0-9]*$/i.exec(sn || "");
  if (fromSn) return Number(fromSn[1]);
  return null;
}

function formatWithComma(v: number | string) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : v;
}

// ------- helpers สำหรับ time dropdown -------
const formatTime = (h: number, m: number) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = (h % 12 || 12).toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  return `${hh}:${mm} ${ampm}`;
};
const parseTimeLabel = (label?: string) => {
  const fallback = { hours: 0, minutes: 0 };
  if (!label) return fallback;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!match) return fallback;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const ap = match[3].toUpperCase();
  if (ap === "PM" && hours !== 12) hours += 12;
  if (ap === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
};
const to24FromLabel = (label?: string) => {
  const { hours, minutes } = parseTimeLabel(label);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

import { fetchEquipmentTelemetry } from "../../../features/electric";

type DailySeries = {
  key: string;
  date: Date;
  isToday: boolean;
  totalWh: number;
  totalKwh: number;
  halfHourSeries: number[];
};

type DailyTelemetryPoint = {
  timestamp: number;
  totalWh: number;
};

type NormalizedTelemetrySummary = {
  voltageAvg: number;
  currentAvg: number;
  frequencyAvg: number;
  usageKwh: number;
  accumulatedKwh: number;
  productionTodayKwh: number;
  productionMonthKwh: number;
  temperatureC: number | null;
};

type OverviewInverterSummary = {
  deviceId: string;
  label: string;
  sn: string;
  siteIdOrCode?: string;
  siteLabel?: string;
  summary: NormalizedTelemetrySummary;
  halfHourSeries: number[];
};

const HALF_HOUR_SLOTS = Array.from({ length: 24 * 2 }, (_, idx) => {
  const hour = Math.floor(idx / 2);
  const minute = (idx % 2) * 30;
  return {
    hour,
    minute,
    label: `${String(hour).padStart(2, "0")}:${minute === 0 ? "00" : "30"}`,
  };
});

const HALF_HOUR_LABELS = HALF_HOUR_SLOTS.map((slot) => slot.label);

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const formatDateTimeForApi = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

const normalizeTelemetries = (raw: any[]): DailyTelemetryPoint[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const ts = new Date(item?.date ?? 0).getTime();
      const total = Number(item?.totalEnergy ?? 0);
      if (!Number.isFinite(total) || Number.isNaN(ts)) return null;
      return { timestamp: ts, totalWh: total };
    })
    .filter((p): p is DailyTelemetryPoint => !!p && Number.isFinite(p.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);
};

const buildHalfHourSeries = (
  points: DailyTelemetryPoint[],
  dayStart: Date
): number[] => {
  if (!points.length) return HALF_HOUR_SLOTS.map(() => 0);
  const baseline = points[0].totalWh;
  let cursor = 0;
  let latest = baseline;
  return HALF_HOUR_SLOTS.map((slot) => {
    const slotTs = new Date(
      dayStart.getFullYear(),
      dayStart.getMonth(),
      dayStart.getDate(),
      slot.hour,
      slot.minute,
      59,
      999
    ).getTime();
    while (cursor < points.length && points[cursor].timestamp <= slotTs) {
      latest = points[cursor].totalWh;
      cursor += 1;
    }
    const delta = latest - baseline;
    return delta > 0 ? delta / 1000 : 0;
  });
};

const formatWeekdayLabel = (date: Date, locale = "th-TH") =>
  new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);

const formatDateLabel = (date: Date, locale = "th-TH") =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(date);

const sanitizeSeries = (arr: number[]) =>
  arr.map((value) => (Number.isFinite(value) ? Math.round(value) : 0));

const niceAxisMax = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 10;
  const roughStep = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const normalized = roughStep / magnitude;
  const stepBase =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = stepBase * magnitude;
  return Math.max(step, Math.ceil(value / step) * step);
};

const OVERVIEW_CONTRIBUTION_COLORS = [
  "#22A9E0",
  "#67C4F1",
  "#B9E5FB",
  "#F59E0B",
  "#FF7A1A",
  "#10B981",
  "#8B5CF6",
  "#F04444",
  "#14B8A6",
  "#A3E635",
  "#38BDF8",
  "#7DD3FC",
  "#D0EEFF",
  "#F59E0B",
  "#FF7A1A",
];

const toShape = (value: unknown, depth = 0): unknown => {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      sample: value.length ? toShape(value[0], depth + 1) : "empty",
    };
  }
  if (typeof value !== "object") return typeof value;
  if (depth >= 4) return "object";

  const entries = Object.entries(value as Record<string, unknown>);
  return entries.reduce<Record<string, unknown>>((acc, [key, item]) => {
    acc[key] = toShape(item, depth + 1);
    return acc;
  }, {});
};

const logElectricApiPayload = (label: string, payload: unknown) => {
  if (!import.meta.env.DEV || typeof console === "undefined") return;
  console.groupCollapsed(`[ElectricMeterPanel API shape] ${label}`);
  console.log(toShape(payload));
  console.groupEnd();
};

const summarizeTelemetryPayload = (payload: any): NormalizedTelemetrySummary => {
  const summary = payload?.summary ?? null;
  const list: any[] = Array.isArray(payload?.telemetries) ? payload.telemetries : [];
  const t1: any = payload?.telemetryFirst ?? list[0] ?? null;
  const t2: any = payload?.telemetryLast ?? (list.length ? list[list.length - 1] : null);

  if (summary && typeof summary === "object") {
    const temperature =
      summary?.temperatureC === null || summary?.temperatureC === undefined
        ? null
        : Math.round(Number(summary.temperatureC));
    return {
      voltageAvg: Math.round(Number(summary?.voltageAvg ?? 0) || 0),
      currentAvg: Math.round(Number(summary?.currentAvg ?? 0) || 0),
      frequencyAvg: Math.round(Number(summary?.frequencyAvg ?? 0) || 0),
      usageKwh: Math.round(Number(summary?.usageKwh ?? 0) || 0),
      accumulatedKwh: Math.round(Number(summary?.accumulatedKwh ?? 0) || 0),
      productionTodayKwh: Math.round(Number(summary?.productionTodayKwh ?? 0) || 0),
      productionMonthKwh: Math.round(Number(summary?.productionMonthKwh ?? 0) || 0),
      temperatureC:
        typeof temperature === "number" && Number.isFinite(temperature)
          ? temperature
          : null,
    };
  }

  const last: any = t2 || t1 || {};
  const phaseVs = [
    last?.L1Data?.acVoltage,
    last?.L2Data?.acVoltage,
    last?.L3Data?.acVoltage,
  ].filter((v: any) => Number.isFinite(Number(v))) as number[];
  const voltageAvg = phaseVs.length
    ? phaseVs.reduce((a, b) => a + Number(b), 0) / phaseVs.length
    : (([last?.vL1To2, last?.vL2To3, last?.vL3To1]
        .map(Number)
        .filter((n) => Number.isFinite(n)) as number[]).reduce((a, b) => a + b, 0) /
        3) ||
      0;
  const currents = [last?.L1Data?.acCurrent, last?.L2Data?.acCurrent, last?.L3Data?.acCurrent]
    .map(Number)
    .filter((n) => Number.isFinite(n)) as number[];
  const currentAvg = currents.length
    ? currents.reduce((a, b) => a + b, 0) / currents.length
    : 0;
  const freqs = [last?.L1Data?.acFrequency, last?.L2Data?.acFrequency, last?.L3Data?.acFrequency]
    .map(Number)
    .filter((n) => Number.isFinite(n)) as number[];
  const frequencyAvg = freqs.length
    ? freqs.reduce((a, b) => a + b, 0) / freqs.length
    : 0;
  const eFirst = Number(t1?.totalEnergy ?? 0);
  const eLast = Number(t2?.totalEnergy ?? t1?.totalEnergy ?? 0);
  const usageKwh = eLast > eFirst ? (eLast - eFirst) / 1000 : 0;
  const accumulatedKwh = eLast / 1000;
  const tempRaw =
    last?.temperature ??
    last?.Temperature ??
    last?.L1Data?.temperature ??
    last?.L1Data?.Temperature ??
    last?.envTemp ??
    null;
  const temperature =
    tempRaw === null || tempRaw === undefined ? null : Number(tempRaw);

  return {
    voltageAvg: Math.round(voltageAvg),
    currentAvg: Math.round(currentAvg),
    frequencyAvg: Math.round(frequencyAvg),
    usageKwh: Math.round(usageKwh),
    accumulatedKwh: Math.round(accumulatedKwh),
    productionTodayKwh: 0,
    productionMonthKwh: 0,
    temperatureC:
      typeof temperature === "number" && Number.isFinite(temperature)
        ? Math.round(temperature)
        : null,
  };
};

const averagePositive = (
  summaries: NormalizedTelemetrySummary[],
  picker: (summary: NormalizedTelemetrySummary) => number | null
) => {
  const values = summaries
    .map((summary) => picker(summary))
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value > 0
    );
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const sumSummaryField = (
  summaries: NormalizedTelemetrySummary[],
  picker: (summary: NormalizedTelemetrySummary) => number
) =>
  Math.round(
    summaries.reduce((sum, summary) => {
      const value = Number(picker(summary));
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0)
  );

const aggregateTelemetrySummaries = (
  summaries: NormalizedTelemetrySummary[]
): NormalizedTelemetrySummary => {
  const temperatures = summaries
    .map((summary) => summary.temperatureC)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value > 0
    );

  return {
    voltageAvg: averagePositive(summaries, (summary) => summary.voltageAvg),
    currentAvg: averagePositive(summaries, (summary) => summary.currentAvg),
    frequencyAvg: averagePositive(summaries, (summary) => summary.frequencyAvg),
    usageKwh: sumSummaryField(summaries, (summary) => summary.usageKwh),
    accumulatedKwh: sumSummaryField(summaries, (summary) => summary.accumulatedKwh),
    productionTodayKwh: sumSummaryField(
      summaries,
      (summary) => summary.productionTodayKwh
    ),
    productionMonthKwh: sumSummaryField(
      summaries,
      (summary) => summary.productionMonthKwh
    ),
    temperatureC: temperatures.length
      ? Math.round(
          temperatures.reduce((sum, value) => sum + value, 0) / temperatures.length
        )
      : null,
  };
};

export default function ElectricMeterPanel({ siteCode }: Props) {
  const { selectedSite, selectedGroupSite, selectedUtility, siteOptions, date: filtersDate } = useFilters();
  const { t, i18n } = useTranslation("devices");
  const locale = React.useMemo(
    () => (i18n.language?.toLowerCase().startsWith("th") ? "th-TH" : "en-US"),
    [i18n.language]
  );

  const defaultTimeRange = React.useMemo(() => {
    const now = new Date();
    const to = new Date(now);
    to.setSeconds(0, 0);
    const mins = to.getMinutes();
    if (mins >= 30) {
      to.setMinutes(30, 0, 0);
    } else {
      to.setMinutes(0, 0, 0);
    }
    if (to.getTime() > now.getTime()) {
      to.setMinutes(to.getMinutes() - 30);
    }
    const from = new Date(now);
    if (now.getHours() >= 9) {
      from.setHours(9, 0, 0, 0);
    } else {
      // Before 09:00 use midnight->now to avoid querying future windows.
      from.setHours(0, 0, 0, 0);
    }
    const makeLabel = (d: Date) => formatTime(d.getHours(), d.getMinutes());
    return {
      from: makeLabel(from),
      to: makeLabel(to),
    };
  }, []);

  const [fromTime] = useState<string>(defaultTimeRange.from);
  const [toTime] = useState<string>(defaultTimeRange.to);
  const [selectedComparisonKey, setSelectedComparisonKey] = useState<string | null>(
    null
  );
  const [activeChartTab, setActiveChartTab] = useState<"contribution" | "trend">(
    "contribution"
  );
  const [dailySeries, setDailySeries] = useState<DailySeries[]>([]);
  // Compute ISO date range from selected day/time (use selected date)
    const computeRange = React.useCallback(() => {
    const base = (typeof filtersDate === "object" && filtersDate) ? new Date(filtersDate.y, (filtersDate.m||1)-1, filtersDate.d||1) : new Date();
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    const from = `${yyyy}-${mm}-${dd} ${to24FromLabel(fromTime)}:00`;
    const to = `${yyyy}-${mm}-${dd} ${to24FromLabel(toTime)}:00`;
    // Force same-date range even if to < from (per requirement)
    return { from, to };
  }, [fromTime, toTime, filtersDate]);

  // fetched data

  const [metrics, setMetrics] = useState({
    voltage: 0,
    current: 0,
    frequency: 0,
    consumptionKwh: 0,
    lifetimeKwh: 0,
    monthKwh: 0,
  });
  const [temperatureC, setTemperatureC] = useState<number | null>(null);
  // overview-derived values for side cards and max bound
  const [overviewTodayValue, setOverviewTodayValue] = useState<number | null>(null);
  const [overviewMonthValue, setOverviewMonthValue] = useState<number | null>(null);
  const [overviewLifetimeValue, setOverviewLifetimeValue] = useState<number | null>(null);
  const [overviewThreshold90DayKwh, setOverviewThreshold90DayKwh] = useState<number | null>(null);
  const [overviewLastUpdateTime, setOverviewLastUpdateTime] = useState<string | null>(null);
  const [overviewInverterSummaries, setOverviewInverterSummaries] = useState<
    OverviewInverterSummary[]
  >([]);
  const [deviceOptions, setDeviceOptions] = useState<ElectricDeviceOption[]>([]);
  const [deviceOptionsLoading, setDeviceOptionsLoading] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
    OVERVIEW_DEVICE_ID
  );
  const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlDeviceSN = qs?.get("inverterSN") || qs?.get("deviceSn") || undefined;
  const isAllSitesSelected = String(selectedSite || "")
    .trim()
    .toLowerCase() === "all";
  const isUtilitySelected = Boolean(selectedUtility?.id);
  const isGroupSiteSelected = Boolean(selectedGroupSite?.id);
  const isGlobalAllOverview = isAllSitesSelected && !isGroupSiteSelected && !isUtilitySelected;
  const siteLabelByCode = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const option of siteOptions || []) {
      const code = String(option?.value || "").trim();
      if (!code || code.toLowerCase() === "all") continue;
      const label = String(option?.label || code).trim() || code;
      map.set(code, label);
    }
    return map;
  }, [siteOptions]);
  const groupSiteEntries = React.useMemo(() => {
    const map = new Map<string, { label: string; siteCodes: string[] }>();
    const ungrouped: string[] = [];
    for (const option of siteOptions || []) {
      const siteCode = String(option?.value || "").trim();
      if (!siteCode || siteCode.toLowerCase() === "all") continue;
      const groupIdRaw = String(option?.groupId || "").trim();
      const groupLabelRaw = String(option?.groupLabel || "").trim();
      const groupLabel = groupLabelRaw || groupIdRaw;
      if (!groupLabel) {
        ungrouped.push(siteCode);
        continue;
      }
      const groupId = groupIdRaw || groupLabel;
      const key = `${groupId}::${groupLabel}`;
      const existing = map.get(key);
      if (existing) {
        existing.siteCodes.push(siteCode);
      } else {
        map.set(key, { label: groupLabel, siteCodes: [siteCode] });
      }
    }
    const entries = Array.from(map.entries())
      .map(([id, item]) => ({
        id,
        label: item.label,
        siteCodes: Array.from(new Set(item.siteCodes)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "th"));
    if (ungrouped.length > 0) {
      entries.push({
        id: UNGROUPED_GROUP_OPTION_ID,
        label: t("devices.electric.groupSelector.ungrouped", {
          defaultValue: "Ungrouped",
        }),
        siteCodes: Array.from(new Set(ungrouped)),
      });
    }
    return entries;
  }, [siteOptions, t]);
  const allSiteTargets = React.useMemo(() => {
    const values = (siteOptions || [])
      .map((opt) => String(opt?.value || "").trim())
      .filter((value) => value.length > 0 && value.toLowerCase() !== "all");
    return Array.from(new Set(values));
  }, [siteOptions]);
  const siteForApi =
    !isAllSitesSelected && selectedSite
      ? String(selectedSite)
      : siteCode && String(siteCode).trim().length > 0
      ? String(siteCode)
      : allSiteTargets[0] || "3078000";
  // Filter by utility first, then by group
  const utilityScopedTargets = React.useMemo(() => {
    if (!isUtilitySelected) return allSiteTargets;
    const utilId = selectedUtility?.id;
    return (siteOptions || [])
      .filter((opt) => {
        const code = String(opt?.value || "").trim();
        if (!code || code.toLowerCase() === "all") return false;
        return (opt as any)?.utilityId === utilId;
      })
      .map((opt) => String(opt.value).trim());
  }, [isUtilitySelected, selectedUtility, siteOptions, allSiteTargets]);

  const siteTargets = React.useMemo(() => {
    if (!isAllSitesSelected) return [siteForApi];
    if (!selectedGroupSite?.id) return utilityScopedTargets;
    const selectedGroup = groupSiteEntries.find(
      (entry) => entry.id === selectedGroupSite.id || entry.label === selectedGroupSite.label
    );
    return selectedGroup?.siteCodes ?? utilityScopedTargets;
  }, [
    isAllSitesSelected,
    siteForApi,
    selectedGroupSite,
    utilityScopedTargets,
    groupSiteEntries,
  ]);
  const siteTargetsKey = siteTargets.join("|");
  const fallbackDeviceSn = urlDeviceSN || DEFAULT_INVERTER_SN;

  React.useEffect(() => {
    if (isGlobalAllOverview || !siteTargets.length) {
      setDeviceOptions([]);
      setSelectedDeviceId(OVERVIEW_DEVICE_ID);
      setDeviceOptionsLoading(false);
      return;
    }
    let cancelled = false;
    // Immediately reset stale device list while fetching next site's devices.
    setDeviceOptions([]);
    setSelectedDeviceId(OVERVIEW_DEVICE_ID);
    setDeviceOptionsLoading(true);
    (async () => {
      try {
        const settled = await runWithConcurrency(siteTargets, 4, async (siteIdOrCode) => {
          const res = await getElectricDevices(siteIdOrCode);
          logElectricApiPayload("getElectricDevices", {
            siteIdOrCode,
            response: res,
          });
          const items: any[] = Array.isArray((res as any)?.items)
            ? (res as any).items
            : Array.isArray((res as any)?.data?.items)
            ? (res as any).data.items
            : [];
          return { siteIdOrCode, items };
        });
        if (cancelled) return;
        const normalized = settled
          .filter(
            (result): result is PromiseFulfilledResult<{ siteIdOrCode: string; items: any[] }> =>
              result.status === "fulfilled"
          )
          .flatMap((result) => {
            const siteIdOrCode = result.value.siteIdOrCode;
            const siteLabel = siteLabelByCode.get(siteIdOrCode) ?? siteIdOrCode;
            return normalizeElectricDeviceOptions(result.value.items).map((item) => ({
              ...item,
              id: `${siteIdOrCode}::${item.id}`,
              siteIdOrCode,
              siteLabel,
            }));
          });
        const filtered = normalized
          .filter((opt) => opt.category === "INVERTER")
          .sort((a, b) => {
            const bySite = String(a.siteLabel || "").localeCompare(
              String(b.siteLabel || ""),
              "th"
            );
            if (bySite !== 0) return bySite;
            const aNo = extractInverterNumber(a.label, a.sn);
            const bNo = extractInverterNumber(b.label, b.sn);
            if (aNo !== null && bNo !== null && aNo !== bNo) return aNo - bNo;
            const byLabel = String(a.label || "").localeCompare(String(b.label || ""), "th", {
              numeric: true,
            });
            if (byLabel !== 0) return byLabel;
            return a.sn.localeCompare(b.sn, undefined, { numeric: true });
          });
        setDeviceOptions(filtered);
        setSelectedDeviceId((prev) => {
          if (prev === OVERVIEW_DEVICE_ID && !urlDeviceSN) {
            return OVERVIEW_DEVICE_ID;
          }
          if (prev && filtered.some((opt) => opt.id === prev)) return prev;
          const matchSn =
            urlDeviceSN &&
            filtered.find(
              (opt) => opt.sn.toUpperCase() === urlDeviceSN.toUpperCase()
            );
          if (matchSn) return matchSn.id;
          return OVERVIEW_DEVICE_ID;
        });
      } catch {
        if (cancelled) return;
        setDeviceOptions([]);
        setSelectedDeviceId(OVERVIEW_DEVICE_ID);
      } finally {
        if (!cancelled) {
          setDeviceOptionsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [siteTargetsKey, urlDeviceSN, siteLabelByCode, isGlobalAllOverview]);

  const isOverviewSelected = selectedDeviceId === OVERVIEW_DEVICE_ID;

  const selectedDevice = React.useMemo(() => {
    if (!selectedDeviceId || isOverviewSelected) return null;
    return deviceOptions.find((opt) => opt.id === selectedDeviceId) ?? null;
  }, [deviceOptions, selectedDeviceId, isOverviewSelected]);

  const deviceStatusById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of deviceOptions) {
      map.set(opt.id, String(opt.status || "").toLowerCase());
    }
    return map;
  }, [deviceOptions]);
  const deviceSN =
    isOverviewSelected
      ? OVERVIEW_DEVICE_ID
      : (selectedDevice?.sn || fallbackDeviceSn || DEFAULT_INVERTER_SN).trim() ||
        DEFAULT_INVERTER_SN;
  const selectedDeviceSiteForApi = selectedDevice?.siteIdOrCode || siteForApi;
  const deviceCategory = "INVERTER";
  const overviewDeviceOptionsKey = React.useMemo(
    () =>
      deviceOptions
        .map(
          (device) =>
            `${device.siteIdOrCode || siteForApi}:${device.category}:${device.sn}`
        )
        .join("|"),
    [deviceOptions, siteForApi]
  );
  const deviceDropdownOptions = React.useMemo(
    () => {
      const overviewLabel = t("devices.electric.deviceSelector.overview", {
            defaultValue: "Overview",
          });
      return [
        {
          value: OVERVIEW_DEVICE_ID,
          label: overviewLabel,
        },
        ...deviceOptions.map((opt) => {
          const name = (opt.label || "").trim() || opt.sn;
          const sitePrefix =
            isGroupSiteSelected && (opt.siteLabel || opt.siteIdOrCode)
              ? `${opt.siteLabel || opt.siteIdOrCode} / `
              : "";
          return {
            value: opt.id,
            // Use real inverter label from backend (avoid misleading index-based names).
            label: `${sitePrefix}${name} (${opt.sn})`,
          };
        }),
      ];
    },
    [deviceOptions, t, isGroupSiteSelected]
  );
  const [deviceTabsPerPage, setDeviceTabsPerPage] = useState(8);
  React.useEffect(() => {
    const updateTabsPerPage = () => {
      if (typeof window === "undefined") return;
      const width = window.innerWidth;
      if (width >= 1800) {
        setDeviceTabsPerPage(9);
      } else if (width >= 1536) {
        setDeviceTabsPerPage(8);
      } else if (width >= 1280) {
        setDeviceTabsPerPage(7);
      } else if (width >= 1024) {
        setDeviceTabsPerPage(6);
      } else if (width >= 768) {
        setDeviceTabsPerPage(4);
      } else {
        setDeviceTabsPerPage(2);
      }
    };

    updateTabsPerPage();
    window.addEventListener("resize", updateTabsPerPage);
    return () => window.removeEventListener("resize", updateTabsPerPage);
  }, []);
  const selectedDeviceIndex = React.useMemo(
    () =>
      Math.max(
        0,
        deviceDropdownOptions.findIndex((opt) => opt.value === (selectedDeviceId ?? ""))
      ),
    [deviceDropdownOptions, selectedDeviceId]
  );
  const deviceWindowStart = React.useMemo(() => {
    const total = deviceDropdownOptions.length;
    if (total <= deviceTabsPerPage) return 0;
    const half = Math.floor(deviceTabsPerPage / 2);
    const maxStart = Math.max(0, total - deviceTabsPerPage);
    return Math.max(0, Math.min(selectedDeviceIndex - half, maxStart));
  }, [deviceDropdownOptions.length, deviceTabsPerPage, selectedDeviceIndex]);
  const visibleDeviceTabs = React.useMemo(
    () =>
      deviceDropdownOptions.slice(
        deviceWindowStart,
        deviceWindowStart + deviceTabsPerPage
      ),
    [deviceDropdownOptions, deviceTabsPerPage, deviceWindowStart]
  );

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!isOverviewSelected || !deviceOptions.length) {
        if (!active) return;
        setOverviewInverterSummaries([]);
        return;
      }
      try {
        const base =
          typeof filtersDate === "object" && filtersDate
            ? new Date(filtersDate.y, (filtersDate.m || 1) - 1, filtersDate.d || 1)
            : new Date();
        const dayStart = startOfDay(base);
        const dayEnd = endOfDay(base);
        const startTime = formatDateTimeForApi(dayStart);
        const endTime = formatDateTimeForApi(dayEnd);
        const settled = await runWithConcurrency(deviceOptions, 4, async (device) => {
          const res = await fetchEquipmentTelemetry({
            siteIdOrCode: device.siteIdOrCode || siteForApi,
            sn: device.sn,
            startTime,
            endTime,
            category: device.category,
          });
          const payload = (res as any)?.data ?? {};
          const telemetries = normalizeTelemetries(
            Array.isArray(payload?.telemetries) ? payload.telemetries : []
          );
          return {
            deviceId: device.id,
            label: device.label,
            sn: device.sn,
            siteIdOrCode: device.siteIdOrCode,
            siteLabel: device.siteLabel,
            summary: summarizeTelemetryPayload(payload),
            halfHourSeries: buildHalfHourSeries(telemetries, dayStart),
          } as OverviewInverterSummary;
        });
        if (!active) return;
        const normalized = settled
          .filter(
            (result): result is PromiseFulfilledResult<OverviewInverterSummary> =>
              result.status === "fulfilled"
          )
          .map((result) => result.value)
          .sort((a, b) =>
            String(a.label || "").localeCompare(String(b.label || ""), "th", {
              numeric: true,
            })
          );
        setOverviewInverterSummaries(normalized);
      } catch {
        if (!active) return;
        setOverviewInverterSummaries([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [deviceOptions, filtersDate, isOverviewSelected, siteForApi]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const hasUsage = (entries: DailySeries[]) =>
        entries.some(
          (item) =>
            (Number(item.totalWh) || 0) > 0 ||
            item.halfHourSeries.some((v) => Number(v) > 0)
        );
      const fromCachedEntries = (
        entries: Array<{
          key: string;
          dateISO: string;
          isToday: boolean;
          totalWh: number;
          totalKwh: number;
          halfHourSeries: number[];
        }>
      ): DailySeries[] =>
        entries.map((item) => ({
          key: item.key,
          date: new Date(item.dateISO),
          isToday: !!item.isToday,
          totalWh: Number(item.totalWh) || 0,
          totalKwh: Number(item.totalKwh) || 0,
          halfHourSeries: Array.isArray(item.halfHourSeries)
            ? item.halfHourSeries
            : HALF_HOUR_SLOTS.map(() => 0),
        }));

      const daysToFetch = 8; // today + previous 7 days
      if (isOverviewSelected && !isAllSitesSelected && !deviceOptions.length) {
        if (!active) return;
        setDailySeries([]);
        return;
      }
      const todayStart = startOfDay(new Date());
      const rangeStart = new Date(todayStart);
      rangeStart.setDate(rangeStart.getDate() - (daysToFetch - 1));
      const rangeEnd = endOfDay(new Date());
      const rangeStartKey = formatDateTimeForApi(rangeStart).slice(0, 10);
      const rangeEndKey = formatDateTimeForApi(rangeEnd).slice(0, 10);
      const cacheSiteKey =
        isAllSitesSelected && isOverviewSelected
          ? `group:${siteTargetsKey}`
          : selectedDeviceSiteForApi;
      const cacheDeviceKey =
        isOverviewSelected && !isAllSitesSelected
          ? `overview:${overviewDeviceOptionsKey || "pending"}`
          : deviceSN;
      const cacheKey = `db:telemetry-window:${cacheSiteKey}:${cacheDeviceKey}:${rangeStartKey}:${rangeEndKey}`;
      const stickyKey = `db:telemetry-window:sticky:${cacheSiteKey}:${cacheDeviceKey}`;
      const cached = readSessionJson<{
        fetchedAt: number;
        entries: Array<{
          key: string;
          dateISO: string;
          isToday: boolean;
          totalWh: number;
          totalKwh: number;
          halfHourSeries: number[];
        }>;
      }>(cacheKey);
      if (
        cached &&
        typeof cached.fetchedAt === "number" &&
        Date.now() - cached.fetchedAt <= TELEMETRY_CACHE_TTL_MS &&
        Array.isArray(cached.entries)
      ) {
        const mapped = fromCachedEntries(cached.entries);
        const hasAnyUsage = hasUsage(mapped);
        // Ignore stale all-zero cache to avoid locking the 7-day chart at zero.
        if (hasAnyUsage) {
          setDailySeries(mapped);
          return;
        }
        const sticky = readSessionJson<{
          fetchedAt: number;
          entries: Array<{
            key: string;
            dateISO: string;
            isToday: boolean;
            totalWh: number;
            totalKwh: number;
            halfHourSeries: number[];
          }>;
        }>(stickyKey);
        if (sticky && Array.isArray(sticky.entries)) {
          const stickyMapped = fromCachedEntries(sticky.entries);
          if (hasUsage(stickyMapped)) {
            setDailySeries(stickyMapped);
            return;
          }
        }
      }

      try {
        const startTime = formatDateTimeForApi(rangeStart);
        const endTime = formatDateTimeForApi(rangeEnd);
        let points: DailyTelemetryPoint[] = [];
        let aggregatedEntries: DailySeries[] | null = null;
        if (isOverviewSelected && !isAllSitesSelected) {
          const settled = await runWithConcurrency(deviceOptions, 4, async (device) => {
            const res = await fetchEquipmentTelemetry({
              siteIdOrCode: device.siteIdOrCode || siteForApi,
              sn: device.sn,
              startTime,
              endTime,
              category: device.category,
            });
            const list: any[] = (res?.data as any)?.telemetries ?? [];
            return normalizeTelemetries(list);
          });

          const perDevicePoints = settled
            .filter(
              (result): result is PromiseFulfilledResult<DailyTelemetryPoint[]> =>
                result.status === "fulfilled"
            )
            .map((result) => result.value);

          aggregatedEntries = [];
          for (let i = 0; i < daysToFetch; i++) {
            const dayStart = new Date(todayStart);
            dayStart.setDate(dayStart.getDate() - i);
            const dayEnd = endOfDay(dayStart);
            const dayKey = formatDateTimeForApi(dayStart).slice(0, 10);

            const summedHalfHourSeries = HALF_HOUR_SLOTS.map(() => 0);
            let totalWhSum = 0;

            for (const devicePoints of perDevicePoints) {
              const dayPoints = devicePoints.filter(
                (p) => p.timestamp >= dayStart.getTime() && p.timestamp <= dayEnd.getTime()
              );
              const halfHourSeries = buildHalfHourSeries(dayPoints, dayStart);
              for (let j = 0; j < summedHalfHourSeries.length; j++) {
                summedHalfHourSeries[j] += Number(halfHourSeries[j] || 0);
              }

              const totalWh =
                dayPoints.length > 1
                  ? Math.max(
                      0,
                      dayPoints[dayPoints.length - 1].totalWh - dayPoints[0].totalWh
                    )
                  : 0;
              totalWhSum += totalWh;
            }

            const totalKwh = summedHalfHourSeries.length
              ? summedHalfHourSeries[summedHalfHourSeries.length - 1]
              : 0;

            aggregatedEntries.push({
              key: dayKey,
              date: dayStart,
              isToday: i === 0,
              totalWh: totalWhSum,
              totalKwh,
              halfHourSeries: summedHalfHourSeries,
            });
          }
        } else if (isAllSitesSelected && isOverviewSelected) {
          const targets = siteTargets;
          if (!targets.length) {
            aggregatedEntries = [];
          } else {
            // IMPORTANT: do not merge raw cumulative totals by timestamp across sites.
            // Sites report at different timestamps; merging can produce negative deltas and
            // lock the 7-day chart at zeros. Instead, normalize per-site first (baseline per day)
            // then sum the derived half-hour kWh series.
            const settled = await runWithConcurrency(targets, 4, async (siteIdOrCode) => {
              const res = await fetchEquipmentTelemetry({
                siteIdOrCode,
                sn: OVERVIEW_DEVICE_ID,
                startTime,
                endTime,
                category: deviceCategory,
              });
              const list: any[] = (res?.data as any)?.telemetries ?? [];
              return normalizeTelemetries(list);
            });

            const perSitePoints = settled
              .filter(
                (result): result is PromiseFulfilledResult<DailyTelemetryPoint[]> =>
                  result.status === "fulfilled"
              )
              .map((result) => result.value);

            aggregatedEntries = [];
            for (let i = 0; i < daysToFetch; i++) {
              const dayStart = new Date(todayStart);
              dayStart.setDate(dayStart.getDate() - i);
              const dayEnd = endOfDay(dayStart);
              const dayKey = formatDateTimeForApi(dayStart).slice(0, 10);

              const summedHalfHourSeries = HALF_HOUR_SLOTS.map(() => 0);
              let totalWhSum = 0;

              for (const sitePoints of perSitePoints) {
                const dayPoints = sitePoints.filter(
                  (p) => p.timestamp >= dayStart.getTime() && p.timestamp <= dayEnd.getTime()
                );
                const halfHourSeries = buildHalfHourSeries(dayPoints, dayStart);
                for (let j = 0; j < summedHalfHourSeries.length; j++) {
                  summedHalfHourSeries[j] += Number(halfHourSeries[j] || 0);
                }

                const totalWh =
                  dayPoints.length > 1
                    ? Math.max(
                        0,
                        dayPoints[dayPoints.length - 1].totalWh - dayPoints[0].totalWh
                      )
                    : 0;
                totalWhSum += totalWh;
              }

              const totalKwh = summedHalfHourSeries.length
                ? summedHalfHourSeries[summedHalfHourSeries.length - 1]
                : 0;

              aggregatedEntries.push({
                key: dayKey,
                date: dayStart,
                isToday: i === 0,
                totalWh: totalWhSum,
                totalKwh,
                halfHourSeries: summedHalfHourSeries,
              });
            }
          }
        } else {
          const res = await fetchEquipmentTelemetry({
            siteIdOrCode: selectedDeviceSiteForApi,
            sn: deviceSN,
            startTime,
            endTime,
            category: deviceCategory,
          });
          const list: any[] = (res?.data as any)?.telemetries ?? [];
          points = normalizeTelemetries(list);
        }
        const entries: DailySeries[] = aggregatedEntries
          ? aggregatedEntries
          : (() => {
              const out: DailySeries[] = [];
              for (let i = 0; i < daysToFetch; i++) {
                const dayStart = new Date(todayStart);
                dayStart.setDate(dayStart.getDate() - i);
                const dayEnd = endOfDay(dayStart);
                const dayKey = formatDateTimeForApi(dayStart).slice(0, 10);
                const dayPoints = points.filter(
                  (p) => p.timestamp >= dayStart.getTime() && p.timestamp <= dayEnd.getTime()
                );
                const halfHourSeries = buildHalfHourSeries(dayPoints, dayStart);
                const totalWh =
                  dayPoints.length > 1
                    ? Math.max(
                        0,
                        dayPoints[dayPoints.length - 1].totalWh - dayPoints[0].totalWh
                      )
                    : 0;
                const totalKwh = halfHourSeries.length
                  ? halfHourSeries[halfHourSeries.length - 1]
                  : 0;
                out.push({
                  key: dayKey,
                  date: dayStart,
                  isToday: i === 0,
                  totalWh,
                  totalKwh,
                  halfHourSeries,
                });
              }
              return out;
            })();
        entries.sort((a, b) => b.date.getTime() - a.date.getTime());
        if (!active) return;
        const usable = hasUsage(entries);
        if (usable) {
          setDailySeries(entries);
        } else {
          const sticky = readSessionJson<{
            fetchedAt: number;
            entries: Array<{
              key: string;
              dateISO: string;
              isToday: boolean;
              totalWh: number;
              totalKwh: number;
              halfHourSeries: number[];
            }>;
          }>(stickyKey);
          if (sticky && Array.isArray(sticky.entries)) {
            const stickyMapped = fromCachedEntries(sticky.entries);
            if (hasUsage(stickyMapped)) {
              setDailySeries(stickyMapped);
            } else {
              setDailySeries(entries);
            }
          } else {
            setDailySeries(entries);
          }
        }
        writeSessionJson(cacheKey, {
          fetchedAt: Date.now(),
          entries: entries.map((item) => ({
            key: item.key,
            dateISO: item.date.toISOString(),
            isToday: item.isToday,
            totalWh: item.totalWh,
            totalKwh: item.totalKwh,
            halfHourSeries: item.halfHourSeries,
          })),
        });
        if (usable) {
          writeSessionJson(stickyKey, {
            fetchedAt: Date.now(),
            entries: entries.map((item) => ({
              key: item.key,
              dateISO: item.date.toISOString(),
              isToday: item.isToday,
              totalWh: item.totalWh,
              totalKwh: item.totalKwh,
              halfHourSeries: item.halfHourSeries,
            })),
          });
        }
      } catch {
        if (!active) return;
        const sticky = readSessionJson<{
          fetchedAt: number;
          entries: Array<{
            key: string;
            dateISO: string;
            isToday: boolean;
            totalWh: number;
            totalKwh: number;
            halfHourSeries: number[];
          }>;
        }>(stickyKey);
        if (sticky && Array.isArray(sticky.entries)) {
          const stickyMapped = fromCachedEntries(sticky.entries);
          if (hasUsage(stickyMapped)) {
            setDailySeries(stickyMapped);
            return;
          }
        }
        const empty = Array.from({ length: daysToFetch }, (_, i) => {
          const dayStart = new Date(todayStart);
          dayStart.setDate(dayStart.getDate() - i);
          return {
            key: formatDateTimeForApi(dayStart).slice(0, 10),
            date: dayStart,
            isToday: i === 0,
            totalWh: 0,
            totalKwh: 0,
            halfHourSeries: HALF_HOUR_SLOTS.map(() => 0),
          } as DailySeries;
        });
        empty.sort((a, b) => b.date.getTime() - a.date.getTime());
        setDailySeries(empty);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    deviceSN,
    deviceCategory,
    deviceOptions,
    isAllSitesSelected,
    isOverviewSelected,
    overviewDeviceOptionsKey,
    siteForApi,
    siteTargetsKey,
    selectedDeviceSiteForApi,
  ]);

  const todaySeriesData = React.useMemo(
    () => dailySeries.find((item) => item.isToday) ?? null,
    [dailySeries]
  );
  const comparisonItems = React.useMemo<ComparisonItem[]>(() => {
    const today = dailySeries.find((item) => item.isToday);
    if (!today) return [];

    const todayKwh = today.totalKwh;

    const ranked = dailySeries
      .filter((item) => !item.isToday)
      .map((item) => {
        const previousKwh = item.totalKwh;
        const ratio = previousKwh > 0 ? todayKwh / previousKwh : 0;
        const cappedPercent = Math.max(0, Math.min(100, ratio * 100));
        return {
          key: item.key,
          label: formatWeekdayLabel(item.date, locale),
          displayDate: formatDateLabel(item.date, locale),
          percentage: cappedPercent,
          previousKwh,
          todayKwh,
          series: item.halfHourSeries,
          date: item.date,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return ranked.map(({ date, percentage, ...rest }) => {
      const formattedPercent = Number.isFinite(percentage)
        ? `${percentage.toFixed(0)}%`
        : "-";
      return {
        ...rest,
        percentage,
        percentLabel: formattedPercent,
      };
    });
  }, [dailySeries, locale]);

  React.useEffect(() => {
    if (!comparisonItems.length) {
      setSelectedComparisonKey(null);
      return;
    }
    setSelectedComparisonKey((prev) => {
      if (prev && comparisonItems.some((item) => item.key === prev)) {
        return prev;
      }
      return comparisonItems[0]?.key ?? null;
    });
  }, [comparisonItems]);

  React.useEffect(() => {
    if (!isOverviewSelected && activeChartTab !== "trend") {
      setActiveChartTab("trend");
    }
  }, [activeChartTab, isOverviewSelected]);

  const selectedComparison = React.useMemo(
    () => comparisonItems.find((item) => item.key === selectedComparisonKey) ?? null,
    [comparisonItems, selectedComparisonKey]
  );

  const chartCategories = React.useMemo(() => HALF_HOUR_LABELS, []);

  const chartSeriesData = React.useMemo(() => {
    const todaySeries = todaySeriesData?.halfHourSeries ?? HALF_HOUR_SLOTS.map(() => 0);
    const baseSeries = [{
      name: t("devices.electric.chart.today", { defaultValue: "Today" }),
      data: sanitizeSeries(todaySeries),
    }];

    if (!selectedComparison) {
      return baseSeries;
    }

    return [
      baseSeries[0],
      {
        name: `${selectedComparison.label} ${selectedComparison.displayDate}`.trim(),
        data: sanitizeSeries(selectedComparison.series),
      },
    ];
  }, [selectedComparison, t, todaySeriesData]);

  React.useEffect(() => {
    (async () => {
      try {
        const range = computeRange();
        console.debug("[FE] fetch equipment", {
          siteForApi,
          isAllSitesSelected,
          siteTargets,
          sn: deviceSN,
          category: deviceCategory,
          range,
        });
        let res: any = null;
        if (isOverviewSelected && !isAllSitesSelected) {
          if (!deviceOptions.length) {
            setMetrics({
              voltage: 0,
              current: 0,
              frequency: 0,
              consumptionKwh: 0,
              lifetimeKwh: 0,
              monthKwh: 0,
            });
            setTemperatureC(null);
            return;
          }
          const settled = await runWithConcurrency(deviceOptions, 4, async (device) => {
            const response = await fetchEquipmentTelemetry({
              siteIdOrCode: device.siteIdOrCode || siteForApi,
              sn: device.sn,
              startTime: range.from,
              endTime: range.to,
              category: device.category,
            });
            const payload = (response as any)?.data ?? {};
            return summarizeTelemetryPayload(payload);
          });
          const summaries = settled
            .filter(
              (item): item is PromiseFulfilledResult<NormalizedTelemetrySummary> =>
                item.status === "fulfilled"
            )
            .map((item) => item.value);
          res = {
            data: {
              summary: aggregateTelemetrySummaries(summaries),
              telemetries: [],
            },
          };
          logElectricApiPayload("fetchEquipmentTelemetry(single-site overview aggregated)", {
            deviceCount: deviceOptions.length,
            summaries,
            response: res,
          });
        } else if (isAllSitesSelected && isOverviewSelected) {
          const targets = siteTargets;
          const settled = await runWithConcurrency(targets, 4, async (siteIdOrCode) =>
            fetchEquipmentTelemetry({
              siteIdOrCode,
              sn: OVERVIEW_DEVICE_ID,
              startTime: range.from,
              endTime: range.to,
              category: deviceCategory,
            })
          );
          logElectricApiPayload("fetchEquipmentTelemetry(all-sites overview settled)", settled);
          const summaries = settled
            .filter(
              (item): item is PromiseFulfilledResult<any> =>
                item.status === "fulfilled"
            )
            .map((item) => (item.value as any)?.data?.summary)
            .filter((summary) => summary && typeof summary === "object");
          const sum = (items: any[], picker: (x: any) => number) =>
            items.reduce((acc, cur) => acc + picker(cur), 0);
          const numOrNaN = (value: unknown) =>
            value === null || value === undefined ? Number.NaN : Number(value);
          const weightedAvg = (
            items: any[],
            picker: (x: any) => number,
            weightPicker: (x: any) => number,
            valueValidator?: (value: number) => boolean
          ): number | null => {
            let valueSum = 0;
            let weightSum = 0;
            for (const item of items) {
              const value = picker(item);
              if (!Number.isFinite(value)) continue;
              if (valueValidator && !valueValidator(value)) continue;
              const weight = Number(weightPicker(item));
              if (!Number.isFinite(weight) || weight <= 0) continue;
              valueSum += value * weight;
              weightSum += weight;
            }
            return weightSum > 0 ? valueSum / weightSum : null;
          };
          const voltageAvg = weightedAvg(
            summaries,
            (s) => numOrNaN(s?.voltageAvg),
            (s) => Number(s?.partialData?.invertersWithTelemetry ?? 0),
            (v) => v > 0
          );
          const currentAvg = weightedAvg(
            summaries,
            (s) => numOrNaN(s?.currentAvg),
            (s) => Number(s?.partialData?.invertersWithTelemetry ?? 0),
            (v) => v > 0
          );
          const frequencyAvg = weightedAvg(
            summaries,
            (s) => numOrNaN(s?.frequencyAvg),
            (s) => Number(s?.partialData?.invertersWithTelemetry ?? 0),
            (v) => v > 0
          );
          const temperatureAvg = weightedAvg(
            summaries,
            (s) => numOrNaN(s?.temperatureC),
            (s) => Number(s?.partialData?.invertersWithTelemetry ?? 0),
            (v) => v > 0
          );
          const aggregatedSummary = {
            usageKwh: sum(summaries, (s) => Number(s?.usageKwh ?? 0) || 0),
            accumulatedKwh: sum(
              summaries,
              (s) => Number(s?.accumulatedKwh ?? 0) || 0
            ),
            productionTodayKwh: sum(
              summaries,
              (s) => Number(s?.productionTodayKwh ?? 0) || 0
            ),
            productionMonthKwh: sum(
              summaries,
              (s) => Number(s?.productionMonthKwh ?? 0) || 0
            ),
            voltageAvg: voltageAvg ?? 0,
            currentAvg: currentAvg ?? 0,
            frequencyAvg: frequencyAvg ?? 0,
            temperatureC: temperatureAvg,
          };
          res = { data: { summary: aggregatedSummary, telemetries: [] } };
          logElectricApiPayload("fetchEquipmentTelemetry(all-sites overview aggregated)", res);
        } else {
          res = await fetchEquipmentTelemetry({
            siteIdOrCode: selectedDeviceSiteForApi,
            sn: deviceSN,
            startTime: range.from,
            endTime: range.to,
            category: deviceCategory,
          });
          logElectricApiPayload("fetchEquipmentTelemetry(single device)", {
            siteIdOrCode: selectedDeviceSiteForApi,
            sn: deviceSN,
            range,
            response: res,
          });
        }
        const payload: any = (res as any)?.data ?? {};
        logElectricApiPayload("fetchEquipmentTelemetry(payload.data)", payload);
        const list: any[] = payload?.telemetries ?? [];
        console.debug("[FE] rangeRes", { count: list.length });
        const summary = summarizeTelemetryPayload(payload);
        logElectricApiPayload("fetchEquipmentTelemetry(summary)", summary);
        setMetrics((m) => ({
          ...m,
          voltage: summary.voltageAvg,
          current: summary.currentAvg,
          frequency: summary.frequencyAvg,
          consumptionKwh: summary.usageKwh,
          lifetimeKwh: summary.accumulatedKwh,
        }));
        setTemperatureC(
          typeof summary.temperatureC === "number" && Number.isFinite(summary.temperatureC)
            ? Math.round(summary.temperatureC)
            : null
        );
        if (!isOverviewSelected) {
          setOverviewTodayValue(
            Number.isFinite(summary.productionTodayKwh)
              ? Math.round(summary.productionTodayKwh)
              : null
          );
          setOverviewMonthValue(
            Number.isFinite(summary.productionMonthKwh)
              ? Math.round(summary.productionMonthKwh)
              : null
          );
          if (Number.isFinite(summary.productionMonthKwh)) {
            setMetrics((m) => ({ ...m, monthKwh: Math.round(summary.productionMonthKwh) }));
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [
    computeRange,
    deviceSN,
    deviceCategory,
    deviceOptions,
    isOverviewSelected,
    isAllSitesSelected,
    overviewDeviceOptionsKey,
    siteForApi,
    siteTargetsKey,
    selectedDeviceSiteForApi,
  ]);
  // Fetch threshold baseline (avg year/day * 90%) for the selected site.
  React.useEffect(() => {
    let active = true;
    (async () => {
      if (isAllSitesSelected) {
        if (!active) return;
        setOverviewThreshold90DayKwh(null);
        return;
      }
      try {
        const resp = await getElectricOverview(siteForApi);
        logElectricApiPayload("getElectricOverview(threshold)", {
          siteForApi,
          response: resp,
        });
        const data = (resp as any)?.data ?? resp ?? {};
        const threshold = Number(data?.threshold_90_day_kwh);
        if (!active) return;
        setOverviewThreshold90DayKwh(Number.isFinite(threshold) ? threshold : null);
      } catch {
        if (!active) return;
        setOverviewThreshold90DayKwh(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAllSitesSelected, siteForApi]);

  // Overview side cards come from backend aggregate only.
  React.useEffect(() => {
    let active = true;
    (async () => {
      if (isOverviewSelected) {
        try {
          let data: any = {};
          if (isAllSitesSelected) {
            const settled = await runWithConcurrency(siteTargets, 4, async (siteIdOrCode) =>
              getElectricOverview(siteIdOrCode)
            );
            logElectricApiPayload("getElectricOverview(all-sites settled)", settled);
            const rows = settled
              .filter(
                (item): item is PromiseFulfilledResult<any> =>
                  item.status === "fulfilled"
              )
              .map((item) => (item.value as any)?.data ?? item.value ?? {});
            const sumField = (key: string) =>
              rows.reduce((acc, row) => acc + (Number(row?.[key] ?? 0) || 0), 0);
            data = {
              today_kwh: sumField("today_kwh"),
              month_kwh: sumField("month_kwh"),
              lifetime_kwh: sumField("lifetime_kwh"),
            };
            logElectricApiPayload("getElectricOverview(all-sites aggregated)", data);
          } else {
            const resp = await getElectricOverview(siteForApi);
            logElectricApiPayload("getElectricOverview(single site)", {
              siteForApi,
              response: resp,
            });
            data = (resp as any)?.data ?? resp ?? {};
          }
          logElectricApiPayload("getElectricOverview(normalized data)", data);
          if (!active) return;
          const today = Number(data?.today_kwh);
          const month = Number(data?.month_kwh);
          const lifetime = Number(data?.lifetime_kwh);
          setOverviewTodayValue(Number.isFinite(today) ? Math.round(today) : null);
          setOverviewMonthValue(Number.isFinite(month) ? Math.round(month) : null);
          setOverviewLifetimeValue(
            Number.isFinite(lifetime) ? Math.round(lifetime) : null
          );
          // keep threshold in sync when overview is fetched here too
          const threshold = Number(data?.threshold_90_day_kwh);
          setOverviewThreshold90DayKwh(Number.isFinite(threshold) ? threshold : null);
          if (typeof data?.lastUpdateTime === "string") setOverviewLastUpdateTime(data.lastUpdateTime);
          if (Number.isFinite(month)) {
            setMetrics((m) => ({ ...m, monthKwh: Math.round(month) }));
          }
        } catch {
          if (!active) return;
          setOverviewTodayValue(null);
          setOverviewMonthValue(null);
          setOverviewLifetimeValue(null);
          setOverviewThreshold90DayKwh(null);
        }
        return;
      }
      if (!active) return;
      setOverviewTodayValue(null);
      setOverviewMonthValue(null);
      setOverviewLifetimeValue(null);
      setOverviewThreshold90DayKwh(null);
    })();
    return () => {
      active = false;
    };
  }, [
    siteForApi,
    deviceSN,
    deviceCategory,
    isOverviewSelected,
    isAllSitesSelected,
    siteTargetsKey,
  ]);

  const selectedGroupLabel = React.useMemo(() => {
    if (!isAllSitesSelected) {
      return t("navbar.allSites", { ns: "dashboard", defaultValue: "All Sites" });
    }
    const parts: string[] = [];
    if (selectedUtility?.label) parts.push(selectedUtility.label);
    if (selectedGroupSite?.label) parts.push(selectedGroupSite.label);
    if (parts.length > 0) return parts.join(" › ");
    return t("navbar.allSites", { ns: "dashboard", defaultValue: "All Sites" });
  }, [isAllSitesSelected, selectedUtility, selectedGroupSite, t]);
  const overviewInverterAggregate = React.useMemo(() => {
    return overviewInverterSummaries.reduce(
      (acc, item) => {
        const seriesTodayKwh = item.halfHourSeries.length
          ? Number(item.halfHourSeries[item.halfHourSeries.length - 1] || 0)
          : 0;
        acc.todayKwh += Number(
          item.summary.productionTodayKwh || seriesTodayKwh || item.summary.usageKwh || 0
        );
        acc.monthKwh += Number(item.summary.productionMonthKwh || 0);
        acc.lifetimeKwh += Number(item.summary.accumulatedKwh || 0);
        return acc;
      },
      { todayKwh: 0, monthKwh: 0, lifetimeKwh: 0 }
    );
  }, [overviewInverterSummaries]);
  const overviewContributionLegend = React.useMemo(
    () =>
      overviewInverterSummaries.map((item, index) => ({
        name: item.label,
        color:
          OVERVIEW_CONTRIBUTION_COLORS[
            index % OVERVIEW_CONTRIBUTION_COLORS.length
          ],
      })),
    [overviewInverterSummaries]
  );
  const overviewContributionColumns = React.useMemo(() => {
    const columns = HALF_HOUR_LABELS.map((label, index) => {
      const bars = overviewInverterSummaries
        .map((item, inverterIndex) => {
          const value = Number(item.halfHourSeries[index] || 0);
          return {
            name: item.label,
            value,
            color:
              OVERVIEW_CONTRIBUTION_COLORS[
                inverterIndex % OVERVIEW_CONTRIBUTION_COLORS.length
              ],
          };
        });
      const maxValue = bars.reduce((max, item) => Math.max(max, item.value), 0);
      return { label, bars, maxValue };
    });
    const maxValue = columns.reduce(
      (max, column) => Math.max(max, column.maxValue),
      0
    );
    return {
      columns,
      maxValue,
    };
  }, [overviewInverterSummaries]);
  const overviewContributionAxis = React.useMemo(() => {
    const max = niceAxisMax(overviewContributionColumns.maxValue * 1.1);
    const ticks = Array.from({ length: 5 }, (_, index) => {
      const value = max - (max / 4) * index;
      return {
        value,
        label: formatWithComma(Math.round(value)),
      };
    });
    return { max, ticks };
  }, [overviewContributionColumns.maxValue]);
  const sideCardTodayValue =
    isOverviewSelected && overviewInverterSummaries.length
      ? Math.round(overviewInverterAggregate.todayKwh)
      : overviewTodayValue !== null && overviewTodayValue !== undefined
      ? overviewTodayValue
      : metrics.consumptionKwh;
  const sideCardMonthValue =
    isOverviewSelected && overviewInverterSummaries.length
      ? Math.round(overviewInverterAggregate.monthKwh)
      : overviewMonthValue !== null && overviewMonthValue !== undefined
      ? overviewMonthValue
      : metrics.monthKwh;
  const sideCardLifetimeValue =
    isOverviewSelected && overviewInverterSummaries.length
      ? Math.round(overviewInverterAggregate.lifetimeKwh)
      : overviewLifetimeValue ?? metrics.lifetimeKwh;
  const hasTemperature = typeof temperatureC === "number" && Number.isFinite(temperatureC);
  const temperatureValue = hasTemperature ? Math.round(Number(temperatureC)) : 0;
  const temperatureDisplay = hasTemperature
    ? undefined
    : t("devices.electric.noData", { defaultValue: "No data" });

  const utilizationPercent = React.useMemo(() => {
    const baseline =
      typeof overviewThreshold90DayKwh === "number" && overviewThreshold90DayKwh > 0
        ? overviewThreshold90DayKwh
        : Math.max(1, Number(sideCardMonthValue || 0));
    const current = Number(sideCardTodayValue || 0);
    return Math.max(0, Math.min(100, Math.round((current / baseline) * 100)));
  }, [overviewThreshold90DayKwh, sideCardMonthValue, sideCardTodayValue]);

  const temperaturePercent = React.useMemo(() => {
    if (!hasTemperature) return 0;
    return Math.max(0, Math.min(100, Math.round((temperatureValue / 60) * 100)));
  }, [hasTemperature, temperatureValue]);

  const metricTiles = React.useMemo(
    () => [
      {
        key: "voltage",
        label: t("devices.electric.cards.voltage", { defaultValue: "Voltage" }),
        value: `${formatWithComma(metrics.voltage)} V`,
        tone: "amber" as const,
        accent: <BoltIcon />,
      },
      {
        key: "consumption",
        label: t("devices.electric.cards.consumption", {
          defaultValue: "Power consumption",
        }),
        value: `${formatWithComma(metrics.consumptionKwh)} kWh`,
        tone: "orange" as const,
        accent: <PulseIcon />,
      },
      {
        key: "accumulated",
        label: t("devices.electric.cards.accumulated", {
          defaultValue: "Accumulated power",
        }),
        value: `${formatWithComma(metrics.lifetimeKwh)} kWh`,
        tone: "amber" as const,
        accent: <MeterIcon />,
      },
      {
        key: "current",
        label: t("devices.electric.cards.current", { defaultValue: "Current" }),
        value: `${formatWithComma(metrics.current)} A`,
        tone: "orange" as const,
        accent: <CurrentIcon />,
      },
      {
        key: "frequency",
        label: t("devices.electric.cards.frequency", { defaultValue: "Frequency" }),
        value: `${formatWithComma(metrics.frequency)} Hz`,
        tone: "slate" as const,
        accent: <WaveIcon />,
      },
    ],
    [metrics, t]
  );

  const summaryTiles = React.useMemo(
    () => [
      {
        key: "today",
        label: t("devices.electric.side.today", { defaultValue: "Today's consumption" }),
        value: `${formatWithComma(sideCardTodayValue ?? 0)} kWh`,
      },
      {
        key: "month",
        label: t("devices.electric.side.month", { defaultValue: "This month's consumption" }),
        value: `${formatWithComma(sideCardMonthValue ?? 0)} kWh`,
      },
      {
        key: "lifetime",
        label: t("devices.electric.cards.accumulated", { defaultValue: "Accumulated power" }),
        value: `${formatWithComma(sideCardLifetimeValue)} kWh`,
      },
    ],
    [sideCardLifetimeValue, sideCardMonthValue, sideCardTodayValue, t]
  );

  return (
    <>
      <div className="mt-6 space-y-4">
        <UtilitySurface>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {isGlobalAllOverview
                    ? t("devices.electric.deviceSelector.overview", {
                        defaultValue: "Overview",
                      })
                    : t("devices.electric.deviceSelector.label", {
                        defaultValue: "Device",
                      })}
                </span>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {isGlobalAllOverview ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                      {t("navbar.allSites", {
                        ns: "dashboard",
                        defaultValue: "All Sites",
                      })}
                    </span>
                  ) : (
                    <div className="min-w-0 flex-1">
                      {deviceDropdownOptions.length > 0 ? (
                        <div className="flex items-center gap-3">
                          <div className="inline-flex shrink-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDeviceId(deviceDropdownOptions[0]?.value ?? null)
                              }
                              disabled={selectedDeviceIndex <= 0}
                              className="grid h-11 w-11 place-items-center border-r border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label="First device"
                            >
                              <span className="material-icons text-[20px]">
                                keyboard_double_arrow_left
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDeviceId(
                                  deviceDropdownOptions[Math.max(0, selectedDeviceIndex - 1)]
                                    ?.value ?? null
                                )
                              }
                              disabled={selectedDeviceIndex <= 0}
                              className="grid h-11 w-11 place-items-center text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label="Previous device"
                            >
                              <span className="material-icons text-[20px]">chevron_left</span>
                            </button>
                          </div>

                          <div className="flex min-w-0 flex-1 items-center justify-center">
                            <div className="flex min-w-0 flex-1 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
                            {visibleDeviceTabs.map((opt) => {
                              const active = (selectedDeviceId ?? "") === opt.value;
                              const status = deviceStatusById.get(opt.value);
                              const isOfflineOpt = status === "offline";
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setSelectedDeviceId(opt.value || null)}
                                  className={[
                                    "inline-flex min-w-0 flex-1 items-center justify-center gap-2 border-r border-slate-200 px-4 py-3 text-sm font-medium transition cursor-pointer last:border-r-0",
                                    active
                                      ? "bg-[#4A90E2] text-white"
                                      : "bg-white text-slate-600 hover:bg-slate-50",
                                    isOfflineOpt && !active ? "text-rose-600" : "",
                                  ].join(" ")}
                                  title={opt.label}
                                >
                                  <span className="truncate">{opt.label}</span>
                                  {isOfflineOpt ? (
                                    <span
                                      className={`inline-flex h-2.5 w-2.5 rounded-full ${
                                        active ? "bg-white/90" : "bg-rose-500"
                                      }`}
                                    />
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                          </div>

                          <div className="inline-flex shrink-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDeviceId(
                                  deviceDropdownOptions[
                                    Math.min(
                                      deviceDropdownOptions.length - 1,
                                      selectedDeviceIndex + 1
                                    )
                                  ]?.value ?? null
                                )
                              }
                              disabled={selectedDeviceIndex >= deviceDropdownOptions.length - 1}
                              className="grid h-11 w-11 place-items-center border-r border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label="Next device"
                            >
                              <span className="material-icons text-[20px]">chevron_right</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDeviceId(
                                  deviceDropdownOptions[deviceDropdownOptions.length - 1]
                                    ?.value ?? null
                                )
                              }
                              disabled={selectedDeviceIndex >= deviceDropdownOptions.length - 1}
                              className="grid h-11 w-11 place-items-center text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label="Last device"
                            >
                              <span className="material-icons text-[20px]">
                                keyboard_double_arrow_right
                              </span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-400">
                          {deviceOptionsLoading
                            ? t("devices.electric.loadingDevices", {
                                defaultValue: "Loading devices...",
                              })
                            : t("devices.electric.deviceSelector.emptyShort", {
                                defaultValue: "No devices",
                              })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {!isGlobalAllOverview &&
                !deviceOptionsLoading &&
                deviceOptions.length === 0 ? (
                  <p className="text-sm text-rose-500">
                    {isGroupSiteSelected
                      ? t("devices.electric.noDevicesForGroup", {
                          defaultValue: "No electric devices found in this group",
                        })
                      : t("devices.electric.noDevices", {
                          defaultValue: "No electric devices found for this site",
                        })}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </UtilitySurface>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.95fr]">
          <UtilityHeroCard
            eyebrow={t("devices.electric.cards.consumption", {
              defaultValue: "Power consumption",
            })}
            title={t("devices.electric.cards.utilization", {
              defaultValue: "Utilization",
            })}
            value={String(formatWithComma(sideCardTodayValue ?? 0))}
            unit="kWh"
            progressValue={utilizationPercent}
            progressLabel={`${utilizationPercent}%`}
            footer={
              overviewLastUpdateTime
                ? `${t("devices.electric.lastUpdate", {
                    defaultValue: "Last sync",
                  })} ${new Date(overviewLastUpdateTime).toLocaleTimeString(i18n.language, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : selectedGroupLabel
            }
            tone="amber"
          />
          <UtilityHeroCard
            eyebrow={t("devices.electric.cards.temperature", {
              defaultValue: "Temperature",
            })}
            title={t("devices.electric.cards.temperature", {
              defaultValue: "Temperature",
            })}
            value={hasTemperature ? String(formatWithComma(temperatureValue)) : "--"}
            unit={hasTemperature ? "°C" : ""}
            progressValue={temperaturePercent}
            progressLabel={`${temperaturePercent}%`}
            footer={temperatureDisplay ?? heroFooterStatus(hasTemperature, t)}
            tone="orange"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {metricTiles.map((tile) => (
            <UtilityMetricTile
              key={tile.key}
              label={tile.label}
              value={tile.value}
              tone={tile.tone}
              accent={tile.accent}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {summaryTiles.map((tile) => (
            <UtilitySurface key={tile.key} className="py-4">
              <div className="text-[11px] font-medium text-slate-400">{tile.label}</div>
              <div className="mt-1 text-[30px] font-semibold leading-none text-slate-900">
                {tile.value}
              </div>
            </UtilitySurface>
          ))}
        </div>

        <UtilitySurface>
          <UtilitySectionTitle
            title={t("devices.electric.dailyUtilization", {
              defaultValue: "Daily utilization",
            })}
            subtitle={t("devices.electric.last7days", {
              defaultValue: "Last 7 days",
            })}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            {comparisonItems.length ? (
              comparisonItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedComparisonKey(item.key)}
                  className={[
                    "cursor-pointer rounded-[18px] border bg-white p-4 text-left transition",
                    item.key === selectedComparisonKey
                      ? "border-amber-200 shadow-[0_12px_28px_rgba(245,158,11,0.12)]"
                      : "border-slate-200/80 hover:border-slate-300",
                  ].join(" ")}
                >
                  <div className="flex h-full min-h-[188px] flex-col">
                    <div className="text-[11px] font-medium text-slate-500">
                      {`${item.label} ${item.displayDate}`}
                    </div>
                    <div className="mt-1 text-[12px] text-slate-400">
                      {t("devices.electric.utilizationLabel", {
                        defaultValue: "Utilization",
                      })}
                    </div>
                    <div className="mt-3 flex flex-1 items-end justify-center">
                      <div className="flex h-[108px] w-12 items-end overflow-hidden rounded-[10px] bg-slate-100">
                        <div
                          className={[
                            "w-full rounded-[10px] transition-all",
                            item.key === selectedComparisonKey
                              ? "bg-gradient-to-t from-[#f59e0b] to-[#fbbf24]"
                              : "bg-gradient-to-t from-[#94a3b8] to-[#cbd5e1]",
                          ].join(" ")}
                          style={{
                            height: `${Math.max(8, Math.min(100, item.percentage))}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 text-center text-[30px] font-semibold leading-none text-slate-700">
                      {item.percentLabel}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center text-sm text-slate-400">
                {t("devices.electric.radial.noHistory", {
                  defaultValue: "No historical data",
                })}
              </div>
            )}
          </div>
        </UtilitySurface>

        <UtilitySurface>
          <UtilitySectionTitle
            title={
              activeChartTab === "contribution"
                ? t("devices.electric.inverterContribution", {
                    defaultValue: "Inverter contribution",
                  })
                : t("devices.electric.powerTrend", {
                    defaultValue: "Power trend",
                  })
            }
            subtitle={
              activeChartTab === "contribution"
                ? t("devices.electric.inverterContributionHint", {
                    defaultValue: "Today · kWh by 30 min",
                  })
                : `${t("devices.electric.today", {
                    defaultValue: "Today",
                  })} · ${t("devices.electric.chartInterval", {
                    defaultValue: "kWh by 30 min",
                  })}`
            }
            right={
              isOverviewSelected ? (
                <div className="inline-flex overflow-hidden rounded-[14px] border border-slate-200 bg-slate-50">
                  {[
                    {
                      key: "contribution" as const,
                      label: t("devices.electric.inverterContribution", {
                        defaultValue: "Inverter contribution",
                      }),
                    },
                    {
                      key: "trend" as const,
                      label: t("devices.electric.powerTrend", {
                        defaultValue: "Power trend",
                      }),
                    },
                  ].map((tab) => {
                    const active = activeChartTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveChartTab(tab.key)}
                        className={[
                          "px-4 py-2 text-sm font-medium transition",
                          active
                            ? "bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
                            : "text-slate-500 hover:bg-white/70",
                        ].join(" ")}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              ) : null
            }
          />
          {activeChartTab === "contribution" && isOverviewSelected ? (
            <>
              {overviewContributionColumns.maxValue > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[1440px]">
                    <div className="grid h-[320px] grid-cols-[72px_1fr] gap-3 rounded-[18px] border border-slate-100 bg-slate-50/50 px-4 pb-8 pt-4">
                      <div className="flex h-full flex-col justify-between pr-2 text-right">
                        <div className="text-[11px] font-medium text-slate-400">kWh</div>
                        {overviewContributionAxis.ticks.map((tick) => (
                          <div
                            key={tick.value}
                            className="text-[11px] font-medium text-slate-400"
                          >
                            {tick.label}
                          </div>
                        ))}
                      </div>
                      <div className="relative h-full">
                        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between">
                          {overviewContributionAxis.ticks.map((tick) => (
                            <div
                              key={`grid-${tick.value}`}
                              className="border-t border-dashed border-slate-200"
                            />
                          ))}
                        </div>
                        <div className="flex h-full items-end gap-1">
                          {overviewContributionColumns.columns.map((column, index) => {
                            const showLabel = index % 2 === 0;
                            return (
                              <div
                                key={column.label}
                                className="flex min-w-0 flex-1 flex-col items-center justify-end"
                              >
                                <div className="flex h-[260px] w-full items-end justify-center">
                                  <div className="flex h-full w-full max-w-[32px] items-end justify-center gap-px">
                                    {column.bars.map((bar) => (
                                      <div
                                        key={`${column.label}-${bar.name}`}
                                        className="min-w-[1px] flex-1 rounded-t-[3px]"
                                        style={{
                                          height:
                                            bar.value > 0
                                              ? `${Math.max(
                                                  2,
                                                  (bar.value / overviewContributionAxis.max) * 100
                                                )}%`
                                              : "0%",
                                          backgroundColor: bar.color,
                                          opacity: bar.value > 0 ? 1 : 0.12,
                                        }}
                                        title={`${column.label} · ${bar.name}: ${formatWithComma(
                                          Math.round(bar.value)
                                        )} kWh`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                <div className="mt-3 h-8 text-center text-[10px] text-slate-400">
                                  {showLabel ? column.label : ""}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400 min-h-[300px]">
                  {t("devices.electric.noData", { defaultValue: "No data" })}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {overviewContributionLegend.map((item) => (
                  <div
                    key={item.name}
                    className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-500"
                    title={item.name}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="max-w-[160px] truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ElectricLineBasicChart
              key={selectedComparison?.key ?? "today"}
              categories={chartCategories}
              series={chartSeriesData}
            />
          )}
        </UtilitySurface>
      </div>
    </>
  );
}

function heroFooterStatus(
  hasTemperature: boolean,
  t: ReturnType<typeof useTranslation>["t"]
) {
  return hasTemperature
    ? t("devices.electric.temperatureHealthy", {
        defaultValue: "Temperature available",
      })
    : t("devices.electric.noData", { defaultValue: "No data" });
}

function BoltIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  );
}

function MeterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a8 8 0 1 1 16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M12 14l3-3" />
    </svg>
  );
}

function CurrentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c2.5 0 2.5-6 5-6s2.5 12 5 12 2.5-12 5-12 2.5 6 5 6" />
    </svg>
  );
}
