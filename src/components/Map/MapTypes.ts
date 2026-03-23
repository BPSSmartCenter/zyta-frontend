import type { Noti, Severity } from "../../data/Dashboard/notis";

export type SiteCoord = { lat: number; lng: number };
export type SiteCoordMap = Record<string, SiteCoord>;

export type SitePoint = {
  name: string;
  lat: number;
  lng: number;
  code?: string;
  id?: string;
  utility?: string;
  groupSite?: string;
};

export type SitePinStatus = {
  electricTotal: number;
  electricOnline: number;
  electricOffline: number;
  hasElectric: boolean;
};

export type SeverityFilter = Severity | "all" | undefined;

// ใช้โดย backup files เท่านั้น (Map_BACKUP.tsx, MapLayers.ts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ViewState = any;

export type Props = {
  notis: Noti[];
  showPins?: boolean;
  aggregateBySite?: boolean;
  severityFilter?: SeverityFilter;
  sitePoints?: SitePoint[];
  focusSiteCenter?: { lat: number; lng: number } | null;
  onPinClick?: (site: SitePoint) => void;
  onZoomOutToCountry?: () => void;
  pinStatusBySite?: Record<string, SitePinStatus>;

  // --- Props เดิมที่ยังคงไว้เพื่อ backward compat (Map.tsx ไม่ใช้แล้ว) ---
  focusProvince?: string | null;
  onProvinceChange?: (value: string | "all") => void;
  role?: "admin" | "manager" | "officer" | "user";
  allowCountryView?: boolean;
  lockZoomOut?: boolean;
  allowedSiteNames?: string[];
};
