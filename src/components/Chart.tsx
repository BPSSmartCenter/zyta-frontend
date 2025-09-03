// src/components/Chart.tsx
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

/** -----------------------------
 *  Types
 *  ----------------------------- */
export type WeeklySnapshotSeries = {
  name: string;
  data: number[];
};

export type HighlightRange =
  | { from: string; to?: string; fillColor?: string; opacity?: number } // ใช้ label category เช่น "WED"
  | {
      fromIndex: number;
      toIndex?: number;
      fillColor?: string;
      opacity?: number;
    }; // ใช้ index ของ category

export interface WeeklySnapshotChartProps {
  categories: string[];
  series: WeeklySnapshotSeries[];

  height?: number;
  colors?: string[];
  title?: string;
  subtitle?: string;
  highlightRange?: HighlightRange;

  legendPosition?: NonNullable<ApexOptions["legend"]>["position"];
  legendAlign?: NonNullable<ApexOptions["legend"]>["horizontalAlign"];
  showGridY?: boolean;
  showGridX?: boolean;
  columnWidthPercent?: number;
  borderRadius?: number;
  showDataLabels?: boolean;

  optionsOverride?: ApexOptions;

  tooltipValueFormatter?: (val: number) => string | number;
}

/** -----------------------------
 *  Utils: Deep Merge (เล็กๆ)
 *  ----------------------------- */
function isObject(item: unknown): item is Record<string, any> {
  return !!item && typeof item === "object" && !Array.isArray(item);
}
function deepMerge<
  T extends Record<string, any>,
  U extends Record<string, any>
>(target: T, source?: U): T & U {
  if (!source) return target as T & U;
  const output = { ...target } as Record<string, any>;
  Object.keys(source).forEach((key) => {
    const sVal = (source as any)[key];
    if (isObject(sVal)) {
      output[key] = deepMerge(isObject(output[key]) ? output[key] : {}, sVal);
    } else {
      output[key] = sVal;
    }
  });
  return output as T & U;
}

const WeeklySnapshotChart = (props: WeeklySnapshotChartProps) => {
  const {
    categories,
    series,

    height = 760,
    colors = ["#4D80F4", "#39B8EE", "#98D1E4"],
    title,
    subtitle,
    highlightRange,

    legendPosition = "right",
    legendAlign = "center",
    showGridY = true,
    showGridX = false,
    columnWidthPercent = 55,
    borderRadius = 6,
    showDataLabels = false,

    tooltipValueFormatter,
    optionsOverride,
  } = props;

  type Annotations = NonNullable<ApexOptions["annotations"]>;

  const buildAnnotations = (): Annotations | undefined => {
    if (!highlightRange) return undefined;

    const fillColor = (highlightRange as any).fillColor ?? "#F5F7FB";
    const opacity = (highlightRange as any).opacity ?? 1;

    if ("from" in highlightRange && typeof highlightRange.from === "string") {
      const x1 = highlightRange.from;
      const x2 = highlightRange.to ?? highlightRange.from;
      return {
        xaxis: [
          {
            x: x1,
            x2,
            fillColor,
            opacity,
            borderColor: "transparent",
          },
        ],
      };
    }

    if (
      "fromIndex" in highlightRange &&
      typeof highlightRange.fromIndex === "number"
    ) {
      const fromIdx = Math.max(
        0,
        Math.min(categories.length - 1, highlightRange.fromIndex)
      );
      const toIdx = Math.max(
        fromIdx,
        Math.min(
          categories.length - 1,
          highlightRange.toIndex ?? highlightRange.fromIndex
        )
      );
      const x1 = categories[fromIdx];
      const x2 = categories[toIdx];
      return {
        xaxis: [
          {
            x: x1,
            x2,
            fillColor,
            opacity,
            borderColor: "transparent",
          },
        ],
      };
    }

    return undefined;
  };

  const baseOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Inter, ui-sans-serif, system-ui",
    },
    colors,
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: `${columnWidthPercent}%`,
        borderRadius,
        borderRadiusApplication: "end",
        dataLabels: { position: "top" },
      },
    },
    dataLabels: { enabled: showDataLabels },
    stroke: { show: false },
    grid: {
      borderColor: "#EEF2F7",
      xaxis: { lines: { show: showGridX } },
      yaxis: { lines: { show: showGridY } },
      padding: { left: 8, right: 8 },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#94A3B8", fontSize: "12px", fontWeight: 500 },
      },
    },
    yaxis: {
      min: 0,
      tickAmount: 6,
      labels: {
        style: { colors: "#94A3B8", fontSize: "12px", fontWeight: 500 },
      },
    },
    legend: {
      position: legendPosition,
      horizontalAlign: legendAlign,
      fontSize: "12px",
      // >>> สำคัญ: คงสไตล์เดิมไว้ และ cast type เพื่อให้ TS ผ่าน
      markers: { radius: 6, width: 10, height: 10 } as unknown as NonNullable<
        NonNullable<ApexOptions["legend"]>["markers"]
      >,
      itemMargin: { vertical: 6 },
      offsetY: 20,
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (val: number) => {
          const v =
            typeof tooltipValueFormatter === "function"
              ? tooltipValueFormatter(val)
              : val;
          return String(v); // บังคับเป็น string ให้ตรง type
        },
      },
    },
    annotations: buildAnnotations(),
  };

  const options = deepMerge(baseOptions, optionsOverride);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      {subtitle ? (
        <div className="mb-1 text-xs text-gray-500">{subtitle}</div>
      ) : null}
      {title ? (
        <div className="mb-3 text-lg font-semibold text-gray-900">{title}</div>
      ) : null}

      <ReactApexChart
        type="bar"
        series={series}
        options={options}
        height={height}
      />
    </div>
  );
};

export default WeeklySnapshotChart;
