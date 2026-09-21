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

// Compact diagram (viewBox 320 × 236): solar above the house, battery left, grid right.
const HUB = { x: 160, y: 132, r: 36 };
const SOLAR = { x: 160, y: 40, r: 24 };
const BATTERY = { x: 46, y: 132, r: 24 };
const GRID = { x: 274, y: 132, r: 24 };
const SPOKES = {
  solar: `M${SOLAR.x},${SOLAR.y + SOLAR.r} L${HUB.x},${HUB.y - HUB.r}`,
  battery: `M${BATTERY.x + BATTERY.r},${BATTERY.y} L${HUB.x - HUB.r},${HUB.y}`,
  grid: `M${GRID.x - GRID.r},${GRID.y} L${HUB.x + HUB.r},${HUB.y}`,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** faster dots for more power: 0.3 kW ≈ 1.8 s per cycle, 2 kW ≈ 0.8 s, ≥ 5 kW ≈ 0.45 s */
const durationFor = (kw: number | null) => `${clamp(2.4 / (1 + Math.abs(kw ?? 0)), 0.45, 2.4).toFixed(2)}s`;

const SunIcon: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <g className="ef-icon" transform={`scale(${scale})`}>
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

const HouseIcon: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <g className="ef-icon" transform={`scale(${scale})`}>
    <path d="M-20,-2 L0,-20 L20,-2" />
    <path d="M-15,-6 V16 H15 V-6" />
    <path d="M-4,16 V4 H4 V16" />
    <path d="M6,-2 H12 V4 H6 Z" />
  </g>
);

const BatteryIcon: React.FC<{ level: number | null; scale?: number }> = ({ level, scale = 1 }) => {
  const pct = level === null ? 0 : clamp(level, 0, 100) / 100;
  return (
    <g className="ef-icon" transform={`scale(${scale})`}>
      <rect x="-16" y="-9" width="30" height="18" rx="3" />
      <rect x="15" y="-4" width="4" height="8" rx="1" className="ef-icon--fill" fill="currentColor" />
      <rect className="ef-battery-level" x="-13" y="-6" width={(24 * pct).toFixed(1)} height="12" rx="1.5" />
    </g>
  );
};

const GridIcon: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <g className="ef-icon" transform={`scale(${scale})`}>
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

