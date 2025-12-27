// src/components/Devices/Water/waterMeterPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../../Dropdown";
import Thermostat from "../../Themorstats";
import phWaterDrop from "../../../assets/phWaterDrop.png";
import waterIcon from "../../../assets/Water.png";
import TDSIcon from "../../../assets/TDS.png";
import waterDrop from "../../../assets/waterDrop.png";
import waterECIcon from "../../../assets/waterECDrop.png";
import { WaterStackedChart, WaterAreaStackedChart } from "../../Chart";
import { WaterMultiRadial } from "../../RadialBar";
import { getWaterDevices, type WaterDeviceRecord } from "../../../api/water";
import { useFilters } from "../../../context/FiltersContext";

type Props = {
  timeRange?: { from: string; to: string };
  siteCode?: string;
};

type CardValueProps = {
  img: string;
  value: number | string;
  valueLabel: string;
  valueLabel2?: string;
  onClick?: () => void; // ← เพิ่มเพื่อคลิกแล้วอัปเดต Thermostat
};

type SideCardValueProps = {
  img: string;
  valueLabel: string;
  value: number | string;
  unit: string;
};

function formatWithComma(v: number | string) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-US") : v;
}

function CardValue({
  img,
  value,
  valueLabel,
  valueLabel2,
  onClick,
}: CardValueProps) {
  return (
    <div
      className="bg-cyan rounded-lg w-[180px] h-[190px] p-5 flex flex-col text-white gap-2 cursor-pointer hover:brightness-90 transition"
      onClick={onClick}
    >
      <div className="bg-white w-[50px] rounded-full ">
        <img src={img} className="p-3 w-full" alt="" />
      </div>
      <h1 className="text-[24px] font-bold">{value}</h1>
      <span>
        {valueLabel} {valueLabel2 ? <p>{valueLabel2}</p> : null}
      </span>
    </div>
  );
}

function SideCardValue({ img, value, valueLabel, unit }: SideCardValueProps) {
  return (
    <div className="flex flex-1 items-center p-5 bg-white w-full h-[100px] rounded-lg gap-5">
      <div className="w-[57px] rounded-full bg-[#A9DB4E]">
        <img src={img} className="p-2" alt="" />
      </div>
      <div>
        <h1 className="text-gray-400 text-[14px]">{valueLabel}</h1>
        <p className="font-bold text-[21px] whitespace-nowrap">
          {formatWithComma(value)} <span>{unit}</span>
        </p>
      </div>
    </div>
  );
}

type WaterTotalsTriple = { today: number; month: number; year: number };

type WaterSectionSnapshot = {
  ph: number | null;
  flowRateLpm: number | null;
  tdsPpm: number | null;
  consumptionLiters: number | null;
  maxLabel?: string;
};

type WaterSnapshot = {
  timestamp: string | null;
  domestic: WaterSectionSnapshot;
  drinking: WaterSectionSnapshot;
  totals: {
    drinking: WaterTotalsTriple;
    domestic: WaterTotalsTriple;
  };
  stacked?: { categories?: string[]; series: { name: string; data: number[] }[] };
  radial?: { total?: number | string; values: number[]; labels: string[] };
  usage?: { categories?: string[]; series: { name: string; data: number[] }[] };
};

const ZERO_TOTALS: WaterTotalsTriple = { today: 0, month: 0, year: 0 };

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
      source?.consumptionLiters ?? source?.consumption ?? source?.liters ?? source?.value
    ) ?? 0,
  maxLabel: typeof source?.maxLitersLabel === "string" ? source?.maxLitersLabel : undefined,
});

const readingTimestamp = (device: WaterDeviceRecord): number => {
  const meta = safeObject(device.meta);
  const waterMeta = safeObject(meta?.water);
  const last = safeObject(waterMeta?.lastReading);
  const tsString =
    typeof last?.timestamp === "string"
      ? last.timestamp
      : typeof last?.capturedAt === "string"
      ? last.capturedAt
      : undefined;
  if (!tsString) return -Infinity;
  const parsed = Date.parse(tsString);
  return Number.isNaN(parsed) ? -Infinity : parsed;
};

