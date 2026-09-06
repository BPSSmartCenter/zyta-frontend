import React from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useTranslation } from "react-i18next";
import SearchInput from "../../SearchInput";
import { getIoTDevices, type IoTDevice } from "../../../features/devices";
import { request } from "../../../lib/http";
import { useFilters } from "../../../context/FiltersContext";
import {
  UtilitySectionTitle,
  UtilitySurface,
} from "../../UtilityDashboard/UtilityDashboardLayout";

type Props = {
  timeRange?: { from: string; to: string };
  siteCode?: string;
};

type AirStatus = "good" | "medium" | "high" | "na";

type AirReading = {
  pm25?: number;
  pm10?: number;
  co2?: number;
  tvoc?: number;
  temperature?: number;
  humidity?: number;
  updatedAt?: string;
  capturedAt?: string;
};

type DeviceSnapshot = {
  device: IoTDevice;
  reading: AirReading;
  timestamp: number | null;
};

type WeatherSnapshot = {
  temperatureC?: number;
  humidityPercent?: number;
  windKmh?: number;
  observationTime?: string;
  code?: number;
  label?: string;
};

type TrendPoint = {
  timestamp: number;
  pm25: number | null;
  co2: number | null;
};

type AlertRow = {
  id: string;
  site: string;
  sensor: string;
  event: string;
  status: "warn" | "watch" | "ok";
  timestamp: number | null;
};

type Threshold = {
  medium: number;
  high: number;
};

const POLL_INTERVAL_MS = 30_000;
const TREND_BUCKET_MS = 5 * 60 * 1000;
const TREND_HISTORY_LIMIT = 72;
const TREND_MIN_POINTS = 2;

const BANGKOK_COORDS = {
  lat: 13.7563,
  lon: 100.5018,
  label: "Bangkok",
};

const THAILAND_COORDS = {
  lat: 15.87,
  lon: 100.9925,
  label: "Thailand",
};

const METRIC_THRESHOLDS: Record<"pm25" | "pm10" | "co2" | "tvoc", Threshold> = {
  pm25: { medium: 25, high: 50 },
  pm10: { medium: 50, high: 100 },
  co2: { medium: 1000, high: 1500 },
  tvoc: { medium: 0.3, high: 0.6 },
};

const TREND_COLORS = {
  pm25: "#10B981",
  co2: "#1D9BF0",
};

const METRIC_CARD_COLORS = {
  good: "border-[#D5F5EA] bg-[#ECFCF4]",
  medium: "border-[#FDE7C7] bg-[#FFF6E8]",
  high: "border-[#F9D0CE] bg-[#FFF1F0]",
  na: "border-slate-200 bg-slate-50",
} as const;

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

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const averageDefined = (values: Array<number | null | undefined>) => {
  const filtered = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
};

const deriveStatus = (value: number | null, threshold: Threshold): AirStatus => {
  if (value === null || !Number.isFinite(value)) return "na";
  if (value >= threshold.high) return "high";
  if (value >= threshold.medium) return "medium";
  return "good";
};

