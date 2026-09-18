import React from "react";
import { useTranslation } from "react-i18next";
import "./energyFlow.css";
import {
  flowDirections,
  solarCoverage,
  type EnergyFlowSnapshot,
  type FlowDirection,
} from "../../../features/electric/energyFlow";

type Props = {
  /** the system (or the aggregate of several systems) to draw */
  snapshot: EnergyFlowSnapshot | null;
  /** the members of an aggregate (empty for a single system) */
  systems?: EnergyFlowSnapshot[];
  loading: boolean;
  error: string | null;
  title: string;
  subtitle?: string | null;
};

// Diagram geometry (viewBox 600 × 400): solar above the house, battery left, grid right.
const HUB = { x: 300, y: 218, r: 50 };
const SOLAR = { x: 300, y: 58, r: 34 };
const BATTERY = { x: 92, y: 218, r: 34 };
const GRID = { x: 508, y: 218, r: 34 };
const SPOKES = {
  solar: `M${SOLAR.x},${SOLAR.y + SOLAR.r} L${HUB.x},${HUB.y - HUB.r}`,
  battery: `M${BATTERY.x + BATTERY.r},${BATTERY.y} L${HUB.x - HUB.r},${HUB.y}`,
  grid: `M${GRID.x - GRID.r},${GRID.y} L${HUB.x + HUB.r},${HUB.y}`,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** faster dots for more power: 0.3 kW ≈ 1.8 s per cycle, 2 kW ≈ 0.8 s, ≥ 5 kW ≈ 0.45 s */
const durationFor = (kw: number | null) => `${clamp(2.4 / (1 + Math.abs(kw ?? 0)), 0.45, 2.4).toFixed(2)}s`;

const SunIcon: React.FC = () => (
  <g className="ef-icon">
    <circle cx="0" cy="0" r="7" />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4;
      return (
        <line
          key={i}
          x1={(11 * Math.cos(a)).toFixed(2)}
          y1={(11 * Math.sin(a)).toFixed(2)}
          x2={(15 * Math.cos(a)).toFixed(2)}
          y2={(15 * Math.sin(a)).toFixed(2)}
        />
      );
    })}
  </g>
);

const HouseIcon: React.FC = () => (
  <g className="ef-icon">
    <path d="M-20,-2 L0,-20 L20,-2" />
    <path d="M-15,-6 V16 H15 V-6" />
    <path d="M-4,16 V4 H4 V16" />
    <path d="M6,-2 H12 V4 H6 Z" />
  </g>
);

const BatteryIcon: React.FC<{ level: number | null }> = ({ level }) => {
  const pct = level === null ? 0 : clamp(level, 0, 100) / 100;
  return (
    <g className="ef-icon">
      <rect x="-16" y="-9" width="30" height="18" rx="3" />
      <rect x="15" y="-4" width="4" height="8" rx="1" className="ef-icon--fill" fill="currentColor" />
      <rect className="ef-battery-level" x="-13" y="-6" width={(24 * pct).toFixed(1)} height="12" rx="1.5" />
    </g>
  );
};

const GridIcon: React.FC = () => (
  <g className="ef-icon">
    <path d="M-7,18 L-3,-14 H3 L7,18" />
    <path d="M-14,-6 H14" />
    <path d="M-10,4 H10" />
    <path d="M-14,-6 L-3,4 M14,-6 L3,4" />
  </g>
);

