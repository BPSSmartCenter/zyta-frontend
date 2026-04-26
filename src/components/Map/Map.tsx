import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Props, SitePoint, SitePinStatus } from "./MapTypes";

declare global {
  interface Window { longdo?: any; }
}

/* ─────────────────────────────────────────────
   GeoJSON types (สำหรับ province overlays)
───────────────────────────────────────────── */
type LonLat = { lon: number; lat: number };
type Geometry = { type: string; coordinates: unknown };
type Feature = { type: "Feature"; properties?: Record<string, string>; geometry: Geometry };
type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };

/* ─────────────────────────────────────────────
   Longdo Map loader
───────────────────────────────────────────── */
const DEFAULT_LONGDO_KEY = "014d3a8670f605c055dfadcbb59a35a2";
let longdoScriptPromise: Promise<void> | null = null;

const resolveLongdoKey = () =>
  ((import.meta as { env?: Record<string, string> }).env?.VITE_LONGDO_MAP_KEY) || DEFAULT_LONGDO_KEY;

const loadLongdoMap2D = async () => {
  if (typeof window === "undefined" || window.longdo) return;
  if (longdoScriptPromise) { await longdoScriptPromise; return; }
  const key = resolveLongdoKey();
  longdoScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-longdo="map2"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Longdo")));
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.longdo = "map2";
    script.src = `https://api.longdo.com/map/?key=${encodeURIComponent(key)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Longdo"));
    document.head.appendChild(script);
  });
  await longdoScriptPromise;
};

/* ─────────────────────────────────────────────
   GeoJSON helpers
───────────────────────────────────────────── */
function ringToLonLat(ring: number[][]): LonLat[] {
  return ring.map(([lon, lat]) => ({ lon, lat }));
}

function geometryToOuterRings(geometry?: Geometry | null): LonLat[][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") {
    const coords = geometry.coordinates as number[][][];
    return coords?.[0] ? [ringToLonLat(coords[0])] : [];
  }
  if (geometry.type === "MultiPolygon") {
    const coords = geometry.coordinates as number[][][][];
    return (coords ?? []).map((poly) => ringToLonLat(poly[0] ?? []));
  }
  return [];
}

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const MAP_MIN_ZOOM = 6;
const MAP_MAX_ZOOM = 18;
const GROUP_ZOOM_THRESHOLD = 10; // ต่ำกว่านี้ = แสดง GroupSite pin

/* ─────────────────────────────────────────────
   SVG builders
───────────────────────────────────────────── */
function buildPinSvg(color: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="46" viewBox="0 0 32 46">` +
    `<path d="M16 0c8.837 0 16 7.163 16 16 0 11.356-16 30-16 30S0 27.356 0 16C0 7.163 7.163 0 16 0z" fill="${color}"/>` +
    `<circle cx="16" cy="15.5" r="7" fill="#FFFFFF"/>` +
    `</svg>`
  );
}

