// src/components/StatsDonut.tsx
import React from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

type CenterMode = "default" | "sum" | "percentOf" | "custom";
type CenterDisplay = "label" | "value" | "both";
type CenterOrder = "label-first" | "value-first";

type CenterConfig = {
  mode?: CenterMode;
  focusIndex?: number;
  label?: string;

  // แสดง/จัดรูปแบบค่า
  decimals?: number;
  prefix?: string;
  suffix?: string;

  // dataLabels รอบวง
  showDataLabelsAround?: boolean;

  // จัดตำแหน่ง
  offsets?: {
    labelOffsetY?: number;
    valueOffsetY?: number;
    labelOffsetX?: number;
    valueOffsetX?: number;
  };

  // คุมการแสดงผลตรงกลาง
  display?: CenterDisplay; // label | value | both (default = both)
  order?: CenterOrder; // label-first | value-first (default = label-first)

  // สไตล์ฟอนต์ตรงกลาง (ปรับได้แยกกัน)
  labelStyle?: {
    fontSize?: number; // px
    fontWeight?: number | string;
    color?: string;
    lineHeight?: number; // em
  };
  valueStyle?: {
    fontSize?: number; // px
    fontWeight?: number | string;
    color?: string;
    lineHeight?: number; // em
  };

  // โหมดคัสตอมขั้นสูง
  compute?: (args: { series: number[]; labels: string[]; sum: number }) => {
    label?: string;
    valueText: string;
  };
};

type Props = {
  title?: string;
  series: number[];
  labels: string[];
  colors?: string[];
  height?: number; // px
  donutSize?: string; // "55%", "70%", ...
  showLegend?: boolean;

  // ทำให้รอยต่อดูนุ่ม (soft) ด้วยเส้นคั่นและ lineCap
  softEdges?: boolean; // default: true
  separatorColor?: string; // default: "#ffffff"
  separatorWidth?: number; // default: 2

  center?: CenterConfig;
};

const StatsDonut: React.FC<Props> = ({
  title,
  series,
  labels,
  colors = ["#0077B6", "#4D80F4", "#34D399", "#FBBF24", "#FBBB50", "#98D1E4"],
  height = 240,
  donutSize = "55%",
  showLegend = false,

  softEdges = true,
  separatorColor = "#ffffff",
  separatorWidth = 2,

  center,
}) => {
  const sum = React.useMemo(
    () => (Array.isArray(series) ? series.reduce((a, b) => a + b, 0) : 0),
    [series]
  );

  // defaults
  const {
    mode = "default",
    focusIndex = 0,
    label,
    decimals = 2,
    prefix = "",
    suffix = "",
    offsets = {},
    showDataLabelsAround = true,
    display = "both",
    order = "label-first",
    labelStyle = {},
    valueStyle = {},
    compute,
  } = center ?? {};

  // เตรียมค่าตรงกลาง
  let centerLabel = label;
  let centerValue = "";

  if (compute) {
    const out = compute({ series, labels, sum });
    centerLabel = out.label ?? centerLabel;
    centerValue = out.valueText;
  } else {
    if (mode === "sum") {
      centerLabel = centerLabel ?? "Total";
      centerValue = `${prefix}${sum}${suffix}`;
    } else if (mode === "percentOf") {
      const base = sum || 1;
      const v = series?.[focusIndex] ?? 0;
      const pct = (v / base) * 100;
      centerLabel = centerLabel ?? labels?.[focusIndex] ?? "Value";
      centerValue = `${prefix}${pct.toFixed(decimals)}${suffix || "%"}`;
    } else if (mode === "custom") {
      centerLabel = centerLabel ?? "Result";
      centerValue = `${prefix}${series?.[0] ?? ""}${suffix}`;
    }
  }

  // ใช้ Apex แค่ “วาดโดนัท” ส่วนข้อความกลางทำ overlay เอง -> เสถียรสุด
  const options: ApexOptions = {
    chart: {
      type: "donut",
      toolbar: { show: false },
      sparkline: { enabled: true },
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    },
    labels,
    colors,
    stroke: {
      // เส้นคั่นระหว่างชิ้นเพื่อความนุ่มนวล
      width: softEdges ? separatorWidth : 0,
      colors: softEdges ? [separatorColor] : undefined,
      // บางเวอร์ชันของ Apex ไม่รองรับ rounding สำหรับ pie โดยตรง
      // แต่การมี stroke + สีพื้นหลังจะช่วยให้รอยต่อดูซอฟต์ขึ้น
      lineCap: "round" as any,
    },
    plotOptions: {
      pie: {
        donut: {
          size: donutSize,
          labels: {
            // ปิด native center ของ Apex (เรา overlay เองเพื่อความแน่นอน)
            show: false,
            name: { show: false },
            value: { show: false },
            total: { show: false },
          },
        },
        // ทำให้ hover/active ไม่ดึงชิ้นออกมากจนตัด overlay
        expandOnClick: false,
      },
    },
    dataLabels: {
      enabled: showDataLabelsAround,
      formatter: (val: number) => `${Math.round(val)}%`,
      style: { fontSize: "12px", fontWeight: 600 },
      dropShadow: { enabled: false },
    },
    legend: { show: showLegend },
    tooltip: {
      x: { show: true },
      y: { formatter: (val: number) => `${val}` },
    },
  };

  // สไตล์ค่าเริ่มต้นของข้อความกลาง (ปรับได้ด้วย props)
  const _labelStyle = {
    fontSize: (labelStyle.fontSize ?? 11) + "px",
    fontWeight: labelStyle.fontWeight ?? 500,
    color: labelStyle.color ?? "#6B7280",
    lineHeight: (labelStyle.lineHeight ?? 1.2) + "em",
    transform: `translate(${offsets.labelOffsetX ?? 0}px, ${
      offsets.labelOffsetY ?? 10
    }px)`,
  } as React.CSSProperties;

  const _valueStyle = {
    fontSize: (valueStyle.fontSize ?? 16) + "px",
    fontWeight: valueStyle.fontWeight ?? 700,
    color: valueStyle.color ?? "#1F2937",
    lineHeight: (valueStyle.lineHeight ?? 1.1) + "em",
    transform: `translate(${offsets.valueOffsetX ?? 0}px, ${
      offsets.valueOffsetY ?? -8
    }px)`,
  } as React.CSSProperties;

  // ตัดสินใจ render อะไรตรงกลาง
  const showCenter =
    Boolean(center) && (mode !== "default" || Boolean(compute));
  const showLabel = display === "label" || display === "both";
  const showValue = display === "value" || display === "both";

  const CenterBlock = (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="text-center leading-tight">
        {order === "label-first" ? (
          <>
            {showLabel && <div style={_labelStyle}>{centerLabel ?? ""}</div>}
            {showValue && <div style={_valueStyle}>{centerValue}</div>}
          </>
        ) : (
          <>
            {showValue && <div style={_valueStyle}>{centerValue}</div>}
            {showLabel && <div style={_labelStyle}>{centerLabel ?? ""}</div>}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex w-[150px] flex-col items-center">
      {title && (
        <h3 className="mb-3 font-inter text-[21px] whitespace-nowrap text-gray-800">
          {title}
        </h3>
      )}

      <div className="relative inline-block">
        <Chart options={options} series={series} type="donut" height={height} />
        {showCenter && CenterBlock}
      </div>
    </div>
  );
};

export default StatsDonut;