type StatusKey = "normal" | "standby" | "poweroff" | "offline" | "mixed";
const STATUS_DOT: Record<StatusKey, string> = {
  normal: "bg-emerald-400",
  standby: "bg-amber-400",
  poweroff: "bg-slate-500",
  offline: "bg-slate-500",
  mixed: "bg-amber-400",
};
const statusKey = (status: string | null, online: boolean): StatusKey => {
  const s = (status || "").toLowerCase();
  if (/normal/.test(s)) return "normal";
  if (/standby/.test(s)) return "standby";
  if (/power-?off|disconnect/.test(s)) return "poweroff";
  if (/mixed/.test(s)) return "mixed";
  if (!online || /offline/.test(s)) return "offline";
  return "normal";
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
      generating: t("devices.energyFlow.generating", { defaultValue: "generating" }),
      consuming: t("devices.energyFlow.consuming", { defaultValue: "consuming" }),
      noSun: t("devices.energyFlow.noSun", { defaultValue: "no sun" }),
      sections: {
        now: t("devices.energyFlow.sections.now", { defaultValue: "Power right now" }),
        results: t("devices.energyFlow.sections.results", { defaultValue: "Results" }),
        system: t("devices.energyFlow.sections.system", { defaultValue: "System" }),
      },
      today: t("devices.energyFlow.today", { defaultValue: "Generated today" }),
      month: t("devices.energyFlow.month", { defaultValue: "Generated this month" }),
      coverage: t("devices.energyFlow.coverageShort", { defaultValue: "Load covered by solar" }),
      pvCapacity: t("devices.energyFlow.pvCapacity", { defaultValue: "PV capacity" }),
      batteryCapacity: t("devices.energyFlow.batteryCapacity", { defaultValue: "Battery capacity" }),
      noBattery: t("devices.energyFlow.noBattery", { defaultValue: "No battery" }),
      soc: t("devices.energyFlow.soc", { defaultValue: "State of charge" }),
      loading: t("devices.energyFlow.loading", { defaultValue: "Loading live power…" }),
      error: t("devices.energyFlow.error", { defaultValue: "Could not load live power" }),
      noData: t("devices.energyFlow.noData", {
        defaultValue: "No live power readings for this system yet",
      }),
      legend: t("devices.energyFlow.legend", {
        defaultValue: "Arrows show the direction of flow; the dots move faster with more power",
      }),
      systemsTitle: t("devices.energyFlow.systemsTitle", { defaultValue: "By system" }),
      colSystem: t("devices.energyFlow.columns.system", { defaultValue: "System" }),
      colSolar: t("devices.energyFlow.columns.solar", { defaultValue: "Solar" }),
      colLoad: t("devices.energyFlow.columns.load", { defaultValue: "Load" }),
      colBattery: t("devices.energyFlow.columns.battery", { defaultValue: "Battery" }),
      online: t("devices.energyFlow.online", { defaultValue: "{{count}} online" }),
      status: {
        normal: t("devices.energyFlow.status.normal", { defaultValue: "Normal" }),
        standby: t("devices.energyFlow.status.standby", { defaultValue: "Standby" }),
        poweroff: t("devices.energyFlow.status.poweroff", { defaultValue: "Power-off" }),
        offline: t("devices.energyFlow.status.offline", { defaultValue: "Offline" }),
        mixed: t("devices.energyFlow.status.mixed", { defaultValue: "Some systems offline" }),
      } as Record<StatusKey, string>,
    }),
    [t]
  );

  const kw = React.useCallback(
    (value: number | null, digits = 2) =>
      value === null
        ? "—"
        : `${Math.abs(value).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })} kW`,
    [locale]
  );
  const kwh = React.useCallback(
    (value: number | null) =>
      value === null ? "—" : `${value.toLocaleString(locale, { maximumFractionDigits: 1 })} kWh`,
    [locale]
  );
  const pct = (value: number | null) => (value === null ? "—" : `${Math.round(value)}%`);
  const formatUpdated = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return null;
    const sameDay = d.toDateString() === new Date().toDateString();
    return sameDay
      ? d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const sectionTitle = (label: string) => (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
  );

  let body: React.ReactNode;
  if (!snapshot) {
    body = (
      <div className="px-6 py-8 text-sm text-slate-400">
        {loading ? text.loading : error ? text.error : text.noData}
      </div>
    );
  } else {
    const dir = flowDirections(snapshot);
    const coverage = solarCoverage(snapshot);
    const hasBattery =
      snapshot.batteryCapacityKwh !== null ? snapshot.batteryCapacityKwh > 0 : snapshot.batterySoc !== null;
    const batteryState =
      dir.battery === "out"
        ? text.charging
        : dir.battery === "in"
          ? text.discharging
          : hasBattery
            ? text.idle
            : text.noBattery;
    const gridState = dir.grid === "in" ? text.importing : dir.grid === "out" ? text.exporting : text.idle;
    const solarState = dir.solar === "in" ? text.generating : text.noSun;
    const sKey = statusKey(snapshot.status, snapshot.online);
    const updated = formatUpdated(snapshot.capturedAt);
    const stale = snapshot.capturedAt
      ? Date.now() - new Date(snapshot.capturedAt).getTime() > 30 * 60 * 1000
      : false;
    const onlineCount = systems.filter((s) => s.online).length;

    // Rows of the "power right now" list — same colours as the diagram, so the list is its legend.
    const rows: Array<{
      key: "solar" | "home" | "battery" | "grid";
      label: string;
      value: string;
      state: string;
      dot: string;
      active: boolean;
    }> = [
      {
        key: "solar",
        label: text.solar,
        value: kw(snapshot.pvKw),
        state: solarState,
        dot: "bg-[var(--ef-solar-glow)]",
        active: dir.solar !== "none",
      },
      {
        key: "home",
        label: text.home,
        value: kw(snapshot.loadKw),
        state: text.consuming,
        dot: "bg-slate-300",
        active: (snapshot.loadKw ?? 0) > 0.01,
      },
      {
        key: "battery",
        label: text.battery,
        value: hasBattery ? kw(snapshot.batteryKw) : "—",
        state: hasBattery && snapshot.batterySoc !== null ? `${batteryState} · ${pct(snapshot.batterySoc)}` : batteryState,
        dot: "bg-[var(--ef-battery-glow)]",
        active: dir.battery !== "none",
      },
      {
        key: "grid",
        label: text.grid,
        value: kw(snapshot.gridKw),
        state: gridState,
        dot: "bg-[var(--ef-grid-glow)]",
        active: dir.grid !== "none",
      },
    ];

    body = (
      <div className="grid grid-cols-1 gap-5 px-4 pb-5 md:grid-cols-[300px_minmax(0,1fr)] md:gap-8 md:px-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ── left: compact animated diagram ─────────────────────────────────────── */}
        <div className="mx-auto w-full max-w-[360px] md:mx-0 md:max-w-none">
          <svg
            className="ef-diagram ef-diagram--compact"
            viewBox="0 0 320 236"
            role="img"
            aria-label={rows.map((r) => `${r.label} ${r.value} ${r.state}`).join(", ")}
          >
            <defs>
              {(["solar", "battery", "grid"] as const).map((kind) => (
                <marker
                  key={kind}
                  id={markerId(kind)}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="4"
                  markerHeight="4"
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
                <SunIcon scale={0.75} />
              </g>
              <text className="ef-label" x={SOLAR.x + SOLAR.r + 10} y={SOLAR.y - 4}>
                {text.solar}
              </text>
              <text className="ef-value" x={SOLAR.x + SOLAR.r + 10} y={SOLAR.y + 14}>
                {kw(snapshot.pvKw)}
              </text>
            </g>

            {/* home */}
            <g className="ef-node ef-node--home ef-node--active">
              <circle className="ef-node__disc" cx={HUB.x} cy={HUB.y} r={HUB.r} />
              <g transform={`translate(${HUB.x} ${HUB.y})`}>
                <HouseIcon scale={0.85} />
              </g>
              <text className="ef-label" x={HUB.x} y={HUB.y + HUB.r + 16} textAnchor="middle">
                {text.home}
              </text>
              <text className="ef-value" x={HUB.x} y={HUB.y + HUB.r + 34} textAnchor="middle">
                {kw(snapshot.loadKw)}
              </text>
            </g>

            {/* battery */}
            <g className={`ef-node ef-node--battery ${dir.battery !== "none" ? "ef-node--active" : ""}`}>
              <circle className="ef-node__disc" cx={BATTERY.x} cy={BATTERY.y} r={BATTERY.r} />
              <g transform={`translate(${BATTERY.x} ${BATTERY.y})`}>
                <BatteryIcon level={snapshot.batterySoc} scale={0.75} />
              </g>
              <text className="ef-label" x={BATTERY.x} y={BATTERY.y + BATTERY.r + 16} textAnchor="middle">
                {text.battery}
              </text>
              <text className="ef-value" x={BATTERY.x} y={BATTERY.y + BATTERY.r + 34} textAnchor="middle">
                {hasBattery ? kw(snapshot.batteryKw) : "—"}
              </text>
              {hasBattery && snapshot.batterySoc !== null ? (
                <text className="ef-sub ef-sub--battery" x={BATTERY.x} y={BATTERY.y + BATTERY.r + 50} textAnchor="middle">
                  {pct(snapshot.batterySoc)}
                </text>
              ) : null}
            </g>

            {/* grid */}
            <g className={`ef-node ef-node--grid ${dir.grid !== "none" ? "ef-node--active" : ""}`}>
              <circle className="ef-node__disc" cx={GRID.x} cy={GRID.y} r={GRID.r} />
              <g transform={`translate(${GRID.x} ${GRID.y})`}>
                <GridIcon scale={0.75} />
              </g>
              <text className="ef-label" x={GRID.x} y={GRID.y + GRID.r + 16} textAnchor="middle">
                {text.grid}
              </text>
              <text className="ef-value" x={GRID.x} y={GRID.y + GRID.r + 34} textAnchor="middle">
                {kw(snapshot.gridKw)}
              </text>
              {dir.grid !== "none" ? (
                <text className="ef-sub ef-sub--grid" x={GRID.x} y={GRID.y + GRID.r + 50} textAnchor="middle">
                  {gridState}
                </text>
              ) : null}
            </g>
          </svg>
          <p className="mt-1 text-center text-[11px] text-slate-500 md:text-left">{text.legend}</p>
        </div>

        {/* ── right: the numbers, grouped ────────────────────────────────────────── */}
        <div className="grid min-w-0 grid-cols-1 gap-5 text-sm lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* power right now */}
          <div className="min-w-0">
            {sectionTitle(text.sections.now)}
            <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
              {rows.map((row) => (
                <li key={row.key} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${row.dot} ${row.active ? "" : "opacity-30"}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-100">{row.label}</span>
                    <span className={`block truncate text-[11px] ${row.active ? "text-slate-300" : "text-slate-500"}`}>
                      {row.state}
                    </span>
                  </span>
                  <span className={`tabular-nums text-base font-semibold ${row.active ? "text-white" : "text-slate-500"}`}>
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            {/* results */}
            <div>
              {sectionTitle(text.sections.results)}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: text.today, value: kwh(snapshot.todayKwh) },
                  { label: text.month, value: kwh(snapshot.monthKwh) },
                  { label: text.coverage, value: coverage === null ? "—" : `${Math.round(coverage * 100)}%` },
                ].map((tile) => (
                  <div key={tile.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <div className="text-[11px] leading-tight text-slate-400">{tile.label}</div>
                    <div className="mt-1 truncate text-base font-semibold tabular-nums text-white">{tile.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* system */}
            <div className="min-w-0">
              {sectionTitle(text.sections.system)}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-100">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[sKey]}`} aria-hidden="true" />
                    {text.status[sKey]}
                  </span>
                  {snapshot.systems > 1 ? (
                    <span className="text-xs text-slate-400">
                      {t("devices.energyFlow.systems", { defaultValue: "{{count}} systems", count: snapshot.systems })}
                      {" · "}
                      {t("devices.energyFlow.online", { defaultValue: "{{count}} online", count: onlineCount })}
                    </span>
                  ) : null}
                  {updated ? (
                    <span className={`ml-auto text-xs ${stale ? "text-amber-300" : "text-slate-400"}`}>
                      {t("devices.energyFlow.updated", { defaultValue: "Updated {{time}}", time: updated })}
                    </span>
                  ) : null}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-slate-400">{text.pvCapacity}</dt>
                  <dd className="text-right tabular-nums text-slate-100">
                    {snapshot.pvCapacityKwp === null
                      ? "—"
                      : `${snapshot.pvCapacityKwp.toLocaleString(locale, { maximumFractionDigits: 2 })} kWp`}
                  </dd>
                  <dt className="text-slate-400">{text.batteryCapacity}</dt>
                  <dd className="text-right tabular-nums text-slate-100">
                    {hasBattery && snapshot.batteryCapacityKwh !== null
                      ? `${snapshot.batteryCapacityKwh.toLocaleString(locale, { maximumFractionDigits: 2 })} kWh`
                      : text.noBattery}
                  </dd>
                </dl>
                {hasBattery && snapshot.batterySoc !== null ? (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{text.soc}</span>
                      <span className="tabular-nums text-slate-100">{pct(snapshot.batterySoc)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--ef-battery-glow)] transition-[width] duration-700"
                        style={{ width: `${clamp(snapshot.batterySoc, 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* per-system table for aggregates */}
          {systems.length > 1 ? (
            <div className="min-w-0 lg:col-span-2">
              {sectionTitle(text.systemsTitle)}
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
                <table className="w-full min-w-[420px] text-xs">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-400">
                      <th className="px-3 py-2 font-medium">{text.colSystem}</th>
                      <th className="px-3 py-2 text-right font-medium">{text.colSolar}</th>
                      <th className="px-3 py-2 text-right font-medium">{text.colLoad}</th>
                      <th className="px-3 py-2 text-right font-medium">{text.colBattery}</th>
                      <th className="px-3 py-2 text-right font-medium">{text.grid}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {systems.map((s) => {
                      const d = flowDirections(s);
                      const sBattery = s.batteryCapacityKwh !== null ? s.batteryCapacityKwh > 0 : s.batterySoc !== null;
                      return (
                        <tr key={s.deviceId} className="text-slate-200">
                          <td className="max-w-[220px] px-3 py-2">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[statusKey(s.status, s.online)]}`}
                                aria-hidden="true"
                              />
                              <span className="truncate" title={[s.name, s.systemName].filter(Boolean).join(" · ")}>
                                {s.systemName || s.name}
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-[var(--ef-solar-glow)]">{kw(s.pvKw)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{kw(s.loadKw)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {sBattery ? (
                              <>
                                <span className="text-[var(--ef-battery-glow)]">{kw(s.batteryKw)}</span>
                                <span className="ml-1 text-slate-500">
                                  {d.battery === "out" ? "↑" : d.battery === "in" ? "↓" : ""}
                                  {s.batterySoc !== null ? ` ${pct(s.batterySoc)}` : ""}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            <span className="text-[var(--ef-grid-glow)]">{kw(s.gridKw)}</span>
                            <span className="ml-1 text-slate-500">{d.grid === "in" ? "↓" : d.grid === "out" ? "↑" : ""}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
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
