import type L from "leaflet";
import type { Noti } from "../../data/Dashboard/notis";

export type SiteCoord = { lat: number; lng: number };
export type SiteCoordMap = Record<string, SiteCoord>;

export type Props = {
  notis: Noti[];
  showPins?: boolean;
  aggregateBySite?: boolean;
  severityFilter?: string; // "all" | "low" | "medium" | "high" | "critical"
  focusProvince?: string | null;
};

export type ViewState = {
  bounds: L.LatLngBoundsLiteral;
  padding?: [number, number];
  maxZoom?: number;
  level: "country" | "province" | "district";
  rings?: L.LatLngExpression[][];
};
