import React from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useTranslation } from "react-i18next";
import { request } from "../../../lib/http";
import { useFilters } from "../../../context/FiltersContext";
import { useFaceRec } from "../../../context/FaceRecContext";
import { useDeviceInventory } from "../../../context/DeviceInventoryContext";
import { useNotisFeed } from "../../../context/NotisContext";
import type { Noti } from "../../../data/Dashboard/notis";
import {
  buildNotiKeywordBag,
  isCameraOfflineNoti,
  matchesSite,
  notiSeverity,
  resolveAlertEventKey,
  resolveDefaultNotiImage,
  toDateKey,
} from "../../../utils/notis";
import {
  UtilitySectionTitle,
  UtilitySurface,
} from "../../UtilityDashboard/UtilityDashboardLayout";

type Props = {
  siteCode?: string;
};

type RangeKey = "24h" | "7d" | "30d";

type FeedStatus = "live" | "offline" | "standby";

type FeedItem = {
  id: string;
  title: string;
  subtitle: string;
  imageSrc?: string;
  streamUrl?: string;
  status: FeedStatus;
  eventKey: string;
  eventLabel: string;
  timestamp: number | null;
  isPlaceholder?: boolean;
};

type SummaryCard = {
  label: string;
  value: string;
  pill: string;
  tone: "violet" | "emerald" | "amber" | "rose";
};

const ACTIVE_WINDOW_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

const TONE_STYLES: Record<
  SummaryCard["tone"],
  { pill: string; accent: string; surface: string }
