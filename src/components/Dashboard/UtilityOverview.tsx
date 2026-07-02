import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { selectAuthSites } from "../../features/auth";
import { getElectricOverviewForSites } from "../../features/electric";
import {
  selectSelectedGroup,
  selectSelectedUtility,
} from "../../features/siteSelection";
import { useUserPath } from "../../routes/useUserPath";
import { useAppSelector } from "../../store/hooks";

type CardKey = "water" | "electric" | "air";

type Props = {
  selectedSiteCode?: string;
};

type ElectricOverviewState = {
  loading: boolean;
  hasData: boolean;
  todayKwh: number | null;
  monthKwh: number | null;
  lastUpdateTime: string | null;
};

const CARD_THEME: Record<
  CardKey,
  {
    gradientClassName: string;
    glowClassName: string;
    iconWrapClassName: string;
    badgeClassName: string;
    shadowClassName: string;
  }
> = {
  water: {
    gradientClassName: "from-[#1BA7F5] via-[#1598EB] to-[#4B6DFF]",
    glowClassName:
      "bg-[radial-gradient(circle_at_86%_18%,rgba(255,255,255,0.28),transparent_22%),radial-gradient(circle_at_28%_110%,rgba(255,255,255,0.18),transparent_26%)]",
    iconWrapClassName: "bg-white/14 ring-1 ring-white/18",
    badgeClassName: "bg-[#FF3B7B] text-white",
    shadowClassName: "shadow-[0_24px_60px_rgba(19,137,224,0.26)]",
  },
  electric: {
    gradientClassName: "from-[#FFB100] via-[#FF8A00] to-[#FF6266]",
    glowClassName:
      "bg-[radial-gradient(circle_at_84%_20%,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_24%_112%,rgba(255,255,255,0.12),transparent_28%)]",
    iconWrapClassName: "bg-white/14 ring-1 ring-white/18",
    badgeClassName: "bg-[#FF2F6D] text-white",
    shadowClassName: "shadow-[0_24px_60px_rgba(255,146,0,0.26)]",
  },
  air: {
    gradientClassName: "from-[#14D59C] via-[#14C6A7] to-[#20B8CF]",
    glowClassName:
      "bg-[radial-gradient(circle_at_84%_18%,rgba(255,255,255,0.2),transparent_22%),radial-gradient(circle_at_26%_110%,rgba(255,255,255,0.12),transparent_30%)]",
    iconWrapClassName: "bg-white/14 ring-1 ring-white/18",
    badgeClassName: "bg-white/18 text-white",
    shadowClassName: "shadow-[0_24px_60px_rgba(18,197,161,0.24)]",
  },
};

function UtilityOverviewIcon({ kind }: { kind: CardKey }) {
  if (kind === "water") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3.75c-2.45 3.16-5.25 6.26-5.25 9.28a5.25 5.25 0 1 0 10.5 0c0-3.02-2.8-6.12-5.25-9.28Z" />
      </svg>
    );
  }

  if (kind === "electric") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M13 2 4 14h6l-1 8 11-14h-6l1-6Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h10" />
      <path d="M14 4c1.8 0 3.25 1.46 3.25 3.25S15.8 10.5 14 10.5" />
      <path d="M6.5 16h10" />
      <path d="M16.5 12c1.8 0 3.25 1.46 3.25 3.25S18.3 18.5 16.5 18.5" />
      <path d="M4 12v8" />
    </svg>
  );
}

