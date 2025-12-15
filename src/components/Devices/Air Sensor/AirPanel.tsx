import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Dropdown from "../../Dropdown";
import Thermostat from "../../Themorstats";
import ThermostatAir from "../../ThermostatAir";
import waterDrop from "../../../assets/waterDrop.png";
import { windSelected } from "../../../assets";
import { cloudyDay1, rainyDay1, thunderDay1 } from "../../../assets/index";
import { getIoTDevices, type IoTDevice } from "../../../api/iot"; // Updated import
import { useFilters } from "../../../context/FiltersContext";

type Props = {
  timeRange?: { from: string; to: string };
  siteCode?: string;
};

type CardValueProps = {
  img?: string;
  imgLabel?: string;
  value: number | string;
  valueLabel: string;
  valueLabel2?: string;
  onClick?: () => void;
};

type AirStatus = "good" | "medium" | "high" | "na";

type AirReading = Partial<Record<AirKpiKey, number>> & {
  humidity?: number;
  temperature?: number;
  co2?: number;
  voc?: number;
  pressure?: number;
  updatedAt?: string;
  capturedAt?: string;
  status?: Partial<Record<AirKpiKey, AirStatus>>;
  source?: string;
  // Extra fields from IoT
  mode?: string;
  anion?: boolean;
  uv_light?: boolean;
  filter_reset?: boolean;
  fault?: number;
};

type DeviceSnapshot = {
  device: IoTDevice; // Updated to IoTDevice
  reading: AirReading;
  timestamp: number | null;
};

type WeatherSnapshot = {
  temperatureC?: number;
  humidityPercent?: number;
  windKmh?: number;
  observationTime?: string;
  label?: string;
  code?: number;
};

const AIR_THRESHOLDS = {
  pm25: { medium: 25, high: 50 },
  co2: { medium: 1000, high: 1500 },
} as const;

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

type AirKpiKey = keyof typeof AIR_THRESHOLDS;

const KPI_CONFIG: Array<{
  key: AirKpiKey;
  label: string;
  unitKey: string;
  thresholds: (typeof AIR_THRESHOLDS)[AirKpiKey];
}> = [
    {
      key: "pm25",
      label: "PM 2.5",
      unitKey: "devices.air.units.ugm3",
      thresholds: AIR_THRESHOLDS.pm25,
    },
    {
      key: "co2",
      label: "CO2",
      unitKey: "ppm",
      thresholds: AIR_THRESHOLDS.co2,
    },
  ];

function CardValue({
  img,
  imgLabel,
  value,
  valueLabel,
  valueLabel2,
  onClick,
}: CardValueProps) {
  const showImage = !!img;

  return (
    <div
      className="bg-cyan rounded-lg w-[180px] h-[190px] p-5 flex flex-col text-white gap-2 cursor-pointer hover:brightness-90 transition"
      onClick={onClick}
    >
      {showImage ? (
        <div className="bg-white w-[50px] rounded-full">
          <img src={img} className="p-3 w-full" alt={imgLabel ?? ""} />
        </div>
      ) : (
        <div className="select-none bg-white w-[50px] h-[50px] rounded-full flex items-center justify-center">
          <span className="text-[15px] font-bold text-[#A9DB4E] text-center px-1">
            {imgLabel ?? ""}
          </span>
        </div>
      )}

      <h1 className="text-[24px] font-bold select-none">{value}</h1>
      <span className="select-none">
        {valueLabel} {valueLabel2 ? <p>{valueLabel2}</p> : null}
      </span>
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

const buildDateWithTime = (baseDay: Date, label: string) => {
  const { hours, minutes } = parseTimeLabel(label);
  const next = new Date(baseDay);
  next.setHours(hours, minutes, 0, 0);
  return next;
};

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};


const parseReadingFromDevice = (
  device?: IoTDevice | null
): AirReading => {
  if (!device || !device.snapshot) return {};

  const snap = device.snapshot;

  // Mapping based on user request:
  // "eco2": 0, "pm25": 10, "tvoc": 0, "temp_indoor": 29
  // "mode", "anion", "fault", "switch", "uv_light", "air_quality", "filter_reset"

  const reading: AirReading = {
    pm25: coerceNumber(snap.pm25),
    // Map eco2 -> co2
    co2: coerceNumber(snap.eco2),
    // Map tvoc -> voc
    voc: coerceNumber(snap.tvoc),
    // Map temp_indoor -> temperature
    temperature: coerceNumber(snap.temp_indoor),

    // Other fields
    mode: typeof snap.mode === 'string' ? snap.mode : undefined,
    anion: snap.anion === true || snap.anion === 'true',
    uv_light: snap.uv_light === true || snap.uv_light === 'true',
    filter_reset: snap.filter_reset === true || snap.filter_reset === 'true',
    fault: coerceNumber(snap.fault),

    // Status mapping? "air_quality": "great"
    // We might need to map "great" to "good" for our types?
    status: {
      pm25: snap.pm25 > 50 ? 'high' : snap.pm25 > 25 ? 'medium' : 'good'
    },

    // Default others
    updatedAt: new Date().toISOString(), // Use current time if not provided
  };

  return reading;
};

const readingTimestamp = (reading?: AirReading | null): number | null => {
  if (!reading) return null;
  if (reading.capturedAt) {
    const ts = Date.parse(reading.capturedAt);
    if (!Number.isNaN(ts)) return ts;
  }
  if (reading.updatedAt) {
    const ts = Date.parse(reading.updatedAt);
    if (!Number.isNaN(ts)) return ts;
  }
  return null;
};

const formatWeatherTime = (value?: string, locale: string = "en-US") => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getWeatherIcon = (code?: number) => {
  if (code == null) return cloudyDay1;
  if ([95, 96, 99].includes(code)) return thunderDay1;
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    [85, 86].includes(code)
  ) {
    return rainyDay1;
  }
  return cloudyDay1;
};

