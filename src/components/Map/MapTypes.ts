import type L from "leaflet";
import type { Noti, Severity } from "../../data/Dashboard/notis";

export type SiteCoord = { lat: number; lng: number };
export type SiteCoordMap = Record<string, SiteCoord>;

export type SeverityFilter = Severity | "all" | undefined;

export type Props = {
  notis: Noti[];
  showPins?: boolean;
  aggregateBySite?: boolean;
  severityFilter?: SeverityFilter;

  /** จังหวัดที่จะโฟกัส (ชื่อไทยให้ตรง geojson เช่น "กรุงเทพมหานคร") */
  focusProvince?: string | null;

  /** center ของ Site ที่เลือกไว้ (ถ้ามี) จะ flyTo ให้แบบ auto-focus */
  focusSiteCenter?: { lat: number; lng: number } | null;

  onProvinceChange?: (value: string | "all") => void;

  /** สิทธิ์ผู้ใช้ — ใช้กำหนดพฤติกรรมโต้ตอบ (เช่น lock interaction สำหรับ user) */
  role?: "admin" | "officer" | "user";

  /** อนุญาตให้มุมมอง country หรือไม่ (บาง role อาจไม่ให้ออกนอกจังหวัด) */
  allowCountryView?: boolean;

  /** ล็อกปุ่ม Zoom out และกันซูมออก */
  lockZoomOut?: boolean;

  /** รายชื่อ site ที่อนุญาต (ไว้ใช้กับการ aggregate marker ถ้าต้อง) */
  allowedSiteNames?: string[];
};

export type ViewState = {
  bounds: L.LatLngBoundsLiteral;
  padding?: [number, number];
  maxZoom?: number;
  level: "country" | "province" | "district" | "subdistrict";
  rings?: L.LatLngExpression[][] | null;
};