function formatOverviewUpdateTime(value: string | null, locale: string) {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function Sparkline({
  todayKwh,
  monthKwh,
}: {
  todayKwh: number | null;
  monthKwh: number | null;
}) {
  const today = Number.isFinite(Number(todayKwh)) ? Math.max(0, Number(todayKwh)) : 0;
  const month = Number.isFinite(Number(monthKwh)) ? Math.max(0, Number(monthKwh)) : 0;
  const dayOfMonth = Math.max(1, new Date().getDate());
  const monthDailyAvg = month > 0 ? month / dayOfMonth : 0;

  // Build a tiny trend using real values so the chart reflects current usage,
  // even when detailed per-hour telemetry is unavailable in this endpoint.
  const anchors = [
    Math.max(0, monthDailyAvg * 0.78),
    Math.max(0, monthDailyAvg * 0.92),
    Math.max(0, monthDailyAvg * 0.85),
    Math.max(0, monthDailyAvg * 1.05),
    Math.max(0, monthDailyAvg * 0.88),
    today,
  ];

  const maxY = Math.max(1, ...anchors);
  const minY = Math.min(...anchors);
  const span = Math.max(1e-6, maxY - minY);
  const left = 12;
  const right = 144;
  const top = 34;
  const bottom = 68;
  const width = right - left;
  const step = width / Math.max(1, anchors.length - 1);
  const points = anchors.map((value, idx) => {
    const x = left + idx * step;
    const normalized = (value - minY) / span;
    const y = bottom - normalized * (bottom - top);
    return { x, y };
  });
  const linePath = points
    .map((point, idx) => `${idx === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L ${right} ${bottom} L ${left} ${bottom} Z`;
  const lastPoint = points[points.length - 1] ?? { x: right, y: bottom };

  return (
    <svg
      viewBox="0 0 160 72"
      className="pointer-events-none absolute right-4 h-20 w-[8.5rem] opacity-90 sm:w-[9rem]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="utility-empty-line" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path d={linePath} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d={areaPath} fill="url(#utility-empty-line)" />
      <circle cx={lastPoint.x} cy={lastPoint.y} r="2.6" fill="rgba(255,255,255,0.95)" />
    </svg>
  );
}

function UtilityCard({
  cardKey,
  electricOverview,
  onOpenElectric,
}: {
  cardKey: CardKey;
  electricOverview: ElectricOverviewState;
  onOpenElectric: () => void;
}) {
  const { t, i18n } = useTranslation("dashboard");
  const theme = CARD_THEME[cardKey];
  const isElectric = cardKey === "electric";
  const hasLiveElectric = isElectric && electricOverview.hasData;
  const loadingElectric = isElectric && electricOverview.loading;
  const locale = i18n.language?.toLowerCase().startsWith("th")
    ? "th-TH"
    : "en-US";
  const formattedLastUpdateTime = formatOverviewUpdateTime(
    electricOverview.lastUpdateTime,
    locale
  );

  return (
    <article
      className={[
        "group relative overflow-hidden rounded-[24px] text-white transition duration-300 hover:-translate-y-1",
        "bg-gradient-to-br",
        theme.gradientClassName,
        theme.shadowClassName,
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute inset-0 opacity-100",
          theme.glowClassName,
        ].join(" ")}
      />

      <div className="relative flex min-h-[320px] flex-col">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex h-12 w-12 items-center justify-center rounded-[18px] text-white",
                theme.iconWrapClassName,
              ].join(" ")}
            >
              <UtilityOverviewIcon kind={cardKey} />
            </div>
            <div>
              <h3 className="text-[1rem] font-semibold tracking-tight">
                {t(`utilityOverview.cards.${cardKey}.title`, {
                  defaultValue: cardKey,
                })}
              </h3>
            </div>
          </div>

          <span
            className={[
              "inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold",
              theme.badgeClassName,
            ].join(" ")}
          >
            {hasLiveElectric
              ? t("utilityOverview.live", { defaultValue: "Live" })
              : t("utilityOverview.emptyBadge", { defaultValue: "No data" })}
          </span>
        </div>

        <div className="relative flex flex-1 flex-col px-5 pt-5">
          <Sparkline
            todayKwh={isElectric ? electricOverview.todayKwh : null}
            monthKwh={isElectric ? electricOverview.monthKwh : null}
          />

          {hasLiveElectric ? (
            <div className="max-w-[62%] pr-5">
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-white/78">
                {t("utilityOverview.cards.electric.eyebrow", {
                  defaultValue: "Today's consumption",
                })}
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-[3.25rem] font-semibold leading-none">
                  {Number(electricOverview.todayKwh ?? 0).toLocaleString("en-US")}
                </span>
                <span className="pb-1.5 text-[0.95rem] font-semibold text-white/92">
                  kWh
                </span>
              </div>
              <p className="mt-1.5 text-[0.95rem] font-semibold text-white/88">
                {t("utilityOverview.liveToday", {
                  defaultValue: "Today's energy usage",
                })}
              </p>
            </div>
          ) : (
            <div className="max-w-[62%] pr-5">
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-white/78">
                {t(`utilityOverview.cards.${cardKey}.eyebrow`, {
                  defaultValue: "-",
                })}
              </p>
              <div className="mt-3">
                <p className="text-[1rem] font-semibold text-white">
                  {loadingElectric
                    ? t("utilityOverview.loadingTitle", {
                        defaultValue: "Loading utility data",
                      })
                    : t("utilityOverview.emptyTitle", {
                        defaultValue: "No live utility data",
                      })}
                </p>
                <p className="mt-1 text-xs font-medium text-white/78">
                  {t("utilityOverview.emptyDescription", {
                    defaultValue:
                      "This section will appear when utility metrics are available from the system.",
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 px-5 pb-4 pt-4 backdrop-blur-[1px]">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {hasLiveElectric ? (
              <>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/72">
                    {t("utilityOverview.monthLabel", {
                      defaultValue: "This month",
                    })}
                  </p>
                  <p className="mt-1 truncate text-[0.95rem] font-semibold text-white">
                    {Number(electricOverview.monthKwh ?? 0).toLocaleString("en-US")} kWh
                  </p>
                  <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[78%] rounded-full bg-white/80" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/72">
                    {t("utilityOverview.updatedLabel", {
                      defaultValue: "Updated",
                    })}
                  </p>
                  <p className="mt-1 truncate text-[0.95rem] font-semibold text-white">
                    {formattedLastUpdateTime}
                  </p>
                  <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[62%] rounded-full bg-white/80" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/72">
                    {t("utilityOverview.statusLabel", {
                      defaultValue: "Status",
                    })}
                  </p>
                  <p className="mt-1 truncate text-[0.95rem] font-semibold text-white">
                    {t("utilityOverview.live", { defaultValue: "Live" })}
                  </p>
                  <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-full rounded-full bg-white/80" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/72">
                    {t("utilityOverview.sourceLabel", {
                      defaultValue: "Source",
                    })}
                  </p>
                  <p className="mt-1 truncate text-[0.95rem] font-semibold text-white">
                    Electric API
                  </p>
                  <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[84%] rounded-full bg-white/80" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/72">
                    {t("utilityOverview.emptyMetricTitle", {
                      defaultValue: "Data source",
                    })}
                  </p>
                  <p className="mt-1 truncate text-[0.95rem] font-semibold text-white">
                    -
                  </p>
                  <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[16%] rounded-full bg-white/60" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/72">
                    {t("utilityOverview.emptyMetricValue", {
                      defaultValue: "Latest value",
                    })}
                  </p>
                  <p className="mt-1 truncate text-[0.95rem] font-semibold text-white">
                    -
                  </p>
                  <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[22%] rounded-full bg-white/60" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/72">
                    {t("utilityOverview.emptyMetricUpdated", {
                      defaultValue: "Updated",
                    })}
                  </p>
                  <p className="mt-1 truncate text-[0.95rem] font-semibold text-white">
                    -
                  </p>
                  <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[14%] rounded-full bg-white/60" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/72">
                    {t("utilityOverview.emptyMetricStatus", {
                      defaultValue: "Status",
                    })}
                  </p>
                  <p className="mt-1 truncate text-[0.95rem] font-semibold text-white">
                    {loadingElectric
                      ? t("utilityOverview.loadingShort", {
                          defaultValue: "Loading",
                        })
                      : t("utilityOverview.emptyBadge", {
                          defaultValue: "No data",
                        })}
                  </p>
                  <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/20">
                    <div className="h-full w-[30%] rounded-full bg-white/60" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/16 pt-3">
            <p className="text-sm font-medium text-white/82">
              {hasLiveElectric
                ? t("utilityOverview.electricFooter", {
                    defaultValue: "Electric meter overview • selected site",
                  })
                : t("utilityOverview.waitingFooter", {
                    defaultValue: "Waiting for utility data from the selected site",
                  })}
            </p>
            <button
              type="button"
              onClick={onOpenElectric}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.95rem] font-semibold text-white transition hover:bg-white/10"
            >
              <span>{t("utilityOverview.open", { defaultValue: "Open" })}</span>
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
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
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function UtilityOverview({ selectedSiteCode }: Props) {
  const navigate = useNavigate();
  const { absSite, abs } = useUserPath();
  const authSites = useAppSelector(selectAuthSites);
  const selectedGroup = useAppSelector(selectSelectedGroup);
  const selectedUtility = useAppSelector(selectSelectedUtility);
  const [electricOverview, setElectricOverview] = React.useState<ElectricOverviewState>({
    loading: false,
    hasData: false,
    todayKwh: null,
    monthKwh: null,
    lastUpdateTime: null,
  });

  React.useEffect(() => {
    const siteCode = String(selectedSiteCode ?? "").trim();
    const isAll = !siteCode || siteCode.toLowerCase() === "all";

    // Scope target sites directly from /me-derived auth slice. We deliberately
    // don't go through siteSelection.accessibleSites because that depends on
    // loadSiteCatalog finishing first — if that thunk is still pending or
    // failed, the dashboard would render with zero data even though /me
    // already has everything we need.
    let targetSites = authSites;
    if (!isAll) {
      const norm = siteCode.toLowerCase();
      targetSites = authSites.filter(
        (s) =>
          s.code.toLowerCase() === norm ||
          String(s.id).toLowerCase() === norm
      );
    } else {
      if (selectedUtility) {
        targetSites = targetSites.filter(
          (s) => String(s.utility_id ?? "") === String(selectedUtility.id)
        );
      }
      if (selectedGroup) {
        targetSites = targetSites.filter(
          (s) => String(s.site_group_id ?? "") === String(selectedGroup.id)
        );
      }
    }

    if (targetSites.length === 0) {
      setElectricOverview({
        loading: false,
        hasData: false,
        todayKwh: null,
        monthKwh: null,
        lastUpdateTime: null,
      });
      return;
    }

    const siteIds = targetSites.map((s) => String(s.id || s.code));
    let cancelled = false;
    setElectricOverview((prev) => ({ ...prev, loading: true }));

    (async () => {
      try {
        const results = await getElectricOverviewForSites(siteIds);
        if (cancelled) return;
        const usable = results.filter((r) => r.hasData);
        if (usable.length === 0) {
          setElectricOverview({
            loading: false,
            hasData: false,
            todayKwh: null,
            monthKwh: null,
            lastUpdateTime: null,
          });
          return;
        }
        const totalToday = usable.reduce(
          (sum, r) => sum + (r.todayKwh ?? 0),
          0
        );
        const totalMonth = usable.reduce(
          (sum, r) => sum + (r.monthKwh ?? 0),
          0
        );
        const lastUpdateTime =
          usable
            .map((r) => r.lastUpdateTime)
            .filter((v): v is string => Boolean(v))
            .sort()
            .pop() ?? null;

        // hasData = at least one in-scope site responded with electric data.
        // Zero kWh is still valid (e.g., at night / inverter idle).
        setElectricOverview({
          loading: false,
          hasData: true,
          todayKwh: Math.round(totalToday),
          monthKwh: Math.round(totalMonth),
          lastUpdateTime,
        });
      } catch {
        if (cancelled) return;
        setElectricOverview({
          loading: false,
          hasData: false,
          todayKwh: null,
          monthKwh: null,
          lastUpdateTime: null,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSiteCode, selectedUtility, selectedGroup, authSites]);

  const handleOpenElectric = React.useCallback(() => {
    const siteCode = String(selectedSiteCode ?? "").trim();
    if (siteCode && siteCode.toLowerCase() !== "all") {
      navigate(absSite("/electric/meter", siteCode));
      return;
    }
    navigate(abs("/electric/meter"));
  }, [abs, absSite, navigate, selectedSiteCode]);

  return (
    <section>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <UtilityCard
          cardKey="water"
          electricOverview={electricOverview}
          onOpenElectric={handleOpenElectric}
        />
        <UtilityCard
          cardKey="electric"
          electricOverview={electricOverview}
          onOpenElectric={handleOpenElectric}
        />
        <UtilityCard
          cardKey="air"
          electricOverview={electricOverview}
          onOpenElectric={handleOpenElectric}
        />
      </div>
    </section>
  );
}
