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
  focusProvince?: string | null;
  onProvinceChange?: (value: string | "all") => void;
};

export type ViewState = {
  bounds: L.LatLngBoundsLiteral;
  padding?: [number, number];
  maxZoom?: number;
  level: "country" | "province" | "district" | "subdistrict";
  rings?: L.LatLngExpression[][] | null;
};
