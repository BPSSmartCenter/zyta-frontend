import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashboardTopBar from "../Dashboard/DashboardTopBar";
import DetectionSummaryBar from "../Dashboard/DetectionSummaryBar";
import type { Noti } from "../../data/Dashboard/notis";
import { useUserPath } from "../../routes/useUserPath";
import { useNotisFeed } from "../../context/NotisContext";
import { useFilters } from "../../context/FiltersContext";
import { setSelectedStat } from "../../hook/useStatSelection";
import { FACE_RECOGNIZE_PATH } from "../../utils/faceRecRoutes";
import {
  matchesSite,
  resolveAlertEventKey,
  resolveDefaultNotiImage,
  toDateKey,
} from "../../utils/notis";

type EventKey =
  | "motion"
  | "fall"
  | "fire"
  | "offline"
  | "sleep"
  | "face"
  | "other";

type PrimaryEvent = Exclude<EventKey, "other">;

type StatItem = {
  key: string;
  label: string;
  val: number | string;
  img: string;
  activeImg: string;
};

type Props = { statItems?: StatItem[] };

const ALERT_META: Record<
  PrimaryEvent,
  {
    title: string;
    subtitle: string;
    avgResponse: string;
    activeCardClassName: string;
    activeIconWrapClassName: string;
    heroBorderClassName: string;
    emphasisClassName: string;
  }
> = {
  fire: {
    title: "Fire detected",
    subtitle: "Thermal & smoke anomalies",
    avgResponse: "4m",
    activeCardClassName:
      "border-[#FF285B] bg-[#FF285B] text-white shadow-[0_22px_42px_rgba(255,40,91,0.22)]",
    activeIconWrapClassName: "bg-white/16",
    heroBorderClassName: "border-[#FFC2CF]",
    emphasisClassName: "text-[#FF285B]",
  },
  motion: {
    title: "Motion detected",
    subtitle: "Unexpected movement and patrol triggers",
    avgResponse: "6m",
    activeCardClassName:
      "border-[#14B8E5] bg-[#14B8E5] text-white shadow-[0_22px_42px_rgba(20,184,229,0.22)]",
    activeIconWrapClassName: "bg-white/16",
    heroBorderClassName: "border-[#B9F0FF]",
    emphasisClassName: "text-[#14B8E5]",
  },
  offline: {
    title: "Cameras offline",
    subtitle: "Connectivity and device availability incidents",
    avgResponse: "9m",
    activeCardClassName:
      "border-[#64748B] bg-[#64748B] text-white shadow-[0_22px_42px_rgba(100,116,139,0.2)]",
    activeIconWrapClassName: "bg-white/16",
    heroBorderClassName: "border-[#D8E0EA]",
    emphasisClassName: "text-[#475569]",
  },
  fall: {
    title: "Fall detected",
    subtitle: "Human fall incidents requiring quick follow-up",
    avgResponse: "5m",
    activeCardClassName:
      "border-[#F59E0B] bg-[#F59E0B] text-white shadow-[0_22px_42px_rgba(245,158,11,0.22)]",
    activeIconWrapClassName: "bg-white/16",
    heroBorderClassName: "border-[#FDE1A7]",
    emphasisClassName: "text-[#F59E0B]",
  },
  sleep: {
    title: "Sleep detected",
    subtitle: "Prolonged inactivity or sleeping posture alerts",
    avgResponse: "7m",
    activeCardClassName:
      "border-[#8B5CF6] bg-[#8B5CF6] text-white shadow-[0_22px_42px_rgba(139,92,246,0.2)]",
    activeIconWrapClassName: "bg-white/16",
    heroBorderClassName: "border-[#DDD1FF]",
    emphasisClassName: "text-[#7C3AED]",
  },
  face: {
    title: "Face/Plate Recognize",
    subtitle: "Identity, access, and plate recognition activity",
    avgResponse: "3m",
    activeCardClassName:
      "border-[#4F46E5] bg-[#4F46E5] text-white shadow-[0_22px_42px_rgba(79,70,229,0.22)]",
    activeIconWrapClassName: "bg-white/16",
    heroBorderClassName: "border-[#CFCBFF]",
    emphasisClassName: "text-[#4F46E5]",
  },
};

function parseForcedEvent(value?: string | null): PrimaryEvent {
  const normalized = String(value ?? "fire").toLowerCase();
  const event = normalized === "plate" ? "face" : normalized;
  return ["motion", "fall", "fire", "offline", "sleep", "face"].includes(event)
    ? (event as PrimaryEvent)
    : "fire";
}