/** Group pin — ใหญ่กว่า Site pin, มีวงกลม + ตัวเลขจำนวน site */
function buildGroupPinSvg(count: number): string {
  const label = count > 99 ? "99+" : String(count);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="58" viewBox="0 0 42 58">` +
    `<path d="M21 0C32.598 0 42 9.402 42 21 42 36.456 21 58 21 58S0 36.456 0 21C0 9.402 9.402 0 21 0z" fill="#1D4ED8"/>` +
    `<circle cx="21" cy="20" r="12" fill="#FFFFFF"/>` +
    `<text x="21" y="25" text-anchor="middle" font-size="11" font-weight="bold" fill="#1D4ED8" font-family="Arial,sans-serif">${label}</text>` +
    `</svg>`
  );
}

/* ─────────────────────────────────────────────
   Map Component
───────────────────────────────────────────── */
export default function Map({
  sitePoints,
  pinStatusBySite,
  focusSiteCenter,
  onPinClick,
}: Props) {
  console.log("🗺️ [Map] COMPONENT RENDER", { sitePoints: sitePoints?.length, focusSiteCenter });
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const initializedRef = useRef(false);
  const provincesRef = useRef<Feature[]>([]);

  /* refs สำหรับ overlay tracking */
  const provinceOverlaysRef = useRef<unknown[]>([]);
  const allMarkerOverlaysRef = useRef<unknown[]>([]);
  const siteByOverlayRef = useRef<globalThis.Map<unknown, SitePoint>>(new globalThis.Map());
  // ติดตาม position + label ของทุก marker ที่ render (ใช้สำหรับ tooltip)
  const renderedMarkerLabelsRef = useRef<{ lat: number; lng: number; name: string }[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(MAP_MIN_ZOOM);
  const zoomLevelRef = useRef(MAP_MIN_ZOOM);
  const [pinTooltip, setPinTooltip] = useState<{
    visible: boolean; text: string; left: number; top: number;
  }>({ visible: false, text: "", left: 0, top: 0 });

  // ติดตาม mouse position สำหรับ tooltip
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const track = (e: MouseEvent) => { lastMousePosRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", track, true);
    return () => window.removeEventListener("mousemove", track, true);
  }, []);

  const allSitePoints = useMemo(
    () => (Array.isArray(sitePoints) && sitePoints.length > 0 ? sitePoints : []),
    [sitePoints],
  );
  const allSitePointsRef = useRef<SitePoint[]>(allSitePoints);
  allSitePointsRef.current = allSitePoints;

  const pinStatusRef = useRef(pinStatusBySite);
  pinStatusRef.current = pinStatusBySite;

  /* ─── Electric status helpers ─── */
  const resolveStatus = (site: SitePoint): SitePinStatus | undefined =>
    (site.code ? pinStatusRef.current?.[site.code] : undefined)
    ?? (site.id ? pinStatusRef.current?.[site.id] : undefined)
    ?? pinStatusRef.current?.[site.name];

  const pinColor = (site: SitePoint): string => {
    const s = resolveStatus(site);
    if (!s?.hasElectric) return "#003a81";
    return s.electricOffline > 0 ? "#EF4444" : "#16A34A";
  };

  /* ─── Overlay cleanup ─── */
  const clearAllMarkers = () => {
    const map = mapRef.current as { Overlays: { remove: (o: unknown) => void } } | null;
    if (!map) return;
    for (const ov of allMarkerOverlaysRef.current) {
      try { map.Overlays.remove(ov); } catch { /* noop */ }
    }
    renderedMarkerLabelsRef.current = [];
    allMarkerOverlaysRef.current = [];
    siteByOverlayRef.current.clear();
  };

  const clearProvinceOverlays = () => {
    const map = mapRef.current as { Overlays: { remove: (o: unknown) => void } } | null;
    if (!map) return;
    for (const ov of provinceOverlaysRef.current) {
      try { map.Overlays.remove(ov); } catch { /* noop */ }
    }
    provinceOverlaysRef.current = [];
  };

  /* ─── Province border overlays (visual only, not clickable) ─── */
  const drawProvinceOverlays = () => {
    const map = mapRef.current as { Overlays: { add: (o: unknown) => void } } | null;
    const longdo = window.longdo;
    if (!map || !longdo) return;
    clearProvinceOverlays();
    for (const feature of provincesRef.current) {
      for (const ring of geometryToOuterRings(feature.geometry)) {
        if (!ring.length) continue;
        const polygon = new longdo.Polygon(ring, {
          lineWidth: 1,
          lineColor: "rgba(2,132,199,0.45)",
          fillColor: "rgba(2,132,199,0.05)",
          clickable: false,
          pointer: false,
        });
        provinceOverlaysRef.current.push(polygon);
        map.Overlays.add(polygon);
      }
    }
  };

  /* ─── helpers สำหรับสร้าง marker ─── */
  const addSiteMarker = (
    site: SitePoint,
    longdo: any,
    map: { Overlays: { add: (o: unknown) => void } },
    evtOver: string,
    evtOut: string,
  ) => {
    const svg = buildPinSvg(pinColor(site));
    const iconUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
    const marker = new longdo.Marker(
      { lon: site.lng, lat: site.lat },
      {
        title: site.name,
        icon: { url: iconUrl, offset: { x: 16, y: 46 } },
        weight: longdo.OverlayWeight?.Top,
        clickable: true,
        pointer: true,
      },
    );
    const label = site.name;
    const showTip = () => {
      const rect = mapContainerRef.current?.getBoundingClientRect();
      const pos = lastMousePosRef.current;
      setPinTooltip({ visible: true, text: label, left: pos.x - (rect?.left ?? 0), top: pos.y - (rect?.top ?? 0) - 20 });
    };
    try { longdo.Event.bind(evtOver, marker, showTip); } catch { /* noop */ }
    try { longdo.Event.bind(evtOut, marker, () => setPinTooltip((p) => ({ ...p, visible: false }))); } catch { /* noop */ }
    allMarkerOverlaysRef.current.push(marker);
    siteByOverlayRef.current.set(marker, site);
    renderedMarkerLabelsRef.current.push({ lat: site.lat, lng: site.lng, name: site.name });
    map.Overlays.add(marker);
  };

  const addGroupMarker = (
    groupName: string,
    groupSites: SitePoint[],
    longdo: any,
    map: { Overlays: { add: (o: unknown) => void } },
    evtOver: string,
    evtOut: string,
  ) => {
    const lat = groupSites.reduce((s, g) => s + g.lat, 0) / groupSites.length;
    const lng = groupSites.reduce((s, g) => s + g.lng, 0) / groupSites.length;
    const svg = buildGroupPinSvg(groupSites.length);
    const iconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const label = groupName;
    const marker = new longdo.Marker(
      { lon: lng, lat },
      {
        title: label,
        icon: { url: iconUrl, offset: { x: 21, y: 58 } },
        weight: longdo.OverlayWeight?.Top,
        clickable: true,
        pointer: true,
      },
    );
    const showTip = () => {
      const rect = mapContainerRef.current?.getBoundingClientRect();
      const pos = lastMousePosRef.current;
      setPinTooltip({ visible: true, text: label, left: pos.x - (rect?.left ?? 0), top: pos.y - (rect?.top ?? 0) - 20 });
    };
    try { longdo.Event.bind(evtOver, marker, showTip); } catch { /* noop */ }
    try { longdo.Event.bind(evtOut, marker, () => setPinTooltip((p) => ({ ...p, visible: false }))); } catch { /* noop */ }
    // คลิก group pin → zoom เข้าไปให้เห็น individual sites
    const fakeGroupSite: SitePoint = { name: groupName, lat, lng };
    allMarkerOverlaysRef.current.push(marker);
    siteByOverlayRef.current.set(marker, fakeGroupSite);
    renderedMarkerLabelsRef.current.push({ lat, lng, name: groupName });
    map.Overlays.add(marker);
  };

  /* ─── Render site markers ─── */
  const renderMarkers = () => {
    clearAllMarkers();
    const map = mapRef.current as { Overlays: { add: (o: unknown) => void }; zoom: (z?: number) => number; location: (l: { lon: number; lat: number }) => void } | null;
    const longdo = window.longdo;
    if (!map || !longdo) return;

    const sites = [...allSitePointsRef.current].sort((a, b) => {
      const aOff = (resolveStatus(a)?.electricOffline ?? 0) > 0;
      const bOff = (resolveStatus(b)?.electricOffline ?? 0) > 0;
      return aOff === bOff ? 0 : aOff ? 1 : -1;
    });

    const currentZoom = zoomLevelRef.current;
    console.log("[Map] renderMarkers", {
      siteCount: sites.length,
      zoom: currentZoom,
      groups: sites.map((s) => ({ name: s.name, groupSite: s.groupSite })),
    });

    const longdoEvt = (window.longdo as any)?.EventName ?? {};
    const evtOver = longdoEvt.MouseOver ?? longdoEvt.mouseover ?? "mouseover";
    const evtOut  = longdoEvt.MouseOut  ?? longdoEvt.mouseout  ?? "mouseout";

    if (currentZoom < GROUP_ZOOM_THRESHOLD) {
      // ─── Group mode: รวม site ที่มี groupSite เดียวกัน ───
      const groupMap = new globalThis.Map<string, SitePoint[]>();
      const noGroup: SitePoint[] = [];

      for (const site of sites) {
        if (site.groupSite) {
          if (!groupMap.has(site.groupSite)) groupMap.set(site.groupSite, []);
          groupMap.get(site.groupSite)!.push(site);
        } else {
          noGroup.push(site);
        }
      }

      for (const [groupName, groupSites] of groupMap) {
        if (groupSites.length === 1) {
          addSiteMarker(groupSites[0], longdo, map, evtOver, evtOut);
        } else {
          addGroupMarker(groupName, groupSites, longdo, map, evtOver, evtOut);
        }
      }
      for (const site of noGroup) {
        addSiteMarker(site, longdo, map, evtOver, evtOut);
      }
    } else {
      // ─── Individual mode: แสดง site ทั้งหมด ───
      for (const site of sites) {
        addSiteMarker(site, longdo, map, evtOver, evtOut);
      }
    }
  };
  const renderMarkersRef = useRef(renderMarkers);
  renderMarkersRef.current = renderMarkers;

  /* ─── Map initialization (runs once) ─── */
  useEffect(() => {
    let cancelled = false;
    let overlayClickHandler: ((overlay: unknown) => void) | null = null;

    (async () => {
      console.log("🗺️ [Map] init useEffect START", { hasContainer: !!mapContainerRef.current });
      if (!mapContainerRef.current) return;
      await loadLongdoMap2D();
      console.log("🗺️ [Map] Longdo script loaded", { hasLongdo: !!window.longdo, cancelled });
      if (cancelled || !mapContainerRef.current || !window.longdo) return;

      const longdo = window.longdo;

      // สร้าง map ก่อน ไม่ต้องรอ provinces.geojson
      mapContainerRef.current.innerHTML = "";

      console.log("🗺️ [Map] creating longdo.Map instance...");
      const map = new longdo.Map({
        placeholder: mapContainerRef.current,
        location: { lon: 101.0, lat: 13.0 },   // ศูนย์กลางประเทศไทย
        zoom: MAP_MIN_ZOOM,
        ui: longdo.UiComponent?.None,
        language: longdo.Language?.THAI ?? "th",
        layer: longdo.Layers?.NORMAL ?? longdo.Layers?.NORMAL_EN,
        zoomRange: { min: MAP_MIN_ZOOM, max: MAP_MAX_ZOOM },
        input: true,
        smoothZoom: true,
      });

      console.log("🗺️ [Map] longdo.Map created successfully");
      try { map.Ui?.Crosshair?.visible?.(false); } catch { /* noop */ }
      mapRef.current = map;
      initializedRef.current = true;

      /* Click handler */
      overlayClickHandler = (overlay: unknown) => {
        const site = siteByOverlayRef.current.get(overlay);
        if (!site) return;
        // ถ้า zoom ต่ำกว่า threshold และ site ไม่มี code = group pin → zoom เข้า
        if (zoomLevelRef.current < GROUP_ZOOM_THRESHOLD && !site.code && !site.id) {
          try {
            (map as any).location({ lon: site.lng, lat: site.lat });
            (map as any).zoom(GROUP_ZOOM_THRESHOLD);
          } catch { /* noop */ }
        } else {
          onPinClick?.(site);
        }
      };

      /* Resolve Longdo event names — enum or string fallback */
      const EVT = (longdo as any).EventName ?? {};
      const evtOverlayClick = EVT.OverlayClick ?? EVT.overlayClick ?? "overlayClick";
      try { map.Event.bind(evtOverlayClick, overlayClickHandler); } catch (e) { console.warn("[Map] bind overlayClick failed", e); }

      // Bind zoom event เพื่อ re-render markers ตาม zoom level
      const evtZoom = EVT.Zoom ?? EVT.zoom ?? "zoom";
      try {
        map.Event.bind(evtZoom, () => {
          const z = Number((map as any).zoom?.() ?? MAP_MIN_ZOOM);
          zoomLevelRef.current = z;
          setZoomLevel(z);
        });
      } catch { /* noop */ }

      console.log("🗺️ [Map] init complete, setting mapReady=true");
      setMapReady(true);

      // โหลด provinces.geojson แบบ background (ไม่บล็อก map)
      try {
        const provincesGeo = await fetch("/data/provinces.geojson")
          .then((r) => r.json()) as FeatureCollection;
        if (!cancelled) {
          provincesRef.current = provincesGeo.features ?? [];
          drawProvinceOverlays();
          console.log("🗺️ [Map] provinces loaded", { count: provincesGeo?.features?.length });
        }
      } catch (e) {
        console.warn("🗺️ [Map] provinces.geojson load failed", e);
      }
    })().catch((err) => console.error("[Map] init failed", err));

    return () => {
      cancelled = true;
      const map = mapRef.current as {
        Event: { unbind: (e: string, h: unknown) => void };
      } | null;
      if (map) {
        try { if (overlayClickHandler) map.Event.unbind("overlayClick", overlayClickHandler); } catch { /* */ }
        try { if (overlayClickHandler) map.Event.unbind("OverlayClick", overlayClickHandler); } catch { /* */ }
      }
      try { clearAllMarkers(); clearProvinceOverlays(); } catch { /* noop */ }
      initializedRef.current = false;
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Re-render markers เมื่อ sitePoints / pinStatus / zoom เปลี่ยน ─── */
  useEffect(() => {
    if (!mapReady || !initializedRef.current) return;
    renderMarkersRef.current();
  }, [allSitePoints, pinStatusBySite, mapReady, zoomLevel]);

  /* ─── Focus เมื่อ site ถูกเลือกจาก dropdown ─── */
  useEffect(() => {
    if (!focusSiteCenter || !mapReady) return;
    const map = mapRef.current as {
      location: (l: { lon: number; lat: number }) => void;
      zoom: (z?: number) => number;
    } | null;
    if (!map) return;
    try {
      map.location({ lon: focusSiteCenter.lng, lat: focusSiteCenter.lat });
      map.zoom(14);
    } catch { /* noop */ }
    const matched = allSitePoints.find(
      (s) => s.lat === focusSiteCenter.lat && s.lng === focusSiteCenter.lng,
    );
    if (matched) onPinClick?.(matched);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSiteCenter, mapReady]);

  /* ─── Hover tooltip — ใช้ mousemove + distance-to-marker calculation ─── */
  useEffect(() => {
    const root = mapContainerRef.current;
    if (!root || !mapReady) return;

    const HOVER_RADIUS_PX = 24; // pixel radius รอบ marker ที่ถือว่า hover

    /** แปลง lat/lng → pixel position ใน map container
     *  ใช้ Longdo map.getPixel() ถ้ามี, ไม่งั้น fallback ด้วย mercator
     */
    const latLngToPixel = (lat: number, lng: number): { x: number; y: number } | null => {
      const map = mapRef.current as any;
      if (!map) return null;
      try {
        // Longdo API: map.location({ lon, lat }) คืน pixel? — ไม่มี direct method
        // ใช้ map.bound() + container size แปลงเอง
        const bound = map.bound?.() as { minLon: number; maxLon: number; minLat: number; maxLat: number } | undefined;
        if (!bound) return null;
        const rect = root.getBoundingClientRect();
        const W = rect.width;
        const H = rect.height;
        const x = ((lng - bound.minLon) / (bound.maxLon - bound.minLon)) * W;
        const y = ((bound.maxLat - lat) / (bound.maxLat - bound.minLat)) * H;
        return { x, y };
      } catch {
        return null;
      }
    };

    const handleMove = (e: MouseEvent) => {
      const rect = root.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let closest: { name: string; dist: number } | null = null;
      // ใช้ renderedMarkerLabelsRef เพื่อรวม group markers + site markers
      for (const m of renderedMarkerLabelsRef.current) {
        if (!m.lat || !m.lng) continue;
        const px = latLngToPixel(m.lat, m.lng);
        if (!px) continue;
        const dx = mx - px.x;
        const dy = my - (px.y - 20); // ชดเชยตำแหน่ง pin tip
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < HOVER_RADIUS_PX && (!closest || dist < closest.dist)) {
          closest = { name: m.name, dist };
        }
      }

      if (closest) {
        setPinTooltip({ visible: true, text: closest.name, left: mx, top: my - 32 });
      } else {
        setPinTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    };

    const handleLeave = () => setPinTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));

    root.addEventListener("mousemove", handleMove);
    root.addEventListener("mouseleave", handleLeave);
    return () => {
      root.removeEventListener("mousemove", handleMove);
      root.removeEventListener("mouseleave", handleLeave);
    };
  }, [mapReady]);

  /* ─── Zoom button style ─── */
  const zoomBtnStyle: CSSProperties = {
    width: 34,
    height: 34,
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 20,
    lineHeight: "32px",
    textAlign: "center" as const,
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    userSelect: "none" as const,
  };

  return (
    <div className="longdo-map-root relative">
      <style>{`
        .longdo-map-root .ldmap_center_mark,
        .longdo-map-root .ldmap-center-mark,
        .longdo-map-root [class*="center"][class*="mark"],
        .longdo-map-root [class*="crosshair"] {
          display: none !important;
        }
      `}</style>

      {/* Longdo map container */}
      <div
        ref={mapContainerRef}
        className="relative z-0 h-[760px] w-full overflow-hidden rounded-lg bg-[#dff1ff] md:h-[620px] sm:h-[480px]"
      />

      {/* Hover tooltip */}
      {pinTooltip.visible && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: pinTooltip.left,
            top: pinTooltip.top,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg whitespace-nowrap">
            {pinTooltip.text}
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute right-3 bottom-10 z-20 flex flex-col gap-1">
        <button
          type="button"
          title="Zoom in"
          style={zoomBtnStyle}
          onClick={() => {
            const map = mapRef.current as { zoom: (z?: number) => number } | null;
            if (!map) return;
            try { map.zoom(Math.min(Number(map.zoom?.() ?? MAP_MIN_ZOOM) + 1, MAP_MAX_ZOOM)); } catch { /* noop */ }
          }}
        >
          +
        </button>
        <button
          type="button"
          title="Zoom out"
          style={zoomBtnStyle}
          onClick={() => {
            const map = mapRef.current as { zoom: (z?: number) => number } | null;
            if (!map) return;
            try { map.zoom(Math.max(Number(map.zoom?.() ?? MAP_MIN_ZOOM) - 1, MAP_MIN_ZOOM)); } catch { /* noop */ }
          }}
        >
          −
        </button>
      </div>
    </div>
  );
}
