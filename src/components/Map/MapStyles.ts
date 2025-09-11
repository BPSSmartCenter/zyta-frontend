import type L from "leaflet";

export const EDGE = "#111827";
const PALETTE = [
  "#f87171",
  "#fb923c",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#e879f9",
  "#f472b6",
  "#f43f5e",
  "#34d399",
  "#4ade80",
  "#2dd4bf",
  "#38bdf8",
  "#93c5fd",
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
