import { useEffect, useRef } from "react";
import L from "leaflet";

const TH_BOUNDS: L.LatLngBoundsExpression = [
  [5.5, 97.0],
  [21.0, 107.5],
];

type Noti = {
  type: "alert" | "warning" | "normal" | string;
  title: string;
  site: string;
  date: string; // YYYY-MM-DD หรือ parse ได้
};

type SiteCoord = { lat: number; lng: number };
type SiteCoordMap = Record<string, SiteCoord>;

type Props = {
  notis: Noti[];
  siteCoords?: SiteCoordMap; // ถ้าไม่ส่ง ใช้ค่า default ด้านล่าง
  aggregateBySite?: boolean; // true = เลือก “เหตุรุนแรงสุด/ใหม่สุด” ต่อ site
};

const DEFAULT_SITE_COORDS: SiteCoordMap = {
  "Site A": { lat: 18.7883, lng: 98.9853 }, // เชียงใหม่
  "Site B": { lat: 7.8906, lng: 98.3981 }, // ภูเก็ต
  "Site C": { lat: 15.87, lng: 100.9925 }, // กลางประเทศ
  "Site D": { lat: 16.4419, lng: 102.835 }, // ขอนแก่น
  "Site E": { lat: 15.244, lng: 104.8487 }, // อุบลฯ
  "Site F": { lat: 13.7563, lng: 100.5018 }, // กทม.
  "Site G": { lat: 9.1382, lng: 99.321 }, // สุราษฎร์ฯ (ตัวอย่าง)
};

const SEVERITY_RANK: Record<string, number> = {
  alert: 3,
  warning: 2,
  normal: 1,
};
const SEVERITY_COLOR: Record<string, string> = {
  alert: "#ef4444", // แดง
  warning: "#f59e0b", // ส้ม
  normal: "#22c55e", // เขียว
};

function makeSvgPin(color: string, size = 32) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${
    size * 1.25
  }" viewBox="0 0 32 40">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>
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

export default function Map({
  notis,
  siteCoords = DEFAULT_SITE_COORDS,
  aggregateBySite = true,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const maskLayerRef = useRef<L.Polygon | null>(null);
  const thLayerRef = useRef<L.GeoJSON<any> | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  // --- init map (ครั้งเดียว) ---
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map("th-map", {
      center: [13.736717, 100.523186],
      zoom: 7,
      minZoom: 6,
      maxZoom: 16,
      maxBounds: TH_BOUNDS,
      maxBoundsViscosity: 0.3,
      inertia: true,
      inertiaDeceleration: 2500,
      worldCopyJump: false,
    });
    mapRef.current = map;

    // Base map (OSM สี)
    tileRef.current = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        minZoom: 2,
        attribution: "&copy; OpenStreetMap contributors",
      }
    ).addTo(map);

    // Mask pane
    map.createPane("dimPane");
    const dimPane = map.getPane("dimPane")!;
    dimPane.style.zIndex = "430";
    dimPane.style.pointerEvents = "none";

    // วาด mask รอบนอก (โหลด geojson ประเทศไทย)
    const worldRing: L.LatLngExpression[] = [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180],
    ];

    fetch("/data/thailand.geojson")
      .then((r) => r.json())
      .then((geojson) => {
        thLayerRef.current = L.geoJSON(geojson, {
          style: { color: "#000000", weight: 0.5, fillOpacity: 0 },
        }).addTo(map);

        const thRingsLatLng: L.LatLngExpression[][] = [];
        const pushRing = (ring: number[][]) =>
          thRingsLatLng.push(ring.map(([lng, lat]) => [lat, lng]));

        const feats = Array.isArray(geojson.features)
          ? geojson.features
          : [geojson];
        feats.forEach((f: any) => {
          const g = f.geometry;
          if (!g) return;
          if (g.type === "Polygon")
            g.coordinates.forEach((ring: number[][]) => pushRing(ring));
          else if (g.type === "MultiPolygon")
            g.coordinates.forEach((poly: number[][][]) =>
              poly.forEach((ring: number[][]) => pushRing(ring))
            );
        });

        if (thRingsLatLng.length > 0) {
          maskLayerRef.current = L.polygon([worldRing, ...thRingsLatLng], {
            pane: "dimPane",
            stroke: true,
            color: "#000000",
            weight: 2,
            opacity: 0.5,
            fill: true,
            fillColor: "#D3F7FF",
            fillOpacity: 0.82,
            interactive: false,
            smoothFactor: 2.0,
          }).addTo(map);
        }

        map.fitBounds(TH_BOUNDS, { padding: [20, 20] });
        map.zoomIn(1, { animate: false });
      })
      .catch((e) => console.error("Cannot load /data/thailand.geojson", e));

    // layer สำหรับ markers
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      // cleanup ทั้งหมดเมื่อ component unmount
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
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- render pins ตาม props.notis ---
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // เคลียร์รอบเก่า
    markersLayer.clearLayers();

    // เลือก 1 noti ต่อ site (รุนแรงสุด แล้วค่อยใหม่สุด)
    const pickBySite = (list: Noti[]) => {
      const chosen: Record<string, Noti> = {};
      for (const n of list) {
        const key = n.site;
        const prev = chosen[key];
        if (!prev) {
          chosen[key] = n;
          continue;
        }
        const r1 = SEVERITY_RANK[String(n.type)] ?? 0;
        const r0 = SEVERITY_RANK[String(prev.type)] ?? 0;
        if (r1 > r0) chosen[key] = n;
        else if (
          r1 === r0 &&
          new Date(n.date).getTime() > new Date(prev.date).getTime()
        )
          chosen[key] = n;
      }
      return Object.values(chosen);
    };

    const list = aggregateBySite ? pickBySite(notis) : notis;

    // วาดหมุด
    list.forEach((n) => {
      const coord = siteCoords[n.site];
      if (!coord) {
        console.warn(`[Map] ไม่มีพิกัดสำหรับ site: ${n.site}`);
        return;
      }
      const color = SEVERITY_COLOR[String(n.type)] ?? "#3b82f6";
      const icon = makeSvgPin(color, 32);
      const popupHtml = `
        <div class="bps-popup">
          <div class="bps-popup-title">${n.site}</div>
          <div class="bps-popup-sub">${n.title}</div>
        </div>
      `;

      L.marker([coord.lat, coord.lng], { icon })
        .bindPopup(popupHtml, {
          className: "bps-popup-wrap",
          closeButton: false,
          autoPan: false,
          offset: L.point(90, 20), // กล่องดำไปทางขวา
        })
        .addTo(markersLayer)
        .on("mouseover", function () {
          this.openPopup();
        })
        .on("mouseout", function () {
          this.closePopup();
        })
        .on("click", function () {
          this.openPopup();
        });
    });
  }, [notis, siteCoords, aggregateBySite]);

  return (
    <div
      id="th-map"
      className="relative z-0 h-[680px] w-full rounded-lg bg-gray-200"
    />
  );
}
