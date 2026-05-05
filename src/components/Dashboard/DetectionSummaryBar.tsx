import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Noti } from "../../data/Dashboard/notis";
import {
  detectionSummaryActions,
  selectDetectionSummarySelectedKey,
  type DetectionSummaryKey,
} from "../../features/detectionSummary";
import { useNotisFeed } from "../../context/NotisContext";
import { useUserPath } from "../../routes/useUserPath";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { FACE_RECOGNIZE_PATH } from "../../utils/faceRecRoutes";
import { resolveAlertEventKey } from "../../utils/notis";

export type DetectionSummaryStatItem = {
  key: string;
  label: string;
  val: number | string;
  img: string;
  activeImg: string;
};

type DetectionSummaryBarProps = {
  statItems: DetectionSummaryStatItem[];
  events?: Noti[];
  selectedSiteCode?: string;
  className?: string;
  variant?: "floating" | "inline";
};

function normalizeDetectionKey(value: string): DetectionSummaryKey {
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

function eventToDetectionKey(noti: Noti): DetectionSummaryKey {
  const key = resolveAlertEventKey(noti);
  if (key === "plate") return "face";
  if (
    key === "motion" ||
    key === "fall" ||
    key === "fire" ||
    key === "offline" ||
    key === "sleep" ||
    key === "face"
  ) {
    return key;
  }
  if (key === "electric_offline") return "offline";
  return "other";
}

export default function DetectionSummaryBar({
  statItems,
  events,
  selectedSiteCode,
  className = "",
  variant = "floating",
}: DetectionSummaryBarProps) {
  const { t } = useTranslation(["dashboard"]);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const selectedKey = useAppSelector(selectDetectionSummarySelectedKey);
  const { absSite, base } = useUserPath();
  const { items: liveNotis } = useNotisFeed();

  React.useEffect(() => {
    const pathNoBase = location.pathname.startsWith(base)
      ? location.pathname.slice(base.length) || "/"
      : location.pathname;
    const pathScoped = pathNoBase.replace(/^\/site\/[^/]+/, "");
    if (pathScoped === "/dashboard") {
      dispatch(detectionSummaryActions.clearSelectedDetectionKey());
    }
  }, [base, dispatch, location.pathname]);

  const source = React.useMemo<Noti[]>(() => {
    if (Array.isArray(events)) return events;
    if (Array.isArray(liveNotis) && liveNotis.length) return liveNotis;
    return [];
  }, [events, liveNotis]);

  const counts = React.useMemo<Record<DetectionSummaryKey, number>>(() => {
    const next: Record<DetectionSummaryKey, number> = {
      motion: 0,
      fall: 0,
      fire: 0,
      offline: 0,
      sleep: 0,
      face: 0,
      other: 0,
    };

    for (const noti of source) {
      const key = eventToDetectionKey(noti);
      next[key] = (next[key] ?? 0) + 1;
    }

    return next;
  }, [source]);

  const syncedItems = React.useMemo(
    () =>
      (statItems ?? []).map((item) => {
        const key = normalizeDetectionKey(item.key || item.label);
        return {
          ...item,
          key,
          val: counts[key] ?? 0,
          labelClassName:
            key === "face" ? "text-[10px] whitespace-nowrap" : undefined,
        };
      }),
    [counts, statItems]
  );

  const handleChange = (ids: string[]) => {
    const nextKey = (ids[0] ?? null) as DetectionSummaryKey | null;
    dispatch(detectionSummaryActions.setSelectedDetectionKey(nextKey));
    if (!nextKey) return;

    const siteCode =
      selectedSiteCode && selectedSiteCode !== "all"
        ? selectedSiteCode
        : undefined;

    if (nextKey === "face") {
      navigate(absSite(FACE_RECOGNIZE_PATH, siteCode));
      return;
    }

    navigate(absSite(`/alert?event=${nextKey}`, siteCode));
  };

  const isInline = variant === "inline";

  return (
    <section
      aria-label="Detection summary"
      className={[
        isInline
          ? "w-full"
          : "pointer-events-none fixed bottom-3 left-1/2 z-[900] w-[calc(100vw-8px)] max-w-[940px] -translate-x-1/2",
        className,
      ].join(" ")}
    >
      <div
        className={[
          isInline
            ? "flex items-center justify-start gap-2 lg:justify-end"
            : "pointer-events-auto flex flex-wrap items-end justify-center gap-2 bg-transparent",
        ].join(" ")}
      >
        {syncedItems.map((item) => {
          const active = selectedKey === item.key;
          const itemLabel = t(`stats.${item.key}`, { defaultValue: item.label });
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleChange([active ? "" : item.key])}
              title={itemLabel}
              className={[
                isInline
                  ? "inline-flex h-11 min-w-[66px] items-center justify-center gap-2 rounded-[18px] border px-3 text-sm font-semibold shadow-[0_12px_30px_rgba(15,23,42,0.08)] outline-none transition"
                  : "group flex h-14 w-20 min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border px-3 py-2 text-center shadow-[0_10px_28px_rgba(15,23,42,0.16)] outline-none backdrop-blur-2xl transition-all duration-300 hover:h-24 hover:w-[148px] hover:-translate-y-2 focus-visible:h-24 focus-visible:w-[148px] focus-visible:-translate-y-2",
                isInline
                  ? "focus-visible:ring-4 focus-visible:ring-[#39B8EE]/15"
                  : "focus-visible:ring-4 focus-visible:ring-cyan-400/25",
                active
                  ? isInline
                    ? "border-[#8CDEFF] bg-gradient-to-br from-[#E7F9FF] via-white to-[#F0FCFF] text-[#1689BC]"
                    : "border-cyan-300/80 bg-gradient-to-br from-cyan-500 to-sky-500 text-white shadow-[0_14px_30px_rgba(8,119,168,0.24)]"
                  : isInline
                    ? "border-[#CDEFFF] bg-white text-slate-700 hover:-translate-y-0.5 hover:border-[#8CDEFF] hover:text-slate-950"
                    : "border-white/80 bg-white/45 text-slate-700 hover:border-cyan-200/80 hover:bg-gradient-to-br hover:from-cyan-50/90 hover:via-white/85 hover:to-sky-50/80 hover:text-slate-950",
              ].join(" ")}
              aria-pressed={active}
              aria-label={itemLabel}
            >
              <span className="flex items-center justify-center gap-2">
                <span
                  className={[
                    isInline
                      ? "grid h-7 w-7 shrink-0 place-items-center rounded-xl transition"
                      : "grid h-8 w-8 shrink-0 place-items-center rounded-xl transition",
                    active
                      ? isInline
                        ? "bg-[#39B8EE]/12"
                        : "bg-white/20"
                      : isInline
                        ? "bg-[#EAF8FF]"
                        : "bg-white/60 group-hover:bg-white/80",
                  ].join(" ")}
                >
                  <img
                    src={active ? item.activeImg : item.img}
                    alt=""
                    className={isInline ? "h-4 w-4 object-contain" : "h-5 w-5 object-contain"}
                  />
                </span>
                <span
                  className={
                    isInline
                      ? "text-base font-semibold leading-none tabular-nums tracking-normal"
                      : "text-[19px] font-semibold leading-none tabular-nums tracking-normal"
                  }
                >
                  {item.val}
                </span>
              </span>
              {!isInline ? (
                <span className="mt-0 block max-h-0 w-full translate-y-2 overflow-hidden text-xs font-extrabold uppercase leading-tight tracking-normal opacity-0 transition-all duration-300 group-hover:mt-2 group-hover:max-h-10 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:mt-2 group-focus-visible:max-h-10 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                  {itemLabel}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