function normalizeStatKey(value: string): EventKey {
  const raw = (value || "").toLowerCase();
  const collapsed = raw.replace(/[\s/_()\-|]+/g, "");

  if (raw.includes("motion")) return "motion";
  if (raw.includes("fall")) return "fall";
  if (raw.includes("fire")) return "fire";
  if (raw.includes("face") || raw.includes("plate")) return "face";
  if (
    raw.includes("offline") ||
    /ออฟ.?ไลน์/.test(raw) ||
    collapsed.includes("จำนวนกล้องออฟไลน์ออนไลน์") ||
    collapsed.includes("กล้องออฟไลน์")
  ) {
    return "offline";
  }
  if (raw.includes("sleep") || raw.includes("หลับ")) return "sleep";
  return "other";
}

function notiToEventKey(noti: Noti): EventKey {
  const detected = resolveAlertEventKey(noti);
  if (!detected) return "other";
  if (detected === "plate") return "face";
  return detected as EventKey;
}

function getHeroImage(noti?: Noti): string | undefined {
  if (!noti) return undefined;

  const direct =
    typeof noti.screenshot === "string" && noti.screenshot.trim().length
      ? noti.screenshot
      : typeof noti.img === "string" && noti.img.trim().length
        ? noti.img
        : undefined;

  return direct ?? resolveDefaultNotiImage(noti) ?? undefined;
}

function getSiteIdentity(noti: Noti): string {
  return String(
    noti.siteCode ?? noti.siteName ?? noti.siteId ?? noti.site ?? ""
  ).trim();
}

function resolveEventLabel(
  item: StatItem,
  eventKey: EventKey,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (eventKey === "offline") {
    return t("stats.offline", { defaultValue: "Cameras offline" });
  }

  return t(`stats.${eventKey}`, { defaultValue: item.label });
}

