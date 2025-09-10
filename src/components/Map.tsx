// src/components/Map.tsx
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  TH_BOUNDS,
  DEFAULT_SITE_COORDS,
  SEVERITY_RANK,
  SEVERITY_COLOR,
} from "./Dashboard/dashboard.constants";
import { useTranslation } from "react-i18next";

type Noti = {
  type: "alert" | "warning" | "offline" | "normal" | string;
  title: string;
  titleKey?: string;
  province?: string; // ใช้วางหมุดกลางจังหวัด
  site: string;
  date: string;
};
type SiteCoord = { lat: number; lng: number };
type SiteCoordMap = Record<string, SiteCoord>;

type Props = {
  notis: Noti[];
  siteCoords?: SiteCoordMap;
  aggregateBySite?: boolean;
  severityFilter?: string;
  /** รับคำสั่งซูมจาก Dropdown: ชื่อจังหวัด (ไทย/อังกฤษได้) */
  focusProvince?: string | null;
};

/** ---------------- Data URLs ---------------- */
const URLS = {
  TH: "/data/thailand.geojson",
  PROVINCES: "/data/provinces.geojson",
  DISTRICTS: "/data/districts.geojson",
  SUBDISTRICTS: "/data/subdistricts.geojson",
};

/** ---------------- Utils ---------------- */
function makeSvgPin(color: string, size = 32) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${
    size * 1.25
  }" viewBox="0 0 32 40">
    <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="rgba(0,0,0,0.35)"/></filter></defs>
    <g filter="url(#shadow)">
      <path d="M16 2 C9.924 2 5 6.924 5 13c0 7.5 8.2 14.5 10.1 16.1a1.5 1.5 0 0 0 1.8 0C19.8 27.5 28 20.5 28 13 28 6.924 23.076 2 17 2h-1z" fill="${color}"/>
      <circle cx="16" cy="13" r="5.2" fill="#ffffff"/>
    </g>
  </svg>`;
  const dataUrl = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  return L.icon({
    iconUrl: dataUrl,
    iconSize: [size, size * 1.25],
    iconAnchor: [size / 2, size * 1.25],
    popupAnchor: [0, -size * 1.05],
  });
}

function normalizeSeverity(
  input?: string
): "all" | "alert" | "warning" | "offline" | "normal" {
  const raw = (input || "").trim().toLowerCase();
  if (!raw || raw === "all" || raw === "any severity") return "all";
  if (raw.includes("fire")) return "alert";
  if (raw.includes("motion")) return "warning";
  if (raw.includes("offline") || raw.includes("ออฟไลน์")) return "offline";
  if (["alert", "warning", "offline", "normal"].includes(raw))
    return raw as any;
  return "all";
}

function responsivePadding(
  containerW: number,
  containerH: number,
  vw?: number
) {
  const side = Math.max(1, Math.min(containerW, containerH));
  const basePad = Math.max(10, Math.round(side * 0.04));
  const vww = vw ?? containerW;
  const padY =
    vww >= 375 && vww <= 510
      ? Math.max(basePad, Math.round(side * 0.38))
      : basePad;
  return { x: basePad, y: padY };
}

function zoomForExactHeight(
  map: L.Map,
  boundsExpr: L.LatLngBoundsExpression,
  innerHeight: number
) {
  const b = L.latLngBounds(boundsExpr as any);
  const MIN_Z = 2,
    MAX_Z = 19;
  let lo = MIN_Z,
    hi = MAX_Z;
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    const pN = map.project(b.getNorthWest(), mid);
    const pS = map.project(b.getSouthEast(), mid);
    const spanY = Math.abs(pS.y - pN.y);
    if (spanY > innerHeight) hi = mid;
    else lo = mid;
  }
  return Math.max(MIN_Z, Math.min(lo, MAX_Z));
}

function extractRingsLatLng(geo: any): L.LatLngExpression[][] {
  const rings: L.LatLngExpression[][] = [];
  const pushRing = (ring: number[][]) =>
    rings.push(ring.map(([lng, lat]) => [lat, lng]));
  if (!geo) return rings;
  if (geo.type === "Polygon")
    geo.coordinates.forEach((r: number[][]) => pushRing(r));
  else if (geo.type === "MultiPolygon")
    geo.coordinates.forEach((poly: number[][][]) =>
      poly.forEach((r) => pushRing(r))
    );
  return rings;
}

function buildMask(map: L.Map, rings: L.LatLngExpression[][], renderer: L.SVG) {
  const worldRing: L.LatLngExpression[] = [
    [-90, -180],
    [-90, 180],
    [90, 180],
    [90, -180],
  ];
  return L.polygon([worldRing, ...rings], {
    pane: "dimPane",
    renderer,
    stroke: true,
    color: "#000000",
    weight: 2,
    opacity: 0.5,
    fill: true,
    fillColor: "#D3F7FF",
    fillOpacity: 1,
    interactive: false,
    smoothFactor: 2.0,
  }).addTo(map);
}

/** ---------------- Styles ---------------- */
const EDGE = "#111827";
const styleProvinceDefault: L.PathOptions = {
  color: EDGE,
  weight: 2.2,
  fillOpacity: 0.18,
  fillColor: "#000000ff",
};
const styleProvinceHover: L.PathOptions = {
  color: EDGE,
  weight: 3.2,
  fillOpacity: 0.28,
  fillColor: "#06B6D4",
};
const styleDistrictDefault: L.PathOptions = {
  color: EDGE,
  weight: 1.8,
  fillOpacity: 0.1,
  fillColor: "#0EA5E9",
};
const styleDistrictHover: L.PathOptions = {
  color: EDGE,
  weight: 2.6,
  fillOpacity: 0.18,
  fillColor: "#0EA5E9",
};
const styleSubdistrictDefault: L.PathOptions = {
  color: EDGE,
  weight: 1.4,
  fillOpacity: 0.06,
  fillColor: "#38BDF8",
};

/** ---------------- Component ---------------- */
export default function Map({
  notis,
  siteCoords = DEFAULT_SITE_COORDS,
  aggregateBySite = true,
  severityFilter,
  focusProvince,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);

  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  const thLayerRef = useRef<L.GeoJSON<any> | null>(null);
  const provincesLayerRef = useRef<L.GeoJSON<any> | null>(null);
  const districtsLayerRef = useRef<L.GeoJSON<any> | null>(null);
  const subdistrictsLayerRef = useRef<L.GeoJSON<any> | null>(null);

  // mask & shade
  const dimRendererRef = useRef<L.SVG | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null); // นอกรอบ
  const innerShadeRef = useRef<L.Polygon | null>(null); // เฉดภายในระดับประเทศ
  const thRingsRef = useRef<L.LatLngExpression[][]>([]);

  // centroids จังหวัดสำหรับวาง noti
  const provinceCentersRef = useRef<Record<string, L.LatLngLiteral>>({});

  // markers
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // zoom-out stack
  type ViewState = {
    bounds: L.LatLngBoundsLiteral;
    padding?: L.PointExpression;
    maxZoom?: number;
    level: "country" | "province" | "district" | "subdistrict";
    rings?: L.LatLngExpression[][];
  };
  const viewStackRef = useRef<ViewState[]>([]);
  const [canZoomOut, setCanZoomOut] = useState(false);
  const zoomOutWrapRef = useRef<HTMLDivElement | null>(null);

  const BASE_HEIGHT_PX = 680;
  const lockContainerBox = () => {
    const m = mapRef.current;
    if (!m) return;
    const el = m.getContainer() as HTMLDivElement;
    el.style.height = `${BASE_HEIGHT_PX}px`;
    el.style.minHeight = `${BASE_HEIGHT_PX}px`;
    el.style.maxHeight = `${BASE_HEIGHT_PX}px`;
    el.style.width = "100%";
    el.style.display = "block";
    el.style.flexShrink = "0";
  };

  const ensureGrayscaleCss = () => {
    const id = "grayscale-tiles-style";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      .leaflet-tile.grayscale-tiles,
      .leaflet-layer img.leaflet-tile.grayscale-tiles,
      .leaflet-pane .leaflet-tile.grayscale-tiles,
      .leaflet-pane .leaflet-layer img.grayscale-tiles {
        filter: grayscale(1) contrast(1.05) brightness(1);
      }
    `;
    document.head.appendChild(style);
  };

  const fitThailandTight = (animate = false) => {
    const map = mapRef.current;
    if (!map) return;

    lockContainerBox();
    map.invalidateSize(false);

    const sz = map.getSize();
    const vw = typeof window !== "undefined" ? window.innerWidth : sz.x;
    const pad = responsivePadding(sz.x, sz.y, vw);
    const innerH = Math.max(1, sz.y - pad.y * 2);

    const z = zoomForExactHeight(map, TH_BOUNDS, innerH);
    const center = L.latLngBounds(TH_BOUNDS as any).getCenter();

    map.setView(center, z, { animate });
    map.setMinZoom(z);
    map.setMaxZoom(19);

    const topY = map.latLngToContainerPoint(
      L.latLngBounds(TH_BOUNDS as any).getNorthWest()
    ).y;
    const bottomY = map.latLngToContainerPoint(
      L.latLngBounds(TH_BOUNDS as any).getSouthEast()
    ).y;
    const wantTop = pad.y;
    const wantBottom = sz.y - pad.y;
    const deltaY = Math.round((wantTop - topY + (wantBottom - bottomY)) / 2);
    if (deltaY) map.panBy([0, deltaY], { animate });
  };

  const setMaskByRings = (rings: L.LatLngExpression[][] | null) => {
    const map = mapRef.current;
    if (!map) return;
    if (maskLayerRef.current) {
      map.removeLayer(maskLayerRef.current);
      maskLayerRef.current = null;
    }
    if (rings && rings.length > 0 && dimRendererRef.current) {
      maskLayerRef.current = buildMask(map, rings, dimRendererRef.current);
    }
  };

  const setInnerShade = (active: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    if (innerShadeRef.current) {
      map.removeLayer(innerShadeRef.current);
      innerShadeRef.current = null;
    }
    if (!active || thRingsRef.current.length === 0) return;
    innerShadeRef.current = L.polygon(thRingsRef.current[0], {
      pane: "shadeUnder",
      stroke: false,
      fill: true,
      fillColor: "#F2F2F2",
      fillOpacity: 0.92,
      interactive: false,
    }).addTo(map);
  };

  const pushView = (state: ViewState) => {
    viewStackRef.current.push(state);
    setCanZoomOut(viewStackRef.current.length > 0);
  };
  const popView = (): ViewState | undefined => {
    const v = viewStackRef.current.pop();
    setCanZoomOut(viewStackRef.current.length > 0);
    return v;
  };

  const zoomOut = () => {
    const map = mapRef.current;
    if (!map) return;
    const prev = popView();
    if (!prev) {
      // ไม่มี history → กลับประเทศ
      setMaskByRings(thRingsRef.current);
      setInnerShade(true);
      fitThailandTight(true);
      return;
    }
    const ringsToUse =
      prev.rings && prev.rings.length > 0 ? prev.rings : thRingsRef.current;
    setMaskByRings(ringsToUse);

    if (prev.level === "country") {
      setInnerShade(true);
      if (districtsLayerRef.current) {
        map.removeLayer(districtsLayerRef.current);
        districtsLayerRef.current = null;
      }
      if (subdistrictsLayerRef.current) {
        map.removeLayer(subdistrictsLayerRef.current);
        subdistrictsLayerRef.current = null;
      }
    } else if (prev.level === "province") {
      setInnerShade(false);
      if (subdistrictsLayerRef.current) {
        map.removeLayer(subdistrictsLayerRef.current);
        subdistrictsLayerRef.current = null;
      }
    } else if (prev.level === "district") {
      setInnerShade(false);
      // ถอยจากตำบล → เห็น “ทุกตำบลในอำเภอ” (ไม่ล้าง sLayer)
    }
    map.flyToBounds(L.latLngBounds(prev.bounds), {
      animate: true,
      padding: prev.padding ?? [12, 12],
      maxZoom: prev.maxZoom ?? 19,
    });
  };

  /** ---------- init map ---------- */
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map("th-map", {
      center: [13.736717, 100.523186],
      zoom: 7,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoom: false,
      keyboard: false,
      maxBounds: TH_BOUNDS,
      maxBoundsViscosity: 1.0,
      inertia: false,
      worldCopyJump: false,
    });
    mapRef.current = map;

    ensureGrayscaleCss();
    tileRef.current = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        minZoom: 2,
        attribution: "&copy; OpenStreetMap contributors",
        className: "grayscale-tiles",
      }
    ).addTo(map);

    // panes
    map.createPane("shadeUnder");
    const shadeUnder = map.getPane("shadeUnder")!;
    shadeUnder.style.zIndex = "350";
    shadeUnder.style.pointerEvents = "none";

    map.createPane("dimPane");
    dimRendererRef.current = L.svg({ pane: "dimPane" }).addTo(map);
    const dimPane = map.getPane("dimPane")!;
    dimPane.style.zIndex = "430";
    dimPane.style.pointerEvents = "none";

    map.createPane("markersPane");
    const markersPane = map.getPane("markersPane")!;
    markersPane.style.zIndex = "520";
    markersPane.style.pointerEvents = "auto";

    // โหลดขอบประเทศ + mask + innerShade
    fetch(URLS.TH)
      .then((r) => r.json())
      .then((geojson) => {
        thLayerRef.current = L.geoJSON(geojson, {
          style: { color: EDGE, weight: 1.2, fillOpacity: 0 },
          interactive: false,
        }).addTo(map);

        const thRings: L.LatLngExpression[][] = [];
        const feats = Array.isArray(geojson.features)
          ? geojson.features
          : [geojson];
        feats.forEach((f: any) =>
          thRings.push(...extractRingsLatLng(f.geometry))
        );
        thRingsRef.current = thRings;

        setMaskByRings(thRingsRef.current);
        setInnerShade(true);
        fitThailandTight(false);
      });

    markersLayerRef.current = L.layerGroup().addTo(map);

    // Zoom Out control
    const ZoomOutControl = L.Control.extend({
      options: { position: "topleft" as L.ControlPosition },
      onAdd: () => {
        const wrap = L.DomUtil.create("div", "leaflet-bar");
        wrap.style.display = "none";
        const btn = L.DomUtil.create("button", "", wrap);
        btn.style.padding = "6px 10px";
        btn.style.background = "#fff";
        btn.style.border = "1px solid #ddd";
        btn.style.cursor = "pointer";
        btn.title = "Zoom out";
        btn.innerText = "Zoom out";
        L.DomEvent.on(btn, "click", (ev) => {
          L.DomEvent.stop(ev);
          zoomOut();
        });
        zoomOutWrapRef.current = wrap;
        return wrap;
      },
    });
    map.addControl(new ZoomOutControl());

    return () => {
      if (markersLayerRef.current) {
        markersLayerRef.current.remove();
        markersLayerRef.current = null;
      }
      if (innerShadeRef.current) {
        map.removeLayer(innerShadeRef.current);
        innerShadeRef.current = null;
      }
      if (maskLayerRef.current) {
        map.removeLayer(maskLayerRef.current);
        maskLayerRef.current = null;
      }
      if (thLayerRef.current) {
        map.removeLayer(thLayerRef.current);
        thLayerRef.current = null;
      }
      if (provincesLayerRef.current) {
        map.removeLayer(provincesLayerRef.current);
        provincesLayerRef.current = null;
      }
      if (districtsLayerRef.current) {
        map.removeLayer(districtsLayerRef.current);
        districtsLayerRef.current = null;
      }
      if (subdistrictsLayerRef.current) {
        map.removeLayer(subdistrictsLayerRef.current);
        subdistrictsLayerRef.current = null;
      }
      if (tileRef.current) {
        map.removeLayer(tileRef.current);
        tileRef.current = null;
      }
      if (dimRendererRef.current) {
        map.removeLayer(dimRendererRef.current);
        dimRendererRef.current = null;
      }
      viewStackRef.current = [];
      const el = map.getContainer() as HTMLDivElement;
      if (el) {
        el.style.height = "";
        el.style.minHeight = "";
        el.style.maxHeight = "";
        el.style.width = "";
        el.style.display = "";
        el.style.flexShrink = "";
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = zoomOutWrapRef.current;
    if (!el) return;
    el.style.display = canZoomOut ? "block" : "none";
  }, [canZoomOut]);

  /** ---------- provinces layer ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (provincesLayerRef.current) return;

    fetch(URLS.PROVINCES)
      .then((r) => r.json())
      .then((provinces) => {
        const layer = L.geoJSON(provinces, {
          style: styleProvinceDefault,
          onEachFeature: (feature, layer) => {
            const proCode = feature?.properties?.pro_code as string | undefined;
            const nameTH = feature?.properties?.pro_th as string | undefined;
            const nameEN = feature?.properties?.pro_en as string | undefined;

            // เก็บ centroid ไว้ใช้วาง noti ด้วยชื่อจังหวัด
            if (nameTH) {
              const c = (layer as any).getBounds().getCenter();
              provinceCentersRef.current[nameTH] = { lat: c.lat, lng: c.lng };
              if (nameEN)
                provinceCentersRef.current[nameEN] = { lat: c.lat, lng: c.lng };
            }

            layer.on("mouseover", () =>
              (layer as L.Path).setStyle(styleProvinceHover)
            );
            layer.on("mouseout", () =>
              (layer as L.Path).setStyle(styleProvinceDefault)
            );

            const label = nameTH || nameEN || "Province";
            (layer as any).bindTooltip(label, {
              sticky: true,
              direction: "top",
              opacity: 0.95,
            });

            const handleEnterProvince = () => {
              if (!proCode) return;
              pushView({
                bounds: TH_BOUNDS as any,
                padding: [12, 12],
                maxZoom: 19,
                level: "country",
                rings: thRingsRef.current,
              });
              setInnerShade(false);

              const ringsProv = extractRingsLatLng((feature as any).geometry);
              setMaskByRings(ringsProv);

              const b = (layer as any).getBounds() as L.LatLngBounds;
              map.flyToBounds(b, {
                animate: true,
                padding: [12, 12],
                maxZoom: 10,
              });

              loadDistrictsForProvince(proCode, nameTH, ringsProv);
            };

            // คลิกเพื่อเข้า
            layer.on("click", handleEnterProvince);

            // รองรับ external focus ด้วยชื่อจังหวัด
            (layer as any).__enterProvince = handleEnterProvince;
          },
        }).addTo(map);

        provincesLayerRef.current = layer;

        // รอ centroid ครบแล้ววาง noti
        renderMarkers();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** รับสัญญาณจาก Dropdown ให้ซูมเข้าจังหวัด */
  useEffect(() => {
    if (!focusProvince || !provincesLayerRef.current) return;
    let matched: any | null = null;
    provincesLayerRef.current.eachLayer((ly: any) => {
      const p = ly?.feature?.properties || {};
      const th: string = p.pro_th || "";
      const en: string = p.pro_en || "";
      if (th === focusProvince || en === focusProvince) matched = ly;
    });
    if (matched && matched.__enterProvince) matched.__enterProvince();
  }, [focusProvince]);

  /** โหลด Districts ของจังหวัด */
  const loadDistrictsForProvince = (
    pro_code: string,
    _nameTH?: string,
    ringsProv?: L.LatLngExpression[][]
  ) => {
    const map = mapRef.current;
    if (!map) return;

    if (districtsLayerRef.current) {
      map.removeLayer(districtsLayerRef.current);
      districtsLayerRef.current = null;
    }
    if (subdistrictsLayerRef.current) {
      map.removeLayer(subdistrictsLayerRef.current);
      subdistrictsLayerRef.current = null;
    }

    fetch(URLS.DISTRICTS)
      .then((r) => r.json())
      .then((allDistricts) => {
        const filtered = {
          type: "FeatureCollection",
          features: (allDistricts.features || []).filter(
            (f: any) => String(f.properties?.pro_code) === String(pro_code)
          ),
        };

        const dLayer = L.geoJSON(filtered as any, {
          style: styleDistrictDefault,
          onEachFeature: (feature, layer) => {
            const ampCode = feature?.properties?.amp_code as string | undefined;
            const ampTH = feature?.properties?.amp_th as string | undefined;

            layer.on("mouseover", () =>
              (layer as L.Path).setStyle(styleDistrictHover)
            );
            layer.on("mouseout", () =>
              (layer as L.Path).setStyle(styleDistrictDefault)
            );
            if (ampTH)
              (layer as any).bindTooltip(ampTH, {
                sticky: true,
                direction: "top",
                opacity: 0.98,
              });

            // คลิกอำเภอ → เข้า “ทุกตำบลในอำเภอ”
            layer.on("click", () => {
              if (!ampCode) return;

              const bb = (dLayer as any).getBounds() as L.LatLngBounds;
              const toLiteral: L.LatLngBoundsLiteral = [
                [bb.getSouthWest().lat, bb.getSouthWest().lng],
                [bb.getNorthEast().lat, bb.getNorthEast().lng],
              ];
              pushView({
                bounds: toLiteral,
                padding: [12, 12],
                maxZoom: 10,
                level: "province",
                rings: ringsProv,
              });

              const ringsDist = extractRingsLatLng((feature as any).geometry);
              setMaskByRings(ringsDist);

              const b = (layer as any).getBounds() as L.LatLngBounds;
              map.flyToBounds(b, {
                animate: true,
                padding: [10, 10],
                maxZoom: 12,
              });

              loadSubdistrictsForDistrict(ampCode, ringsDist);
            });
          },
        }).addTo(map);

        districtsLayerRef.current = dLayer;
      });
  };

  /** โหลด Subdistricts ของอำเภอ + รองรับ drill-in ลง “ตำบล” */
  const loadSubdistrictsForDistrict = (
    amp_code: string,
    ringsDist?: L.LatLngExpression[][]
  ) => {
    const map = mapRef.current;
    if (!map) return;
    if (subdistrictsLayerRef.current) {
      map.removeLayer(subdistrictsLayerRef.current);
      subdistrictsLayerRef.current = null;
    }

    fetch(URLS.SUBDISTRICTS)
      .then((r) => r.json())
      .then((allSubs) => {
        const feats = (allSubs.features || []) as any[];
        const withAmp = feats.filter(
          (f) => f.properties?.amp_code !== undefined
        );
        const filtered = withAmp.filter(
          (f) => String(f.properties?.amp_code) === String(amp_code)
        );
        const collection = {
          type: "FeatureCollection",
          features: filtered.length ? filtered : feats.slice(0, 0),
        };

        const sLayer = L.geoJSON(collection as any, {
          style: styleSubdistrictDefault,
          onEachFeature: (feature, layer) => {
            const tamTH = feature?.properties?.tam_th as string | undefined;
            if (tamTH)
              (layer as any).bindTooltip(tamTH, {
                sticky: true,
                direction: "top",
                opacity: 0.95,
                offset: L.point(0, -14),
              });

            // คลิกตำบล → zoom เจาะเฉพาะตำบล + ถมรอบข้างทั้งหมด
            layer.on("click", () => {
              const ringsTam = extractRingsLatLng((feature as any).geometry);
              // เก็บมุมมองระดับ “ทุกตำบลของอำเภอ”
              const bb = (sLayer as any).getBounds() as L.LatLngBounds;
              const toLiteral: L.LatLngBoundsLiteral = [
                [bb.getSouthWest().lat, bb.getSouthWest().lng],
                [bb.getNorthEast().lat, bb.getNorthEast().lng],
              ];
              pushView({
                bounds: toLiteral,
                padding: [10, 10],
                maxZoom: 12,
                level: "district",
                rings: ringsDist,
              });

              setMaskByRings(ringsTam);

              const b = (layer as any).getBounds() as L.LatLngBounds;
              map.flyToBounds(b, {
                animate: true,
                padding: [10, 10],
                maxZoom: 14,
              });
            });
          },
        }).addTo(map);

        subdistrictsLayerRef.current = sLayer;
      });
  };

  /** ---------- markers (notis) ---------- */
  const renderMarkers = () => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const pickBySite = (list: Noti[]) => {
      const chosen: Record<string, Noti> = {};
      for (const n of list) {
        const prev = chosen[n.site];
        if (!prev) {
          chosen[n.site] = n;
          continue;
        }
        const r1 = SEVERITY_RANK[String(n.type)] ?? 0;
        const r0 = SEVERITY_RANK[String(prev.type)] ?? 0;
        if (r1 > r0) chosen[n.site] = n;
        else if (
          r1 === r0 &&
          new Date(n.date).getTime() > new Date(prev.date).getTime()
        )
          chosen[n.site] = n;
      }
      return Object.values(chosen);
    };

    const normalized = normalizeSeverity(severityFilter);
    const filtered =
      normalized === "all"
        ? notis
        : notis.filter((n) => String(n.type).toLowerCase() === normalized);
    const list = aggregateBySite ? pickBySite(filtered) : filtered;

    list.forEach((n) => {
      let coord = siteCoords[n.site];
      if (!coord && n.province) {
        // รองรับทั้งชื่อไทย/อังกฤษ และสะกดเพี้ยนเล็กน้อย (trim)
        const key = n.province.trim();
        const c = provinceCentersRef.current[key];
        if (c) coord = { lat: c.lat, lng: c.lng };
      }
      if (!coord) return;

      const color = SEVERITY_COLOR[String(n.type)] ?? "#3b82f6";
      const icon = makeSvgPin(color, 32);
      const localizedTitle = n.titleKey
        ? t(n.titleKey, { defaultValue: n.title })
        : n.title;

      const popupHtml = `
        <div class="bps-popup">
          <div class="bps-popup-title">${n.site}</div>
          <div class="bps-popup-sub">${localizedTitle}</div>
        </div>
      `;

      L.marker([coord.lat, coord.lng], { icon, pane: "markersPane" })
        .bindPopup(popupHtml, {
          className: "bps-popup-wrap",
          closeButton: false,
          autoPan: false,
          offset: L.point(90, 20),
        })
        .addTo(markersLayer)
        .on("mouseover", function (this: L.Marker) {
          this.openPopup();
        })
        .on("mouseout", function (this: L.Marker) {
          this.closePopup();
        })
        .on("click", function (this: L.Marker) {
          this.openPopup();
        });
    });
  };

  useEffect(() => {
    renderMarkers(); /* หลัง province centroid พร้อมแล้วจะถูกเรียกอีกที */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notis, siteCoords, aggregateBySite, severityFilter, t, i18n.language]);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    zoomOut();
  };

  return (
    <div
      id="th-map"
      className="relative z-0 h-[680px] w-full rounded-lg bg-gray-200 md:h-[560px] sm:h-[440px]"
      onContextMenu={onContextMenu}
    />
  );
}