const Spoke: React.FC<{
  kind: "solar" | "battery" | "grid";
  d: string;
  direction: FlowDirection;
  kw: number | null;
  markerId: string;
}> = ({ kind, d, direction, kw, markerId }) => {
  const active = direction !== "none";
  const reverse = direction === "out";
  return (
    <g
      className={[
        "ef-spoke",
        `ef-spoke--${kind}`,
        active ? "ef-spoke--active" : "",
        reverse ? "ef-spoke--reverse" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--ef-duration": durationFor(kw) } as React.CSSProperties}
    >
      <path className="ef-spoke__base" d={d} />
      <path className="ef-spoke__glow" d={d} />
      <path
        className="ef-spoke__flow"
        d={d}
        markerEnd={active && !reverse ? `url(#${markerId})` : undefined}
        markerStart={active && reverse ? `url(#${markerId})` : undefined}
      />
    </g>
  );
};

const EnergyFlowCard: React.FC<Props> = ({ snapshot, systems = [], loading, error, title, subtitle }) => {
  const { t, i18n } = useTranslation(["devices"]);
  const locale = i18n.language || "th";
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const markerId = (kind: string) => `ef-arrow-${kind}-${uid}`;

  const text = React.useMemo(
    () => ({
      title: t("devices.energyFlow.title", { defaultValue: "Energy flow" }),
      subtitle: t("devices.energyFlow.subtitle", {
        defaultValue: "Live power of the solar system — from the maker's cloud, refreshed every 5 minutes",
      }),
      solar: t("devices.energyFlow.solar", { defaultValue: "Solar" }),
      home: t("devices.energyFlow.home", { defaultValue: "Home" }),
      battery: t("devices.energyFlow.battery", { defaultValue: "Battery" }),
      grid: t("devices.energyFlow.grid", { defaultValue: "Grid" }),
      charging: t("devices.energyFlow.charging", { defaultValue: "charging" }),
      discharging: t("devices.energyFlow.discharging", { defaultValue: "discharging" }),
      idle: t("devices.energyFlow.idle", { defaultValue: "idle" }),
      importing: t("devices.energyFlow.importing", { defaultValue: "importing" }),
      exporting: t("devices.energyFlow.exporting", { defaultValue: "exporting" }),
      today: t("devices.energyFlow.today", { defaultValue: "Generated today" }),
      month: t("devices.energyFlow.month", { defaultValue: "Generated this month" }),
      pvCapacity: t("devices.energyFlow.pvCapacity", { defaultValue: "PV capacity" }),
      batteryCapacity: t("devices.energyFlow.batteryCapacity", { defaultValue: "Battery capacity" }),
      noBattery: t("devices.energyFlow.noBattery", { defaultValue: "No battery" }),
      loading: t("devices.energyFlow.loading", { defaultValue: "Loading live power…" }),
      error: t("devices.energyFlow.error", { defaultValue: "Could not load live power" }),
      noData: t("devices.energyFlow.noData", {
        defaultValue: "No live power readings for this system yet",
      }),
      legend: t("devices.energyFlow.legend", {
        defaultValue: "Arrows show the direction of flow; the dots move faster with more power",
      }),
      systemsTitle: t("devices.energyFlow.systemsTitle", { defaultValue: "By system" }),
      status: {
        normal: t("devices.energyFlow.status.normal", { defaultValue: "Normal" }),
        standby: t("devices.energyFlow.status.standby", { defaultValue: "Standby" }),
        poweroff: t("devices.energyFlow.status.poweroff", { defaultValue: "Power-off" }),
        offline: t("devices.energyFlow.status.offline", { defaultValue: "Offline" }),
        mixed: t("devices.energyFlow.status.mixed", { defaultValue: "Some systems offline" }),
      },
    }),
    [t]
  );

  const kw = React.useCallback(
    (value: number | null) =>
      value === null
        ? "—"
        : `${Math.abs(value).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kW`,
    [locale]
  );
  const kwh = React.useCallback(
    (value: number | null) =>
      value === null ? "—" : `${value.toLocaleString(locale, { maximumFractionDigits: 1 })} kWh`,
    [locale]
  );
  const pct = (value: number | null) => (value === null ? "—" : `${Math.round(value)}%`);

  const statusKey = (status: string | null, online: boolean): keyof typeof text.status => {
    const s = (status || "").toLowerCase();
    if (/normal/.test(s)) return "normal";
    if (/standby/.test(s)) return "standby";
    if (/power-?off|disconnect/.test(s)) return "poweroff";
    if (/mixed/.test(s)) return "mixed";
    if (!online || /offline/.test(s)) return "offline";
    return "normal";
  };
  const statusTone: Record<keyof typeof text.status, string> = {
    normal: "bg-emerald-400",
    standby: "bg-amber-400",
    poweroff: "bg-slate-500",
    offline: "bg-slate-500",
    mixed: "bg-amber-400",
  };

  const formatUpdated = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return null;
    const sameDay = d.toDateString() === new Date().toDateString();
    return sameDay
      ? d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  let body: React.ReactNode;
  if (!snapshot) {
    body = (
      <div className="px-6 py-10 text-sm text-slate-400">
        {loading ? text.loading : error ? text.error : text.noData}
      </div>
    );
  } else {
    const dir = flowDirections(snapshot);
    const coverage = solarCoverage(snapshot);
    const hasBattery = snapshot.batteryCapacityKwh !== null ? snapshot.batteryCapacityKwh > 0 : snapshot.batterySoc !== null;
    const batteryState =
      dir.battery === "out" ? text.charging : dir.battery === "in" ? text.discharging : hasBattery ? text.idle : text.noBattery;
    const gridState = dir.grid === "in" ? text.importing : dir.grid === "out" ? text.exporting : text.idle;
    const sKey = statusKey(snapshot.status, snapshot.online);
    const updated = formatUpdated(snapshot.capturedAt);
    const stale = snapshot.capturedAt
      ? Date.now() - new Date(snapshot.capturedAt).getTime() > 30 * 60 * 1000
      : false;

    body = (
      <div className="grid grid-cols-1 gap-6 px-4 pb-6 pt-2 md:grid-cols-[minmax(0,1.5fr)_minmax(220px,0.9fr)] md:px-6">
        <svg
          className="ef-diagram"
          viewBox="0 0 600 400"
          role="img"
          aria-label={`${text.solar} ${kw(snapshot.pvKw)}, ${text.home} ${kw(snapshot.loadKw)}, ${text.battery} ${kw(
            snapshot.batteryKw
          )} ${batteryState}, ${text.grid} ${kw(snapshot.gridKw)} ${gridState}`}
        >
          <defs>
            {(["solar", "battery", "grid"] as const).map((kind) => (
              <marker
                key={kind}
                id={markerId(kind)}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 Z" fill={`var(--ef-${kind})`} />
              </marker>
            ))}
          </defs>

          <Spoke kind="solar" d={SPOKES.solar} direction={dir.solar} kw={snapshot.pvKw} markerId={markerId("solar")} />
          <Spoke
            kind="battery"
            d={SPOKES.battery}
            direction={dir.battery}
            kw={snapshot.batteryKw}
            markerId={markerId("battery")}
          />
          <Spoke kind="grid" d={SPOKES.grid} direction={dir.grid} kw={snapshot.gridKw} markerId={markerId("grid")} />

          {/* solar */}
          <g className={`ef-node ef-node--solar ${dir.solar !== "none" ? "ef-node--active" : ""}`}>
            <circle className="ef-node__disc" cx={SOLAR.x} cy={SOLAR.y} r={SOLAR.r} />
            <g transform={`translate(${SOLAR.x} ${SOLAR.y})`}>
              <SunIcon />
            </g>
            <text className="ef-label" x={SOLAR.x + SOLAR.r + 14} y={SOLAR.y - 8}>
              {text.solar}
            </text>
            <text className="ef-value" x={SOLAR.x + SOLAR.r + 14} y={SOLAR.y + 16}>
              {kw(snapshot.pvKw)}
            </text>
          </g>

          {/* home */}
          <g className="ef-node ef-node--home ef-node--active">
            <circle className="ef-node__disc" cx={HUB.x} cy={HUB.y} r={HUB.r} />
            <g transform={`translate(${HUB.x} ${HUB.y})`}>
              <HouseIcon />
            </g>
            <text className="ef-label" x={HUB.x} y={HUB.y + HUB.r + 22} textAnchor="middle">
              {text.home}
            </text>
            <text className="ef-value" x={HUB.x} y={HUB.y + HUB.r + 46} textAnchor="middle">
              {kw(snapshot.loadKw)}
            </text>
            {coverage !== null ? (
              <text className="ef-sub ef-sub--solar" x={HUB.x} y={HUB.y + HUB.r + 66} textAnchor="middle">
                {t("devices.energyFlow.coverage", {
                  defaultValue: "Solar covers {{percent}}% of the load",
                  percent: Math.round(coverage * 100),
                })}
              </text>
            ) : null}
          </g>

          {/* battery */}
          <g className={`ef-node ef-node--battery ${dir.battery !== "none" ? "ef-node--active" : ""}`}>
            <circle className="ef-node__disc" cx={BATTERY.x} cy={BATTERY.y} r={BATTERY.r} />
            <g transform={`translate(${BATTERY.x} ${BATTERY.y})`}>
              <BatteryIcon level={snapshot.batterySoc} />
            </g>
            <text className="ef-label" x={BATTERY.x} y={BATTERY.y + BATTERY.r + 22} textAnchor="middle">
              {text.battery}
            </text>
            <text className="ef-value" x={BATTERY.x} y={BATTERY.y + BATTERY.r + 46} textAnchor="middle">
              {hasBattery ? kw(snapshot.batteryKw) : "—"}
            </text>
            <text className="ef-sub ef-sub--battery" x={BATTERY.x} y={BATTERY.y + BATTERY.r + 66} textAnchor="middle">
              {hasBattery && snapshot.batterySoc !== null ? `${batteryState} · ${pct(snapshot.batterySoc)}` : batteryState}
            </text>
          </g>

          {/* grid */}
          <g className={`ef-node ef-node--grid ${dir.grid !== "none" ? "ef-node--active" : ""}`}>
            <circle className="ef-node__disc" cx={GRID.x} cy={GRID.y} r={GRID.r} />
            <g transform={`translate(${GRID.x} ${GRID.y})`}>
              <GridIcon />
            </g>
            <text className="ef-label" x={GRID.x} y={GRID.y + GRID.r + 22} textAnchor="middle">
              {text.grid}
            </text>
            <text className="ef-value" x={GRID.x} y={GRID.y + GRID.r + 46} textAnchor="middle">
              {kw(snapshot.gridKw)}
            </text>
            <text className="ef-sub ef-sub--grid" x={GRID.x} y={GRID.y + GRID.r + 66} textAnchor="middle">
              {gridState}
            </text>
          </g>
        </svg>

        <div className="flex flex-col gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100">
              <span className={`h-2 w-2 rounded-full ${statusTone[sKey]}`} aria-hidden="true" />
              {text.status[sKey]}
            </span>
            {snapshot.systems > 1 ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100">
                {t("devices.energyFlow.systems", { defaultValue: "{{count}} systems", count: snapshot.systems })}
              </span>
            ) : null}
            {updated ? (
              <span className={`text-xs ${stale ? "text-amber-300" : "text-slate-400"}`}>
                {t("devices.energyFlow.updated", { defaultValue: "Updated {{time}}", time: updated })}
              </span>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{text.today}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-white">{kwh(snapshot.todayKwh)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{text.month}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-white">{kwh(snapshot.monthKwh)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{text.pvCapacity}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-white">
                {snapshot.pvCapacityKwp === null
                  ? "—"
                  : `${snapshot.pvCapacityKwp.toLocaleString(locale, { maximumFractionDigits: 2 })} kWp`}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{text.batteryCapacity}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-white">
                {hasBattery && snapshot.batteryCapacityKwh !== null
                  ? `${snapshot.batteryCapacityKwh.toLocaleString(locale, { maximumFractionDigits: 2 })} kWh`
                  : text.noBattery}
              </dd>
            </div>
          </dl>

          {hasBattery && snapshot.batterySoc !== null ? (
            <div>
              <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <span>{text.battery}</span>
                <span className="text-slate-200">{pct(snapshot.batterySoc)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--ef-battery-glow)] transition-[width] duration-700"
                  style={{ width: `${clamp(snapshot.batterySoc, 0, 100)}%` }}
                />
              </div>
            </div>
          ) : null}

          {systems.length > 1 ? (
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{text.systemsTitle}</div>
              <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto pr-1">
                {systems.map((s) => (
                  <li key={s.deviceId} className="flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate text-slate-200" title={[s.name, s.systemName].filter(Boolean).join(" · ")}>
                      <span
                        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${statusTone[statusKey(s.status, s.online)]}`}
                        aria-hidden="true"
                      />
                      {s.systemName || s.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-300">
                      <span className="text-[var(--ef-solar-glow)]">{kw(s.pvKw)}</span>
                      <span className="mx-1 text-slate-500">→</span>
                      {kw(s.loadKw)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-auto text-[11px] text-slate-500">{text.legend}</p>
        </div>
      </div>
    );
  }

  return (
    <section className="ef-card overflow-hidden rounded-[28px] border border-slate-800 shadow-[0_20px_35px_rgba(15,23,42,0.25)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-6 pt-5 pb-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">{text.title}</h3>
          <p className="text-xs text-slate-400">{[title, subtitle].filter(Boolean).join(" · ") || text.subtitle}</p>
        </div>
        {loading && snapshot ? <span className="text-[11px] text-slate-500">…</span> : null}
      </div>
      {body}
    </section>
  );
};

export default EnergyFlowCard;
