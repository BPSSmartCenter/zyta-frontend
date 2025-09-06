// src/components/Map.tsx
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

function normalizeSeverity(
  input?: string
): "all" | "alert" | "warning" | "offline" | "normal" {
  const raw = (input || "").trim().toLowerCase();
  if (!raw || raw === "all" || raw === "any severity") return "all";
  if (raw.includes("fire")) return "alert";
  if (raw.includes("motion")) return "warning";
  if (raw.includes("offline") || raw.includes("ออฟไลน์")) return "offline";
  if (
    raw === "alert" ||
    raw === "warning" ||
    raw === "offline" ||
    raw === "normal"
  ) {
    return raw as any;
  }
  return "all";
}

/** ยิ่ง container แคบ → ยิ่งเพิ่ม offset เพื่อ "ซูมออก" ให้เห็นประเทศเล็กลง */
function computeZoomOutOffset(width: number) {
  const REF_WIDTH = 1280;
  const w = Math.max(320, Math.min(width, 2560));
  const ratio = REF_WIDTH / w; // >1 เมื่อแคบลง
  const delta = Math.log2(ratio) * 0.9; // ทำให้ลื่นขึ้น
  return Math.max(0, Math.min(delta, 2.25)); // จำกัด offset สูงสุด
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
  const roRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);

  // ปรับซูมตามขนาด container: "ยิ่งเล็ก → ยิ่งซูมออก"
  const updateResponsiveZoom = (animate = false) => {
    const map = mapRef.current;
    if (!map) return;
    const el = map.getContainer();
    const width = el.clientWidth || 0;

    // ใช้ L.point เพื่อแก้ type error และใช้ซ้ำได้ทั้งสองที่
    const padding = L.point(20, 20);

    // base zoom ที่เห็นประเทศไทยพอดีกับขอบ (inside=true)
    const baseZoom = map.getBoundsZoom(TH_BOUNDS, true, padding);

    // เพิ่ม offset แล้ว "ลบ" ออกจาก baseZoom เพื่อซูมออก
    const offset = computeZoomOutOffset(width);
    const target = Math.max(
      map.getMinZoom(),
      Math.min(map.getMaxZoom(), baseZoom - offset)
    );

    // fit ก่อน แล้วค่อยตั้งซูมที่เล็กลง
    map.fitBounds(TH_BOUNDS, { padding, animate: false });
    map.setZoom(target, { animate });
  };

  // init map ครั้งเดียว
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map("th-map", {
      center: [13.736717, 100.523186],
      zoom: 7,
      minZoom: 4,
      maxZoom: 16,
      maxBounds: TH_BOUNDS,
      maxBoundsViscosity: 0.3,
      inertia: true,
      inertiaDeceleration: 2500,
      worldCopyJump: false,
    });
    mapRef.current = map;

    // Base tiles
    tileRef.current = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        minZoom: 2,
        attribution: "&copy; OpenStreetMap contributors",
      }
    ).addTo(map);

    // Pane สำหรับ mask
    map.createPane("dimPane");
    const dimPane = map.getPane("dimPane")!;
    dimPane.style.zIndex = "430";
    dimPane.style.pointerEvents = "none";

    // วาด mask รอบนอกจาก geojson ประเทศไทย
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

        // fit ครั้งแรก + ปรับซูมออกตามขนาด container ตอน mount
        updateResponsiveZoom(false);
      })
      .catch((e) => console.error("Cannot load /data/thailand.geojson", e));

    // layer markers
    markersLayerRef.current = L.layerGroup().addTo(map);

    // ===== Resize handling =====
    const hasRO = typeof window !== "undefined" && "ResizeObserver" in window;

    if (hasRO) {
      const el = map.getContainer();
      const ro = new ResizeObserver(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() =>
          updateResponsiveZoom(true)
        );
      });
      ro.observe(el);
      roRef.current = ro;
    } else if (typeof window !== "undefined") {
      // fallback: ใช้ window resize (แก้ ts: เช็ก window อีกรอบ)
      const onResize = () => updateResponsiveZoom(true);
      window.addEventListener("resize", onResize);
      // เก็บตัว disconnect ไว้ใน roRef เป็น object ที่มีเมธอด disconnect
      (
        roRef as unknown as { current: { disconnect: () => void } | null }
      ).current = {
        disconnect: () => window.removeEventListener("resize", onResize),
      };
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // เรียก disconnect() ได้ทั้งกรณี ResizeObserver จริง และกรณี fallback object
      (roRef.current as any)?.disconnect?.();
      roRef.current = null;

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

  // render pins
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

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

    const normalized = normalizeSeverity(severityFilter);
    const filtered =
      normalized === "all"
        ? notis
        : notis.filter((n) => String(n.type).toLowerCase() === normalized);

    const list = aggregateBySite ? pickBySite(filtered) : filtered;

    list.forEach((n) => {
      const coord = siteCoords[n.site];
      if (!coord) {
        console.warn(`[Map] ไม่มีพิกัดสำหรับ site: ${n.site}`);
        return;
      }
      const color = SEVERITY_COLOR[String(n.type)] ?? "#3b82f6";
      const icon = makeSvgPin(color, 32);

      // แปล title จากคีย์ ถ้ามี
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
    // ผูกกับภาษาเพื่อ re-render เมื่อเปลี่ยนภาษา
  }, [notis, siteCoords, aggregateBySite, severityFilter, t, i18n.language]);

  return (
    <div
      id="th-map"
      className="relative z-0 h-[680px] w-full rounded-lg bg-gray-200
                 md:h-[560px] sm:h-[440px]"
    />
  );
}