export default function Content({ statItems = [] }: Props) {
  const { t: tAlert } = useTranslation("alert");
  const { t } = useTranslation("dashboard");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams();
  const { absSite } = useUserPath();
  const { items: liveNotis } = useNotisFeed();
  const { date: globalDate, selectedSite: selectedSiteFilter } = useFilters();

  const selectedDateKey = React.useMemo(() => toDateKey(globalDate), [globalDate]);
  const routeSite = params.siteCode ? String(params.siteCode) : null;
  const contextSite =
    selectedSiteFilter && selectedSiteFilter !== "all"
      ? selectedSiteFilter
      : null;
  const effectiveSite = routeSite ?? contextSite;
  const activeEvent = parseForcedEvent(searchParams.get("event"));

  React.useEffect(() => {
    setSelectedStat(activeEvent);
  }, [activeEvent]);

  const scopedEvents = React.useMemo<Noti[]>(() => {
    let next: Noti[] = Array.isArray(liveNotis) ? liveNotis : [];

    if (effectiveSite) {
      next = next.filter((item) => matchesSite(item, effectiveSite));
    }

    if (selectedDateKey) {
      next = next.filter((item) => toDateKey(item.date) === selectedDateKey);
    }

    return next;
  }, [effectiveSite, liveNotis, selectedDateKey]);

  const counts = React.useMemo<Record<EventKey, number>>(() => {
    const next: Record<EventKey, number> = {
      motion: 0,
      fall: 0,
      fire: 0,
      offline: 0,
      sleep: 0,
      face: 0,
      other: 0,
    };

    for (const item of scopedEvents) {
      const key = notiToEventKey(item);
      next[key] = (next[key] ?? 0) + 1;
    }

    return next;
  }, [scopedEvents]);

  const cards = React.useMemo(
    () =>
      statItems.map((item) => {
        const normalizedKey = normalizeStatKey(item.key || item.label);
        return {
          ...item,
          key: normalizedKey,
          val: counts[normalizedKey] ?? 0,
          displayLabel: resolveEventLabel(item, normalizedKey, t),
        };
      }),
    [counts, statItems, t]
  );

  const listForEvent = React.useMemo(
    () =>
      scopedEvents
        .filter((item) => notiToEventKey(item) === activeEvent)
        .sort(
          (a, b) =>
            new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
        ),
    [activeEvent, scopedEvents]
  );

  const activeCard =
    cards.find((item) => item.key === activeEvent) ??
    cards.find((item) => item.key !== "other") ??
    cards[0];

  const activeMeta = ALERT_META[activeEvent];
  const activeImage = getHeroImage(listForEvent[0]);
  const activeSitesCount = new Set(
    listForEvent.map((item) => getSiteIdentity(item)).filter(Boolean)
  ).size;
  const unresolvedCount = listForEvent.filter((item) => {
    const type = String(item.type ?? "").toLowerCase();
    return type === "alert" || type === "warning" || type === "offline";
  }).length;

  const handleCardSelect = (nextKey: EventKey) => {
    if (nextKey === "other") return;
    setSelectedStat(nextKey);

    if (nextKey === "face") {
      navigate(absSite(FACE_RECOGNIZE_PATH, effectiveSite ?? undefined));
      return;
    }

    navigate(absSite(`/alert?event=${nextKey}`, effectiveSite ?? undefined));
  };

  const heroStats = [
    {
      label: tAlert("summary.today", { defaultValue: "Today" }),
      value: String(activeCard?.val ?? 0),
      valueClassName: activeMeta.emphasisClassName,
    },
    {
      label: tAlert("summary.unresolved", { defaultValue: "Unresolved" }),
      value: String(unresolvedCount),
      valueClassName: "text-slate-950",
    },
    {
      label: tAlert("summary.sitesAffected", {
        defaultValue: "Sites affected",
      }),
      value: String(activeSitesCount),
      valueClassName: "text-slate-950",
    },
    {
      label: tAlert("summary.avgResponse", {
        defaultValue: "Avg response",
      }),
      value: activeMeta.avgResponse,
      valueClassName: "text-slate-950",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <DashboardTopBar />
        <DetectionSummaryBar
          statItems={statItems}
          events={scopedEvents}
          selectedSiteCode={effectiveSite ?? undefined}
          variant="inline"
        />
      </div>

      <div className="space-y-1 px-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8AA0C5]">
          {tAlert("section.detection", { defaultValue: "Detection" })}
        </p>
        <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-slate-950">
          {tAlert("totalAlertsToday", {
            defaultValue: "Total Alerts (Today)",
          })}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {cards.map((item) => {
          const isActive = item.key === activeEvent;
          const cardMeta =
            item.key !== "other" ? ALERT_META[item.key as PrimaryEvent] : ALERT_META.fire;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleCardSelect(item.key)}
              className={[
                "group flex min-h-[108px] items-center gap-4 rounded-[22px] border p-4 text-left shadow-[0_18px_38px_rgba(15,23,42,0.08)] transition",
                isActive
                  ? cardMeta.activeCardClassName
                  : "border-[#E8EEF7] bg-white text-slate-900 hover:-translate-y-0.5 hover:border-[#D2E7F5]",
              ].join(" ")}
              aria-pressed={isActive}
            >
              <span
                className={[
                  "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                  isActive
                    ? cardMeta.activeIconWrapClassName
                    : "bg-[#F7FAFF] group-hover:bg-[#EFF8FF]",
                ].join(" ")}
              >
                <img
                  src={isActive ? item.activeImg : item.img}
                  alt=""
                  className="h-5 w-5 object-contain"
                />
              </span>

              <span className="min-w-0">
                <span className="block text-[34px] font-semibold leading-none tracking-[-0.03em]">
                  {item.val}
                </span>
                <span
                  className={[
                    "mt-2 block text-sm font-medium leading-snug",
                    isActive ? "text-white/92" : "text-[#5B6B7F]",
                  ].join(" ")}
                >
                  {item.displayLabel}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <section
        className={[
          "rounded-[30px] border bg-white p-6 shadow-[0_22px_48px_rgba(15,23,42,0.08)]",
          activeMeta.heroBorderClassName,
        ].join(" ")}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="h-[160px] w-full max-w-[160px] overflow-hidden rounded-[20px] bg-[#F1F5F9]">
            {activeImage ? (
              <img
                src={activeImage}
                alt={activeMeta.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#F8FBFE] text-xs font-semibold uppercase tracking-[0.2em] text-[#94A3B8]">
                No image
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8AA0C5]">
              {tAlert("summary.activeType", { defaultValue: "Active Type" })}
            </p>
            <h2 className="mt-2 text-[36px] font-semibold tracking-[-0.03em] text-slate-950">
              {activeMeta.title}
            </h2>
            <p className="mt-2 text-base text-[#5B6B7F]">{activeMeta.subtitle}</p>

            <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="border-l border-[#E7EEF8] pl-4 first:border-l-0 first:pl-0"
                >
                  <p className="text-sm text-[#8AA0C5]">{stat.label}</p>
                  <p
                    className={[
                      "mt-1 text-[18px] font-semibold tracking-[-0.02em]",
                      stat.valueClassName,
                    ].join(" ")}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