> = {
  violet: {
    pill: "bg-[#EEF0FF] text-[#5B61FF]",
    accent: "text-[#5B61FF]",
    surface: "bg-white",
  },
  emerald: {
    pill: "bg-[#EAFBF2] text-[#10B981]",
    accent: "text-[#10B981]",
    surface: "bg-white",
  },
  amber: {
    pill: "bg-[#FFF6E7] text-[#F59E0B]",
    accent: "text-[#F59E0B]",
    surface: "bg-white",
  },
  rose: {
    pill: "bg-[#FFF0F0] text-[#FB3F3F]",
    accent: "text-[#FB3F3F]",
    surface: "bg-white",
  },
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const safeObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const pickMetaImage = (meta: Record<string, unknown> | null): string | undefined => {
  if (!meta) return undefined;
  const candidates = [
    meta.screenshot,
    meta.screenShot,
    meta.thumbnail,
    meta.img,
    meta.image,
    meta.picture,
    meta.faceCropImg,
    meta.faceFullImg,
    meta.cropImg,
    meta.crop,
  ];
  for (const candidate of candidates) {
    const src = normalizeText(candidate);
    if (src) return src;
  }
  return undefined;
};

const getNotiImage = (noti: Noti): string | undefined => {
  const meta = safeObject(noti.meta);
  return (
    normalizeText(noti.screenshot) ??
    normalizeText(noti.img) ??
    pickMetaImage(meta) ??
    resolveDefaultNotiImage(noti)
  );
};

const parseTimestamp = (noti: Noti): number | null => {
  const raw = noti.occurredAt ?? noti.createdAt ?? noti.date;
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatClock = (timestamp: number, locale: string) =>
  new Date(timestamp).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const formatOccurredAt = (timestamp: number | null, locale: string) => {
  if (!timestamp) return "No recent event";
  return new Date(timestamp).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const eventLabelForKey = (eventKey: string) => {
  switch (eventKey) {
    case "motion":
      return "Motion";
    case "fire":
      return "Fire";
    case "fall":
      return "Fall";
    case "sleep":
      return "Sleep";
    case "face":
      return "Face";
    case "plate":
      return "Plate";
    case "offline":
      return "Offline";
    default:
      return "Live";
  }
};

const buildFeedLabel = (index: number) => `Camera ${String(index + 1).padStart(2, "0")}`;

const extractCameraName = (noti: Noti, fallbackIndex = 0) => {
  const meta = safeObject(noti.meta);
  const device = safeObject(meta?.device);
  const headers = safeObject(meta?.deviceHeaders);
  return (
    normalizeText(meta?.cameraName) ??
    normalizeText(meta?.camera) ??
    normalizeText(device?.name) ??
    normalizeText(headers?.deviceKey) ??
    normalizeText(noti.deviceModel) ??
    normalizeText(noti.deviceId) ??
    buildFeedLabel(fallbackIndex)
  );
};

const extractSiteLabel = (noti: Noti) => {
  const meta = safeObject(noti.meta);
  return (
    normalizeText(noti.siteName) ??
    normalizeText(noti.site) ??
    normalizeText(noti.siteCode) ??
    normalizeText(meta?.siteName) ??
    normalizeText(meta?.siteCode) ??
    "Unknown site"
  );
};

const normalizeCameraKey = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const toFeedStatusFromDeviceStatus = (status: unknown): FeedStatus => {
  const s = String(status || "").toLowerCase();
  if (s === "online" || s === "active") return "live";
  if (s === "offline") return "offline";
  if (s === "disabled" || s === "provisioning") return "standby";
  return "standby";
};

const extractCamNumber = (...candidates: unknown[]) => {
  for (const c of candidates) {
    const raw = String(c ?? "");
    const camMatch = raw.match(/cam\s*0*(\d+)/i);
    if (camMatch) return Number(camMatch[1]);
    const numMatch = raw.match(/(?:^|\D)0*(\d+)(?:\D|$)/);
    if (numMatch) return Number(numMatch[1]);
  }
  return null;
};

// The MediaMTX stream server (203.159.95.168:8888) only speaks plain HTTP. Embedding it directly
// as `http://…` fails on our HTTPS sites because browsers block mixed content. nginx reverse-proxies
// it under `/cams/` on each HTTPS vhost, so use a same-origin relative URL and let nginx reach .168.
const buildStreamUrl = (n: number | null) =>
  Number.isFinite(n as number) && (n as number) > 0
    ? `/cams/cam${n}/`
    : undefined;

type CameraDeviceLite = {
  id: string;
  name: string;
  status: string;
  externalId?: string;
  siteName?: string;
};

const isCameraType = (type: unknown) => {
  const tx = String(type || "").toLowerCase();
  return tx === "cctv" || tx === "camera";
};

const mapCameraDevices = (raw: unknown): CameraDeviceLite[] => {
  const rows: Array<Record<string, unknown>> =
    Array.isArray(raw)
      ? (raw as Array<Record<string, unknown>>)
      : raw && typeof raw === "object" && Array.isArray((raw as { devices?: unknown }).devices)
        ? (((raw as { devices: Array<Record<string, unknown>> }).devices) || [])
        : [];

  return rows
    .filter((r) => isCameraType(r.type))
    .map((r) => ({
      id: String(r.id ?? ""),
      externalId: r.externalId == null ? undefined : String(r.externalId),
      name: String(r.name ?? r.displayName ?? r.externalId ?? r.id ?? "").trim(),
      status: String(r.status ?? "Unknown"),
      siteName: r.subLocation == null ? (r.locationName == null ? undefined : String(r.locationName)) : String(r.subLocation),
    }))
    .filter((r) => r.name.length > 0 || r.id.length > 0);
};


const isCctvRelevantNoti = (noti: Noti) => {
  const eventKey = resolveAlertEventKey(noti);
  if (eventKey === "face" || eventKey === "plate") return true;
  if (
    eventKey === "motion" ||
    eventKey === "fire" ||
    eventKey === "fall" ||
    eventKey === "sleep"
  ) {
    return true;
  }
  if (eventKey === "offline" && isCameraOfflineNoti(noti)) return true;

  const meta = safeObject(noti.meta);
  if (normalizeText(meta?.cameraName) || normalizeText(meta?.camera)) return true;

  const bag = buildNotiKeywordBag(noti);
  return /\bcamera\b|\bcctv\b|\bcam\b/.test(bag);
};

const dedupeNotis = (items: ReadonlyArray<Noti>) => {
  const seen = new Set<string>();
  const result: Noti[] = [];
  for (const item of items) {
    const key = [
      item.id ?? "",
      item.occurredAt ?? item.createdAt ?? item.date ?? "",
      item.titleKey ?? item.title ?? "",
      getNotiImage(item) ?? "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

const isSameDay = (timestamp: number, now: Date) =>
  toDateKey(new Date(timestamp)) === toDateKey(now);

function buildTrend(
  items: ReadonlyArray<Noti>,
  range: RangeKey,
  locale: string
): { categories: string[]; data: number[] } {
  const now = new Date();

  if (range === "24h") {
    const categories = Array.from({ length: 24 }, (_, idx) => {
      const d = new Date(now.getTime() - (23 - idx) * 60 * 60 * 1000);
      return d.toLocaleTimeString(locale, {
        hour: "numeric",
        hour12: false,
      });
    });
    const buckets = Array.from({ length: 24 }, () => new Set<string>());
    const start = now.getTime() - 24 * 60 * 60 * 1000;
    items.forEach((item) => {
      const timestamp = parseTimestamp(item);
      if (!timestamp || timestamp < start) return;
      const diff = now.getTime() - timestamp;
      const hoursAgo = Math.floor(diff / (60 * 60 * 1000));
      const index = 23 - hoursAgo;
      if (index < 0 || index >= 24) return;
      buckets[index].add(extractCameraName(item));
    });
    return { categories, data: buckets.map((bucket) => bucket.size) };
  }

  if (range === "7d") {
    const categories = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(now.getTime() - (6 - idx) * DAY_MS);
      return d.toLocaleDateString(locale, { weekday: "short" });
    });
    const buckets = Array.from({ length: 7 }, () => new Set<string>());
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    items.forEach((item) => {
      const timestamp = parseTimestamp(item);
      if (!timestamp || timestamp < start.getTime()) return;
      const diffDays = Math.floor(
        (new Date(timestamp).setHours(0, 0, 0, 0) - start.getTime()) / DAY_MS
      );
      if (diffDays < 0 || diffDays >= 7) return;
      buckets[diffDays].add(extractCameraName(item));
    });
    return { categories, data: buckets.map((bucket) => bucket.size) };
  }

  const categories = Array.from({ length: 30 }, (_, idx) => {
    const d = new Date(now.getTime() - (29 - idx) * DAY_MS);
    return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  });
  const buckets = Array.from({ length: 30 }, () => new Set<string>());
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 29);
  items.forEach((item) => {
    const timestamp = parseTimestamp(item);
    if (!timestamp || timestamp < start.getTime()) return;
    const diffDays = Math.floor(
      (new Date(timestamp).setHours(0, 0, 0, 0) - start.getTime()) / DAY_MS
    );
    if (diffDays < 0 || diffDays >= 30) return;
    buckets[diffDays].add(extractCameraName(item));
  });
  return { categories, data: buckets.map((bucket) => bucket.size) };
}

function PlaceholderFrame({ label }: { label: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#E8EEF8_0%,#DCE7F4_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_38%)]" />
      <div className="absolute bottom-4 left-4 text-sm font-medium text-slate-600">
        {label}
      </div>
    </div>
  );
}

function ViewerActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full bg-slate-900/75 text-white transition hover:bg-slate-900"
    >
      <i className="material-icons text-[20px]">{icon}</i>
    </button>
  );
}

function SummaryMetricCard({ card }: { card: SummaryCard }) {
  const style = TONE_STYLES[card.tone];
  return (
    <UtilitySurface className={cx("min-h-[156px]", style.surface)}>
      <div className="flex h-full flex-col justify-between">
        <div className="text-[15px] font-medium text-slate-500">{card.label}</div>
        <div className={cx("mt-5 text-[44px] font-semibold leading-none", style.accent)}>
          {card.value}
        </div>
        <div className="mt-5">
          <span className={cx("inline-flex rounded-full px-3 py-1 text-xs font-semibold", style.pill)}>
            {card.pill}
          </span>
        </div>
      </div>
    </UtilitySurface>
  );
}

function ActiveStreamsChart({
  categories,
  data,
}: {
  categories: string[];
  data: number[];
}) {
  const maxValue = Math.max(1, ...data);
  const options = React.useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
        sparkline: { enabled: false },
      },
      grid: {
        borderColor: "#E6ECF5",
        strokeDashArray: 4,
        padding: {
          left: 8,
          right: 12,
          top: 12,
          bottom: 0,
        },
      },
      colors: ["#564DFF"],
      stroke: {
        curve: "smooth",
        width: 3,
        lineCap: "round",
      },
      fill: {
        type: "gradient",
        gradient: {
          shade: "light",
          type: "vertical",
          shadeIntensity: 0.12,
          gradientToColors: ["#C7C3FF"],
          inverseColors: false,
          opacityFrom: 0.34,
          opacityTo: 0.04,
          stops: [0, 100],
        },
      },
      dataLabels: { enabled: false },
      markers: { size: 0, hover: { sizeOffset: 4 } },
      legend: { show: false },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: {
            colors: Array(categories.length).fill("#8AA0C0"),
            fontSize: "13px",
            fontWeight: 500,
          },
          trim: true,
          hideOverlappingLabels: true,
        },
      },
      yaxis: {
        min: 0,
        max: maxValue < 3 ? 3 : undefined,
        tickAmount: 4,
        labels: {
          style: {
            colors: ["#8AA0C0"],
            fontSize: "13px",
            fontWeight: 500,
          },
          formatter: (value) => Math.round(value).toString(),
        },
      },
      tooltip: {
        theme: "light",
        x: { show: true },
        y: {
          formatter: (value) =>
            `${Math.round(value)} active ${Math.round(value) === 1 ? "camera" : "cameras"}`,
        },
      },
    }),
    [categories, maxValue]
  );

  return (
    <ReactApexChart
      type="area"
      height={320}
      options={options}
      series={[{ name: "Active streams", data }]}
    />
  );
}

