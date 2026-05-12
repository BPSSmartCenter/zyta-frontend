import React from "react";
import StatsDonut from "../StatsDonut";
import {
  regionColors,
  regionLabels,
  regionSeries,
  roleColors,
  roleLabels,
  roleSeries,
} from "../Dashboard/dashboard.constants";
import { useTranslation } from "react-i18next";

const DONUT_MIN_PX = 140;
const DONUT_MAX_PX = 260;
const DONUT_VALUE_RATIO = 0.16;
const DONUT_VALUE_MIN = 18;
const DONUT_VALUE_MAX = 34;

function useResponsiveDonutSize() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState(DONUT_MAX_PX);

  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const update = () => {
      // wrapper has p-3 (12px each side); subtract to get inner square edge
      const innerWidth = Math.max(0, node.clientWidth - 24);
      const next = Math.round(
        Math.min(DONUT_MAX_PX, Math.max(DONUT_MIN_PX, innerWidth))
      );
      setSize((prev) => (prev === next ? prev : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function DistributionLegend({
  labels,
  series,
  colors,
}: {
  labels: string[];
  series: number[];
  colors: string[];
}) {
  const total = series.reduce((sum, value) => sum + value, 0);

  return (
    <div className="grid grid-cols-1 gap-2.5">
      {labels.map((label, index) => {
        const value = Number(series[index] ?? 0);
        const percent = total > 0 ? Math.round((value / total) * 100) : 0;

        return (
          <div
            key={`${label}-${index}`}
            className="flex items-center justify-between gap-3 rounded-[16px] border border-slate-200/80 bg-white px-3.5 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: colors[index] }}
              />
              <span className="truncate text-sm font-medium text-slate-700">
                {label}
              </span>
            </div>

            <div className="flex items-center gap-3 text-right">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                {percent}%
              </span>
              <span className="min-w-[24px] text-sm font-semibold text-slate-950">
                {value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutSection({
  title,
  labels,
  series,
  colors,
}: {
  title: string;
  labels: string[];
  series: number[];
  colors: string[];
}) {
  const total = series.reduce((sum, value) => sum + value, 0);
  const { ref: donutRef, size: donutSize } = useResponsiveDonutSize();
  const valueFontSize = Math.round(
    Math.min(
      DONUT_VALUE_MAX,
      Math.max(DONUT_VALUE_MIN, donutSize * DONUT_VALUE_RATIO)
    )
  );

  return (
    <section className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfe_100%)] p-5 shadow-[0_18px_36px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Distribution
          </p>
          <h3 className="mt-2 text-[1.2rem] font-semibold text-slate-950">
            {title}
          </h3>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          Total {total}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-4">
        <div className="flex w-full justify-center">
          <div
            ref={donutRef}
            className="flex aspect-square w-full max-w-[284px] items-center justify-center rounded-full border border-slate-100 bg-white/90 p-3 shadow-[0_16px_32px_rgba(15,23,42,0.06)]"
          >
            <StatsDonut
              title=""
              series={series}
              labels={labels}
              colors={colors}
              height={donutSize}
              donutSize="68%"
              separatorWidth={4}
              separatorColor="#FFFFFF"
              showLegend={false}
              center={{
                mode: "sum",
                showDataLabelsAround: false,
                display: "value",
                offsets: {
                  valueOffsetX: 0,
                  valueOffsetY: 0,
                },
                valueStyle: {
                  fontSize: valueFontSize,
                  fontWeight: 700,
                  color: "#0F172A",
                },
              }}
            />
          </div>
        </div>

        <DistributionLegend labels={labels} series={series} colors={colors} />
      </div>
    </section>
  );
}

type UserManagementProps = {
  regionSeries?: number[];
  regionLabels?: string[];
  regionColors?: string[];
  roleSeries?: number[];
  roleLabels?: string[];
  roleColors?: string[];
};

export default function UserManagement(props: UserManagementProps = {}) {
  const { t } = useTranslation(["dashboard"]);
  const {
    regionSeries: regionSeriesProp,
    regionLabels: regionLabelsProp,
    regionColors: regionColorsProp,
    roleSeries: roleSeriesProp,
    roleLabels: roleLabelsProp,
    roleColors: roleColorsProp,
  } = props;

  const regionSeriesData = regionSeriesProp ?? regionSeries;
  const regionLabelsData = regionLabelsProp ?? regionLabels;
  const regionColorsData = regionColorsProp ?? regionColors;
  const roleSeriesData = roleSeriesProp ?? roleSeries;
  const roleLabelsData = roleLabelsProp ?? roleLabels;
  const roleColorsData = roleColorsProp ?? roleColors;

  const translatedRegionLabels = regionLabelsData.map((label, i) =>
    t(`userMgmt.region.labels.${i}`, { defaultValue: label })
  );
  const translatedRoleLabels = roleLabelsData.map((label, i) =>
    t(`userMgmt.role.labels.${i}`, { defaultValue: label })
  );

  return (
    <section className="flex flex-col gap-5">
      <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {t("userMgmt.title", { defaultValue: "USER MANAGEMENT" })}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <DonutSection
          title={t("userMgmt.region.title", { defaultValue: "Total Sites" })}
          labels={translatedRegionLabels}
          series={regionSeriesData}
          colors={regionColorsData}
        />
        <DonutSection
          title={t("userMgmt.role.title", {
            defaultValue: "Active users",
          })}
          labels={translatedRoleLabels}
          series={roleSeriesData}
          colors={roleColorsData}
        />
      </div>
    </section>
  );
}
