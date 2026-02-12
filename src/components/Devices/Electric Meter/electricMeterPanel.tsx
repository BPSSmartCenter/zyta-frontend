
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../../Dropdown";
import Thermostat from "../../Themorstats";
import boltWhiteIcon from "../../../assets/bolt.png";
import voltageIcon from "../../../assets/Voltage.png";
import IletterIcon from "../../../assets/i.png";
import plugIcon from "../../../assets/plug-cable.png";
import wavesineIcon from "../../../assets/wave-sine.png";
import transformIcon from "../../../assets/transformer-bolt.png";
import plugWhiteIcon from "../../../assets/plug.png";
import { ElectricRadialBasic } from "../../RadialBar";
import { ElectricLineBasicChart } from "../../Chart";
import { useFilters } from "../../../context/FiltersContext";
import {
  getElectricOverview,
  getElectricDevices,
} from "../../../api/electric";

type Props = {
  siteCode?: string;
  timeRange?: { from: string; to: string };
};

type CardValueProps = {
  img: string;
  value: number | string;
  valueLabel: string;
  valueLabel2: string;
  onClick?: () => void; // ← เพิ่มสำหรับคลิก
};

type SideCardValueProps = {
  img: string;
  valueLabel: string;
  value: number | string;
  unit: string;
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

function formatWithComma(v: number | string) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : v;
}

function CardValue({
  img,
  value,
  valueLabel,
  valueLabel2,
  onClick,
}: CardValueProps) {
  const toNum = (x: number | string) =>
    Number.isFinite(Number(x)) ? Number(x) : 0;
  const shown = formatWithComma(Math.round(toNum(value)));
  return (
    <div
      className="bg-cyan rounded-lg w-[139px] md:w-[145px] h-[190px] p-5 flex flex-col text-white gap-2 select-none cursor-pointer hover:brightness-90 transition"
      onClick={onClick}
    >
      <div className="bg-white w-[48px] rounded-full ">
        <img src={img} className="p-3 w-full" alt="" />
      </div>
      <h1 className="text-[24px] font-bold">{shown}</h1>
      <div className="flex flex-col">
        <span>{valueLabel}</span>
        <p>{valueLabel2}</p>
      </div>
    </div>
  );
}

