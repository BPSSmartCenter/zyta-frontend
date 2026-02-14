import type L from "leaflet";
import type { Noti, Severity } from "../../data/Dashboard/notis";

export type SiteCoord = { lat: number; lng: number };
export type SiteCoordMap = Record<string, SiteCoord>;

export type SitePoint = {
  name: string;
  lat: number;
  lng: number;
  code?: string;
  id?: string;
};

export type SitePinStatus = {
  electricTotal: number;
  electricOnline: number;
  electricOffline: number;
  hasElectric: boolean;
};

export type SeverityFilter = Severity | "all" | undefined;

export type Props = {
  notis: Noti[];
  showPins?: boolean;
  aggregateBySite?: boolean;
  severityFilter?: SeverityFilter;
  /** รายการจุดไซต์ถาวรสำหรับปักหมุด (ถ้ามีจะวาดหมุดทุกไซต์เสมอ แล้วเปลี่ยนสีตาม Event) */
  sitePoints?: SitePoint[];

  /** จังหวัดที่จะโฟกัส (ชื่อไทยให้ตรง geojson เช่น "กรุงเทพมหานคร") */
  focusProvince?: string | null;

  /** center ของ Site ที่เลือกไว้ (ถ้ามี) จะ flyTo ให้แบบ auto-focus */
  focusSiteCenter?: { lat: number; lng: number } | null;

  onProvinceChange?: (value: string | "all") => void;

  /** callback เมื่อผู้ใช้คลิกหมุด – ส่ง SitePoint ไปยัง parent เพื่ออัปเดต dropdown ฯลฯ */
  onPinClick?: (site: SitePoint) => void;

  /** callback เมื่อ map zoom out กลับไป country view → ให้ parent reset site selection */
  onZoomOutToCountry?: () => void;

  /** สิทธิ์ผู้ใช้ — ใช้กำหนดพฤติกรรมโต้ตอบ (เช่น lock interaction สำหรับ user) */
  role?: "admin" | "officer" | "user";

  /** อนุญาตให้มุมมอง country หรือไม่ (บาง role อาจไม่ให้ออกนอกจังหวัด) */
  allowCountryView?: boolean;

  /** ล็อกปุ่ม Zoom out และกันซูมออก */
  lockZoomOut?: boolean;

  /** รายชื่อ site ที่อนุญาต (ไว้ใช้กับการ aggregate marker ถ้าต้อง) */
  allowedSiteNames?: string[];

  /** สถานะไฟฟ้ารายไซต์สำหรับระบายสีหมุด */
  pinStatusBySite?: Record<string, SitePinStatus>;
};

export type ViewState = {
  bounds: L.LatLngBoundsLiteral;
  center?: { lat: number; lng: number };
  zoom?: number;
  padding?: [number, number];
  maxZoom?: number;
  level: "country" | "province" | "district" | "subdistrict";
  rings?: L.LatLngExpression[][] | null;
};
