import RadialBar from "../RadialBar";
import {
  cctvImage,
  intercomeImage,
  nurseImage,
  solarImage,
  waterTapImage,
  wifiImage,
  windImage,
} from "../../assets/index";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUserPath } from "../../routes/useUserPath";
import { useDeviceInventory } from "../../context/DeviceInventoryContext";

type DeviceCounts = {
  cameras: number;
  camerasOnline?: number;
  camerasOffline?: number;
  intercom: number;
  intercomOnline?: number;
  intercomOffline?: number;
  waterMeter: number;
  waterMeterOnline?: number;
  waterMeterOffline?: number;
  electricMeter: number;
  electricOnline?: number;
  electricOffline?: number;
  airSensor: number;
  airSensorOnline?: number;
  airSensorOffline?: number;
  zyta: number;
  iot: number;
  iotOnline?: number;
  iotOffline?: number;
  medical: number;
  medicalOnline?: number;
  medicalOffline?: number;
  caregiver: number;
  caregiverOffline?: number;
};

type Props = {
  siteCode?: string;
  counts?: Partial<DeviceCounts>;
  offlinePercent?: number;
  offlineCount?: number;
  onlineCount?: number;
};

type DeviceCardItem = {
  key: string;
  label: string;
  count: number;
  online: number;
  offline: number;
  icon: string;
  iconAlt: string;
  iconWrapClassName: string;
  accentClassName: string;
  onClick?: () => void;
  disabled?: boolean;
};

function SummaryPill({
  tone,
  label,
  value,
}: {
  tone: "online" | "offline";
  label: string;
  value: number;
}) {
  const isOnline = tone === "online";
  return (
    <div
      className={[
        "rounded-[18px] border px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.05)]",
        isOnline
          ? "border-emerald-100 bg-emerald-50/80"
          : "border-rose-100 bg-rose-50/85",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <span
          className={[
            "h-2.5 w-2.5 rounded-full",
            isOnline ? "bg-emerald-500" : "bg-rose-500",
          ].join(" ")}
        />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-[1.65rem] font-semibold leading-none text-slate-950">
        {value}
      </div>
    </div>
  );
}

function DeviceMetricCard({
  item,
}: {
  item: DeviceCardItem;
}) {
  const clickable = Boolean(item.onClick) && !item.disabled;
  const Comp = clickable ? "button" : "div";

  return (
    <Comp
      {...(clickable
        ? {
            type: "button" as const,
            onClick: item.onClick,
          }
        : {})}
      className={[
        "group relative flex min-h-[108px] w-full items-start gap-3 overflow-hidden rounded-[20px] border px-4 py-4 text-left transition",
        "border-slate-200/80 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.06)]",
        clickable
          ? "hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_20px_40px_rgba(14,116,144,0.12)]"
          : item.disabled
          ? "opacity-55"
          : "",
      ].join(" ")}
      >
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] ring-1",
          item.iconWrapClassName,
        ].join(" ")}
      >
        <img src={item.icon} alt={item.iconAlt} width={26} className="object-contain" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Device
            </p>
            <h3 className="mt-1 truncate text-[0.98rem] font-semibold text-slate-950">
              {item.label}
            </h3>
          </div>
          <div
            className={[
              "inline-flex min-h-8 min-w-[46px] items-center justify-center rounded-full px-2.5 text-base font-semibold",
              item.accentClassName,
            ].join(" ")}
          >
            {item.count}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.79rem] font-semibold">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {item.online}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            {item.offline}
          </span>
        </div>
      </div>

      {clickable ? (
        <span className="absolute bottom-3.5 right-3.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-cyan-50 group-hover:text-cyan-700">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      ) : null}
    </Comp>
  );
}

