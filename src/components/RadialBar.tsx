// src/components/RadialBar.tsx
import React from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

/* ============================ Single RadialBar (เดิม) ============================ */
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
  height = 20,
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
        // ⬇️ cast เพื่อให้ TS ผ่าน โดยคงพฤติกรรม formatter/offset ไว้ครบ
        dataLabels: {
          show: true,
          name: {
            show: !!label,
            formatter: () => label,
            offsetX: offsets?.labelOffsetX ?? 0,
            offsetY: offsets?.labelOffsetY ?? -6,
            color: "#6B7280",
            fontSize: "12px",
            fontWeight: 500,
          },
          value: {
            formatter: (val: number) =>
              `${Number(val).toFixed(2)}${prefix ?? ""}`,
            offsetX: offsets?.valueOffsetX ?? 0,
            offsetY: offsets?.valueOffsetY ?? 8,
            color: valueStyle?.color ?? "#111827",
            fontSize: `${valueStyle?.fontSize ?? 24}px`,
            fontWeight: valueStyle?.fontWeight ?? 600,
            show: true,
          },
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

/* ============================ NEW: Multi-Radial (Water) ============================

   - ทำวงซ้อน 3 ชั้น (โทนฟ้า) ตามภาพอ้างอิง
   - มีเลขรวมตรงกลาง (เช่น 1,000) แบบตัวใหญ่
   - ทำ custom legend ด้านล่าง (จุดกลม + ชื่อซีรีส์)
   - ใช้เป็น named export เพื่อไม่กระทบ default (Snapshot เดิม)

============================================================================= */

export type WaterMultiRadialProps = {
  values?: number[]; // ค่าร้อยละของแต่ละวง (0–100)
  total?: number | string; // ตัวเลขรวมตรงกลาง
  labels?: string[]; // ป้าย legend ล่าง (เช่น ["Series 1", "Series 2", "Series 3"])
  colors?: string[]; // สีวง (นอก→ใน) เช่น ["#22A9E0","#8EDCFF","#CDEFFF"]
  trackColor?: string; // สี track จาง
  height?: number; // ความสูงกราฟ
  startAngle?: number; // ปรับองศาเริ่ม
  endAngle?: number; // ปรับองศาจบ
  className?: string;
};

export function WaterMultiRadial({
  values = [88, 62, 38], // วงนอก → ใน
  total = 1000,
  labels = ["Series 1", "Series 2", "Series 3"],
  colors = ["#22A9E0", "#8EDCFF", "#E6F7FF"], // ฟ้าเข้ม → อ่อน
  trackColor = "#F2F8FF",
  height = 280, // ใช้เป็นค่าเริ่มต้นเท่านั้น (responsive จะ override)
  startAngle = -90,
  endAngle = 270,
  className,
}: {
  values?: number[];
  total?: number | string;
  labels?: string[];
  colors?: string[];
  trackColor?: string;
  height?: number | string;
  startAngle?: number;
  endAngle?: number;
  className?: string;
}) {
  // --- คุมให้ overlay ขยาย/ย่อไปพร้อมกราฟ ---
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState<number>(
    typeof height === "number" ? height : 280
  );

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el || !(window as any).ResizeObserver) return;

    const ro = new (window as any).ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      // ทำให้เป็นสี่เหลี่ยมจัตุรัสเสมอ และอัปเดตเมื่อกว้างเปลี่ยน
      setSize(Math.max(120, Math.round(w)));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const centerText =
    typeof total === "number" ? total.toLocaleString() : String(total);

  // สเกลฟอนต์ตามขนาดกราฟ (responsive)
  const fontPx = Math.max(18, Math.min(44, Math.round(size * 0.07)));

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "radialBar",
      sparkline: { enabled: true },
      toolbar: { show: false },
      offsetX: 0,
      offsetY: 0,
    },
    labels,
    colors,
    stroke: { lineCap: "round" },
    plotOptions: {
      radialBar: {
        startAngle,
        endAngle,
        // ทำวงให้หนาแบบภาพ: รูตรงกลางเล็ก + แถบกว้าง + ระยะห่างวงพอดี
        hollow: { size: "30%", background: "#FFFFFF" },
        track: { background: trackColor, strokeWidth: "100%", margin: 10 },
        dataLabels: {
          name: { show: false },
          value: { show: false },
          total: { show: false }, // ปิดกลไกเดิมของ Apex ใช้ overlay เองแทน
        } as any,
      },
    },
    legend: { show: false },
  };

  return (
    <div
      ref={wrapRef}
      className={["inline-flex flex-col items-center w-full", className].join(
        " "
      )}
    >
      {/* กล่องกราฟให้กว้าง 100% และสูงเท่ากับความกว้าง (square) */}
      <div className="relative w-full" style={{ height: size }}>
        <ReactApexChart
          type="radialBar"
          options={options}
          series={values}
          height={size}
        />
        {/* เลขกลางแบบ overlay (responsive ตาม size) */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className="font-extrabold text-gray-900 leading-none"
            style={{ fontSize: `${fontPx}px` }}
          >
            {centerText}
          </span>
        </div>
      </div>

      {/* legend แบบ custom ด้านล่าง */}
      <div className="mt-2 flex items-center justify-center gap-6 text-[13px] text-gray-500">
        {labels.slice(0, values.length).map((lb, i) => (
          <span key={lb} className="inline-flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            {lb}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================ NEW (Electric) ============================ */
/** Basic RadialBar สำหรับ Electric — วงเดี่ยวแบบเรียบ ใช้ได้กับ mini widget ด้านบน */
export type ElectricRadialBasicProps = {
  value: number; // 0–100 (เปอร์เซ็นต์ของวง)
  size?: number; // px
  color?: string; // สี progress
  trackColor?: string; // สี track
  rounded?: boolean; // ปลายมนหรือไม่
  hollowSize?: string; // ขนาดรูตรงกลาง (เล็กลง = วงหนาขึ้น) เช่น "60%"
  trackWidth?: string; // ความหนาแถบ (ของพื้นที่ที่เหลือ) เช่น "85%"
};

export function ElectricRadialBasic({
  value,
  size = 64,
  color = "#2E90FA",
  trackColor = "#E5EEF6",
  hollowSize = "30%",
  trackWidth = "85%",
}: ElectricRadialBasicProps) {
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "radialBar",
      sparkline: { enabled: true },
      toolbar: { show: false },
    },
    colors: [color],
    plotOptions: {
      radialBar: {
        hollow: { size: hollowSize, background: "#fff" },
        track: { background: trackColor, strokeWidth: trackWidth, margin: 0 },
        dataLabels: {
          name: { show: false },
          value: { show: false },
          total: { show: false },
        } as any,
        startAngle: 0,
        endAngle: 360,
      },
    },
    legend: { show: false },
  };

  return (
    <ReactApexChart
      type="radialBar"
      options={options}
      series={[value]}
      height={size}
      width={size}
    />
  );
}