const pickLatestWaterDevice = (devices: WaterDeviceRecord[]): WaterDeviceRecord | null => {
  if (!devices.length) return null;
  return devices.reduce<WaterDeviceRecord | null>((best, current) => {
    if (!best) return current;
    return readingTimestamp(current) > readingTimestamp(best) ? current : best;
  }, null);
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
  const stacked =
    stackedRaw && Array.isArray(stackedRaw.series)
      ? {
          categories: Array.isArray(stackedRaw.categories)
            ? stackedRaw.categories.map((c: any) => String(c))
            : undefined,
          series: stackedRaw.series.map((entry: any, idx: number) => ({
            name:
              typeof entry?.name === "string" && entry.name.trim()
                ? entry.name
                : `Series ${idx + 1}`,
            data: Array.isArray(entry?.data)
              ? entry.data.map((v: any) => coerceNumber(v) ?? 0)
              : [],
          })),
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
          ? radialRaw.values.map((val: any) => coerceNumber(val) ?? 0)
          : [],
        labels: Array.isArray(radialRaw.labels)
          ? radialRaw.labels.map((lb: any) => String(lb))
          : [],
      }
    : undefined;

  const usageRaw = charts?.usageTimeline;
  const usageSource =
    Array.isArray(usageRaw?.series) || Array.isArray(usageRaw?.categories)
      ? usageRaw
      : Array.isArray(usageRaw)
      ? { series: usageRaw }
      : undefined;
  const usage =
    usageSource && Array.isArray(usageSource.series)
      ? {
          categories: Array.isArray(usageSource.categories)
            ? usageSource.categories.map((c: any) => String(c))
            : undefined,
          series: usageSource.series.map((entry: any, idx: number) => ({
            name:
              typeof entry?.name === "string" && entry.name.trim()
                ? entry.name
                : `Series ${idx + 1}`,
            data: Array.isArray(entry?.data)
              ? entry.data.map((v: any) => coerceNumber(v) ?? 0)
              : [],
          })),
        }
      : undefined;

  const timestamp =
    typeof lastReading.timestamp === "string"
      ? lastReading.timestamp
      : typeof lastReading.capturedAt === "string"
      ? lastReading.capturedAt
      : null;

  return {
    timestamp,
    domestic,
    drinking,
    totals: {
      domestic: normalizeTotalsTriple(safeObject(totalsRaw?.domestic)) ?? ZERO_TOTALS,
      drinking: normalizeTotalsTriple(safeObject(totalsRaw?.drinking)) ?? ZERO_TOTALS,
    },
    stacked:
      stacked && Array.isArray(stacked.series) && stacked.series.length ? stacked : undefined,
    radial,
    usage:
      usage && Array.isArray(usage.series) && usage.series.length ? usage : undefined,
  };
};

const formatDecimal = (value: number | null | undefined, digits = 2) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toFixed(digits);
};

const DEFAULT_STACKED_SERIES = [
  { name: "A", data: Array(12).fill(0) },
  { name: "B", data: Array(12).fill(0) },
  { name: "C", data: Array(12).fill(0) },
];

const DEFAULT_AREA_SERIES = [
  { name: "A", data: Array(12).fill(0) },
  { name: "B", data: Array(12).fill(0) },
  { name: "C", data: Array(12).fill(0) },
];

const DEFAULT_SITE_CODE = "3078000";

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