const formatMetricValue = (value: number | null, fractionDigits = 0) => {
  if (value === null || !Number.isFinite(value)) return "--";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatLastSync = (timestamp: number | null, locale: string) => {
  if (!timestamp) return "No recent sync";
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (diffMinutes <= 1) return "Last sync just now";
  if (diffMinutes < 60) return `Last sync ${diffMinutes} min ago`;
  return `Last sync ${new Date(timestamp).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const readingTimestamp = (device: IoTDevice, reading: AirReading): number | null => {
  const candidates = [
    reading.capturedAt,
    reading.updatedAt,
    typeof device.timestamp === "string" ? device.timestamp : undefined,
    typeof device.snapshot?.timestamp === "string" ? device.snapshot.timestamp : undefined,
    typeof device.snapshot?.updatedAt === "string" ? device.snapshot.updatedAt : undefined,
  ];
  for (const value of candidates) {
    if (!value) continue;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
};

const parseReadingFromDevice = (device: IoTDevice): AirReading => {
  const snapshot = device.snapshot ?? {};
  return {
    pm25: coerceNumber(snapshot.pm25),
    pm10: coerceNumber(snapshot.pm10),
    co2: coerceNumber(snapshot.eco2 ?? snapshot.co2),
    tvoc: coerceNumber(snapshot.tvoc ?? snapshot.voc),
    temperature: coerceNumber(snapshot.temp_indoor ?? snapshot.temperature),
    humidity: coerceNumber(
      snapshot.relative_humidity ?? snapshot.humidity ?? snapshot.rh
    ),
    updatedAt:
      typeof snapshot.updatedAt === "string"
        ? snapshot.updatedAt
        : typeof device.timestamp === "string"
          ? device.timestamp
          : undefined,
    capturedAt:
      typeof snapshot.capturedAt === "string"
        ? snapshot.capturedAt
        : typeof snapshot.timestamp === "string"
          ? snapshot.timestamp
          : undefined,
  };
};

const siteMatches = (device: IoTDevice, siteKey: string | undefined) => {
  if (!siteKey || siteKey === "all") return true;
  const candidates = [
    device.siteCode,
    device.siteId,
    device.site_id,
    device.site,
    device.siteName,
    device.meta?.siteCode,
    device.meta?.siteId,
    device.meta?.siteName,
  ];
  return candidates.some((candidate) => String(candidate ?? "").trim() === siteKey);
};

const extractSiteLabel = (device: IoTDevice, fallback: string) =>
  String(
    device.siteName ??
      device.site ??
      device.meta?.siteName ??
      device.siteCode ??
      device.siteId ??
      fallback
  ).trim() || fallback;

// Observation date and time of the forecast provider's current conditions.
const formatWeatherTime = (value?: string, locale = "en-US") => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Grid classes must be literal for Tailwind; pick by how many cards survived the "no data" filter.
const GRID_BY_COUNT: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};
const gridColsFor = (count: number) => GRID_BY_COUNT[Math.max(1, Math.min(6, count))];

const getWeatherIconLabel = (code?: number) => {
  if (code == null) return "sun";
  if ([95, 96, 99].includes(code)) return "storm";
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    [85, 86].includes(code)
  ) {
    return "rain";
  }
  return "sun";
};

const buildSeedTrend = (snapshots: DeviceSnapshot[]) => {
  const buckets = new Map<number, { pm25: number[]; co2: number[] }>();
  for (const snapshot of snapshots) {
    if (!snapshot.timestamp) continue;
    const key = Math.floor(snapshot.timestamp / TREND_BUCKET_MS) * TREND_BUCKET_MS;
    const bucket = buckets.get(key) ?? { pm25: [], co2: [] };
    if (typeof snapshot.reading.pm25 === "number") bucket.pm25.push(snapshot.reading.pm25);
    if (typeof snapshot.reading.co2 === "number") bucket.co2.push(snapshot.reading.co2);
    buckets.set(key, bucket);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, values]) => ({
      timestamp,
      pm25: averageDefined(values.pm25),
      co2: averageDefined(values.co2),
    }));
};

const niceAxisMax = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
};

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 22s-7-8.5-7-13a7 7 0 1 1 14 0c0 4.5-7 13-7 13Zm0-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function WindIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 8h10a3 3 0 1 0-3-3" />
      <path d="M2 12h14a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M4 16h7a2 2 0 1 1-2 2" />
    </svg>
  );
}

function DropletIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3s5 5.4 5 9.2a5 5 0 0 1-10 0C7 8.4 12 3 12 3Z" />
    </svg>
  );
}

function AirIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 8h10a3 3 0 1 0-3-3" />
      <path d="M2 12h14a2.5 2.5 0 1 1-2.5 2.5" />
      <path d="M4 16h7a2 2 0 1 1-2 2" />
    </svg>
  );
}

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </svg>
  );
}

function RainIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16a4 4 0 1 1 .8-7.9A5 5 0 0 1 17.8 10H18a3 3 0 1 1 0 6Z" />
      <path d="M8 19l-.5 2M12 19l-.5 2M16 19l-.5 2" />
    </svg>
  );
}

function StormIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16a4 4 0 1 1 .8-7.9A5 5 0 0 1 17.8 10H18a3 3 0 1 1 0 6Z" />
      <path d="m11 13-2 4h3l-1 4 4-6h-3l1-2" />
    </svg>
  );
}

function RingGauge({
  value,
  max,
  unit,
  label,
  color,
}: {
  value: number | null;
  max: number;
  unit: string;
  label: string;
  color: string;
}) {
  const numeric = value ?? 0;
  const safeProgress = Math.max(0, Math.min(100, (numeric / Math.max(max, 1)) * 100));
  return (
    <div
      className="grid size-[132px] shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${safeProgress * 3.6}deg, rgba(226,232,240,0.7) 0deg)`,
      }}
    >
      <div className="grid size-[108px] place-items-center rounded-full bg-white">
        <div className="text-center leading-tight">
          <div className="text-[13px] font-medium text-slate-400">{label}</div>
          <div className="mt-2 text-[34px] font-semibold text-slate-900">
            {value === null ? "--" : formatMetricValue(value, value < 1 ? 2 : 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{unit}</div>
        </div>
      </div>
    </div>
  );
}

