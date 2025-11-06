
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../../Dropdown";
import Thermostat from "../../Themorstats";
import boltWhiteIcon from "../../../assets/bolt.png";
import voltageIcon from "../../../assets/Voltage.png";
import IletterIcon from "../../../assets/i.png";
import plugIcon from "../../../assets/plug-cable.png";
import waterSupplieIcon from "../../../assets/water-supply.png";
import wavesineIcon from "../../../assets/wave-sine.png";
import transformIcon from "../../../assets/transformer-bolt.png";
import plugWhiteIcon from "../../../assets/plug.png";
import { ElectricRadialBasic } from "../../RadialBar";
import { ElectricLineBasicChart } from "../../Chart";
import { useFilters } from "../../../context/FiltersContext";
import { updateElectricOverview, getElectricDevices } from "../../../api/electric";

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
      ? value.toLocaleString("en-US")
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
  arr.map((value) => (Number.isFinite(value) ? Number(value.toFixed(2)) : 0));

export default function ElectricMeterPanel({ siteCode }: Props) {
  const { selectedSite, date: filtersDate } = useFilters();
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
    const from = new Date(to.getTime() - 30 * 60 * 1000);
    const makeLabel = (d: Date) => formatTime(d.getHours(), d.getMinutes());
    return {
      from: makeLabel(from),
      to: makeLabel(to),
    };
  }, []);

  const [fromTime, setFromTime] = useState<string>(defaultTimeRange.from);
  const [toTime, setToTime] = useState<string>(defaultTimeRange.to);
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
    const to24 = (s: string) => {
      const m = /^(\d{2}):(\d{2})\s*(AM|PM)$/i.exec(s.trim());
      if (!m) return "00:00";
      let h = parseInt(m[1], 10);
      const min = m[2];
      const ap = m[3].toUpperCase();
      if (ap === "PM" && h !== 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${min}`;
    };
    const from = `${yyyy}-${mm}-${dd} ${to24(fromTime)}:00`;
    const to = `${yyyy}-${mm}-${dd} ${to24(toTime)}:00`;
    // Force same-date range even if to < from (per requirement)
    return { from, to };
  }, [fromTime, toTime, filtersDate]);

  // fetched data

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
    valueLabel: t("devices.electric.cards.consumption"),
    maxLabel: t("devices.electric.units.kwh"),
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
  const qs = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlInverterSN = qs?.get('inverterSN') || undefined;
  const siteForApi =
    selectedSite && selectedSite !== "all"
      ? String(selectedSite)
      : siteCode && /^\d+$/.test(String(siteCode))
      ? String(siteCode)
      : "3078000";
  const inverterSN = urlInverterSN || "7B0C44D5-A0";

  React.useEffect(() => {
    let active = true;
    (async () => {
      const daysToFetch = 8; // today + previous 7 days
      const entries: DailySeries[] = [];
      for (let i = 0; i < daysToFetch; i++) {
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        base.setDate(base.getDate() - i);
        const dayStart = startOfDay(base);
        const dayEnd = endOfDay(base);

        try {
          const res = await fetchEquipmentTelemetry({
            siteIdOrCode: siteForApi,
            sn: inverterSN,
            startTime: formatDateTimeForApi(dayStart),
            endTime: formatDateTimeForApi(dayEnd),
            category: "INVERTER",
          });
          const list: any[] = (res?.data as any)?.telemetries ?? [];
          const points = normalizeTelemetries(list);
          const halfHourSeries = buildHalfHourSeries(points, dayStart);
          const dayKwh = halfHourSeries.length
            ? halfHourSeries[halfHourSeries.length - 1]
            : 0;
          entries.push({
            key: formatDateTimeForApi(dayStart).slice(0, 10),
            date: dayStart,
            isToday: i === 0,
            totalWh:
              points.length > 1
                ? Math.max(0, points[points.length - 1].totalWh - points[0].totalWh)
                : 0,
            totalKwh: dayKwh,
            halfHourSeries,
          });
        } catch {
          entries.push({
            key: formatDateTimeForApi(dayStart).slice(0, 10),
            date: dayStart,
            isToday: i === 0,
            totalWh: 0,
            totalKwh: 0,
            halfHourSeries: HALF_HOUR_SLOTS.map(() => 0),
          });
        }
      }

      if (!active) return;
      entries.sort((a, b) => b.date.getTime() - a.date.getTime());
      setDailySeries(entries);
    })();

    return () => {
      active = false;
    };
  }, [siteForApi, inverterSN]);

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
        ? `${percentage % 1 === 0 ? percentage.toFixed(0) : percentage.toFixed(1)}%`
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
        console.debug('[FE] fetch equipment', {siteForApi, inverterSN, range});
        const res = await fetchEquipmentTelemetry({ siteIdOrCode: siteForApi, sn: inverterSN, startTime: range.from, endTime: range.to, category: 'INVERTER' });
        const list: any[] = (res?.data as any)?.telemetries ?? [];
        const t1: any = (res?.data as any)?.telemetryFirst ?? list[0] ?? null;
        const t2: any = (res?.data as any)?.telemetryLast ?? (list.length ? list[list.length-1] : null);
        console.debug('[FE] rangeRes', { count: list.length });

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
        setMetrics((m) => ({ ...m, voltage, current, frequency, consumptionKwh, lifetimeKwh }));
        setTemperatureC(
          typeof temperature === "number" && Number.isFinite(temperature)
            ? temperature
            : null
        );
      } catch (e) {
        // ignore
      }
    })();
  }, [computeRange, siteForApi, inverterSN]);


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
      {
        id: "humidity",
        img: waterSupplieIcon,
        value: 0,
        valueLabel: t("devices.electric.cards.humidity"),
        valueLabel2: t("devices.electric.units.gm3"),
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

  // Ensure device.meta overview is refreshed and consumed for side cards / max bound
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        await updateElectricOverview(siteForApi, inverterSN);
      } catch {
        // ignore updater failures; still attempt to read cached meta
      }

      try {
        const res = await getElectricDevices(siteForApi);
        const items: any[] = Array.isArray((res as any)?.items)
          ? (res as any).items
          : Array.isArray((res as any)?.data?.items)
          ? (res as any).data.items
          : [];
        const identity = `INVERTER:${inverterSN}`.toUpperCase();
        const device = items.find((item) => {
          const model = String(item?.model ?? "");
          return model.toUpperCase() === identity;
        });
        const overviewMeta = device?.meta?.overview;
        if (!active) return;
        if (!overviewMeta) {
          setOverviewTodayValue(null);
          setOverviewMonthValue(null);
          setOverviewLifetimeValue(null);
          return;
        }
        const toNum = (value: any): number | null => {
          if (typeof value === "number") return Number.isFinite(value) ? value : null;
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : null;
        };

        const toKwh = (kwhCandidate: any, ...whCandidates: any[]): number | null => {
          const kwh = toNum(kwhCandidate);
          if (kwh !== null) return kwh;
          for (const whSource of whCandidates) {
            const wh = toNum(whSource);
            if (wh !== null) {
              return wh / 1000;
            }
          }
          return null;
        };

        const dayKwh = toKwh(
          overviewMeta.lastDayKwh ?? overviewMeta.today_kwh,
          overviewMeta.lastDayWh,
          overviewMeta.lastDayData?.energy,
          overviewMeta.todayWh
        );
        const monthKwh = toKwh(
          overviewMeta.lastMonthKwh,
          overviewMeta.lastMonthWh,
          overviewMeta.lastMonthData?.energy
        );
        const lifetimeKwh = toKwh(
          overviewMeta.lifeTimeKwh ?? overviewMeta.lifetimeKwh,
          overviewMeta.lifeTimeWh,
          overviewMeta.lifeTimeData?.energy,
          overviewMeta.lifetimeWh
        );

        setOverviewTodayValue(dayKwh);
        setOverviewMonthValue(monthKwh);
        setOverviewLifetimeValue(lifetimeKwh);
        if (monthKwh !== null) {
          setMetrics((m) => ({ ...m, monthKwh }));
        }
      } catch {
        if (!active) return;
        setOverviewTodayValue(null);
        setOverviewMonthValue(null);
        setOverviewLifetimeValue(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [siteForApi, inverterSN]);

  const lifetimeMaxValue =
    typeof overviewLifetimeValue === "number" && Number.isFinite(overviewLifetimeValue)
      ? overviewLifetimeValue
      : null;
  const sideCardTodayValue =
    overviewTodayValue !== null && overviewTodayValue !== undefined
      ? overviewTodayValue
      : metrics.consumptionKwh;
  const sideCardMonthValue =
    overviewMonthValue !== null && overviewMonthValue !== undefined
      ? overviewMonthValue
      : metrics.monthKwh;
  const hasTemperature = typeof temperatureC === "number" && Number.isFinite(temperatureC);
  const temperatureValue = hasTemperature ? Math.round(Number(temperatureC)) : 0;
  const temperatureDisplay = hasTemperature
    ? undefined
    : t("devices.electric.noData", { defaultValue: "No data" });

  return (
    <>
      <div className="grid grid-cols-1 lg-1355:grid-cols-5 gap-3 mt-6">
        <div className="col-span-5 lg-1355:col-span-4 flex flex-col justify-center items-center bg-white rounded-xl gap-10 p-6">
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
                          "absolute z-10 mt-2 max-h-64 w-27 overflow-auto rounded-md bg-white ring-1 ring-black/5 shadow-lg p-1",
                      })}
                    >
                      {options.map((opt) => (
                        <button
                          key={opt.value}
                          {...getItemProps(opt, {
                            className:
                              "w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm cursor-pointer",
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
              options={timeOptions}
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
                          "absolute z-10 mt-2 max-h-64 w-27 overflow-auto rounded-md bg-white ring-1 ring-black/5 shadow-lg p-1",
                      })}
                    >
                      {options.map((opt) => (
                        <button
                          key={opt.value}
                          {...getItemProps(opt, {
                            className:
                              "w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm cursor-pointer",
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
                max={
                  thermoOne.useLifetimeMax
                    ? Math.max(1, lifetimeMaxValue ?? thermoOne.initialValue)
                    : 450
                }
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





