export default function WaterMeterPanel({ siteCode }: Props) {
  const { t } = useTranslation("devices"); // ใช้คีย์แบบ devices.waterMeter.*
  const { selectedSite, siteOptions } = useFilters();

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

  const normalizedSiteCode = siteCode?.trim();
  const normalizedSelectedSite = selectedSite?.trim();

  const normalizedSiteOptions = useMemo(
    () =>
      siteOptions
        .map((opt) => (opt.value ? String(opt.value).trim() : ""))
        .filter(
          (val, idx, arr) =>
            val && val.toLowerCase() !== "all" && arr.indexOf(val) === idx
        ),
    [siteOptions]
  );

  const siteTargets = useMemo(() => {
    const targets = new Set<string>();

    if (normalizedSiteCode) targets.add(normalizedSiteCode);
    if (
      normalizedSelectedSite &&
      normalizedSelectedSite.toLowerCase() !== "all"
    ) {
      targets.add(normalizedSelectedSite);
    }

    if (!targets.size || normalizedSelectedSite?.toLowerCase() === "all") {
      normalizedSiteOptions.forEach((val) => targets.add(val));
    }

    if (!targets.size && normalizedSiteOptions.length) {
      normalizedSiteOptions.forEach((val) => targets.add(val));
    }

    if (!targets.size) targets.add(DEFAULT_SITE_CODE);

    return Array.from(targets);
  }, [normalizedSiteCode, normalizedSelectedSite, normalizedSiteOptions]);

  const siteTargetsKey = siteTargets.join("|");

  useEffect(() => {
    setSnapshot(null);
  }, [siteTargetsKey]);

  const [snapshot, setSnapshot] = useState<WaterSnapshot | null>(null);

  // ค่าเริ่มต้นให้เหมือนภาพ
  const [fromTime, setFromTime] = useState<string>("12:00 AM");
  const [toTime, setToTime] = useState<string>("11:30 PM");
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

  // ✅ state สำหรับ Thermostat ซ้าย/ขวา (อันละชุด)
  const [thermoLeft, setThermoLeft] = useState<{
    initialValue: number;
    valueLabel: string;
    maxLabel: string;
  }>({
    initialValue: 0,
    valueLabel: t("devices.waterMeter.domesticWater"),
    maxLabel: t("devices.waterMeter.ofMl", { max: 0 }) as string,
  });

  const [thermoRight, setThermoRight] = useState<{
    initialValue: number;
    valueLabel: string;
    maxLabel: string;
  }>({
    initialValue: 0,
    valueLabel: t("devices.waterMeter.drinkingWater"),
    maxLabel: t("devices.waterMeter.ofMl", { max: 0 }) as string,
  });

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
              const res = await getWaterDevices(targetSite);
              const items: WaterDeviceRecord[] = Array.isArray((res as any)?.items)
                ? ((res as any)?.items as WaterDeviceRecord[])
                : Array.isArray(res)
                ? (res as WaterDeviceRecord[])
                : [];
              aggregated.push(...items);
            } catch (err) {
              console.error("[WaterMeterPanel] failed to load water devices", {
                site: targetSite,
                err,
              });
            }
          })
        );

        if (cancelled) return;

        if (!aggregated.length) {
          return;
        }

        const latest = pickLatestWaterDevice(aggregated);
        const parsed = extractWaterSnapshot(latest);

        if (parsed) {
          setSnapshot(parsed);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[WaterMeterPanel] failed to load water devices", err);
      } finally {
        if (!cancelled) {
          timer = window.setTimeout(fetchDevices, 5000);
        }
      }
    };

    fetchDevices();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [siteTargetsKey]);

  useEffect(() => {
    if (!snapshot) {
      setThermoLeft({
        initialValue: 0,
        valueLabel: t("devices.waterMeter.domesticWater"),
        maxLabel: t("devices.waterMeter.ofMl", { max: 0 }) as string,
      });
      setThermoRight({
        initialValue: 0,
        valueLabel: t("devices.waterMeter.drinkingWater"),
        maxLabel: t("devices.waterMeter.ofMl", { max: 0 }) as string,
      });
      return;
    }

    const domesticValue = snapshot.domestic.consumptionLiters ?? 0;
    const domesticLabel =
      snapshot.domestic.maxLabel ??
      (t("devices.waterMeter.ofMl", {
        max: formatWithComma(domesticValue),
      }) as string);
    setThermoLeft({
      initialValue: domesticValue,
      valueLabel: t("devices.waterMeter.domesticWater"),
      maxLabel: domesticLabel,
    });

    const drinkingValue = snapshot.drinking.consumptionLiters ?? 0;
    const drinkingLabel =
      snapshot.drinking.maxLabel ??
      (t("devices.waterMeter.ofMl", {
        max: formatWithComma(drinkingValue),
      }) as string);
    setThermoRight({
      initialValue: drinkingValue,
      valueLabel: t("devices.waterMeter.drinkingWater"),
      maxLabel: drinkingLabel,
    });
  }, [snapshot, t]);

  const toNumber = (v: number | string) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const domesticSection = snapshot?.domestic;
  const drinkingSection = snapshot?.drinking;
  const domesticTotals = snapshot?.totals?.domestic ?? ZERO_TOTALS;
  const drinkingTotals = snapshot?.totals?.drinking ?? ZERO_TOTALS;

  const stackedCategories = snapshot?.stacked?.categories;
  const stackedSeries =
    snapshot?.stacked?.series && snapshot.stacked.series.length
      ? snapshot.stacked.series
      : DEFAULT_STACKED_SERIES;

  const radialValues =
    snapshot?.radial?.values && snapshot.radial.values.length
      ? snapshot.radial.values
      : [0, 0, 0];
  const radialLabels =
    snapshot?.radial?.labels && snapshot.radial.labels.length
      ? snapshot.radial.labels
      : [
          t("devices.waterMeter.series1", { defaultValue: "Series 1" }),
          t("devices.waterMeter.series2", { defaultValue: "Series 2" }),
          t("devices.waterMeter.series3", { defaultValue: "Series 3" }),
        ];
  const radialTotal = snapshot?.radial?.total ?? 0;
  const radialSum = radialValues.reduce(
    (acc, val) => acc + (typeof val === "number" ? val : 0),
    0
  );
  const radialDisplayValues =
    radialValues.some((val) => val > 100) && radialSum > 0
      ? radialValues.map((val) =>
          typeof val === "number" ? (val / radialSum) * 100 : 0
        )
      : radialValues;

  const usageCategories = snapshot?.usage?.categories;
  const usageSeries =
    snapshot?.usage?.series && snapshot.usage.series.length
      ? snapshot.usage.series
      : DEFAULT_AREA_SERIES;

  const domesticCards = [
    {
      img: phWaterDrop,
      value: formatDecimal(domesticSection?.ph, 2),
      rawValue: domesticSection?.ph ?? 0,
      valueLabel: t("devices.waterMeter.ph"),
    },
    {
      img: waterIcon,
      value:
        typeof domesticSection?.flowRateLpm === "number"
          ? formatWithComma(domesticSection.flowRateLpm)
          : "--",
      rawValue: domesticSection?.flowRateLpm ?? 0,
      valueLabel: t("devices.waterMeter.flowRate"),
      valueLabel2: t("devices.waterMeter.flowRateUnit"),
    },
  ];

  const drinkingCards = [
    {
      img: phWaterDrop,
      value: formatDecimal(drinkingSection?.ph, 2),
      rawValue: drinkingSection?.ph ?? 0,
      valueLabel: t("devices.waterMeter.ph"),
    },
    {
      img: TDSIcon,
      value:
        typeof drinkingSection?.tdsPpm === "number"
          ? formatWithComma(drinkingSection.tdsPpm)
          : "--",
      rawValue: drinkingSection?.tdsPpm ?? 0,
      valueLabel: t("devices.waterMeter.tds"),
      valueLabel2: t("devices.waterMeter.tdsUnit"),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 lg-1355:grid-cols-5 gap-3 mt-6">
        <div className="col-span-5 lg-1355:col-span-4 flex flex-col justify-center items-center bg-white rounded-xl gap-10 p-6">
          {/* ───── Time Range (Dropdown x2) ───── */}
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
                    {selected?.label ?? t("devices.waterMeter.selectTime")}
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
              {t("devices.waterMeter.to")}
            </span>

            {/* To */}
            <Dropdown
              options={toOptions.length > 0 ? toOptions : [{ label: fromTime, value: fromTime }]}
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
                    {selected?.label ?? t("devices.waterMeter.selectTime")}
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
            {/* ซ้าย */}
            <div className="flex flex-col items-center gap-20">
              <Thermostat
                key={`${thermoLeft.initialValue}-${thermoLeft.valueLabel}-${thermoLeft.maxLabel}`}
                initialValue={thermoLeft.initialValue}
                max={3000}
                maxLabel={thermoLeft.maxLabel}
                valueLabel={thermoLeft.valueLabel}
              />

              <div className="flex gap-5">
                {domesticCards.map((kpi, idx) => (
                  <CardValue
                    key={idx}
                    img={kpi.img}
                    value={kpi.value}
                    valueLabel={kpi.valueLabel}
                    valueLabel2={kpi.valueLabel2}
                    onClick={() =>
                      setThermoLeft({
                        initialValue: toNumber(kpi.rawValue ?? 0),
                        valueLabel: kpi.valueLabel,
                        maxLabel: kpi.valueLabel2 ?? "",
                      })
                    }
                  />
                ))}
              </div>
            </div>

            {/* ขวา */}
            <div className="flex flex-col items-center gap-20">
              <Thermostat
                key={`${thermoRight.initialValue}-${thermoRight.valueLabel}-${thermoRight.maxLabel}`}
                initialValue={thermoRight.initialValue}
                max={3000}
                maxLabel={thermoRight.maxLabel}
                valueLabel={thermoRight.valueLabel}
              />

              <div className="flex gap-5">
                {drinkingCards.map((kpi, idx) => (
                  <CardValue
                    key={idx}
                    img={kpi.img}
                    value={kpi.value}
                    valueLabel={kpi.valueLabel}
                    valueLabel2={kpi.valueLabel2}
                    onClick={() =>
                      setThermoRight({
                        initialValue: toNumber(kpi.rawValue ?? 0),
                        valueLabel: kpi.valueLabel,
                        maxLabel: kpi.valueLabel2 ?? "",
                      })
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 flex flex-wrap flex-row lg-1355:flex-col gap-3 ">
          {[
            {
              img: waterDrop,
              value: drinkingTotals.today,
              valueLabel: t("devices.waterMeter.drinkingToday"),
              unit: t("devices.waterMeter.literUnit"),
            },
            {
              img: waterECIcon,
              value: drinkingTotals.month,
              valueLabel: t("devices.waterMeter.drinkingMonth"),
              unit: t("devices.waterMeter.literUnit"),
            },
            {
              img: waterDrop,
              value: drinkingTotals.year,
              valueLabel: t("devices.waterMeter.drinkingYear"),
              unit: t("devices.waterMeter.literUnit"),
            },
            {
              img: waterDrop,
              value: domesticTotals.today,
              valueLabel: t("devices.waterMeter.domesticToday"),
              unit: t("devices.waterMeter.literUnit"),
            },
            {
              img: waterECIcon,
              value: domesticTotals.month,
              valueLabel: t("devices.waterMeter.domesticMonth"),
              unit: t("devices.waterMeter.literUnit"),
            },
            {
              img: waterDrop,
              value: domesticTotals.year,
              valueLabel: t("devices.waterMeter.domesticYear"),
              unit: t("devices.waterMeter.literUnit"),
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

      <div className="mt-6 grid grid-cols-6">
        <div className="col-span-6 sm-560:col-span-4">
          <WaterStackedChart
            height={460}
            title={t("devices.waterMeter.chart.title")}
            categories={stackedCategories}
            series={stackedSeries}
          />
        </div>
        <div className="flex col-span-6 sm-560:col-span-2 justify-center items-center">
          <WaterMultiRadial
            height={240}
            total={radialTotal}
            values={radialDisplayValues}
            labels={radialLabels}
            className="p-0 m-0"
          />
        </div>
      </div>

      <div className="mt-6">
        <WaterAreaStackedChart
          yTitle={t("devices.waterMeter.chart.yTitle")}
          height={340}
          categories={usageCategories}
          series={usageSeries}
        />
      </div>
    </>
  );
}
