import type L from "leaflet";

export const EDGE = "#111827";
const PALETTE = [
  "#fbbfbb", // เฉดจาก #f87171
  "#fcd4b8", // เฉดจาก #fb923c
  "#fcdba9", // เฉดจาก #f59e0b
  "#c7e8a8", // เฉดจาก #84cc16
  "#8ee7b6", // เฉดจาก #22c55e
  "#7be2c7", // เฉดจาก #10b981
  "#80e0ec", // เฉดจาก #06b6d4
  "#b3d1fb", // เฉดจาก #60a5fa
  "#babdf9", // เฉดจาก #818cf8
  "#cdbefc", // เฉดจาก #a78bfa
  "#f2bff9", // เฉดจาก #e879f9
  "#f7b9d7", // เฉดจาก #f472b6
  "#f6a7b0", // เฉดจาก #f43f5e
  "#a9ecd2", // เฉดจาก #34d399
  "#adf0bb", // เฉดจาก #4ade80
  "#9eece1", // เฉดจาก #2dd4bf
  "#a4e4f9", // เฉดจาก #38bdf8
  "#c6dcfd", // เฉดจาก #93c5fd
];

function hashColor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function isProvinceFeature(feature?: any): boolean {
  const props = feature?.properties ?? {};
  return Boolean(props.pro_code || props.pro_th || props.pro_en);
}

/** ใช้ setStyle() ยกชุด PathOptions เฉพาะระดับจังหวัด */
export function provinceDefaultStyleFor(
  feature?: any,
  variant: "strong" | "dim" = "strong"
): L.PathOptions {
  if (!isProvinceFeature(feature)) return {} as L.PathOptions;

  const nameTH = feature?.properties?.pro_th ?? "";
  const fillColor = hashColor(nameTH);
  return {
    fill: true,
    opacity: 1,
    color: EDGE,
    weight: 1,
    fillColor,
    fillOpacity: variant === "strong" ? 1 : 0.05,
  };
}

/** สไตล์เริ่มต้น geoJSON จังหวัด (โทนเข้ม) */
export const styleProvinceDefault: L.StyleFunction = (feature?: any) =>
  provinceDefaultStyleFor(feature, "strong");

/** hover จังหวัดให้เด่นขึ้น */
export const styleProvinceHover: L.PathOptions = {
  fill: true,
  opacity: 1,
  color: EDGE,
  weight: 3.2,
  fillOpacity: 1,
  fillColor: "#06B6D4",
};

/** ค่าเริ่มต้นอำเภอ */
export const styleDistrictDefault: L.PathOptions = {
  color: EDGE,
  weight: 1.8,
  fillOpacity: 0.05,
  fillColor: "#0EA5E9",
};
export const styleDistrictHover: L.PathOptions = {
  color: EDGE,
  weight: 2.6,
  fillOpacity: 0.12,
  fillColor: "#0EA5E9",
};

/** ค่าเริ่มต้นตำบล */
export const styleSubdistrictDefault: L.PathOptions = {
  color: EDGE,
  weight: 1.4,
  fillOpacity: 0.05,
  fillColor: "#38BDF8",
};
export const styleSubdistrictHover: L.PathOptions = {
  color: EDGE,
  weight: 2,
  fillOpacity: 0.1,
  fillColor: "#38BDF8",
};
