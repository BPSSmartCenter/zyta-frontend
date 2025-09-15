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
} from "../../assets";

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
    id: "intercom-1",
    img: intercomeImage,
    label: "header.intercomeCard",
    activeImg: intercomeSelected,
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

export const CCTV_ROWS: CCTVRow[] = [
  {
    id: "1",
    site: "SITE C",
    event: "fire detected",
    picture: GREEN_BOX_SVG,
    camera: "hikvision",
    status: "UNRESOLVED",
    timeISO: "2025-01-06T17:24:55",
  },
  {
    id: "3",
    site: "SITE C",
    event: "face detected",
    picture: GREEN_BOX_SVG,
    camera: "hikvision",
    status: "UNRESOLVED",
    timeISO: "2025-01-06T12:05:10",
  },
  {
    id: "4",
    site: "SITE C",
    event: "face detected",
    picture: GREEN_BOX_SVG,
    camera: "hikvision",
    status: "RESOLVED",
    timeISO: "2025-01-06T10:11:00",
  },
  {
    id: "5",
    site: "SITE B",
    event: "intrusion detected",
    picture: GREEN_BOX_SVG,
    camera: "hikvision",
    status: "UNRESOLVED",
    timeISO: "2025-01-05T22:41:30",
  },
];

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
  Sun: 90,
  Mon: 30,
  Tue: 20,
  Wed: 40,
  Thu: 20,
  Fri: 40,
  Sat: 50,
};

/** list ตามลำดับวัน (พร้อมใช้กับ grid) */
export const ELECTRIC_CONVERSIONS_LIST: number[] = ELECTRIC_DAYS.map(
  (d) => ELECTRIC_CONVERSIONS_MAP[d]
);

/** ซีรีส์กราฟเส้นของแต่ละวัน (ตัวอย่าง mock) */
export const ELECTRIC_DAY_SERIES: Record<ElectricDay, ApexAxisChartSeries> = {
  Sun: [
    { name: "Traffic", data: [120, 60, 140, 80, 180, 40, 170, 90, 160] },
    { name: "Payment", data: [200, 70, 260, 110, 300, 120, 330, 210, 230] },
  ],
  Mon: [
    { name: "Traffic", data: [80, 110, 90, 150, 100, 130, 70, 160, 120] },
    { name: "Payment", data: [140, 100, 180, 120, 200, 150, 220, 170, 210] },
  ],
  Tue: [
    { name: "Traffic", data: [60, 100, 70, 130, 90, 120, 60, 140, 110] },
    { name: "Payment", data: [110, 90, 150, 100, 180, 130, 200, 150, 180] },
  ],
  Wed: [
    { name: "Traffic", data: [90, 140, 100, 160, 110, 150, 80, 170, 130] },
    { name: "Payment", data: [150, 120, 200, 140, 220, 170, 240, 190, 230] },
  ],
  Thu: [
    { name: "Traffic", data: [70, 120, 80, 140, 100, 130, 70, 150, 120] },
    { name: "Payment", data: [130, 100, 170, 120, 200, 150, 210, 170, 200] },
  ],
  Fri: [
    { name: "Traffic", data: [100, 60, 140, 80, 160, 60, 180, 100, 190] },
    { name: "Payment", data: [160, 120, 200, 140, 230, 180, 260, 210, 250] },
  ],
  Sat: [
    { name: "Traffic", data: [110, 90, 130, 70, 150, 90, 140, 110, 160] },
    { name: "Payment", data: [180, 140, 220, 160, 240, 190, 250, 210, 270] },
  ],
};
