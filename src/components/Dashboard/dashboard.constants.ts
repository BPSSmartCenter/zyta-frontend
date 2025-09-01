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
import { TH_PROVINCES } from "../../data/Dashboard/notis";

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

export const chartSeries = [
  { name: "08–16", data: [13, 6, 12, 1, 5, 68, 55] },
  { name: "16–24", data: [11, 2, 46, 5, 7, 32, 40] },
  { name: "24–08", data: [7, 1, 67, 14, 9, 13, 13] },
];

export const avgOfSeriesMax = Math.ceil(
  chartSeries.reduce((sum, s) => sum + Math.max(...s.data), 0) /
    chartSeries.length
);

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
