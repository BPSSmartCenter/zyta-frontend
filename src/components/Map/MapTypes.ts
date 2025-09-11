import type L from "leaflet";

export type Noti = {
  type: "alert" | "warning" | "offline" | "normal" | string;
  title: string;
  titleKey?: string;
  province?: string;
  site: string;
  date: string;
};

export type SiteCoord = { lat: number; lng: number };
export type SiteCoordMap = Record<string, SiteCoord>;

export type Props = {
  notis: Noti[];
  siteCoords?: SiteCoordMap;
  aggregateBySite?: boolean;
  severityFilter?: string;

  showPins?: boolean;


  preferNotisMarkers?: boolean;

  focusProvince?: string | null;
};

export type ViewState = {
  bounds: L.LatLngBoundsLiteral;
  padding?: L.PointExpression;
  maxZoom?: number;
  level: "country" | "province" | "district" | "subdistrict";
  rings?: L.LatLngExpression[][];
};
