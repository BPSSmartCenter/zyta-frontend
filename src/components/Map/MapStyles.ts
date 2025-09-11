import type L from "leaflet";

export const EDGE = "#111827";
const PALETTE = [
  "#fbbfbb", // อ่อนลงจาก #f87171
  "#fcd4b8", // อ่อนลงจาก #fb923c
  "#fcdba9", // อ่อนลงจาก #f59e0b
  "#c7e8a8", // อ่อนลงจาก #84cc16
  "#8ee7b6", // อ่อนลงจาก #22c55e
  "#7be2c7", // อ่อนลงจาก #10b981
  "#80e0ec", // อ่อนลงจาก #06b6d4
  "#b3d1fb", // อ่อนลงจาก #60a5fa
  "#babdf9", // อ่อนลงจาก #818cf8
  "#cdbefc", // อ่อนลงจาก #a78bfa
  "#f2bff9", // อ่อนลงจาก #e879f9
  "#f7b9d7", // อ่อนลงจาก #f472b6
  "#f6a7b0", // อ่อนลงจาก #f43f5e
  "#a9ecd2", // อ่อนลงจาก #34d399
  "#adf0bb", // อ่อนลงจาก #4ade80
  "#9eece1", // อ่อนลงจาก #2dd4bf
  "#a4e4f9", // อ่อนลงจาก #38bdf8
  "#c6dcfd", // อ่อนลงจาก #93c5fd
];

function hashColor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** ใช้ตอน setStyle() คืนค่า PathOptions และกำหนดความเข้ม/จางได้ */
export function provinceDefaultStyleFor(
  feature?: any,
  variant: "strong" | "dim" = "strong"
): L.PathOptions {
  const nameTH = feature?.properties?.pro_th ?? "";
  const fillColor = hashColor(nameTH);
  return {
    color: EDGE,
    weight: 1,
    fillColor,
    // strong = เข้ม (ตอนมุมมองประเทศ), dim = จาง (ตอนเจาะลึก)
    fillOpacity: variant === "strong" ? 1 : 0.05,
  };
}

/** ใช้ตอนสร้าง geoJSON ครั้งแรก (เข้มในมุมมองประเทศ) */
export const styleProvinceDefault: L.StyleFunction = (feature?: any) =>
  provinceDefaultStyleFor(feature, "strong");

/** hover จังหวัดให้ฟ้าอ่อน */
export const styleProvinceHover: L.PathOptions = {
  color: EDGE,
  weight: 3.2,
  fillOpacity: 0.9,
  fillColor: "#06B6D4",
};

/** อำเภอ/ตำบลโปร่งใสเพื่อให้รายละเอียดอ่านง่าย */
export const styleDistrictDefault: L.PathOptions = {
  color: EDGE,
  weight: 1.8,
  fillOpacity: 0.14,
  fillColor: "#0EA5E9",
};
export const styleDistrictHover: L.PathOptions = {
  color: EDGE,
  weight: 2.6,
  fillOpacity: 0.24,
  fillColor: "#0EA5E9",
};
export const styleSubdistrictDefault: L.PathOptions = {
  color: EDGE,
  weight: 1.4,
  fillOpacity: 0.06,
  fillColor: "#38BDF8",
};