function SideCardValue({ img, value, valueLabel, unit }: SideCardValueProps) {
  const renderValue =
    value === null || value === undefined
      ? "-"
      : typeof value === "number" && Number.isFinite(value)
      ? Math.round(value).toLocaleString("en-US")
      : value;

  return (
    <div className="font-poppins flex flex-col flex-1 text-center items-center justify-center p-5 bg-white w-full min-h-[100px] rounded-lg gap-5 select-none">
      <div>
        <h1 className="text-gray-600 text-[20px]">{valueLabel}</h1>
        <p className="text-gray-600 font-bold text-[30px] whitespace-nowrap">
          {renderValue} <span>{unit}</span>
        </p>
      </div>
      <div className="rounded-full bg-[#A9DB4E]">
        <img src={img} className="p-5 w-[90px]" alt="" />
      </div>
    </div>
  );
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
const minutesFromTimeLabel = (label?: string) => {
  const { hours, minutes } = parseTimeLabel(label);
  return hours * 60 + minutes;
};
const to24FromLabel = (label?: string) => {
  const { hours, minutes } = parseTimeLabel(label);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

import { fetchEquipmentTelemetry } from "../../../api/equipment";

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

export default function ElectricMeterPanel({ siteCode }: Props) {
  const { selectedSite, selectedGroupSite, siteOptions, date: filtersDate } = useFilters();
  const { t, i18n } = useTranslation("devices");
  const locale = React.useMemo(
    () => (i18n.language?.toLowerCase().startsWith("th") ? "th-TH" : "en-US"),
    [i18n.language]
  );

  // options ทุก 30 นาที

  const timeOptions = useMemo(
    () =>
      Array.from({ length: 24 * 2 }, (_, i) => {
        const h = Math.floor(i / 2);
        const m = (i % 2) * 30;
        const label = formatTime(h, m);
        return { label, value: label };
      }),
    []
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

  const [fromTime, setFromTime] = useState<string>(defaultTimeRange.from);
  const [toTime, setToTime] = useState<string>(defaultTimeRange.to);
  const fromMinutes = useMemo(() => minutesFromTimeLabel(fromTime), [fromTime]);
  const toOptions = useMemo(() => {
    const filtered = timeOptions.filter(
      (opt) => minutesFromTimeLabel(opt.value) > fromMinutes
    );
    return filtered.length > 0 ? filtered : [];
  }, [timeOptions, fromMinutes]);
  useEffect(() => {
    if (!toOptions.length) {
      setToTime(fromTime);
      return;
    }
    if (!toOptions.some((opt) => opt.value === toTime)) {
      setToTime(toOptions[0].value);
    }
  }, [toOptions, toTime]);
  const [selectedComparisonKey, setSelectedComparisonKey] = useState<string | null>(
    null
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

  const consumptionLabel = t("devices.electric.cards.consumption", {
    defaultValue: "Power consumption",
  });
  const kwhUnitLabel = t("devices.electric.units.kwh", { defaultValue: "(kWh)" });

  // ✅ state เฉพาะ Thermostat ตัวแรก (ซ้าย)
  const [thermoOne, setThermoOne] = useState<{
    initialValue: number;
    valueLabel: string;
    maxLabel: string;
    useLifetimeMax?: boolean;
    source: "auto" | "card";
    cardKey?: string;
  }>({
    initialValue: 0,
    valueLabel: consumptionLabel,
    maxLabel: kwhUnitLabel,
    useLifetimeMax: false,
    source: "auto",
    cardKey: undefined,
  });

  const toNumber = (v: number | string) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
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
  const isGroupSiteSelected = Boolean(selectedGroupSite?.id);
  const isGlobalAllOverview = isAllSitesSelected && !isGroupSiteSelected;
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
  const siteTargets = React.useMemo(() => {
    if (!isAllSitesSelected) return [siteForApi];
    if (!selectedGroupSite?.id) return allSiteTargets;
    const selectedGroup = groupSiteEntries.find(
      (entry) => entry.id === selectedGroupSite.id || entry.label === selectedGroupSite.label
    );
    return selectedGroup?.siteCodes ?? allSiteTargets;
  }, [
    isAllSitesSelected,
    siteForApi,
    selectedGroupSite,
    allSiteTargets,
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
            return a.sn.localeCompare(b.sn, undefined, { numeric: true });
          });
        setDeviceOptions(filtered);
        setSelectedDeviceId((prev) => {
          if (prev === OVERVIEW_DEVICE_ID) return prev;
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

  const selectedDeviceStatus = (selectedDevice?.status || "").toLowerCase();
  const deviceStatusById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of deviceOptions) {
      map.set(opt.id, String(opt.status || "").toLowerCase());
    }
    return map;
  }, [deviceOptions]);
  const statusBadge =
    selectedDeviceStatus === "online"
      ? { dot: "bg-emerald-500", text: "text-emerald-600", label: "Online" }
      : selectedDeviceStatus === "offline"
      ? { dot: "bg-rose-500", text: "text-rose-600", label: "Offline" }
      : { dot: "bg-slate-300", text: "text-slate-500", label: "Unknown" };

  const deviceSN =
    isOverviewSelected
      ? OVERVIEW_DEVICE_ID
      : (selectedDevice?.sn || fallbackDeviceSn || DEFAULT_INVERTER_SN).trim() ||
        DEFAULT_INVERTER_SN;
  const selectedDeviceSiteForApi = selectedDevice?.siteIdOrCode || siteForApi;
  const deviceCategory = "INVERTER";
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
        ...deviceOptions.map((opt, idx) => ({
          value: opt.id,
          label: isGroupSiteSelected
            ? `${opt.siteLabel || opt.siteIdOrCode || "-"} (${opt.sn})`
            : `Inverter ${idx + 1} (${opt.sn})`,
        })),
      ];
    },
    [deviceOptions, t, isGroupSiteSelected]
  );

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
      const cacheKey = `db:telemetry-window:${cacheSiteKey}:${deviceSN}:${rangeStartKey}:${rangeEndKey}`;
      const stickyKey = `db:telemetry-window:sticky:${cacheSiteKey}:${deviceSN}`;
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
        if (isAllSitesSelected && isOverviewSelected) {
          const targets = siteTargets;
          if (!targets.length) {
            points = [];
          } else {
            const settled = await runWithConcurrency(targets, 4, async (siteIdOrCode) =>
              fetchEquipmentTelemetry({
                siteIdOrCode,
                sn: OVERVIEW_DEVICE_ID,
                startTime,
                endTime,
                category: deviceCategory,
              })
            );
            const sumByTs = new Map<number, number>();
            for (const result of settled) {
              if (result.status !== "fulfilled") continue;
              const list: any[] = (result.value?.data as any)?.telemetries ?? [];
              for (const item of list) {
                const ts = new Date(item?.date ?? 0).getTime();
                const total = Number(item?.totalEnergy ?? 0);
                if (!Number.isFinite(ts) || !Number.isFinite(total)) continue;
                sumByTs.set(ts, (sumByTs.get(ts) ?? 0) + total);
              }
            }
            const merged = Array.from(sumByTs.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([ts, totalEnergy]) => ({
                date: new Date(ts).toISOString(),
                totalEnergy,
              }));
            points = normalizeTelemetries(merged);
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
        const entries: DailySeries[] = [];
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
          entries.push({
            key: dayKey,
            date: dayStart,
            isToday: i === 0,
            totalWh,
            totalKwh,
            halfHourSeries,
          });
        }
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
    isAllSitesSelected,
    isOverviewSelected,
    siteTargetsKey,
    selectedDeviceSiteForApi,
  ]);

  const todaySeriesData = React.useMemo(
    () => dailySeries.find((item) => item.isToday) ?? null,
    [dailySeries]
  );
  const yesterdaySeriesData = React.useMemo(
    () => dailySeries.find((item) => !item.isToday) ?? null,
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
        if (isAllSitesSelected && isOverviewSelected) {
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
        } else {
          res = await fetchEquipmentTelemetry({
            siteIdOrCode: selectedDeviceSiteForApi,
            sn: deviceSN,
            startTime: range.from,
            endTime: range.to,
            category: deviceCategory,
          });
        }
        const payload: any = (res as any)?.data ?? {};
        const summary = payload?.summary ?? null;
        const list: any[] = payload?.telemetries ?? [];
        const t1: any = payload?.telemetryFirst ?? list[0] ?? null;
        const t2: any = payload?.telemetryLast ?? (list.length ? list[list.length - 1] : null);
        console.debug("[FE] rangeRes", { count: list.length });

        if (summary && typeof summary === "object") {
          const voltage = Math.round(Number(summary?.voltageAvg ?? 0) || 0);
          const current = Math.round(Number(summary?.currentAvg ?? 0) || 0);
          const frequency = Math.round(Number(summary?.frequencyAvg ?? 0) || 0);
          const consumptionKwh = Math.round(
            Number(summary?.usageKwh ?? 0) || 0
          );
          const lifetimeKwh = Math.round(
            Number(summary?.accumulatedKwh ?? 0) || 0
          );
          const temperature =
            summary?.temperatureC === null || summary?.temperatureC === undefined
              ? null
              : Math.round(Number(summary.temperatureC));
          setMetrics((m) => ({
            ...m,
            voltage,
            current,
            frequency,
            consumptionKwh,
            lifetimeKwh,
          }));
          setTemperatureC(
            typeof temperature === "number" && Number.isFinite(temperature)
              ? temperature
              : null
          );
          if (!isOverviewSelected) {
            const todayProd = Number(summary?.productionTodayKwh);
            const monthProd = Number(summary?.productionMonthKwh);
            setOverviewTodayValue(
              Number.isFinite(todayProd) ? Math.round(todayProd) : null
            );
            setOverviewMonthValue(
              Number.isFinite(monthProd) ? Math.round(monthProd) : null
            );
            if (Number.isFinite(monthProd)) {
              setMetrics((m) => ({ ...m, monthKwh: Math.round(monthProd) }));
            }
          }
          return;
        }

        const last: any = (t2 || t1 || {});
        const phaseVs = [last?.L1Data?.acVoltage, last?.L2Data?.acVoltage, last?.L3Data?.acVoltage].filter((v: any) => Number.isFinite(Number(v))) as number[];
        const voltage = phaseVs.length ? phaseVs.reduce((a, b) => a + Number(b), 0) / phaseVs.length : (([last?.vL1To2, last?.vL2To3, last?.vL3To1].map(Number).filter((n) => Number.isFinite(n)) as number[]).reduce((a, b) => a + b, 0) / 3) || 0;
        const currents = [last?.L1Data?.acCurrent, last?.L2Data?.acCurrent, last?.L3Data?.acCurrent].map(Number).filter((n) => Number.isFinite(n)) as number[];
        const current = currents.length ? currents.reduce((a, b) => a + b, 0) / currents.length : 0;
        const freqs = [last?.L1Data?.acFrequency, last?.L2Data?.acFrequency, last?.L3Data?.acFrequency].map(Number).filter((n) => Number.isFinite(n)) as number[];
        const frequency = freqs.length ? freqs.reduce((a, b) => a + b, 0) / freqs.length : 0;
        const eFirst = Number(t1?.totalEnergy ?? 0);
        const eLast = Number(t2?.totalEnergy ?? t1?.totalEnergy ?? 0);
        const consumptionKwh = eLast > eFirst ? (eLast - eFirst) / 1000 : 0;
        const lifetimeKwh = eLast / 1000;
        const tempRaw =
          last?.temperature ??
          last?.Temperature ??
          last?.L1Data?.temperature ??
          last?.L1Data?.Temperature ??
          last?.envTemp ??
          null;
        const temperature =
          tempRaw === null || tempRaw === undefined ? null : Number(tempRaw);
        setMetrics((m) => ({
          ...m,
          voltage: Math.round(voltage),
          current: Math.round(current),
          frequency: Math.round(frequency),
          consumptionKwh: Math.round(consumptionKwh),
          lifetimeKwh: Math.round(lifetimeKwh),
        }));
        setTemperatureC(
          typeof temperature === "number" && Number.isFinite(temperature)
            ? Math.round(temperature)
            : null
        );
      } catch (e) {
        // ignore
      }
    })();
  }, [
    computeRange,
    deviceSN,
    deviceCategory,
    isOverviewSelected,
    isAllSitesSelected,
    siteTargetsKey,
    selectedDeviceSiteForApi,
  ]);


  const cardItems = React.useMemo(
    () => [
      {
        id: "voltage",
        img: voltageIcon,
        value: metrics.voltage,
        valueLabel: t("devices.electric.cards.voltage"),
        valueLabel2: t("devices.electric.units.volt"),
      },
      {
        id: "consumption",
        img: plugIcon,
        value: metrics.consumptionKwh,
        valueLabel: t("devices.electric.cards.consumption"),
        valueLabel2: t("devices.electric.units.kwh"),
      },
      {
        id: "accumulated",
        img: transformIcon,
        value: metrics.lifetimeKwh,
        valueLabel: t("devices.electric.cards.accumulated"),
        valueLabel2: t("devices.electric.units.kwh"),
      },
      {
        id: "current",
        img: IletterIcon,
        value: metrics.current,
        valueLabel: t("devices.electric.cards.current"),
        valueLabel2: t("devices.electric.units.amp"),
      },
      {
        id: "frequency",
        img: wavesineIcon,
        value: metrics.frequency,
        valueLabel: t("devices.electric.cards.frequency"),
        valueLabel2: t("devices.electric.units.hz"),
      },
    ],
    [metrics, t]
  );

  // Update left gauge from telemetry-based today consumption (kWh)
  React.useEffect(() => {
    const today = Number(metrics.consumptionKwh || 0);
    setThermoOne((prev) => {
      if (prev.source !== "auto") return prev;
      const nextValue = Math.round(toNumber(today));
      if (prev.initialValue === nextValue) return prev;
      return { ...prev, initialValue: nextValue };
    });
  }, [metrics.consumptionKwh]);

  React.useEffect(() => {
    setThermoOne((prev) => {
      if (prev.source !== "auto") return prev;
      if (prev.valueLabel === consumptionLabel && prev.maxLabel === kwhUnitLabel) {
        return prev;
      }
      return { ...prev, valueLabel: consumptionLabel, maxLabel: kwhUnitLabel };
    });
  }, [consumptionLabel, kwhUnitLabel]);

  // Keep card-driven Thermostat in sync with live card values
  React.useEffect(() => {
    setThermoOne((prev) => {
      if (prev.source !== "card" || !prev.cardKey) return prev;
      const card = cardItems.find((item) => item.id === prev.cardKey);
      if (!card) return prev;
      const nextValue = Math.round(toNumber(card.value));
      if (
        prev.initialValue === nextValue &&
        prev.valueLabel === card.valueLabel &&
        prev.maxLabel === card.valueLabel2
      ) {
        return prev;
      }
      return {
        ...prev,
        initialValue: nextValue,
        valueLabel: card.valueLabel,
        maxLabel: card.valueLabel2,
      };
    });
  }, [cardItems]);

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
          } else {
            const resp = await getElectricOverview(siteForApi);
            data = (resp as any)?.data ?? resp ?? {};
          }
          if (!active) return;
          const today = Number(data?.today_kwh);
          const month = Number(data?.month_kwh);
          const lifetime = Number(data?.lifetime_kwh);
          setOverviewTodayValue(Number.isFinite(today) ? Math.round(today) : null);
          setOverviewMonthValue(Number.isFinite(month) ? Math.round(month) : null);
          setOverviewLifetimeValue(
            Number.isFinite(lifetime) ? Math.round(lifetime) : null
          );
          if (Number.isFinite(month)) {
            setMetrics((m) => ({ ...m, monthKwh: Math.round(month) }));
          }
        } catch {
          if (!active) return;
          setOverviewTodayValue(null);
          setOverviewMonthValue(null);
          setOverviewLifetimeValue(null);
        }
        return;
      }
      if (!active) return;
      setOverviewTodayValue(null);
      setOverviewMonthValue(null);
      setOverviewLifetimeValue(null);
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

  const lifetimeMaxValue =
    typeof overviewLifetimeValue === "number" && Number.isFinite(overviewLifetimeValue)
      ? overviewLifetimeValue
      : null;
  const yesterdayMaxValue =
    yesterdaySeriesData && Number.isFinite(yesterdaySeriesData.totalKwh)
      ? Number(yesterdaySeriesData.totalKwh)
      : null;
  const thermoOneMax = Math.max(
    1,
    Number(yesterdayMaxValue ?? 0),
    Number(lifetimeMaxValue ?? 0),
    Number(thermoOne.initialValue ?? 0)
  );
  const sideCardTodayValue =
    overviewTodayValue !== null && overviewTodayValue !== undefined
      ? overviewTodayValue
      : metrics.consumptionKwh;
  const sideCardMonthValue =
    overviewMonthValue !== null && overviewMonthValue !== undefined
      ? overviewMonthValue
      : metrics.monthKwh;
  const selectedGroupLabel = React.useMemo(() => {
    if (!isAllSitesSelected || !selectedGroupSite?.label) {
      return t("navbar.allSites", { ns: "dashboard", defaultValue: "All Sites" });
    }
    return selectedGroupSite.label;
  }, [isAllSitesSelected, selectedGroupSite, t]);
  const hasTemperature = typeof temperatureC === "number" && Number.isFinite(temperatureC);
  const temperatureValue = hasTemperature ? Math.round(Number(temperatureC)) : 0;
  const temperatureDisplay = hasTemperature
    ? undefined
    : t("devices.electric.noData", { defaultValue: "No data" });

  return (
    <>
      <div className="grid grid-cols-1 lg-1355:grid-cols-5 gap-3 mt-6">
        <div className="col-span-5 lg-1355:col-span-4 flex flex-col justify-center items-center bg-white rounded-xl gap-10 p-6 w-full">
          <div className="w-full flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-600">
              {isGlobalAllOverview
                ? t("devices.electric.deviceSelector.overview", {
                    defaultValue: "Overview",
                  })
                : t("devices.electric.deviceSelector.label", { defaultValue: "Device" })}
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {isGlobalAllOverview ? (
                <>
                  <p className="text-xs text-gray-500">
                    {t("navbar.allSites", { ns: "dashboard", defaultValue: "All Sites" })}
                  </p>
                </>
              ) : (
                <>
                  <Dropdown
                    options={deviceDropdownOptions}
                    value={selectedDeviceId ?? ""}
                    onChange={(value) => setSelectedDeviceId(value || null)}
                  >
                    {({
                      open,
                      selected,
                      getButtonProps,
                      getMenuProps,
                      getItemProps,
                      options,
                    }) => {
                      const disabled = options.length === 0;
                  return (
                    <div className="relative w-full sm:w-[520px]">
                          <button
                            {...getButtonProps({
                              disabled,
                              className: [
                                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition",
                                disabled
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                                  : "bg-[#F6FBFF] text-cyan hover:bg-cyan-300 hover:text-white border-transparent",
                              ].join(" "),
                            })}
                          >
                            <span className="whitespace-nowrap">
                              {deviceOptionsLoading
                                ? t("devices.electric.loadingDevices", {
                                    defaultValue: "Loading devices...",
                                  })
                                : selected?.label ??
                                (disabled
                                  ? t("devices.electric.deviceSelector.emptyShort", {
                                      defaultValue: "No devices",
                                    })
                                  : t("devices.electric.deviceSelector.placeholder", {
                                      defaultValue: "Select device",
                                    }))}
                            </span>
                            <i className="material-icons text-base text-current">
                              {open ? "expand_less" : "expand_more"}
                            </i>
                          </button>
                          {open && !disabled && (
                            <div
                              {...getMenuProps({
                                className:
                                  "absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-auto",
                              })}
                            >
                              {options.map((opt) => {
                                const status = deviceStatusById.get(opt.value);
                                const isOfflineOpt = status === "offline";
                                return (
                                  <button
                                    key={opt.value}
                                    {...getItemProps(opt, {
                                  className: `w-full text-left px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer flex items-center justify-between ${
                                    isOfflineOpt ? "text-rose-600 bg-rose-50" : ""
                                  }`,
                                })}
                              >
                                    <span className="whitespace-nowrap">{opt.label}</span>
                                    {isOfflineOpt ? (
                                      <span className="ml-2 inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  </Dropdown>
                  {selectedDevice && !isOverviewSelected && (
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className={`h-2.5 w-2.5 rounded-full ${statusBadge.dot}`} />
                      <span className={statusBadge.text}>{statusBadge.label}</span>
                    </div>
                  )}
                  {deviceOptionsLoading && (
                    <span className="inline-flex items-center gap-2 text-xs text-cyan font-medium">
                      <i className="material-icons text-sm animate-spin">autorenew</i>
                      {t("devices.electric.loadingDevices", {
                        defaultValue: "Loading devices...",
                      })}
                    </span>
                  )}
                </>
              )}
            </div>
            {!isGlobalAllOverview && (isOverviewSelected ? (
              <p className="text-xs text-gray-500">
                {isGroupSiteSelected
                  ? selectedGroupLabel
                  : siteLabelByCode.get(siteForApi) ?? siteForApi}
              </p>
            ) : selectedDevice ? (
              <p className="text-xs text-gray-500">
                {selectedDevice.siteLabel ??
                  siteLabelByCode.get(siteForApi) ??
                  siteForApi}
              </p>
            ) : null)}
            {!isGlobalAllOverview && !deviceOptionsLoading && deviceOptions.length === 0 && (
              <p className="text-xs text-red-500">
                {isGroupSiteSelected
                  ? t("devices.electric.noDevicesForGroup", {
                      defaultValue: "No electric devices found in this group",
                    })
                  : t("devices.electric.noDevices", {
                      defaultValue: "No electric devices found for this site",
                    })}
              </p>
            )}
          </div>
          {/* Time Range (Dropdown x2) */}
          <div className="flex items-center gap-3">
            {/* From */}
            <Dropdown
              options={timeOptions}
              value={fromTime}
              onChange={(val) => setFromTime(val)}
            >
              {({
                selected,
                open,
                getButtonProps,
                getMenuProps,
                getItemProps,
                options,
              }) => (
                <div className="relative">
                  <button
                    {...getButtonProps({
                      className:
                        "px-3 py-2 rounded-lg bg-[#F6FBFF] text-cyan font-semibold text-sm shadow-sm hover:bg-cyan-300 hover:text-white cursor-pointer transition-all duration-300",
                    })}
                  >
                    {selected?.label ?? t("devices.electric.selectTime")}
                  </button>

                  {open && (
                    <div
                      {...getMenuProps({
                        className:
                          "absolute z-20 mt-2 max-h-64 w-32 overflow-auto rounded-md bg-white ring-1 ring-black/5 shadow-lg p-1",
                      })}
                    >
                      {options.map((opt) => (
                        <button
                          key={opt.value}
                          {...getItemProps(opt, {
                            className:
                              "w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm cursor-pointer whitespace-nowrap leading-none",
                          })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Dropdown>

            <span className="text-cyan font-semibold text-sm select-none">
              {t("devices.electric.to")}
            </span>

            {/* To */}
            <Dropdown
              options={
                toOptions.length > 0
                  ? toOptions
                  : [{ label: fromTime, value: fromTime }]
              }
              value={toTime}
              onChange={(val) => setToTime(val)}
            >
              {({
                selected,
                open,
                getButtonProps,
                getMenuProps,
                getItemProps,
                options,
              }) => (
                <div className="relative">
                  <button
                    {...getButtonProps({
                      className:
                        "px-3 py-2 rounded-lg bg-[#F6FBFF] text-cyan font-semibold text-sm shadow-sm hover:bg-cyan-300 hover:text-white cursor-pointer transition-all duration-300",
                    })}
                  >
                    {selected?.label ?? t("devices.electric.selectTime")}
                  </button>

                  {open && (
                    <div
                      {...getMenuProps({
                        className:
                          "absolute z-20 mt-2 max-h-64 w-32 overflow-auto rounded-md bg-white ring-1 ring-black/5 shadow-lg p-1",
                      })}
                    >
                      {options.map((opt) => (
                        <button
                          key={opt.value}
                          {...getItemProps(opt, {
                            className:
                              "w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm cursor-pointer whitespace-nowrap leading-none",
                          })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Dropdown>
          </div>
          {/* ──────────────────────────────────── */}

          <div className="flex flex-col md:flex-row w-full justify-around gap-10 lg:gap-0">
            <div className="flex flex-col items-center gap-20">
              {/* ✅ รี-mount เมื่อค่าเปลี่ยน */}
              <Thermostat
                key={`${thermoOne.initialValue}-${thermoOne.valueLabel}-${thermoOne.maxLabel}-${thermoOne.useLifetimeMax ? 'l' : 'n'}`}
                initialValue={thermoOne.initialValue}
                max={thermoOneMax}
                maxLabel={thermoOne.maxLabel}
                valueLabel={thermoOne.valueLabel}
              />
            </div>

            <div className="flex flex-col items-center gap-20">
              <Thermostat
                initialValue={temperatureValue}
                value={hasTemperature ? temperatureValue : undefined}
                valueDisplay={temperatureDisplay}
                max={60}
                maxLabel={""}
                valueLabel={t("devices.electric.cards.temperature", { defaultValue: "Temperature" })}
                unit={hasTemperature ? "°C" : ""}
              />
            </div>
          </div>

          {/* value cards */}
          <div className="flex flex-wrap gap-4">
            {cardItems.map((kpi) => (
              <CardValue
                key={kpi.id}
                img={kpi.img}
                value={kpi.value}
                valueLabel={kpi.valueLabel}
                valueLabel2={kpi.valueLabel2}
                onClick={() => {
                  const isAccumulated = kpi.id === "accumulated";
                  setThermoOne({
                    initialValue: toNumber(kpi.value),
                    valueLabel: kpi.valueLabel,
                    maxLabel: kpi.valueLabel2,
                    useLifetimeMax: !!isAccumulated,
                    source: "card",
                    cardKey: kpi.id,
                  })
                }}
              />
            ))}
          </div>
        </div>

        <div className="col-span-1 flex flex-wrap flex-row lg-1355:flex-col gap-3 ">
          {[
            {
              img: plugWhiteIcon,
              value: sideCardTodayValue,
              valueLabel: t("devices.electric.side.today"),
              unit: t("devices.electric.side.unitKwh"),
            },
            {
              img: boltWhiteIcon,
              value: sideCardMonthValue,
              valueLabel: t("devices.electric.side.month"),
              unit: t("devices.electric.side.unitKwh"),
            },
          ].map((kpi, idx) => (
            <SideCardValue
              key={idx}
              img={kpi.img}
              valueLabel={kpi.valueLabel}
              value={kpi.value}
              unit={kpi.unit}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6">
        {/* แถบรายวัน + วง Radial */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {comparisonItems.length ? (
            comparisonItems.map((item) => {
              const isActive = item.key === selectedComparisonKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedComparisonKey(item.key)}
                  className={[
                    "flex flex-col text-left border-b transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50 cursor-pointer",
                    isActive
                      ? "border-b-2 border-cyan"
                      : "border-b border-transparent",
                  ].join(" ")}
                >
                  <div className="mb-1">
                    <span className="text-xl font-semibold text-gray-800">{item.label}</span>
                    <span className="ml-2 text-sm text-gray-400">{item.displayDate}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-2xl font-semibold text-gray-700">
                      {item.percentLabel}
                    </span>
                    <ElectricRadialBasic
                      value={Math.max(0, Math.min(100, item.percentage))}
                    />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="col-span-full text-center text-sm text-gray-400">
              {t("devices.electric.radial.noHistory", { defaultValue: "No historical data" })}
            </div>
          )}
        </div>

        {/* กราฟเส้นเปลี่ยนตามวัน */}
        <ElectricLineBasicChart
          key={selectedComparison?.key ?? "today"}
          categories={chartCategories}
          series={chartSeriesData}
        />
      </div>
    </>
  );
}





























