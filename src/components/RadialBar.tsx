// src/components/RadialBar.tsx
import React from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

type CenterOffsets = {
  labelOffsetX?: number;
  labelOffsetY?: number;
  valueOffsetX?: number;
  valueOffsetY?: number;
};

type RadialValueStyle = {
  fontSize?: number;
  fontWeight?: number;
  color?: string;
};

type RadialBarProps = {
  title?: string;
  value: number; // 0–100
  label?: string;
  offsets?: CenterOffsets;
  mainColor?: string; // progress
  primaryColor?: string; // track
  bg?: string; // hollow background
  prefix?: string; // ต่อท้ายตัวเลข เช่น %
  height?: number;
  width?: number; // ความกว้าง chart (px)
  rounded?: boolean;
  hollowSize?: string;
  valueStyle?: RadialValueStyle;
  className?: string;
  tight?: boolean; // ทำ container ให้พอดีตัว
};

const RadialBar: React.FC<RadialBarProps> = ({
  title,
  value,
  label = "",
  offsets,
  mainColor = "#FB3F3F",
  primaryColor = "#A9DB4E",
  bg = "#FFFFFF",
  prefix = "%",
  height = 170,
  width, // ถ้าไม่ส่งจะเท่ากับ height
  rounded = true,
  hollowSize = "72%",
  valueStyle,
  className,
  tight = false,
}) => {
  const chartWidth = width ?? height;

  const options: ApexOptions = {
    chart: {
      type: "radialBar",
      sparkline: { enabled: true },
      toolbar: { show: false },
    },
    colors: [mainColor],
    stroke: { lineCap: rounded ? "round" : "butt" },
    plotOptions: {
      radialBar: {
        hollow: { size: hollowSize, background: bg },
        track: { background: primaryColor, strokeWidth: "100%", margin: 0 },
        // ⬇️ Cast ทั้งก้อนของ dataLabels เพื่อคงสไตล์ (formatter/offsetX) และให้ TS ผ่าน
        dataLabels: {
          show: true,
          name: {
            show: !!label,
            // apexcharts ช่วยรองรับ formatter แม้ type ไม่ประกาศ -> cast ครอบทั้งก้อน
            formatter: () => label,
            offsetX: offsets?.labelOffsetX ?? 0,
            offsetY: offsets?.labelOffsetY ?? -6, // label อยู่เหนือค่า
            color: "#6B7280",
            fontSize: "12px",
            fontWeight: 500,
          },
          value: {
            formatter: (val: number) =>
              `${Number(val).toFixed(2)}${prefix ?? ""}`,
            offsetX: offsets?.valueOffsetX ?? 0,
            offsetY: offsets?.valueOffsetY ?? 8, // ค่ากลางอยู่ใต้ label
            color: valueStyle?.color ?? "#111827",
            fontSize: `${valueStyle?.fontSize ?? 24}px`,
            fontWeight: valueStyle?.fontWeight ?? 600,
            show: true,
          },
          // (ถ้าคุณมี total ก็ใส่เพิ่มได้ที่นี่ โดยยังอยู่ใน cast เดียวกัน)
        } as unknown as NonNullable<
          NonNullable<ApexOptions["plotOptions"]>["radialBar"]
        >["dataLabels"],
        startAngle: 0,
        endAngle: 360,
      },
    },
    fill: { type: "solid", opacity: 1 },
  };

  return (
    <div
      className={[
        tight
          ? "inline-flex shrink-0 items-center justify-center p-0 bg-transparent border-0"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!tight && title && (
        <div className="mb-2 text-sm font-medium text-gray-800">{title}</div>
      )}

      <ReactApexChart
        type="radialBar"
        options={options}
        series={[value]}
        height={height}
        width={chartWidth}
      />
    </div>
  );
};

export default RadialBar;