export default function DeviceCount({
  siteCode,
  counts,
  offlinePercent,
  offlineCount,
  onlineCount,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const langKey = i18n.language || "en";
  const navigate = useNavigate();
  const { abs, absSite } = useUserPath();
  const { counts: globalCounts } = useDeviceInventory();

  const titleDevices = t("devices.title", { defaultValue: "DEVICES" });
  const labelOffline = t("devices.offline", { defaultValue: "Offline" });
  const labelOnline = t("devices.online", { defaultValue: "Online" });
  const titleTotal = t("devices.total", { defaultValue: "Total" });
  const labelCameraCount = t("devices.camerasShort", {
    defaultValue: "Cameras",
  });
  const labelWater = t("devices.waterMeter", { defaultValue: "Water meter" });
  const labelElectric = t("devices.electricMeter", {
    defaultValue: "Electric meter",
  });
  const labelAir = t("devices.air", { defaultValue: "Air" });
  const labelIot = t("devices.iot", { defaultValue: "IoT" });
  const labelMedical = t("devices.medical", {
    defaultValue: "Medical",
  });
  const labelDigitalTwin = t("devices.digitalTwinCard", {
    defaultValue: "Digital Twin",
  });

  const goDevices = (type: string) => {
    if (siteCode) return navigate(absSite(`/devices?type=${type}`, siteCode));
    return navigate(abs(`/devices?type=${type}`));
  };

  const mergedCounts: DeviceCounts = {
    cameras: 0,
    intercom: 0,
    waterMeter: 0,
    electricMeter: 0,
    airSensor: 0,
    zyta: 0,
    iot: 0,
    iotOffline: 0,
    medical: 0,
    medicalOffline: 0,
    caregiver: 0,
    caregiverOffline: 0,
    ...(globalCounts || {}),
    ...(counts || {}),
  } as DeviceCounts;

  // Online = devices whose status is exactly Online; offline = every other
  // counted device. Both come from the backend counters; only if a type has
  // no online figure at all is it shown as fully online.
  const tally = (
    total: number | undefined,
    online: number | undefined,
    offline: number | undefined
  ) => {
    const count = Math.max(0, Number(total || 0));
    const on =
      typeof online === "number" ? Math.min(count, Math.max(0, online)) : count;
    const off =
      typeof offline === "number" ? Math.max(0, offline) : Math.max(0, count - on);
    return { on, off };
  };

  const statusByType = {
    cameras: tally(mergedCounts.cameras, mergedCounts.camerasOnline, mergedCounts.camerasOffline),
    waterMeter: tally(
      mergedCounts.waterMeter,
      mergedCounts.waterMeterOnline,
      mergedCounts.waterMeterOffline
    ),
    electricMeter: tally(
      mergedCounts.electricMeter,
      mergedCounts.electricOnline,
      mergedCounts.electricOffline
    ),
    airSensor: tally(mergedCounts.airSensor, mergedCounts.airSensorOnline, mergedCounts.airSensorOffline),
    iot: tally(mergedCounts.iot, mergedCounts.iotOnline, mergedCounts.iotOffline),
    medical: tally(mergedCounts.medical, mergedCounts.medicalOnline, mergedCounts.medicalOffline),
  } as const;

  const donut = (() => {
    const fallbackOn = 0;
    const fallbackOff = 0;
    const on = typeof onlineCount === "number" ? onlineCount : fallbackOn;
    const oc = typeof offlineCount === "number" ? offlineCount : fallbackOff;
    const sumRaw = Math.max(0, on + oc);
    const pctOnline =
      typeof offlinePercent === "number"
        ? Math.max(0, Math.min(100, 100 - offlinePercent))
        : sumRaw === 0
        ? 0
        : (on / sumRaw) * 100;
    return { on, oc, pct: pctOnline, sum: sumRaw };
  })();

  const isZero = (n?: number) => !n || Number(n) <= 0;

  const deviceItems: DeviceCardItem[] = [
    {
      key: "cameras",
      label: labelCameraCount,
      count: Number(mergedCounts.cameras || 0),
      online: statusByType.cameras.on,
      offline: statusByType.cameras.off,
      icon: cctvImage,
      iconAlt: "",
      iconWrapClassName: "bg-sky-50 ring-sky-100",
      accentClassName: "bg-sky-50 text-sky-700",
      onClick: () => goDevices("cctv"),
      disabled: isZero(mergedCounts.cameras),
    },
    {
      key: "water",
      label: labelWater,
      count: Number(mergedCounts.waterMeter || 0),
      online: statusByType.waterMeter.on,
      offline: statusByType.waterMeter.off,
      icon: waterTapImage,
      iconAlt: "",
      iconWrapClassName: "bg-cyan-50 ring-cyan-100",
      accentClassName: "bg-cyan-50 text-cyan-700",
      onClick: () => goDevices("watermeter"),
      disabled: isZero(mergedCounts.waterMeter),
    },
    {
      key: "electric",
      label: labelElectric,
      count: Number(mergedCounts.electricMeter || 0),
      online: statusByType.electricMeter.on,
      offline: statusByType.electricMeter.off,
      icon: solarImage,
      iconAlt: "",
      iconWrapClassName: "bg-amber-50 ring-amber-100",
      accentClassName: "bg-amber-50 text-amber-700",
      onClick: () => goDevices("electricmeter"),
      disabled: isZero(mergedCounts.electricMeter),
    },
    {
      key: "air",
      label: labelAir,
      count: Number(mergedCounts.airSensor || 0),
      online: statusByType.airSensor.on,
      offline: statusByType.airSensor.off,
      icon: windImage,
      iconAlt: "",
      iconWrapClassName: "bg-teal-50 ring-teal-100",
      accentClassName: "bg-teal-50 text-teal-700",
      onClick: () => goDevices("airsensor"),
      disabled: isZero(mergedCounts.airSensor),
    },
    {
      key: "iot",
      label: labelIot,
      count: Number(mergedCounts.iot || 0),
      online: statusByType.iot.on,
      offline: statusByType.iot.off,
      icon: wifiImage,
      iconAlt: "",
      iconWrapClassName: "bg-indigo-50 ring-indigo-100",
      accentClassName: "bg-indigo-50 text-indigo-700",
      onClick: () => goDevices("iot"),
      disabled: isZero(mergedCounts.iot),
    },
    {
      key: "medical",
      label: labelMedical,
      count: Number(mergedCounts.medical || 0),
      online: statusByType.medical.on,
      offline: statusByType.medical.off,
      icon: nurseImage,
      iconAlt: "",
      iconWrapClassName: "bg-fuchsia-50 ring-fuchsia-100",
      accentClassName: "bg-fuchsia-50 text-fuchsia-700",
      onClick: () => window.open("https://bpstech.online/login", "_blank"),
    },
    {
      key: "digitalTwin",
      label: labelDigitalTwin,
      count: 0,
      online: 0,
      offline: 0,
      icon: intercomeImage,
      iconAlt: "",
      iconWrapClassName: "bg-slate-100 ring-slate-200",
      accentClassName: "bg-slate-100 text-slate-700",
      onClick: () => window.open("https://bpstech.online/login", "_blank"),
    },
  ];

  return (
    <section className="flex flex-col gap-5">
      <div className="">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {titleDevices}
            </p>
            <div className="mt-2 flex items-end gap-3">
              <h3 className="text-[2rem] font-semibold leading-none text-slate-950">
                {donut.sum}
              </h3>
              <p className="pb-1 text-sm font-medium text-slate-500">
                {titleTotal}
              </p>
            </div>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {donut.pct.toFixed(2)}% {labelOnline}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-center">
          <div className="flex justify-center lg:justify-start">
            <RadialBar
              key={`radial-offline-${langKey}`}
              value={donut.pct}
              label={labelOnline}
              mainColor="#22C55E"
              primaryColor="#F43F5E"
              bg="#FFFFFF"
              height={170}
              width={170}
              hollowSize="68%"
              rounded
              offsets={{ labelOffsetY: -8, valueOffsetY: 10 }}
              valueStyle={{
                fontSize: 20,
                fontWeight: 700,
                color: "#0F172A",
              }}
              prefix="%"
              tight
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <SummaryPill tone="online" label={labelOnline} value={donut.on} />
              <SummaryPill tone="offline" label={labelOffline} value={donut.oc} />
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-500">
                  Availability
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {Math.round(donut.pct)}%
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#06b6d4_100%)]"
                  style={{ width: `${Math.max(0, Math.min(100, donut.pct))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {deviceItems.map((item) => (
            <DeviceMetricCard key={item.key} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
