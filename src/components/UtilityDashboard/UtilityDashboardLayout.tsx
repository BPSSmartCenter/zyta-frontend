import React from "react";

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

type Tone = "amber" | "orange" | "emerald" | "slate";

const TONE_STYLES: Record<
  Tone,
  {
    surface: string;
    ring: string;
    glow: string;
    text: string;
    progress: string;
    soft: string;
  }
> = {
  amber: {
    surface: "from-[#fffaf0] via-[#fff8e5] to-[#fff3d2]",
    ring: "#f59e0b",
    glow: "shadow-[0_18px_40px_rgba(245,158,11,0.12)]",
    text: "text-amber-600",
    progress: "from-[#f59e0b] to-[#fbbf24]",
    soft: "bg-amber-50 text-amber-700",
  },
  orange: {
    surface: "from-[#fff8f2] via-[#fff3e8] to-[#ffe7d2]",
    ring: "#f97316",
    glow: "shadow-[0_18px_40px_rgba(249,115,22,0.12)]",
    text: "text-orange-600",
    progress: "from-[#f97316] to-[#fb923c]",
    soft: "bg-orange-50 text-orange-700",
  },
  emerald: {
    surface: "from-[#f4fffb] via-[#edfff8] to-[#dcfce7]",
    ring: "#10b981",
    glow: "shadow-[0_18px_40px_rgba(16,185,129,0.12)]",
    text: "text-emerald-600",
    progress: "from-[#10b981] to-[#34d399]",
    soft: "bg-emerald-50 text-emerald-700",
  },
  slate: {
    surface: "from-[#ffffff] via-[#f8fafc] to-[#eef2f7]",
    ring: "#64748b",
    glow: "shadow-[0_18px_40px_rgba(100,116,139,0.08)]",
    text: "text-slate-600",
    progress: "from-[#64748b] to-[#94a3b8]",
    soft: "bg-slate-100 text-slate-700",
  },
};

export const UtilityPageShell: React.FC<{
  title: string;
  titleBadge?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, titleBadge, toolbar, children }) => (
  <div className="mx-auto w-full max-w-[1600px] px-4 pb-14 sm:px-6">
    <div className="mb-5 mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[24px] font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          {titleBadge}
        </div>
      </div>
      {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

export const UtilitySurface: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <section
    className={cx(
      "rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-5",
      className
    )}
  >
    {children}
  </section>
);

export const UtilityHeroCard: React.FC<{
  eyebrow: string;
  title: string;
  value: string;
  unit?: string;
  progressValue?: number;
  progressLabel?: string;
  footer?: string;
  badge?: React.ReactNode;
  tone?: Tone;
}> = ({
  eyebrow,
  title,
  value,
  unit,
  progressValue = 0,
  progressLabel,
  footer,
  badge,
  tone = "amber",
}) => {
  const style = TONE_STYLES[tone];
  const safeProgress = Math.max(0, Math.min(100, progressValue));
  // The ring is a fixed size: shrink the type for long figures instead of cutting them off.
  const valueSizeClass =
    value.length <= 4
      ? "text-[2.4rem]"
      : value.length <= 6
        ? "text-[1.9rem]"
        : value.length <= 8
          ? "text-[1.45rem]"
          : "text-[1.15rem]";
  return (
    <UtilitySurface className={cx("overflow-hidden bg-gradient-to-br", style.surface, style.glow)}>
      <div className="flex h-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <ProgressRing value={safeProgress} color={style.ring}>
            <div className="text-center leading-tight">
              <div
                className={cx("mx-auto whitespace-nowrap font-semibold leading-none text-slate-900 tabular-nums", valueSizeClass)}
                title={value}
              >
                {value}
              </div>
              {unit ? <div className="text-[11px] text-slate-500">{unit}</div> : null}
            </div>
          </ProgressRing>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              {eyebrow}
            </div>
            <div className="mt-1 text-[15px] font-medium text-slate-700">{title}</div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate text-sm font-medium text-slate-500">{footer}</div>
            {badge ?? (progressLabel ? <span className={cx("rounded-full px-3 py-1 text-xs font-semibold", style.soft)}>{progressLabel}</span> : null)}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/80">
            <div
              className={cx("h-full rounded-full bg-gradient-to-r", style.progress)}
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
            <span>{title}</span>
            <span className={cx("font-semibold", style.text)}>
              {progressLabel ?? `${safeProgress.toFixed(0)}%`}
            </span>
          </div>
        </div>
      </div>
    </UtilitySurface>
  );
};

export const UtilityMetricTile: React.FC<{
  label: string;
  value: string;
  sublabel?: string;
  accent?: React.ReactNode;
  tone?: Tone;
}> = ({ label, value, sublabel, accent, tone = "amber" }) => {
  const style = TONE_STYLES[tone];
  return (
    <UtilitySurface className={cx("bg-gradient-to-br", style.surface)}>
      <div className="flex items-start gap-3">
        {accent ? (
          <div className={cx("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", style.soft)}>
            {accent}
          </div>
        ) : null}
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-slate-400">{label}</div>
          <div className="mt-1 text-[28px] font-semibold leading-none text-slate-900">{value}</div>
          {sublabel ? <div className="mt-1 text-[11px] text-slate-500">{sublabel}</div> : null}
        </div>
      </div>
    </UtilitySurface>
  );
};

export const UtilityStripCard: React.FC<{
  title: string;
  value: string;
  progressValue: number;
  tone?: Tone;
  subtitle?: string;
}> = ({ title, value, progressValue, tone = "slate", subtitle }) => {
  const style = TONE_STYLES[tone];
  const safeProgress = Math.max(0, Math.min(100, progressValue));
  return (
    <div className="rounded-[18px] border border-slate-200/70 bg-slate-50/90 px-3 py-3">
      <div className="text-[11px] font-medium text-slate-500">{title}</div>
      <div className="mt-1 text-[12px] text-slate-400">{subtitle}</div>
      <div className="mt-2 text-[30px] font-semibold leading-none text-slate-700">{value}</div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cx("h-full rounded-full bg-gradient-to-r", style.progress)}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
};

export const UtilitySectionTitle: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}> = ({ title, subtitle, right }) => (
  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div className="">
      <h3 className="text-[18px] font-semibold text-slate-900">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
    </div>
    {right}
  </div>
);

function ProgressRing({
  value,
  color,
  children,
}: {
  value: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid size-[92px] shrink-0 place-items-center rounded-full bg-white"
      style={{
        background: `conic-gradient(${color} ${value * 3.6}deg, rgba(226,232,240,0.9) 0deg)`,
      }}
    >
      <div className="grid size-[74px] place-items-center rounded-full bg-white">
        {children}
      </div>
    </div>
  );
}
