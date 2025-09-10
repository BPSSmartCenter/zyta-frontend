import { useEffect, useRef } from "react";
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
};

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

/** padding อ้างอิงไฟล์เดิม (~4% ของด้านสั้น) */
function responsivePadding(
  containerW: number,
  containerH: number,
  viewportW?: number
) {
  const side = Math.max(1, Math.min(containerW, containerH));

  // ค่าอ้างอิงเดิม ~4% ของด้านสั้น (คงเดิมทุกช่วง)
  const basePad = Math.max(10, Math.round(side * 0.04));

  // 👇 ใช้ viewport width เป็นเงื่อนไขตามที่ต้องการ
  const vw = viewportW ?? containerW;
  const padY =
    vw >= 375 && vw <= 510
      ? Math.max(basePad, Math.round(side * 0.38)) // ซูมออกนิดนึงเฉพาะช่วงนี้เท่านั้น
      : basePad;

  return { x: basePad, y: padY };
}

/** คำนวณ zoom ให้ "ความสูงของประเทศไทย" = innerHeight (หลังหัก padding) */
function zoomForExactHeight(
  map: L.Map,
  boundsExpr: L.LatLngBoundsExpression,
  innerHeight: number
) {
  const b = L.latLngBounds(boundsExpr as any); // แปลง literal → LatLngBounds
  const MIN_Z = 2,
    MAX_Z = 19;
  let lo = MIN_Z,
    hi = MAX_Z;

  for (let i = 0; i < 25; i++) {
    // binary search
    const mid = (lo + hi) / 2;
    const pN = map.project(b.getNorthWest(), mid);
    const pS = map.project(b.getSouthEast(), mid);
    const spanY = Math.abs(pS.y - pN.y);
    if (spanY > innerHeight) hi = mid; // ใหญ่เกิน → ลดซูม
    else lo = mid; // ยังเล็ก → ซูมเข้า
  }
  return Math.max(MIN_Z, Math.min(lo, MAX_Z));
}

export default function Map({
  notis,
  siteCoords = DEFAULT_SITE_COORDS,
  aggregateBySite = true,
  severityFilter,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null);
  const thLayerRef = useRef<L.GeoJSON<any> | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const dimRendererRef = useRef<L.SVG | null>(null); // 👈 renderer สำหรับ pane เฉพาะ

  // คุมกล่องด้วย inline style (ไม่แตะ class เดิม)
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

  /** ฟิตแนวตั้งให้ชิด padding บน/ล่าง “ไม่เหลื่อม” */
  const fitVerticalTight = (animate = false) => {
    const map = mapRef.current;
    if (!map) return;

    lockContainerBox();
    map.invalidateSize(false);

    const sz = map.getSize();
    const vw = typeof window !== "undefined" ? window.innerWidth : sz.x;
    // ใช้ padding ที่พิจารณา viewport width
    const pad = responsivePadding(sz.x, sz.y, vw);
    const innerH = Math.max(1, sz.y - pad.y * 2);

    // คำนวณซูมแนวตั้ง + ล็อกห้ามซูม/เลื่อน (โค้ดที่เหลือคงเดิม)
    const z = zoomForExactHeight(map, TH_BOUNDS, innerH);
    const center = L.latLngBounds(TH_BOUNDS as any).getCenter();

    map.setView(center, z, { animate: false });
    map.setMinZoom(z);
    map.setMaxZoom(z);

    // ชดเชย rounding ให้ top/bottom ชิด padding เป๊ะ
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

    tileRef.current = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        minZoom: 2,
        attribution: "&copy; OpenStreetMap contributors",
      }
    ).addTo(map);

    // 🔧 pane + renderer เฉพาะ เพื่อกัน error appendChild
    map.createPane("dimPane");
    dimRendererRef.current = L.svg({ pane: "dimPane" }).addTo(map);
    const dimPane = map.getPane("dimPane")!;
    dimPane.style.zIndex = "430";
    dimPane.style.pointerEvents = "none";

    const worldRing: L.LatLngExpression[] = [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180],
    ];

    fetch("/data/thailand.geojson")
      .then((r) => r.json())
      .then((geojson) => {
        // เส้นขอบไทย (ไม่ interactive)
        thLayerRef.current = L.geoJSON(geojson, {
          style: { color: "#000000", weight: 0.5, fillOpacity: 0 },
          interactive: false,
        }).addTo(map);

        // ทำมาสก์รอบนอกลง pane พิเศษ + renderer พิเศษ
        const rings: L.LatLngExpression[][] = [];
        const pushRing = (ring: number[][]) =>
          rings.push(ring.map(([lng, lat]) => [lat, lng]));
        const feats = Array.isArray(geojson.features)
          ? geojson.features
          : [geojson];
        feats.forEach((f: any) => {
          const g = f.geometry;
          if (!g) return;
          if (g.type === "Polygon")
            g.coordinates.forEach((r: number[][]) => pushRing(r));
          else if (g.type === "MultiPolygon")
            g.coordinates.forEach((poly: number[][][]) =>
              poly.forEach((r: number[][]) => pushRing(r))
            );
        });

        if (rings.length > 0) {
          maskLayerRef.current = L.polygon([worldRing, ...rings], {
            pane: "dimPane",
            renderer: dimRendererRef.current || undefined, // ✅ ป้องกัน appendChild undefined
            stroke: true,
            color: "#000000",
            weight: 2,
            opacity: 0.5,
            fill: true,
            fillColor: "#D3F7FF",
            fillOpacity: 0.9,
            interactive: false,
            smoothFactor: 2.0,
          }).addTo(map);
        }

        fitVerticalTight(false);
      })
      .catch((e) => console.error("Cannot load /data/thailand.geojson", e));

    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      if (markersLayerRef.current) {
        markersLayerRef.current.remove();
        markersLayerRef.current = null;
      }
      if (maskLayerRef.current) {
        map.removeLayer(maskLayerRef.current);
        maskLayerRef.current = null;
      }
      if (thLayerRef.current) {
        map.removeLayer(thLayerRef.current);
        thLayerRef.current = null;
      }
      if (tileRef.current) {
        map.removeLayer(tileRef.current);
        tileRef.current = null;
      }
      if (dimRendererRef.current) {
        map.removeLayer(dimRendererRef.current);
        dimRendererRef.current = null;
      }

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

  // วาง pins
  useEffect(() => {
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
      const coord = siteCoords[n.site];
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

      L.marker([coord.lat, coord.lng], { icon })
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
  }, [notis, siteCoords, aggregateBySite, severityFilter, t, i18n.language]);

  return (
    <div
      id="th-map"
      className="relative z-0 h-[680px] w-full rounded-lg bg-gray-200
                 md:h-[560px] sm:h-[440px]"
    />
  );
}