export default function CCTVPanel({ siteCode }: Props) {
  const { t, i18n } = useTranslation("devices");
  const locale = (i18n.language || "").startsWith("th") ? "th-TH" : "en-US";
  const { selectedSite } = useFilters();
  const { counts } = useDeviceInventory();
  const { items: notisItems } = useNotisFeed();
  const { dashboardNotis: faceRecItems } = useFaceRec();
  const [range, setRange] = React.useState<RangeKey>("24h");
  const [selectedFeedId, setSelectedFeedId] = React.useState<string | null>(null);
  const [paused, setPaused] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [clockTimestamp, setClockTimestamp] = React.useState(() => Date.now());
  const [cameraDevices, setCameraDevices] = React.useState<CameraDeviceLite[]>([]);

  React.useEffect(() => {
    const timer = window.setInterval(() => setClockTimestamp(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const effectiveSiteCode =
    siteCode ?? (selectedSite && selectedSite !== "all" ? selectedSite : undefined);


  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const params: Record<string, string | number> = { t: Date.now() };
        const scoped = String(effectiveSiteCode || "").trim();
        if (scoped) {
          if (scoped.toLowerCase().startsWith("grp:")) params.siteGroupId = scoped;
          else params.siteId = scoped;
        }
        const data = await request<unknown>("/devices", { params });
        if (!mounted) return;
        setCameraDevices(mapCameraDevices(data));
      } catch {
        if (!mounted) return;
        setCameraDevices([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [effectiveSiteCode]);

  const relevantNotis = React.useMemo(() => {
    const merged = dedupeNotis([...notisItems, ...faceRecItems]);
    return merged
      .filter((item) => matchesSite(item, effectiveSiteCode))
      .filter(isCctvRelevantNoti)
      .sort((a, b) => {
        const aTs = parseTimestamp(a) ?? 0;
        const bTs = parseTimestamp(b) ?? 0;
        return bTs - aTs;
      });
  }, [effectiveSiteCode, faceRecItems, notisItems]);

  const uniqueCameraCountFromEvents = React.useMemo(() => {
    const keys = new Set<string>();
    relevantNotis.forEach((item, idx) => {
      keys.add(extractCameraName(item, idx).toLowerCase());
    });
    return keys.size;
  }, [relevantNotis]);

  const totalCameraCount = Math.max(
    Number(counts?.cameras ?? 0),
    uniqueCameraCountFromEvents,
    cameraDevices.length
  );

  const feedItems = React.useMemo(() => {
    const latestByKey = new Map<string, Noti>();
    relevantNotis.forEach((item, idx) => {
      const key = normalizeCameraKey(extractCameraName(item, idx));
      if (!key || latestByKey.has(key)) return;
      latestByKey.set(key, item);
    });

    const items: FeedItem[] = cameraDevices.map((cam, idx) => {
      const key = normalizeCameraKey(cam.name || cam.externalId || cam.id);
      const latest = latestByKey.get(key);
      const latestTs = latest ? parseTimestamp(latest) : null;
      const latestEvent = latest ? resolveAlertEventKey(latest) : null;
      const streamNo = extractCamNumber(cam.externalId, cam.name, cam.id, idx + 1);
      const streamUrl = buildStreamUrl(streamNo);

      const statusFromDevice = toFeedStatusFromDeviceStatus(cam.status);
      const status: FeedStatus =
        latest && (latestEvent === "offline" || isCameraOfflineNoti(latest))
          ? "offline"
          : statusFromDevice;

      const eventKey = latestEvent || (status === "offline" ? "offline" : status === "live" ? "live" : "standby");

      return {
        id: key || `cam-${idx + 1}`,
        title: cam.name || buildFeedLabel(idx),
        subtitle: cam.siteName || effectiveSiteCode || "All sites",
        imageSrc: latest ? getNotiImage(latest) : undefined,
        streamUrl,
        status,
        eventKey,
        eventLabel: eventLabelForKey(eventKey),
        timestamp: latestTs,
      };
    });

    if (items.length > 0) return items;

    const seen = new Set<string>();
    const fallback: FeedItem[] = [];
    relevantNotis.forEach((item, idx) => {
      const title = extractCameraName(item, idx);
      const key = normalizeCameraKey(title);
      if (!key || seen.has(key)) return;
      seen.add(key);
      const timestamp = parseTimestamp(item);
      const eventKey = resolveAlertEventKey(item) ?? "live";
      const streamNo = extractCamNumber(title, idx + 1);
      fallback.push({
        id: key,
        title,
        subtitle: extractSiteLabel(item),
        imageSrc: getNotiImage(item),
        streamUrl: buildStreamUrl(streamNo),
        status: eventKey === "offline" || isCameraOfflineNoti(item) ? "offline" : "live",
        eventKey,
        eventLabel: eventLabelForKey(eventKey),
        timestamp,
      });
    });

    return fallback;
  }, [cameraDevices, effectiveSiteCode, relevantNotis]);

  React.useEffect(() => {
    if (!feedItems.length) {
      setSelectedFeedId(null);
      return;
    }
    if (selectedFeedId && feedItems.some((item) => item.id === selectedFeedId)) return;
    setSelectedFeedId(feedItems[0].id);
  }, [feedItems, selectedFeedId]);

  const selectedFeed =
    feedItems.find((item) => item.id === selectedFeedId) ?? feedItems[0] ?? null;

  const latestOfflineCameras = React.useMemo(() => {
    const latestStatus = new Map<string, FeedStatus>();
    relevantNotis.forEach((item, idx) => {
      const key = extractCameraName(item, idx).toLowerCase();
      if (latestStatus.has(key)) return;
      latestStatus.set(
        key,
        resolveAlertEventKey(item) === "offline" || isCameraOfflineNoti(item)
          ? "offline"
          : "live"
      );
    });
    return Array.from(latestStatus.values()).filter((status) => status === "offline").length;
  }, [relevantNotis]);

  const onlineCount =
    totalCameraCount > 0
      ? Math.max(0, totalCameraCount - latestOfflineCameras)
      : feedItems.filter((item) => item.status === "live").length;

  const activeRecentCount = React.useMemo(() => {
    const activeKeys = new Set<string>();
    const boundary = Date.now() - ACTIVE_WINDOW_MS;
    relevantNotis.forEach((item, idx) => {
      const timestamp = parseTimestamp(item);
      if (!timestamp || timestamp < boundary) return;
      activeKeys.add(extractCameraName(item, idx).toLowerCase());
    });
    return activeKeys.size;
  }, [relevantNotis]);

  const now = React.useMemo(() => new Date(), [clockTimestamp]);
  const todayAlerts = React.useMemo(
    () =>
      relevantNotis.filter((item) => {
        const timestamp = parseTimestamp(item);
        return timestamp ? isSameDay(timestamp, now) : false;
      }).length,
    [now, relevantNotis]
  );

  const criticalToday = React.useMemo(
    () =>
      relevantNotis.filter((item) => {
        const timestamp = parseTimestamp(item);
        return timestamp ? isSameDay(timestamp, now) && notiSeverity(item) === "critical" : false;
      }).length,
    [now, relevantNotis]
  );

  const summaryCards = React.useMemo<SummaryCard[]>(
    () => [
      {
        label: t("devices.cctv.onlineCameras", {
          defaultValue: "Online cameras",
        }),
        value: `${onlineCount}/${totalCameraCount || onlineCount || 0}`,
        pill:
          latestOfflineCameras > 0
            ? `${latestOfflineCameras} offline`
            : t("devices.cctv.onlineAll", { defaultValue: "All live" }),
        tone: "violet",
      },
      {
        label: t("devices.cctv.activeNow", {
          defaultValue: "Active now",
        }),
        value: `${activeRecentCount}`,
        pill: t("devices.cctv.last30m", { defaultValue: "Last 30 min" }),
        tone: "emerald",
      },
      {
        label: t("devices.cctv.alertsToday", {
          defaultValue: "Alerts today",
        }),
        value: `${todayAlerts}`,
        pill:
          criticalToday > 0
            ? `${criticalToday} critical`
            : t("devices.cctv.noCritical", { defaultValue: "No critical" }),
        tone: criticalToday > 0 ? "rose" : "amber",
      },
      {
        label: t("devices.cctv.offlineAlerts", {
          defaultValue: "Offline alerts",
        }),
        value: `${latestOfflineCameras}`,
        pill: t("devices.cctv.latestStatus", { defaultValue: "Latest device state" }),
        tone: latestOfflineCameras > 0 ? "amber" : "emerald",
      },
    ],
    [activeRecentCount, criticalToday, latestOfflineCameras, onlineCount, t, todayAlerts, totalCameraCount]
  );

  const activeTrend = React.useMemo(
    () => buildTrend(relevantNotis, range, locale),
    [locale, range, relevantNotis]
  );

  const handleSnapshot = React.useCallback(() => {
    const target = selectedFeed?.streamUrl || selectedFeed?.imageSrc;
    if (!target) return;
    window.open(target, "_blank", "noopener,noreferrer");
  }, [selectedFeed]);

  const handleFullscreen = React.useCallback(() => {
    const target = selectedFeed?.streamUrl || selectedFeed?.imageSrc;
    if (!target) return;
    window.open(target, "_blank", "noopener,noreferrer");
  }, [selectedFeed]);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg-1024:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
        <UtilitySurface className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-semibold text-slate-950">
                {t("devices.cctv.allCameras", { defaultValue: "All Cameras" })}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {(totalCameraCount || feedItems.length).toLocaleString(locale)}{" "}
                {t("devices.cctv.feeds", { defaultValue: "feeds" })}
              </p>
            </div>
            <span className="rounded-full bg-[#EEF0FF] px-3 py-1 text-sm font-semibold text-[#5B61FF]">
              {onlineCount} {t("devices.cctv.online", { defaultValue: "online" })}
            </span>
          </div>

          <div className="mt-5 grid max-h-[585px] grid-cols-2 gap-3 overflow-y-auto pr-1">
            {feedItems.map((feed) => {
              const selected = feed.id === selectedFeed?.id;
              return (
                <button
                  key={feed.id}
                  type="button"
                  onClick={() => setSelectedFeedId(feed.id)}
                  className={cx(
                    "group relative overflow-hidden rounded-[22px] border bg-slate-100 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition",
                    "aspect-[2.2/1]",
                    selected
                      ? "border-[#6C63FF] ring-2 ring-[#6C63FF]/30"
                      : "border-slate-200 hover:border-[#C9D4F3]"
                  )}
                >
                  {feed.imageSrc && !feed.isPlaceholder ? (
                    <img
                      src={feed.imageSrc}
                      alt={feed.title}
                      className={cx(
                        "h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]",
                        feed.status === "offline" ? "grayscale-[0.35] opacity-80" : ""
                      )}
                    />
                  ) : (
                    <PlaceholderFrame label={feed.title} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/45 via-transparent to-transparent" />
                  <div className="absolute left-3 top-3">
                    <span
                      className={cx(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                        feed.status === "live"
                          ? "bg-[#FF2E63] text-white"
                          : feed.status === "offline"
                            ? "bg-slate-900/80 text-white"
                            : "bg-white/85 text-slate-600"
                      )}
                    >
                      {feed.status === "live"
                        ? "Live"
                        : feed.status === "offline"
                          ? "Offline"
                          : "Standby"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </UtilitySurface>

        <UtilitySurface className="p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-[28px] bg-[#0F172A]">
            <div className="aspect-[16/9] w-full">
              {selectedFeed?.streamUrl ? (
                <iframe
                  src={selectedFeed.streamUrl}
                  title={selectedFeed.title}
                  className={cx(
                    "h-full w-full border-0",
                    paused ? "opacity-50 grayscale-[0.2]" : ""
                  )}
                  loading="lazy"
                  allow="autoplay; fullscreen"
                />
              ) : selectedFeed?.imageSrc && !selectedFeed.isPlaceholder ? (
                <img
                  src={selectedFeed.imageSrc}
                  alt={selectedFeed.title}
                  className={cx(
                    "h-full w-full object-cover",
                    paused ? "opacity-50 grayscale-[0.2]" : ""
                  )}
                />
              ) : (
                <PlaceholderFrame label={selectedFeed?.title ?? "Camera"} />
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/15" />

            <div className="absolute left-5 top-5 flex flex-wrap items-center gap-3">
              <span
                className={cx(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
                  selectedFeed?.status === "offline"
                    ? "bg-slate-900/75 text-white"
                    : "bg-[#FF2E63] text-white"
                )}
              >
                <span className="size-2 rounded-full bg-white" />
                {selectedFeed?.status === "offline" ? "Offline" : "Live"}
              </span>
              <span className="rounded-full bg-slate-900/70 px-4 py-2 text-sm font-semibold text-white">
                {selectedFeed?.eventLabel ?? "Event stream"}
              </span>
            </div>

            <div className="absolute right-5 top-5 rounded-full bg-slate-900/70 px-4 py-2 text-sm font-semibold text-white">
              {formatClock(clockTimestamp, locale)}
            </div>

            {paused ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-slate-950/75 px-5 py-2 text-sm font-semibold text-white">
                  Paused
                </div>
              </div>
            ) : null}

            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
              <div className="min-w-0 text-white">
                <div className="truncate text-[34px] font-semibold leading-none">
                  {selectedFeed?.title ?? t("devices.cctv.selectCamera", { defaultValue: "Select camera" })}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-200">
                  <span>{selectedFeed?.subtitle ?? "Unknown site"}</span>
                  <span className="text-slate-400">•</span>
                  <span>{formatOccurredAt(selectedFeed?.timestamp ?? null, locale)}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <ViewerActionButton
                  icon={paused ? "play_arrow" : "pause"}
                  label={paused ? "Resume" : "Pause"}
                  onClick={() => setPaused((value) => !value)}
                />
                <ViewerActionButton
                  icon={muted ? "volume_off" : "volume_up"}
                  label={muted ? "Unmute" : "Mute"}
                  onClick={() => setMuted((value) => !value)}
                />
                <ViewerActionButton
                  icon="photo_camera"
                  label="Open snapshot"
                  onClick={handleSnapshot}
                />
                <ViewerActionButton
                  icon="open_in_full"
                  label="Open full size"
                  onClick={handleFullscreen}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="truncate text-[20px] font-semibold text-slate-950">
                {selectedFeed?.title ?? t("devices.cctv.mainViewer", { defaultValue: "Main viewer" })}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {selectedFeed?.subtitle ?? "Unknown site"} • {selectedFeed?.eventLabel ?? "Standby"}
              </div>
            </div>
            <span
              className={cx(
                "inline-flex shrink-0 rounded-full px-4 py-2 text-sm font-semibold",
                selectedFeed?.status === "offline"
                  ? "bg-[#FFF0F0] text-[#FB3F3F]"
                  : "bg-[#EAFBF2] text-[#10B981]"
              )}
            >
              {selectedFeed?.status === "offline"
                ? t("devices.cctv.statusOffline", { defaultValue: "Offline" })
                : t("devices.cctv.statusLive", { defaultValue: "Live" })}
            </span>
          </div>
        </UtilitySurface>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg-1024:grid-cols-3 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryMetricCard key={card.label} card={card} />
        ))}
      </div>

      <UtilitySurface className="overflow-hidden">
        <UtilitySectionTitle
          title={t("devices.cctv.activeStreams", {
            defaultValue: "Active streams",
          })}
          subtitle={
            range === "24h"
              ? t("devices.cctv.activeStreams24h", {
                  defaultValue: "Last 24 hours · cameras with activity",
                })
              : range === "7d"
                ? t("devices.cctv.activeStreams7d", {
                    defaultValue: "Last 7 days · cameras with activity",
                  })
                : t("devices.cctv.activeStreams30d", {
                    defaultValue: "Last 30 days · cameras with activity",
                  })
          }
          right={
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              {(["24h", "7d", "30d"] as RangeKey[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  className={cx(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    option === range
                      ? "bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          }
        />
        <ActiveStreamsChart
          categories={activeTrend.categories}
          data={activeTrend.data}
        />
      </UtilitySurface>
    </div>
  );
}