function WeatherBadge({
  label,
  temp,
  subtitle,
  wind,
  humidity,
  tone,
  location,
}: {
  label: string;
  temp: string;
  subtitle: string;
  wind: string;
  humidity: string;
  tone: "blue" | "amber";
  location: string;
}) {
  const isBlue = tone === "blue";
  return (
    <UtilitySurface
      className={[
        "overflow-hidden border-0 p-0",
        isBlue
          ? "bg-[linear-gradient(135deg,#22A9E0_0%,#1593D6_100%)]"
          : "bg-[linear-gradient(135deg,#FDBA17_0%,#F59E0B_100%)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-6 py-5 text-white">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white/90">
            <PinIcon className="h-4 w-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-4 text-[15px] font-medium">
            <span className="inline-flex items-center gap-2">
              <WindIcon className="h-4 w-4" />
              {wind}
            </span>
            <span className="inline-flex items-center gap-2">
              <DropletIcon className="h-4 w-4" />
              {humidity}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-white/90">{label}</div>
          <div className="mt-1 text-[42px] font-semibold leading-none">{temp}</div>
          <div className="mt-1 text-sm text-white/85">{subtitle}</div>
        </div>
      </div>
    </UtilitySurface>
  );
}

function AirTrendChart({
  categories,
  pm25Series,
  co2Series,
}: {
  categories: string[];
  pm25Series: number[];
  co2Series: number[];
}) {
  const maxPm25 = Math.max(20, ...pm25Series.map((value) => Number(value || 0)));
  const maxCo2 = Math.max(600, ...co2Series.map((value) => Number(value || 0)));
  const formatPm25AxisTick = React.useCallback((value: number) => {
    if (!Number.isFinite(value)) return "0";
    const rounded = Math.round(value * 10) / 10;
    return rounded.toLocaleString("en-US", {
      minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
      maximumFractionDigits: 1,
    });
  }, []);
  const formatCo2AxisTick = React.useCallback((value: number) => {
    if (!Number.isFinite(value)) return "0";
    return Math.round(value).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });
  }, []);
  const options = React.useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: true },
        fontFamily: "Inter, ui-sans-serif, system-ui",
      },
      colors: [TREND_COLORS.pm25, TREND_COLORS.co2],
      dataLabels: { enabled: false },
      stroke: {
        curve: "smooth",
        width: [3, 3],
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.25,
          opacityTo: 0.04,
          stops: [0, 90, 100],
        },
      },
      markers: { size: 0 },
      grid: {
        borderColor: "rgba(148,163,184,0.18)",
        strokeDashArray: 4,
        padding: { left: 8, right: 8, top: 8, bottom: 0 },
      },
      legend: { show: false },
      xaxis: {
        categories,
        axisTicks: { show: false },
        axisBorder: { show: false },
        labels: {
          style: { fontSize: "12px", colors: "#94A3B8" },
        },
      },
      yaxis: [
        {
          min: 0,
          max: niceAxisMax(maxPm25 * 1.1),
          tickAmount: 4,
          labels: {
            style: { fontSize: "12px", colors: "#94A3B8" },
            formatter: (value) => formatPm25AxisTick(Number(value)),
          },
          title: {
            text: "PM 2.5",
            style: { color: "#94A3B8", fontWeight: 500 },
          },
        },
        {
          opposite: true,
          min: 0,
          max: niceAxisMax(maxCo2 * 1.1),
          tickAmount: 4,
          labels: {
            style: { fontSize: "12px", colors: "#94A3B8" },
            formatter: (value) => formatCo2AxisTick(Number(value)),
          },
          title: {
            text: "CO2",
            style: { color: "#94A3B8", fontWeight: 500 },
          },
        },
      ],
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (value: number, ctx) =>
            ctx.seriesIndex === 0
              ? `${formatMetricValue(value, 1)} µg/m³`
              : `${formatMetricValue(value, 0)} ppm`,
        },
      },
    }),
    [categories, formatCo2AxisTick, formatPm25AxisTick, maxCo2, maxPm25]
  );

  const series = React.useMemo(
    () => [
      { name: "PM 2.5", data: pm25Series },
      { name: "CO2", data: co2Series },
    ],
    [co2Series, pm25Series]
  );

  return <ReactApexChart type="area" height={360} options={options} series={series} />;
}