const buildWeatherDisplay = (
  snapshot: WeatherSnapshot | null | undefined,
  locale: string
) => {
  return {
    temp:
      typeof snapshot?.temperatureC === "number"
        ? `${Math.round(snapshot.temperatureC)}°`
        : "0°",
    wind:
      typeof snapshot?.windKmh === "number"
        ? `${Math.round(snapshot.windKmh)} km/h`
        : "0km/h",
    hum:
      typeof snapshot?.humidityPercent === "number"
        ? `${Math.round(snapshot.humidityPercent)}%`
        : "0%",
    time: snapshot?.observationTime
      ? formatWeatherTime(snapshot.observationTime, locale)
      : "-",
    icon: getWeatherIcon(snapshot?.code),
  };
};

// ───── Icons ในไฟล์ (ไม่พึ่ง asset อื่น) ─────
function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 22s-7-8.5-7-13a7 7 0 1 1 14 0c0 4.5-7 13-7 13Zm0-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

export default function AirPanel({ timeRange }: Props) {
  const { t, i18n } = useTranslation("devices");
  const { date: filtersDate } = useFilters(); // Removed selectedSite, siteOptions

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

  const defaultTimeRange = useMemo(
    () => ({
      from: "12:00 AM",
      to: "11:30 PM",
    }),
    []
  );

  const [fromTime, setFromTime] = useState<string>(defaultTimeRange.from);
  const [toTime, setToTime] = useState<string>(defaultTimeRange.to);

  useEffect(() => {
    if (timeRange?.from && timeRange?.to) {
      setFromTime(timeRange.from);
      setToTime(timeRange.to);
    }
  }, [timeRange?.from, timeRange?.to]);

  const [airConfig, setAirConfig] = useState<{
    key: AirKpiKey;
    valueLabel: string;
    initialValue: number;
    unit: string;
    medium: number;
    high: number;
  }>({
    key: KPI_CONFIG[0].key,
    valueLabel: KPI_CONFIG[0].label,
    initialValue: 0,
    unit: "µg/m³",
    medium: KPI_CONFIG[0].thresholds.medium,
    high: KPI_CONFIG[0].thresholds.high,
  });

  const [deviceSnapshots, setDeviceSnapshots] = useState<DeviceSnapshot[]>([]);
  const [, setLoadError] = useState<string | null>(null);
  const [, setLoadingDevice] = useState<boolean>(false);
  const [weatherBangkok, setWeatherBangkok] = useState<WeatherSnapshot | null>(
    null
  );
  const [weatherThailand, setWeatherThailand] = useState<WeatherSnapshot | null>(
    null
  );
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [, setWeatherError] = useState<string | null>(null);

  const fetchErrorLabel = t("devices.air.fetchError", {
    defaultValue: "Unable to load air sensor data",
  });

  const selectedDay = useMemo(() => {
    const base =
      filtersDate && typeof filtersDate.y === "number"
        ? new Date(filtersDate.y, (filtersDate.m ?? 1) - 1, filtersDate.d ?? 1)
        : new Date();
    base.setHours(0, 0, 0, 0);
    return base;
  }, [filtersDate?.y, filtersDate?.m, filtersDate?.d]);

  const selectedRange = useMemo(() => {
    const from = buildDateWithTime(selectedDay, fromTime);
    const to = buildDateWithTime(selectedDay, toTime);
    if (to.getTime() < from.getTime()) {
      return { from: to, to: from };
    }
    return { from, to };
  }, [selectedDay, fromTime, toTime]);

  const rangeFromMs = selectedRange.from.getTime();
  const rangeToMs = selectedRange.to.getTime();

  useEffect(() => {
    let cancelled = false;
    setWeatherLoading(true);
    setWeatherError(null);

    const fetchSnapshot = async (coords: typeof BANGKOK_COORDS) => {
      const params = new URLSearchParams({
        latitude: String(coords.lat),
        longitude: String(coords.lon),
        current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
        timezone: "Asia/Bangkok",
      });
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`
      );
      const data = await res.json();
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
        temperatureC:
          typeof current.temperature_2m === "number"
            ? current.temperature_2m
            : undefined,
        humidityPercent:
          typeof current.relative_humidity_2m === "number"
            ? current.relative_humidity_2m
            : undefined,
        windKmh:
          typeof current.wind_speed_10m === "number"
            ? current.wind_speed_10m
            : undefined,
        observationTime:
          typeof current.time === "string" ? current.time : undefined,
        code:
          typeof current.weather_code === "number"
            ? current.weather_code
            : undefined,
        label: coords.label,
      } as WeatherSnapshot;
    };

    (async () => {
      try {
        const [bk, th] = await Promise.all([
          fetchSnapshot(BANGKOK_COORDS),
          fetchSnapshot(THAILAND_COORDS),
        ]);
        if (cancelled) return;
        setWeatherBangkok(bk);
        setWeatherThailand(th);
        if (!bk && !th) {
          setWeatherError("Unable to fetch weather.");
        }
      } catch (error) {
        if (cancelled) return;
        console.error("[AirPanel] weather fetch failed", error);
        setWeatherBangkok(null);
        setWeatherThailand(null);
        setWeatherError("Unable to fetch weather.");
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchDevices = async () => {
      setLoadingDevice(true);
      setLoadError(null);

      try {
        // fetch all IoT devices
        const allDevices = await getIoTDevices();

        if (cancelled) return;

        if (!allDevices.length) {
          setLoadError("No devices found");
          setDeviceSnapshots([]);
          return;
        }

        // Filter for Air Sensors (heuristic: has pm25 or eco2 or explicit type)
        // User didn't specify a type, so we check for keys
        const airDevices = allDevices.filter(d =>
          d.snapshot && (d.snapshot.pm25 !== undefined || d.snapshot.eco2 !== undefined)
        );

        const snapshots: DeviceSnapshot[] = airDevices.map((device) => {
          const parsed = parseReadingFromDevice(device);
          return {
            device,
            reading: parsed,
            // Use current time as timestamp as a fallback
            timestamp: readingTimestamp(parsed) ?? Date.now(),
          };
        });
        setDeviceSnapshots(snapshots);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        console.error("[AirPanel] load failed", error);
        setDeviceSnapshots([]);
        setLoadError(fetchErrorLabel);
      } finally {
        if (!cancelled) {
          setLoadingDevice(false);
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
  }, [fetchErrorLabel]);

  const rangedReading = useMemo(() => {
    if (!deviceSnapshots.length) return null;

    const inRange = deviceSnapshots.filter(
      (snapshot) =>
        typeof snapshot.timestamp === "number" &&
        snapshot.timestamp >= rangeFromMs &&
        snapshot.timestamp <= rangeToMs
    );

    if (!inRange.length) return null;

    const latest = inRange.reduce<DeviceSnapshot | null>((best, snapshot) => {
      if (!best) return snapshot;
      const currentTs = snapshot.timestamp ?? -Infinity;
      const bestTs = best.timestamp ?? -Infinity;
      return currentTs > bestTs ? snapshot : best;
    }, null);

    return latest?.reading ?? null;
  }, [deviceSnapshots, rangeFromMs, rangeToMs]);

  const computedKpis = useMemo(() => {
    const statusDefaults: Record<AirStatus, string> = {
      good: t("devices.air.status.good", { defaultValue: "Good" }),
      medium: t("devices.air.status.medium", { defaultValue: "Medium" }),
      high: t("devices.air.status.high", { defaultValue: "High" }),
      na: t("devices.air.status.na", { defaultValue: "No data" }),
    };

    return KPI_CONFIG.map((config) => {
      const rawValue = rangedReading?.[config.key];
      const unit = config.unitKey === "ppm" ? "ppm" : t(config.unitKey, { defaultValue: "µg/m³" });
      const thresholds = config.thresholds;
      const derivedStatus =
        rangedReading?.status?.[config.key] ??
        (typeof rawValue === "number" && Number.isFinite(rawValue)
          ? rawValue >= thresholds.high
            ? "high"
            : rawValue >= thresholds.medium
              ? "medium"
              : "good"
          : "na");

      return {
        key: config.key,
        label: config.label,
        value:
          typeof rawValue === "number" && Number.isFinite(rawValue)
            ? Number(rawValue.toFixed(1))
            : "--",
        rawValue:
          typeof rawValue === "number" && Number.isFinite(rawValue)
            ? rawValue
            : 0,
        unit,
        statusLabel: statusDefaults[derivedStatus as AirStatus],
        statusKey: derivedStatus as AirStatus,
        thresholds,
      };
    });
  }, [rangedReading, t]);

  useEffect(() => {
    if (!computedKpis.length) return;
    setAirConfig((prev) => {
      const target =
        computedKpis.find((kpi) => kpi.key === prev.key) ?? computedKpis[0];
      if (!target) return prev;
      const next = {
        key: target.key as AirKpiKey,
        valueLabel: target.label,
        initialValue: target.rawValue,
        unit: target.unit,
        medium: target.thresholds.medium,
        high: target.thresholds.high,
      };
      if (
        next.key === prev.key &&
        next.initialValue === prev.initialValue &&
        next.unit === prev.unit &&
        next.medium === prev.medium &&
        next.high === prev.high
      ) {
        return prev;
      }
      return next;
    });

  }, [computedKpis]);


  // humidityValue, humidityDisplay, temperatureValue, temperatureLabel removed as they are no longer displayed.

  const tvocValue =
    typeof rangedReading?.voc === "number" &&
      Number.isFinite(rangedReading.voc)
      ? rangedReading.voc
      : 0;

  const selectTimeLabel = t("devices.air.selectTime", {
    defaultValue: "Select time",
  });
  const toLabel = t("devices.air.to", { defaultValue: "TO" });
  const loadingLabel = t("devices.air.loading", {
    defaultValue: "Loading air data...",
  });
  const locale = i18n.language || "en-US";
  const heroSnapshot = weatherBangkok ?? weatherThailand;
  const heroDisplay = buildWeatherDisplay(heroSnapshot, locale);
  const bangkokDisplay = buildWeatherDisplay(weatherBangkok, locale);
  const thailandDisplay = buildWeatherDisplay(weatherThailand, locale);
  const heroSubtitle = weatherLoading ? loadingLabel : heroDisplay.time;
  const heroLabel = BANGKOK_COORDS.label;
  const bangkokCard = weatherBangkok ? bangkokDisplay : heroDisplay;
  const thailandCard = weatherThailand ? thailandDisplay : heroDisplay;
  const heroTempDisplay = heroDisplay.temp;
  const heroWindDisplay = heroDisplay.wind;
  const heroHumidityDisplay = heroDisplay.hum;
  const heroIconSrc = heroDisplay.icon;
  const bangkokCity = BANGKOK_COORDS.label;
  const bangkokTempDisplay = bangkokCard.temp;
  const bangkokWindDisplay = bangkokCard.wind;
  const bangkokHumidityDisplay = bangkokCard.hum;
  const thailandCity = THAILAND_COORDS.label;
  const thailandTempDisplay = thailandCard.temp;
  const thailandWindDisplay = thailandCard.wind;
  const thailandHumidityDisplay = thailandCard.hum;

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
                    {selected?.label ?? selectTimeLabel}
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
              {toLabel}
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
                    {selected?.label ?? selectTimeLabel}
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
            <div className="flex flex-col items-center gap-14">
              {/* ใช้ key เพื่อให้ re-mount เมื่อค่าจาก CardValue เปลี่ยน */}
              <ThermostatAir
                key={`${airConfig.key} -${airConfig.initialValue} -${airConfig.unit} `}
                unit=""
                initialValue={airConfig.initialValue}
                maxLabel={airConfig.unit}
                valueLabel={airConfig.valueLabel}
                medium={airConfig.medium}
                high={airConfig.high}
              />
            </div>

            <div className="flex flex-col items-center gap-20">
              <Thermostat
                initialValue={tvocValue}
                value={tvocValue}
                max={1000}
                unit=""
                maxLabel={<span className="font-bold">µg/m³</span>}
                valueLabel={<span className="font-bold">TVOC</span>}
              />
            </div>
          </div>

          {/* valueCards */}
          <div className="flex gap-5">
            {computedKpis.map((kpi) => (
              <CardValue
                key={kpi.key}
                imgLabel={kpi.label}
                value={kpi.value}
                valueLabel={kpi.statusLabel}
                valueLabel2={kpi.unit}
                onClick={() =>
                  setAirConfig({
                    key: kpi.key,
                    valueLabel: kpi.label,
                    initialValue: kpi.rawValue,
                    unit: kpi.unit,
                    medium: kpi.thresholds.medium,
                    high: kpi.thresholds.high,
                  })
                }
              />
            ))}
          </div>
        </div>

        {/* ───────────────────────────────
            ► Sidebar ขวา: การ์ดอากาศ
        ─────────────────────────────── */}
        <div className="col-span-1 flex flex-wrap flex-row lg-1355:flex-col gap-3">
          {/* การ์ดใหญ่ */}
          <div className="w-full rounded-xl min-h-[360px] p-6 text-white bg-gradient-to-b from-[#35C3F3] to-[#29A7E7] relative flex flex-col items-center">
            {/* location pill */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-[#29A7E7]">
                <PinIcon className="w-3 h-3" />
              </span>
              <span className="text-[12px]">{heroLabel}</span>
            </div>

            {/* icon + data */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <div className="relative w-[220px] h-[190px] flex items-center justify-center">
                <img src={heroIconSrc} className="w-full max-w-[200px]" alt="" />
              </div>
              <p className="mt-0 text-white/90 text-sm">Today</p>
              <p className="mt-1 text-[56px] leading-none font-bold">
                {heroTempDisplay}
              </p>
              <p className="mt-1 text-white/90">{heroSubtitle}</p>

              {/* wind & hum */}
              <div className="mt-6 flex flex-col gap-3 text-white/95">
                <div className="flex items-center gap-2">
                  <img src={windSelected} className="w-5 h-5" alt="" />
                  <span className="text-sm">Wind</span>
                  <span className="opacity-70">|</span>
                  <span className="text-sm">{heroWindDisplay}</span>
                </div>
                <div className="flex items-center gap-2">
                  <img src={waterDrop} className="w-4 h-4" alt="" />
                  <span className="text-sm">Hum</span>
                  <span className="opacity-70">|</span>
                  <span className="text-sm">{heroHumidityDisplay}</span>
                </div>
              </div>
            </div>
          </div>

          {/* การ์ดเล็ก #1 (ฟ้า) */}
          <div className="w-full rounded-xl p-4 text-white bg-gradient-to-b from-[#35C3F3] to-[#29A7E7]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <img src={windSelected} className="w-5 h-5" alt="" />
                  <div className="text-sm flex items-center justify-center gap-2">
                    <div className="leading-none">Wind</div>
                    <div>|</div>
                    <div className="text-white/90 text-xs">{bangkokWindDisplay}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <img src={waterDrop} className="w-5 h-5" alt="" />
                  <div className="text-sm flex items-center justify-center gap-2">
                    <div className="leading-none">Hum</div>
                    <div>|</div>
                    <div className="text-white/90 text-xs">{bangkokHumidityDisplay}</div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 justify-end text-white/90 text-sm">
                  <PinIcon className="w-4 h-4" />
                  <span>{bangkokCity}</span>
                </div>
                <div className="text-3xl font-bold leading-none mt-1">
                  {bangkokTempDisplay}
                </div>
              </div>
            </div>
          </div>

          {/* การ์ดเล็ก #2 (เหลือง) */}
          <div className="w-full rounded-xl p-4 text-white bg-gradient-to-b from-[#FEC84E] to-[#F59E0B]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <img src={windSelected} className="w-5 h-5" alt="" />
                  <div className="text-sm flex items-center justify-center gap-2">
                    <div className="leading-none">Wind</div>
                    <div>|</div>
                    <div className="text-white/90 text-xs">{thailandWindDisplay}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <img src={waterDrop} className="w-5 h-5" alt="" />
                  <div className="text-sm flex items-center justify-center gap-2">
                    <div className="leading-none">Hum</div>
                    <div>|</div>
                    <div className="text-white/90 text-xs">{thailandHumidityDisplay}</div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1 justify-end text-white/90 text-sm">
                  <PinIcon className="w-4 h-4" />
                  <span>{thailandCity}</span>
                </div>
                <div className="text-3xl font-bold leading-none mt-1">
                  {thailandTempDisplay}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* ─────────────────────────────── */}
      </div>
    </>
  );
}
