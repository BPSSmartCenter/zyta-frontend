import {
  fireImage,
  motionImage,
  deviceImage,
  fallImage,
  sleepImage,
  fallImageSelected,
  sleepImageSelected,
  motionImageSelected,
  deviceImageSelected,
  fireImageSelected,
  fireCamera,
  motionCamera,
  sleepCamera,
  offlineDeviceCamera,
  fallCamera,
} from "../../assets/index";
import { TH_PROVINCES, notis } from "../../data/Dashboard/notis";
import type L from "leaflet";

export type DateValue = { y: number; m: number; d: number };

export const today: DateValue = (() => {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
})();

export const exportFile = [
  { label: "Export to PDF", value: "pdf" },
  { label: "Export to Word", value: "word" },
  { label: "Export to Excel", value: "excel" },
];

export const EVENT_OPTIONS = [
  { label: "All Events", value: "all" },
  { label: "Fire detection", value: "fire" },
  { label: "Motion detection", value: "motion" },
  { label: "กล้องออฟไลน์", value: "offline" },
];

export const SEVERITY_OPTIONS = [
  { label: "Any Severity", value: "all" },
  { label: "Fire detection", value: "fire" },
  { label: "Motion detection", value: "motion" },
  { label: "กล้องออฟไลน์", value: "offline" },
];

export const LOCATION_OPTIONS = [
  { label: "All Location", value: "all" },
  ...TH_PROVINCES.map((p) => ({ label: p, value: p })),
];

export const CAMERA_ITEMS = [
  { ringColor: "ring-transparent", imgSrc: fireCamera },
  { ringColor: "ring-transparent", imgSrc: motionCamera },
  { ringColor: "ring-transparent", imgSrc: offlineDeviceCamera },
  { ringColor: "ring-transparent", imgSrc: fallCamera },
  { ringColor: "ring-transparent", imgSrc: sleepCamera },
];

export const statItems = [
  {
    key: "fire",
    label: "Fire detected",
    val: 12,
    img: fireImage,
    activeImg: fireImageSelected,
  },
  {
    key: "motion",
    label: "Motion detected",
    val: 9,
    img: motionImage,
    activeImg: motionImageSelected,
  },
  {
    key: "device",
    label: "จำนวนกล้องออฟไลน์ / ออนไลน์",
    val: "8 / 50",
    img: deviceImage,
    activeImg: deviceImageSelected,
  },
  {
    key: "fall",
    label: "Fall detected",
    val: 15,
    img: fallImage,
    activeImg: fallImageSelected,
  },
  {
    key: "sleeping",
    label: "Sleep detected",
    val: 13,
    img: sleepImage,
    activeImg: sleepImageSelected,
  },
];

export const CHART_SERIES = {
  // ใช้กับ Daily/Weekly (7 จุด)
  weekly: [
    { name: "08:00 - 16:00 น.", data: [14, 7, 15, 0, 5, 69, 56] },
    { name: "16:00 - 24:00 น.", data: [13, 2, 45, 6, 30, 29, 36] },
    { name: "24:00 - 08:00 น.", data: [9, 1, 65, 14, 11, 14, 14] },
  ],
  // ใช้กับ Monthly (12 จุด — เติมให้ครบทุกเดือน)
  monthly: [
    {
      name: "08:00 - 16:00 น.",
      data: [14, 8, 45, 0, 6, 68, 55, 60, 70, 65, 70, 55],
    },
    {
      name: "16:00 - 24:00 น.",
      data: [13, 3, 29, 6, 9, 30, 37, 55, 13, 80, 55, 60],
    },
    {
      name: "24:00 - 08:00 น.",
      data: [10, 2, 65, 14, 12, 15, 15, 55, 53, 55, 59, 70],
    },
  ],
  // ถ้า Daily ใช้ค่าเดียวกับ weekly ก็ทำ alias ได้
  daily: null,
} as const;

// เผื่อโค้ดเก่าอ้าง chartSeries เดิมอยู่
export const chartSeries = CHART_SERIES.weekly;

// helper
export const getSeriesByPeriod = (period: "daily" | "weekly" | "monthly") =>
  period === "monthly" ? CHART_SERIES.monthly : CHART_SERIES.weekly; // daily = weekly

export const niceUp = (v: number, step = 5) => Math.ceil(v / step) * step;

export const regionSeries = [20, 47, 20, 47];
export const regionLabels = [
  "ภาคเหนือ",
  "ภาคตะวันออกเฉียงเหนือ",
  "ภาคใต้",
  "ภาคกลาง",
];
export const regionColors = ["#0077B6", "#4D80F4", "#FBBB50", "#98D1E4"];

export const roleSeries = [34, 46, 54];
export const roleLabels = ["officers", "User", "Admin"];
export const roleColors = ["#4D80F4", "#98D1E4", "#FBBB50"];

export const TH_BOUNDS: L.LatLngBoundsExpression = [
  [5.5, 97.0],
  [21.0, 107.5],
];

export const DEFAULT_SITE_COORDS: Record<string, { lat: number; lng: number }> =
  Object.fromEntries(notis.map((n) => [n.site, n.coords]));

export const SEVERITY_RANK: Record<string, number> = {
  alert: 3, // Fire detection
  warning: 2, // Motion detection
  offline: 2, // กล้องออฟไลน์
  normal: 1,
};

export const SEVERITY_COLOR: Record<string, string> = {
  alert: "#ef4444", // แดง
  warning: "#f59e0b", // ส้ม
  offline: "#3b82f6", // ฟ้า
  normal: "#22c55e", // เขียว
};