export default function AirPanel({ siteCode }: Props) {
  const { t, i18n } = useTranslation("devices");
  const { selectedSite } = useFilters();
  const locale = i18n.language || "en-US";
  const scopedSiteKey =
    siteCode ?? (selectedSite && selectedSite !== "all" ? selectedSite : "all");
  const trendStorageKey = `air-panel:trend:${scopedSiteKey}`;

  const [deviceSnapshots, setDeviceSnapshots] = React.useState<DeviceSnapshot[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [weatherBangkok, setWeatherBangkok] = React.useState<WeatherSnapshot | null>(null);
  const [weatherThailand, setWeatherThailand] = React.useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [lastTrendSampleAt, setLastTrendSampleAt] = React.useState<number>(0);
  const [trendHistory, setTrendHistory] = React.useState<TrendPoint[]>(() => {
    return readSessionJson<TrendPoint[]>(trendStorageKey) ?? [];
  });

  React.useEffect(() => {
    setTrendHistory(readSessionJson<TrendPoint[]>(trendStorageKey) ?? []);
  }, [trendStorageKey]);

  React.useEffect(() => {
    let cancelled = false;

    const fetchWeather = async (coords: typeof BANGKOK_COORDS) => {
      // V1: backend wraps Open-Meteo (cache + privacy). The http wrapper
      // already unwraps the v1 envelope, so `data` here is the upstream payload.
      const data = await request<Record<string, any>>("/weather/forecast", {
        params: { lat: coords.lat, lng: coords.lon },
      });
      const current =
        data?.current ??
        (data?.current_weather
          ? {
              temperature_2m: data.current_weather.temperature,
              wind_speed_10m: data.current_weather.windspeed,
              time: data.current_weather.time,
              weather_code: data.current_weather.weathercode,
            }
          : null);
      if (!current) return null;
      return {
        temperatureC: coerceNumber(current.temperature_2m),
        humidityPercent: coerceNumber(current.relative_humidity_2m),
        windKmh: coerceNumber(current.wind_speed_10m),
        observationTime:
          typeof current.time === "string" ? current.time : undefined,
        code: coerceNumber(current.weather_code),
        label: coords.label,
      } satisfies WeatherSnapshot;
    };

    setWeatherLoading(true);
    Promise.all([fetchWeather(BANGKOK_COORDS), fetchWeather(THAILAND_COORDS)])
      .then(([bangkok, thailand]) => {
        if (cancelled) return;
        setWeatherBangkok(bangkok);
        setWeatherThailand(thailand);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[AirPanel] weather fetch failed", error);
        setWeatherBangkok(null);
        setWeatherThailand(null);
      })
      .finally(() => {
        if (!cancelled) setWeatherLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchDevices = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const allDevices = await getIoTDevices();
        if (cancelled) return;
        const airDevices = allDevices.filter(
          (device) =>
            device.snapshot &&
            (device.snapshot.pm25 !== undefined ||
              device.snapshot.eco2 !== undefined ||
              device.snapshot.tvoc !== undefined ||
              device.snapshot.pm10 !== undefined)
        );
        const nextSnapshots = airDevices.map((device) => {
          const reading = parseReadingFromDevice(device);
          return {
            device,
            reading,
            timestamp: readingTimestamp(device, reading) ?? Date.now(),
          } satisfies DeviceSnapshot;
        });
        setDeviceSnapshots(nextSnapshots);
        setLastTrendSampleAt(Date.now());
      } catch (error) {
        if (cancelled) return;
        console.error("[AirPanel] failed to load devices", error);
        setLoadError(
          t("devices.air.fetchError", {
            defaultValue: "Unable to load air sensor data",
          })
        );
        setDeviceSnapshots([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = window.setTimeout(fetchDevices, POLL_INTERVAL_MS);
        }
      }
    };

    fetchDevices();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [t]);

  const scopedSnapshots = React.useMemo(() => {
    const matched = deviceSnapshots.filter((snapshot) =>
      siteMatches(snapshot.device, scopedSiteKey)
    );
    return matched.length ? matched : deviceSnapshots;
  }, [deviceSnapshots, scopedSiteKey]);

  const airSummary = React.useMemo(() => {
    const pm25 = averageDefined(scopedSnapshots.map((snapshot) => snapshot.reading.pm25));
    const pm10 = averageDefined(scopedSnapshots.map((snapshot) => snapshot.reading.pm10));
    const co2 = averageDefined(scopedSnapshots.map((snapshot) => snapshot.reading.co2));
    const tvoc = averageDefined(scopedSnapshots.map((snapshot) => snapshot.reading.tvoc));
    const temperature = averageDefined(
      scopedSnapshots.map((snapshot) => snapshot.reading.temperature)
    );
    const humidity = averageDefined(
      scopedSnapshots.map((snapshot) => snapshot.reading.humidity)
    );
    const latestTimestamp = scopedSnapshots.reduce<number | null>(
      (max, snapshot) =>
        typeof snapshot.timestamp === "number"
          ? max === null || snapshot.timestamp > max
            ? snapshot.timestamp
            : max
          : max,
      null
    );
    return { pm25, pm10, co2, tvoc, temperature, humidity, latestTimestamp };
  }, [scopedSnapshots]);

  React.useEffect(() => {
    if (!lastTrendSampleAt) return;
    const pointTimestamp =
      Math.floor(lastTrendSampleAt / POLL_INTERVAL_MS) * POLL_INTERVAL_MS;
    const nextPoint: TrendPoint = {
      timestamp: pointTimestamp,
      pm25: airSummary.pm25,
      co2: airSummary.co2,
    };

    setTrendHistory((current) => {
      const base = current.length
        ? current
        : readSessionJson<TrendPoint[]>(trendStorageKey) ?? [];
      const next = [...base];
      const lastIndex = next.findIndex((point) => point.timestamp === pointTimestamp);
      if (lastIndex >= 0) {
        next[lastIndex] = nextPoint;
      } else {
        next.push(nextPoint);
      }
      const trimmed = next
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-TREND_HISTORY_LIMIT);
      writeSessionJson(trendStorageKey, trimmed);
      return trimmed;
    });
  }, [airSummary.co2, airSummary.pm25, lastTrendSampleAt, trendStorageKey]);

  const seedTrend = React.useMemo(() => buildSeedTrend(scopedSnapshots), [scopedSnapshots]);

  const trendPoints = React.useMemo(() => {
    const merged = new Map<number, TrendPoint>();
    for (const point of [...seedTrend, ...trendHistory]) {
      merged.set(point.timestamp, point);
    }
    const sorted = Array.from(merged.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-TREND_HISTORY_LIMIT);
    if (sorted.length === 1) {
      const first = sorted[0];
      return [
        {
          timestamp: first.timestamp - POLL_INTERVAL_MS,
          pm25: first.pm25,
          co2: first.co2,
        },
        first,
      ];
    }
    return sorted;
  }, [seedTrend, trendHistory]);

  const trendCategories = React.useMemo(
    () =>
      trendPoints.map((point) =>
        new Date(point.timestamp).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        })
      ),
    [locale, trendPoints]
  );

  const trendPm25Series = React.useMemo(
    () => trendPoints.map((point) => Number(point.pm25 ?? 0)),
    [trendPoints]
  );
  const trendCo2Series = React.useMemo(
    () => trendPoints.map((point) => Number(point.co2 ?? 0)),
    [trendPoints]
  );

  const pm25Status = deriveStatus(airSummary.pm25, METRIC_THRESHOLDS.pm25);
  const co2Status = deriveStatus(airSummary.co2, METRIC_THRESHOLDS.co2);
  const tvocStatus = deriveStatus(airSummary.tvoc, METRIC_THRESHOLDS.tvoc);
  const pm10Status = deriveStatus(airSummary.pm10, METRIC_THRESHOLDS.pm10);

  const statusLabel = React.useCallback(
    (status: AirStatus) => {
      if (status === "good") {
        return t("devices.air.status.good", { defaultValue: "Good" });
      }
      if (status === "medium") {
        return t("devices.air.status.medium", { defaultValue: "Moderate" });
      }
      if (status === "high") {
        return t("devices.air.status.high", { defaultValue: "High" });
      }
      return t("devices.air.status.na", { defaultValue: "No data" });
    },
    [t]
  );

  const primaryCards = React.useMemo(
    () => [
      {
        key: "pm25",
        title: "PM 2.5",
        value: airSummary.pm25,
        unit: "µg/m³",
        status: pm25Status,
        threshold: METRIC_THRESHOLDS.pm25,
      },
      {
        key: "tvoc",
        title: "TVOC",
        value: airSummary.tvoc,
        unit: "µg/m³",
        status: tvocStatus,
        threshold: METRIC_THRESHOLDS.tvoc,
      },
    ].filter((card) => card.value !== null),
    [airSummary.pm25, airSummary.tvoc, pm25Status, tvocStatus]
  );

  const metricCards = React.useMemo(
    () => [
      {
        key: "pm25",
        label: "PM 2.5",
        value: airSummary.pm25,
        unit: "µg/m³",
        status: pm25Status,
      },
      {
        key: "co2",
        label: "CO2",
        value: airSummary.co2,
        unit: "ppm",
        status: co2Status,
      },
      {
        key: "pm10",
        label: "PM 10",
        value: airSummary.pm10,
        unit: "µg/m³",
        status: pm10Status,
      },
      {
        key: "tvoc",
        label: "TVOC",
        value: airSummary.tvoc,
        unit: "µg/m³",
        status: tvocStatus,
      },
    ].filter((metric) => metric.value !== null),
    [
      airSummary.co2,
      airSummary.pm10,
      airSummary.pm25,
      airSummary.tvoc,
      co2Status,
      pm10Status,
      pm25Status,
      tvocStatus,
    ]
  );

  const weatherDisplay = React.useMemo(() => {
    const snapshot = weatherBangkok ?? weatherThailand;
    const label = snapshot?.label ?? BANGKOK_COORDS.label;
    const iconName = getWeatherIconLabel(snapshot?.code);
    return {
      label,
      temp:
        typeof snapshot?.temperatureC === "number"
          ? `${Math.round(snapshot.temperatureC)}°`
          : "--",
      wind:
        typeof snapshot?.windKmh === "number"
          ? `${Math.round(snapshot.windKmh)} km/h`
          : "-- km/h",
      humidity:
        typeof snapshot?.humidityPercent === "number"
          ? `${Math.round(snapshot.humidityPercent)}%`
          : "--%",
      time: formatWeatherTime(snapshot?.observationTime, locale),
      iconName,
    };
  }, [locale, weatherBangkok, weatherThailand]);

  const alertRows = React.useMemo(() => {
    const rows: AlertRow[] = [];
    for (const snapshot of scopedSnapshots) {
      const sensorName =
        String(
          snapshot.device.name ??
            snapshot.device.deviceId ??
            snapshot.device.id ??
            "Air Sensor"
        ) || "Air Sensor";
      const siteLabel = extractSiteLabel(snapshot.device, scopedSiteKey);
      const timestamp = snapshot.timestamp;

      if (String(snapshot.device.status || "").toLowerCase() === "offline") {
        rows.push({
          id: `${sensorName}-offline`,
          site: siteLabel,
          sensor: sensorName,
          event: "Sensor offline",
          status: "warn",
          timestamp,
        });
      }

      const definitions: Array<{
        key: "pm25" | "pm10" | "co2" | "tvoc";
        label: string;
        status: AirStatus;
        value: number | undefined;
      }> = [
        { key: "pm25", label: "PM2.5 spike", status: deriveStatus(snapshot.reading.pm25 ?? null, METRIC_THRESHOLDS.pm25), value: snapshot.reading.pm25 },
        { key: "pm10", label: "PM10 elevated", status: deriveStatus(snapshot.reading.pm10 ?? null, METRIC_THRESHOLDS.pm10), value: snapshot.reading.pm10 },
        { key: "co2", label: "CO2 elevated", status: deriveStatus(snapshot.reading.co2 ?? null, METRIC_THRESHOLDS.co2), value: snapshot.reading.co2 },
        { key: "tvoc", label: "TVOC elevated", status: deriveStatus(snapshot.reading.tvoc ?? null, METRIC_THRESHOLDS.tvoc), value: snapshot.reading.tvoc },
      ];

      for (const definition of definitions) {
        if (definition.status === "good" || definition.status === "na") continue;
        rows.push({
          id: `${sensorName}-${definition.key}-${timestamp ?? "na"}`,
          site: siteLabel,
          sensor: sensorName,
          event: definition.label,
          status: definition.status === "high" ? "warn" : "watch",
          timestamp,
        });
      }
    }

    return rows.sort((a, b) => {
      const severity = { warn: 0, watch: 1, ok: 2 } as const;
      const bySeverity = severity[a.status] - severity[b.status];
      if (bySeverity !== 0) return bySeverity;
      return (b.timestamp ?? 0) - (a.timestamp ?? 0);
    });
  }, [scopedSiteKey, scopedSnapshots]);

  const filteredRows = React.useMemo(() => {
    if (!query.trim()) return alertRows;
    const lowered = query.trim().toLowerCase();
    return alertRows.filter((row) =>
      [row.site, row.sensor, row.event].some((value) =>
        value.toLowerCase().includes(lowered)
      )
    );
  }, [alertRows, query]);

  React.useEffect(() => {
    setPage(1);
  }, [query]);

  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );

  return (
    <div className="mt-6 space-y-4">
      <div
        className={[
          "grid grid-cols-1 gap-4",
          primaryCards.length >= 2
            ? "xl:grid-cols-[1fr_1fr_0.95fr]"
            : primaryCards.length === 1
              ? "xl:grid-cols-[1fr_0.95fr]"
              : "xl:grid-cols-1",
        ].join(" ")}
      >
        {primaryCards.map((card) => {
          const color =
            card.status === "high"
              ? "#F97316"
              : card.status === "medium"
                ? "#FDB022"
                : "#22C55E";
          return (
            <UtilitySurface key={card.key} className="overflow-hidden p-6">
              <div className="flex h-full items-center gap-6">
                <RingGauge
                  value={card.value}
                  max={card.threshold.high}
                  unit={card.unit}
                  label={card.title}
                  color={color}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {t("devices.air.liveReading", { defaultValue: "Live reading" })}
                  </div>
                  <div className="mt-2 text-[24px] font-semibold text-slate-900">
                    {card.title}
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-4">
                    <span className="text-[15px] font-medium text-slate-500">
                      {t("devices.air.quality", { defaultValue: "Quality" })}
                    </span>
                    <span
                      className={[
                        "text-[18px] font-semibold",
                        card.status === "high"
                          ? "text-orange-500"
                          : card.status === "medium"
                            ? "text-amber-500"
                            : "text-emerald-500",
                      ].join(" ")}
                    >
                      {statusLabel(card.status)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-50">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(
                          12,
                          Math.min(
                            100,
                            ((card.value ?? 0) / Math.max(card.threshold.high, 1)) * 100
                          )
                        )}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <div className="mt-4 text-sm font-medium text-slate-400">
                    {formatLastSync(airSummary.latestTimestamp, locale)}
                  </div>
                </div>
              </div>
            </UtilitySurface>
          );
        })}

        <UtilitySurface className="overflow-hidden border-0 p-0">
          <div className="relative h-full bg-[linear-gradient(135deg,#14A4E4_0%,#1287D0_100%)] px-7 py-6 text-white">
            <div className="absolute right-3 top-0 h-40 w-40 rounded-full bg-white/8" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <PinIcon className="h-5 w-5" />
                <span>{weatherDisplay.label}</span>
              </div>
              <div className="mt-6 flex items-center gap-5">
                <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-white/15">
                  {weatherDisplay.iconName === "rain" ? (
                    <RainIcon className="h-10 w-10" />
                  ) : weatherDisplay.iconName === "storm" ? (
                    <StormIcon className="h-10 w-10" />
                  ) : (
                    <SunIcon className="h-10 w-10" />
                  )}
                </div>
                <div>
                  <div className="text-lg text-white/90">Today</div>
                  <div className="mt-1 text-[52px] font-semibold leading-none">
                    {weatherDisplay.temp}
                  </div>
                  <div className="mt-2 text-lg text-white/90">
                    {weatherLoading
                      ? t("devices.air.loading", { defaultValue: "Loading..." })
                      : weatherDisplay.time}
                  </div>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-6 text-[28px] font-medium leading-none">
                <span className="inline-flex items-center gap-2 text-[16px]">
                  <WindIcon className="h-4 w-4" />
                  {weatherDisplay.wind}
                </span>
                <span className="inline-flex items-center gap-2 text-[16px]">
                  <DropletIcon className="h-4 w-4" />
                  {weatherDisplay.humidity}
                </span>
              </div>
            </div>
          </div>
        </UtilitySurface>
      </div>

      <div
        className={["grid grid-cols-1 gap-4 md:grid-cols-2", gridColsFor(metricCards.length)].join(" ")}
        hidden={metricCards.length === 0}
      >
        {metricCards.map((metric) => (
          <UtilitySurface
            key={metric.key}
            className={["px-6 py-5", METRIC_CARD_COLORS[metric.status]].join(" ")}
          >
            <div className="flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-white text-emerald-500 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                <AirIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-end gap-2">
                  <span className="text-[34px] font-semibold leading-none text-slate-900">
                    {formatMetricValue(metric.value, metric.value !== null && metric.value < 1 ? 2 : 0)}
                  </span>
                  <span className="mb-1 text-base text-slate-500">{metric.unit}</span>
                </div>
                <div className="mt-2 text-[15px] font-medium text-slate-500">
                  {metric.label} · {statusLabel(metric.status)}
                </div>
              </div>
            </div>
          </UtilitySurface>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <WeatherBadge
          label="Live weather"
          temp={
            typeof weatherBangkok?.temperatureC === "number"
              ? `${Math.round(weatherBangkok.temperatureC)}°`
              : "--"
          }
          subtitle={
            weatherBangkok?.observationTime
              ? formatWeatherTime(weatherBangkok.observationTime, locale)
              : "-"
          }
          wind={
            typeof weatherBangkok?.windKmh === "number"
              ? `${Math.round(weatherBangkok.windKmh)} km/h`
              : "-- km/h"
          }
          humidity={
            typeof weatherBangkok?.humidityPercent === "number"
              ? `${Math.round(weatherBangkok.humidityPercent)}%`
              : "--%"
          }
          tone="blue"
          location={BANGKOK_COORDS.label}
        />
        <WeatherBadge
          label="Regional weather"
          temp={
            typeof weatherThailand?.temperatureC === "number"
              ? `${Math.round(weatherThailand.temperatureC)}°`
              : "--"
          }
          subtitle={
            weatherThailand?.observationTime
              ? formatWeatherTime(weatherThailand.observationTime, locale)
              : "-"
          }
          wind={
            typeof weatherThailand?.windKmh === "number"
              ? `${Math.round(weatherThailand.windKmh)} km/h`
              : "-- km/h"
          }
          humidity={
            typeof weatherThailand?.humidityPercent === "number"
              ? `${Math.round(weatherThailand.humidityPercent)}%`
              : "--%"
          }
          tone="amber"
          location={THAILAND_COORDS.label}
        />
      </div>

      <UtilitySurface>
        <UtilitySectionTitle
          title={t("devices.air.trendTitle", { defaultValue: "Air quality trend" })}
          subtitle={t("devices.air.trendSubtitle", {
            defaultValue: "Live session · PM2.5 vs CO2",
          })}
          right={
            <div className="flex items-center gap-5 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#10B981]" />
                PM 2.5
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#1D9BF0]" />
                CO2
              </span>
            </div>
          }
        />
        {trendPoints.length >= TREND_MIN_POINTS ? (
          <AirTrendChart
            categories={trendCategories}
            pm25Series={trendPm25Series}
            co2Series={trendCo2Series}
          />
        ) : (
          <div className="grid h-[360px] place-items-center rounded-[18px] border border-slate-200 bg-slate-50 text-center text-sm text-slate-400">
            <div>
              <div>{t("devices.air.trendWaiting", { defaultValue: "Trend will populate as live readings arrive" })}</div>
              <div className="mt-1">{loading ? t("devices.air.loading", { defaultValue: "Loading..." }) : formatLastSync(airSummary.latestTimestamp, locale)}</div>
            </div>
          </div>
        )}
      </UtilitySurface>

      <UtilitySurface>
        <UtilitySectionTitle
          title={t("devices.air.alertLogTitle", {
            defaultValue: "Consolidated Alert Log",
          })}
          subtitle={t("devices.air.alertLogSubtitle", {
            defaultValue: "Current air sensor alerts across this scope",
          })}
          right={
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={t("devices.air.alertSearch", {
                defaultValue: "Search sensor or event...",
              })}
              className="w-full min-w-[280px] md:w-[320px]"
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
                <th className="px-5 py-4">Sensor</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-700">
              {pageRows.length ? (
                pageRows.map((row, index) => (
                  <tr key={row.id}>
                    <td className="px-5 py-4">{String((clampedPage - 1) * pageSize + index + 1).padStart(2, "0")}</td>
                    <td className="px-5 py-4">{row.site}</td>
                    <td className="px-5 py-4">{row.event}</td>
                    <td className="px-5 py-4">{row.sensor}</td>
                    <td className="px-5 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                          row.status === "warn"
                            ? "bg-amber-50 text-amber-700"
                            : row.status === "watch"
                              ? "bg-sky-50 text-sky-700"
                              : "bg-emerald-50 text-emerald-700",
                        ].join(" ")}
                      >
                        {row.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {row.timestamp
                        ? new Date(row.timestamp).toLocaleString(locale)
                        : "--"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-5 py-12 text-center text-sm text-slate-400"
                    colSpan={6}
                  >
                    {loadError ??
                      t("devices.air.noAlerts", {
                        defaultValue: "No active air sensor alerts",
                      })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {t("devices.air.pager", {
                defaultValue: "Page {{page}} of {{pageCount}}",
                page: clampedPage,
                pageCount,
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={clampedPage <= 1}
                className="rounded-[12px] border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("devices.air.prev", { defaultValue: "Previous" })}
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={clampedPage >= pageCount}
                className="rounded-[12px] border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("devices.air.next", { defaultValue: "Next" })}
              </button>
            </div>
          </div>
        ) : null}
      </UtilitySurface>
    </div>
  );
}
