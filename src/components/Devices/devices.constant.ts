import {
  cctvImage,
  cctvSelected,
  intercomeImage,
  intercomeSelected,
  waterTapImage,
  waterTapSelected,
  solarImage,
  solarSelected,
  windImage,
  windSelected,
  wifiImage,
  wifiSelected,
  nurseImage,
} from "../../assets";
import type { AxisSeries } from "../../types/apexSeries";

export const GREEN_BOX_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40" viewBox="0 0 80 40">
       <rect x="0" y="0" width="80" height="40" rx="4" fill="#16A34A"/>
     </svg>`
  );

export type DeviceCard = {
  id: string;
  label: string;
  img: string;
  activeImg: string;
};

export const DEVICE_CARDS: DeviceCard[] = [
  {
    id: "cctv-1",
    img: cctvImage,
    label: "header.cctvCard",
    activeImg: cctvSelected,
  },
  {
    id: "water-1",
    img: waterTapImage,
    label: "header.waterCard",
    activeImg: waterTapSelected,
  },
  {
    id: "electric-1",
    img: solarImage,
    label: "header.electricCard",
    activeImg: solarSelected,
  },
  {
    id: "air-1",
    label: "header.airCard",
    img: windImage,
    activeImg: windSelected,
  },
  {
    id: "iot-1",
    label: "header.iotCard",
    img: wifiImage,
    activeImg: wifiSelected,
  },
  {
    id: "caregiver-1",
    label: "Caregiver",
    img: nurseImage,
    activeImg: nurseImage, // Reuse until a separate active image is available
  },
  {
    id: "digitaltwin-1",
    label: "header.digitalTwinCard",
    img: intercomeImage,
    activeImg: intercomeSelected,
  },
];

export type CCTVRow = {
  id: string;
  site: string;
  event: string;
  picture: string;
  camera: string;
  status: "UNRESOLVED" | "RESOLVED";
  timeISO: string; // ISO string
};

export const CCTV_ROWS: CCTVRow[] = [];

// สำหรับ Dropdown ฟิลเตอร์
export const CCTV_SITE_OPTIONS = [
  { label: "All Sites", value: "All Sites" },
  { label: "SITE A", value: "SITE A" },
  { label: "SITE B", value: "SITE B" },
  { label: "SITE C", value: "SITE C" },
  { label: "SITE D", value: "SITE D" },
  { label: "SITE E", value: "SITE E" },
];

export const CCTV_EVENT_OPTIONS = [
  { label: "All Event", value: "All Event" },
  { label: "Fire detected", value: "fire detected" },
  { label: "Face detected", value: "face detected" },
  { label: "intrusion detected", value: "intrusion detected" },
];

export const ELECTRIC_DAYS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
export type ElectricDay = (typeof ELECTRIC_DAYS)[number];

/** ค่า Conversion รายวัน (0–100) */
export const ELECTRIC_CONVERSIONS_MAP: Record<ElectricDay, number> = {
  Sun: 0,
  Mon: 0,
  Tue: 0,
  Wed: 0,
  Thu: 0,
  Fri: 0,
  Sat: 0,
};

/** list ตามลำดับวัน (พร้อมใช้กับ grid) */
export const ELECTRIC_CONVERSIONS_LIST: number[] = ELECTRIC_DAYS.map(
  (d) => ELECTRIC_CONVERSIONS_MAP[d]
);

/** ซีรีส์กราฟเส้นของแต่ละวัน */
export const ELECTRIC_DAY_SERIES: Record<ElectricDay, AxisSeries> = {
  Sun: [
    { name: "Traffic", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Payment", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
  Mon: [
    { name: "Traffic", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Payment", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
  Tue: [
    { name: "Traffic", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Payment", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
  Wed: [
    { name: "Traffic", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Payment", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
  Thu: [
    { name: "Traffic", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Payment", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
  Fri: [
    { name: "Traffic", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Payment", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
  Sat: [
    { name: "Traffic", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Payment", data: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ],
};
