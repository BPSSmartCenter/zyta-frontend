// src/components/Map/Map.tsx

import { useEffect, useRef, useState } from "react";

import L, { type LeafletEvent } from "leaflet";

import { TH_BOUNDS } from "../Dashboard/dashboard.constants";

import { useTranslation } from "react-i18next";

import type { Props, ViewState } from "./MapTypes";

import {
  responsivePadding,
  extractRingsLatLng,
} from "./MapUtils";

import {
  EDGE,
  styleProvinceDefault,
  styleProvinceHover,
  provinceDefaultStyleFor,
} from "./MapStyles";

import { renderMarkers } from "./MapMarkers";

import LongdoMap3D, { preloadLongdoMap3 } from "./LongdoMap3D";

export default function Map({
  notis,

  aggregateBySite = true,

  severityFilter,

  focusProvince,
  focusSiteCenter,

  onProvinceChange,
  lockZoomOut = false,
  sitePoints,
}: Props) {
  const { t, i18n } = useTranslation(["dashboard"]);

  const mapRef = useRef<L.Map | null>(null);

  const tileRef = useRef<L.TileLayer | null>(null);

  const thLayerRef = useRef<L.GeoJSON<any> | null>(null);

  const provincesLayerRef = useRef<L.GeoJSON<any> | null>(null);

  const districtsLayerRef = useRef<L.GeoJSON<any> | null>(null);

  const subdistrictsLayerRef = useRef<L.GeoJSON<any> | null>(null);

  const dimRendererRef = useRef<L.SVG | null>(null);

  const maskLayerRef = useRef<L.Polygon | null>(null);

  const innerShadeRef = useRef<L.Polygon | null>(null);

  const thRingsRef = useRef<L.LatLngExpression[][]>([]);

  const provinceCentersRef = useRef<Record<string, L.LatLngLiteral>>({});
  const provinceBoundsRef = useRef<
    Record<string, { center: { lat: number; lng: number } }>
  >({});

  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const viewStackRef = useRef<ViewState[]>([]);
  const currentLevelRef = useRef<ViewState["level"]>("country");
  // Guard to avoid resetting view on container resize
  const resizingGuardRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [canZoomOut, setCanZoomOut] = useState(false);
  const [province3DActive, setProvince3DActive] = useState(false);
  const [longdoReady, setLongdoReady] = useState(false);

  const zoomOutWrapRef = useRef<HTMLDivElement | null>(null);

  const provinceVariantRef = useRef<"strong" | "dim">("strong");

  const isDrillingRef = useRef(false);

  const prevFocusRef = useRef<string | null>(null);
  const prevSiteCenterRef = useRef<{ lat: number; lng: number } | null | undefined>(undefined);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [countryLoaded, setCountryLoaded] = useState(false);
  const [provincesLoaded, setProvincesLoaded] = useState(false);
  const [markersReady, setMarkersReady] = useState(false);
  const fitRetryRef = useRef(0);
  const zoomAnimatingRef = useRef(false);
  const countryMinZoomRef = useRef(2);
  // Saved initial country view — used to restore the exact same view every time
  const savedCountryViewRef = useRef<{ center: L.LatLngLiteral; zoom: number } | null>(null);
  const provinceTransitionTokenRef = useRef(0);
  const pendingMoveEndHandlersRef = useRef<
    Array<(ev?: LeafletEvent) => void>
  >([]);

  const focusProvinceKey =
    focusProvince && String(focusProvince).toLowerCase() !== "all"
      ? focusProvince
      : null;

  const shouldShowLongdo = Boolean(focusProvinceKey) && province3DActive;
  const isProvince3DView = shouldShowLongdo && longdoReady;

  const beginZoomAnimation = () => {
    if (zoomAnimatingRef.current) return false;
    zoomAnimatingRef.current = true;
    return true;
  };

  const endZoomAnimation = () => {
    zoomAnimatingRef.current = false;
  };

  // rings ที่ active อยู่ (ใช้กู้คืนตอน zoom out จากหมุด)

  const activeRingsRef = useRef<L.LatLngExpression[][] | null>(null);

  // จำว่าถอดชั้นไหนออกตอนซูมเข้าหมุด

  const removedOnPinRef = useRef({
    provinces: false,

    districts: false,

    subdistricts: false,
  });

  const initialResetDoneRef = useRef(false);

  const maskBlockEvents = [
    "click",

    "dblclick",

    "mousedown",

    "mouseup",

    "contextmenu",

    "touchstart",

    "touchmove",

    "touchend",
  ] as const;

  const swallowMaskEvent = (ev: LeafletEvent) => {
    const original: any = (ev as any)?.originalEvent;

    if (!original) return;

    if (typeof original.preventDefault === "function") {
      original.preventDefault();
    }

    if (typeof original.stopPropagation === "function") {
      original.stopPropagation();
    }

    if (typeof original.stopImmediatePropagation === "function") {
      original.stopImmediatePropagation();
    }
  };

  const enableMaskGuards = (layer: L.Polygon) => {
    maskBlockEvents.forEach((evt) =>
      layer.on(evt as any, swallowMaskEvent as any)
    );
  };
  // ===== helpers: แสดง/ซ่อน pane ของ overlay =====

  const setDimPaneVisible = (visible: boolean) => {
    const p = mapRef.current?.getPane("dimPane");

    if (p) p.style.display = visible ? "" : "none";
  };

  const setShadePaneVisible = (visible: boolean) => {
    const p = mapRef.current?.getPane("shadeUnder");

    if (p) p.style.display = visible ? "" : "none";
  };

  const detachRegionLayersForPinView = () => {
    const map = mapRef.current;

    if (!map) return;

    removedOnPinRef.current = {
      provinces: false,

      districts: false,

      subdistricts: false,
    };

    if (provincesLayerRef.current && map.hasLayer(provincesLayerRef.current)) {
      provincesLayerRef.current.removeFrom(map);

      removedOnPinRef.current.provinces = true;
    }

    if (districtsLayerRef.current && map.hasLayer(districtsLayerRef.current)) {
      districtsLayerRef.current.removeFrom(map);

      removedOnPinRef.current.districts = true;
    }

    if (
      subdistrictsLayerRef.current &&
      map.hasLayer(subdistrictsLayerRef.current)
    ) {
      subdistrictsLayerRef.current.removeFrom(map);

      removedOnPinRef.current.subdistricts = true;
    }
  };

  const reattachRegionLayersAfterPinView = () => {
    const map = mapRef.current;

    if (!map) return;

    // Always ensure layers exist on map if ref exists, regardless of flags
    if (provincesLayerRef.current && !map.hasLayer(provincesLayerRef.current)) {
      provincesLayerRef.current.addTo(map);
    }
    if (districtsLayerRef.current && !map.hasLayer(districtsLayerRef.current)) {
      districtsLayerRef.current.addTo(map);
    }
    if (subdistrictsLayerRef.current && !map.hasLayer(subdistrictsLayerRef.current)) {
      subdistrictsLayerRef.current.addTo(map);
    }

    removedOnPinRef.current = {
      provinces: false,

      districts: false,

      subdistricts: false,
    };

    setProvincesVariant(provinceVariantRef.current);
  };
  const hideLayerFromMap = (layer: L.Layer | null) => {
    const map = mapRef.current;
    if (!map || !layer) return;
    if (map.hasLayer(layer)) layer.removeFrom(map);
    else
      try {
        (layer as any).remove?.();
        } catch {}
      };

  const hideSubdistrictsLayer = () =>
    hideLayerFromMap(subdistrictsLayerRef.current);

  const registerMoveEndHandler = (cb: () => void) => {
    const map = mapRef.current;
    if (!map) return;
    const handler = () => {
      pendingMoveEndHandlersRef.current =
        pendingMoveEndHandlersRef.current.filter((h) => h !== handler);
      cb();
    };
    pendingMoveEndHandlersRef.current.push(handler);
    map.once("moveend", handler);
  };

  const cancelPendingMoveEndHandlers = () => {
    const map = mapRef.current;
    const handlers = pendingMoveEndHandlersRef.current;
    pendingMoveEndHandlersRef.current = [];
    if (!map) return;
    handlers.forEach((handler) => {
      map.off("moveend", handler);
    });
  };

  const BASE_HEIGHT_PX = 680;

  const lockContainerBox = () => {
    const m = mapRef.current;

    if (!m) return;

    const el = m.getContainer() as HTMLDivElement;

    const currentHeight = el.getBoundingClientRect().height || 0;

    if (currentHeight <= 0) {
      el.style.height = `${BASE_HEIGHT_PX}px`;
      el.style.minHeight = `${BASE_HEIGHT_PX}px`;
      el.style.maxHeight = `${BASE_HEIGHT_PX}px`;
    }

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

      .leaflet-tooltip.province-label {

        background: #ffffff;

        border: 1px solid rgba(15,23,42,0.08);

        box-shadow: 0 2px 8px rgba(15,23,42,0.12);

        color: #0f172a;

        font-weight: 600;

        font-size: 12px;

        line-height: 1.2;

        padding: 6px 8px;

        border-radius: 8px;

        pointer-events: none;

        white-space: nowrap;

      }

    `;

    document.head.appendChild(style);
  };

  // Keep map view stable on container resize (e.g., sidebar toggle)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const el = map.getContainer();
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      try {
        const center = map.getCenter();
        const zoom = map.getZoom();
        resizingGuardRef.current = true;
        map.invalidateSize(false);
        map.setView(center, zoom, { animate: false });
      } catch {
      } finally {
        // release guard in next task
        setTimeout(() => (resizingGuardRef.current = false), 0);
      }
    });
    ro.observe(el);
    return () => {
      try { ro.disconnect(); } catch {}
    };
  }, []);

  // Preload Longdo Map script early to reduce 3D swap latency
  useEffect(() => {
    preloadLongdoMap3().catch(() => undefined);
  }, []);

  const fitThailandTight = (animate = false, retry = 0) => {
    const map = mapRef.current;
    if (!map) return;

    lockContainerBox();
    map.invalidateSize(false);

    const sz = map.getSize();
    if ((sz.x === 0 || sz.y === 0) && retry < 10) {
      fitRetryRef.current = retry + 1;
      setTimeout(() => fitThailandTight(animate, retry + 1), 80);
      return;
    }
    fitRetryRef.current = 0;

    // If we have a saved country view, restore it exactly.
    // This avoids fitBounds computing a slightly different zoom each time.
    const saved = savedCountryViewRef.current;
    if (saved) {
      map.setMinZoom(Math.max(5, saved.zoom - 0.05));
      map.setMaxZoom(19);
      countryMinZoomRef.current = Math.max(5, saved.zoom - 0.05);
      if (animate) {
        map.flyTo([saved.center.lat, saved.center.lng], saved.zoom, {
          animate: true,
          duration: 0.6,
        });
      } else {
        map.setView([saved.center.lat, saved.center.lng], saved.zoom, {
          animate: false,
        });
      }
      return;
    }

    // First call — compute and save the initial view.
    const vw = typeof window !== "undefined" ? window.innerWidth : sz.x;
    const pad = responsivePadding(sz.x, sz.y, vw);

    // Use fitBounds non-animated to compute the exact target view.
    map.setMinZoom(2);
    map.setMaxZoom(19);
    map.fitBounds(TH_BOUNDS as any, {
      animate: false,
      paddingTopLeft: [pad.x, pad.y],
      paddingBottomRight: [pad.x, pad.y],
    });

    // Read the settled zoom and center and save them permanently.
    const settledZoom = map.getZoom();
    const settledCenter = map.getCenter();
    savedCountryViewRef.current = {
      center: { lat: settledCenter.lat, lng: settledCenter.lng },
      zoom: settledZoom,
    };
    const countryMinZoom = Math.max(5, settledZoom - 0.05);
    countryMinZoomRef.current = countryMinZoom;
    map.setMinZoom(countryMinZoom);
  };

  const setMaskByRings = (rings: L.LatLngExpression[][] | null) => {
    const map = mapRef.current;

    if (!map) return;

    const sanitizeRings = (rs: L.LatLngExpression[][] | null | undefined) => {
      if (!rs || rs.length === 0) return null;
      const cleaned = rs.filter(
        (ring) => Array.isArray(ring) && (ring as any).length >= 3
      );
      return cleaned.length > 0 ? cleaned : null;
    };

    const safeRings = sanitizeRings(rings);
    const fallback = sanitizeRings(thRingsRef.current) ?? null;

    activeRingsRef.current =
      safeRings && safeRings.length > 0 ? safeRings : (fallback ?? []);

    if (maskLayerRef.current) {
      map.removeLayer(maskLayerRef.current);

      maskLayerRef.current = null;
    }

    if (safeRings && safeRings.length > 0 && dimRendererRef.current) {
      // The mask is a polygon with holes: outer ring covers everything,
      // inner rings (Thailand borders) cut holes to show the map.
      // Use a large fixed boundary at a reasonable scale to avoid excessive
      // pixel calculations while still covering the viewport at all zoom levels.
      const worldRing: L.LatLngExpression[] = [
        [-30, 60],    // SW - large enough to cover viewport
        [45, 60],     // NW
        [45, 140],    // NE
        [-30, 140],   // SE
        [-30, 60],    // close the ring
      ];

      maskLayerRef.current = L.polygon([worldRing, ...safeRings], {
        pane: "dimPane",

        renderer: dimRendererRef.current,

        stroke: true,

        color: "#000000",

        weight: 2,

        opacity: 0.5,

        fill: true,

        fillColor: "#D3F7FF",

        fillOpacity: 1,

        interactive: true,

        smoothFactor: 2.0,

        className: "mask-area",
      }).addTo(map);

      enableMaskGuards(maskLayerRef.current);
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

      fillOpacity: 0.5,

      interactive: false,
    }).addTo(map);
  };

  const pushView = (state: ViewState) => {
    const stack = viewStackRef.current;
    const prev = stack[stack.length - 1];
    if (
      prev &&
      prev.level === state.level &&
      prev.maxZoom === state.maxZoom &&
      prev.padding?.[0] === state.padding?.[0] &&
      prev.padding?.[1] === state.padding?.[1] &&
      JSON.stringify(prev.bounds) === JSON.stringify(state.bounds)
    ) {
      return;
    }
    stack.push(state);
    currentLevelRef.current = state.level;

    setCanZoomOut(viewStackRef.current.length > 0);
  };

  const popView = (): ViewState | undefined => {
    const v = viewStackRef.current.pop();

    setCanZoomOut(viewStackRef.current.length > 0);

    return v;
  };

  function isAtProvinceView() {
    const st = viewStackRef.current;
    if (!st || st.length !== 1) return false;
    const top = st[st.length - 1];
    return top?.level === "country";
  }

  function setProvincesVariant(variant: "strong" | "dim") {
    provinceVariantRef.current = variant;
    const g = provincesLayerRef.current;
    if (!g) return;

    // ✅ ไล่ทุกฟีเจอร์แบบ object ไม่ใช้ callback
    g.eachLayer((ly: any) => {
      const f = ly?.feature;
      (ly as L.Path).setStyle(provinceDefaultStyleFor(f, variant));
    });
  }

  function resetToCountry(animate = true) {
    void animate;  // Kept for API compatibility but not currently used
    const map = mapRef.current;

    if (!map || !countryLoaded) return;
    cancelPendingMoveEndHandlers();
    try {
      map.stop?.();
    } catch {}

    // FORCE clear the view stack immediately
    viewStackRef.current = [];
    currentLevelRef.current = "country";

    setCanZoomOut(false);
    setProvince3DActive(false);
    setLongdoReady(false);

    // Relax zoom constraints enough for the fly animation to reach the
    // saved country zoom.  fitThailandTight will re-clamp immediately.
    const saved = savedCountryViewRef.current;
    try {
      map.setMinZoom(Math.max(4, (saved?.zoom ?? 5) - 1));
      map.setMaxZoom(19);
    } catch {
      map.setMinZoom(4);
      map.setMaxZoom(19);
    }

    // ใส่ชั้นพื้นที่กลับมาก่อนเสมอ

    reattachRegionLayersAfterPinView();

    if (districtsLayerRef.current) {
      map.removeLayer(districtsLayerRef.current);

      districtsLayerRef.current = null;
    }

    if (subdistrictsLayerRef.current) {
      map.removeLayer(subdistrictsLayerRef.current);

      subdistrictsLayerRef.current = null;
    }

    // แสดง pane overlay กลับมาก่อน แล้วค่อยตั้งค่า

    setDimPaneVisible(true);

    setShadePaneVisible(false);

    // CRITICAL: Reset mask to Thailand rings BEFORE any view changes
    setMaskByRings(thRingsRef.current);

    setInnerShade(true);

    isDrillingRef.current = false;

    setProvincesVariant("strong");

    // FORCE instant jump to saved position first, THEN animate if requested.    // This eliminates any drift from flyTo/flyToBounds computation errors.
    if (saved) {
      map.setView([saved.center.lat, saved.center.lng], saved.zoom, {
        animate: false,
      });
      const minZ = Math.max(5, saved.zoom - 0.05);
      map.setMinZoom(minZ);
      countryMinZoomRef.current = minZ;
      endZoomAnimation();
    } else {
      // No saved view yet — compute and save it now
      fitThailandTight(false);
      endZoomAnimation();
    }
  }

  const zoomOut = () => {
    const map = mapRef.current;

    if (!map) return;
    if (!beginZoomAnimation()) return;
    cancelPendingMoveEndHandlers();
    try {
      map.stop?.();
    } catch {}

    if (lockZoomOut && isAtProvinceView()) {
      endZoomAnimation();
      return;
    }

    const prev = popView();
    currentLevelRef.current = prev?.level ?? "country";

    // หมด stack → กลับประเทศ + sync dropdown + ปิด tooltip

    if (!prev) {
      resetToCountry(true);

      onProvinceChange?.("all");

      map.closeTooltip?.();

      return;
    }

    // ใส่ชั้นที่เคยถอดตอน zoom-to-pin กลับมาก่อน

    reattachRegionLayersAfterPinView();

    // ถ้า view ก่อนหน้าเป็น country → กลับประเทศทันที (คลิกเดียว)

    if (prev.level === "country") {
      resetToCountry(true);

      onProvinceChange?.("all"); // ให้ MapPanel ตั้ง All Location + remount

      map.closeTooltip?.(); // ปิด tooltip ที่ค้าง

      return;
    }

    // จัดการชั้น overlay ให้ตรงกับ level ที่เหลือใน stack (เป้าหมายหลังซูมออก)
    const targetLevel = prev.level ?? "country";
    if (targetLevel === "province") {
      // กลับมาโฟกัสจังหวัด → เอาตำบลออก แต่เก็บชั้นอำเภอไว้
      hideSubdistrictsLayer();
      const districtsLayer = districtsLayerRef.current;
      if (districtsLayer && map && !map.hasLayer(districtsLayer)) {
        districtsLayer.addTo(map);
      }
      currentLevelRef.current = "province";
    } else if (targetLevel === "district") {
      // ยังอยู่ระดับตำบล → ให้แน่ใจว่าชั้นตำบลกลับมาแสดง
      const subLayer = subdistrictsLayerRef.current;
      if (subLayer && map && !map.hasLayer(subLayer)) {
        subLayer.addTo(map);
      }
      currentLevelRef.current = "district";
    } else {
      // target เป็น null หรือระดับอื่น → ถอดตำบลออกเผื่อค้าง
      hideSubdistrictsLayer();
      currentLevelRef.current = targetLevel;
    }

    // ที่เหลือคือเคสซูมลึกจากหมุด ⇒ กู้ overlay ตาม rings เดิม

    const ringsToUse: L.LatLngExpression[][] =
      prev.rings && (prev.rings as L.LatLngExpression[][]).length > 0
        ? (prev.rings as L.LatLngExpression[][])
        : thRingsRef.current;

    setDimPaneVisible(true);

    const isCountry = ringsToUse === thRingsRef.current;

    setShadePaneVisible(isCountry);

    setMaskByRings(ringsToUse);

    setInnerShade(isCountry);

    // CRITICAL FIX: If restoring to country view (Thailand rings), use the
    // exact saved country view instead of flyToBounds which causes drift.
    if (isCountry && savedCountryViewRef.current) {
      const saved = savedCountryViewRef.current;
      map.setView([saved.center.lat, saved.center.lng], saved.zoom, {
        animate: false,
      });
      const minZ = Math.max(5, saved.zoom - 0.05);
      map.setMinZoom(minZ);
      countryMinZoomRef.current = minZ;
      endZoomAnimation();
      return;
    }

    // For non-country views, use exact center/zoom if available, otherwise
    // fall back to flyToBounds (which may cause minor drift for deep zooms).
    if (prev.center && prev.zoom !== undefined) {
      map.flyTo([prev.center.lat, prev.center.lng], prev.zoom, {
        animate: true,
        duration: 0.6,
      });
      registerMoveEndHandler(() => {
        endZoomAnimation();
      });
    } else {
      // Legacy fallback for views saved without center/zoom
      map.flyToBounds(L.latLngBounds(prev.bounds), {
        animate: true,
        padding: prev.padding ?? [12, 12],
        maxZoom: prev.maxZoom ?? 19,
        duration: 0.6,
      });
      registerMoveEndHandler(() => {
        endZoomAnimation();
      });
    }
  };

  /** ซูมไปยังพิกัดหมุดให้ชัดที่สุด + เอา overlay ออกชั่วคราว (ซ่อน pane + ถอดชั้นพื้นที่) */

  const zoomToLatLng = (ll: L.LatLngExpression) => {
    const map = mapRef.current;

    if (!map) return;
    if (!beginZoomAnimation()) return;

    // เก็บสภาพก่อนซูม (รวม rings, center, zoom เดิมเพื่อกู้คืนแบบแม่นยำ)
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    pushView({
      bounds: map.getBounds() as unknown as L.LatLngBoundsLiteral,
      center: { lat: currentCenter.lat, lng: currentCenter.lng },
      zoom: currentZoom,
      padding: [12, 12],

      maxZoom: map.getMaxZoom() ?? 19,

      level: "district",

      rings: activeRingsRef.current ?? thRingsRef.current,
    });

    // ปิด overlay แบบชัวร์

    setMaskByRings(null);

    setInnerShade(false);

    setDimPaneVisible(false);

    setShadePaneVisible(false);

    // ถอดชั้นพื้นที่ออก (กัน overlay บัง)

    detachRegionLayersForPinView();

    const targetZoom = Math.min(18, map.getMaxZoom() ?? 19);

    map.flyTo(ll as any, targetZoom, { animate: true, duration: 0.6 });
    registerMoveEndHandler(() => {
      endZoomAnimation();
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

      // Use a slightly padded version of TH_BOUNDS for maxBounds so
      // fitBounds animation doesn't get clamped, but still prevents
      // panning far outside Thailand.
      maxBounds: [
        [4.0, 95.5],   // SW — ~1.5° buffer
        [22.5, 109.0],  // NE — ~1.5° buffer
      ],

      maxBoundsViscosity: 1.0,

      inertia: false,

      worldCopyJump: false,
    });

    mapRef.current = map;
    setMapReady(true);

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

    map.getPane("shadeUnder")!.style.zIndex = "300";

    map.createPane("dimPane");

    map.getPane("dimPane")!.style.zIndex = "450";

    map.getPane("dimPane")!.style.pointerEvents = "auto";

    dimRendererRef.current = L.svg({ pane: "dimPane" }).addTo(map);

    map.createPane("provinceLabels");

    map.getPane("provinceLabels")!.style.zIndex = "660";

    map.getPane("provinceLabels")!.style.pointerEvents = "none";

    map.createPane("markersPane");

    map.getPane("markersPane")!.style.zIndex = "700";

    map.createPane("markerLabels");

    map.getPane("markerLabels")!.style.zIndex = "720";

    map.getPane("markerLabels")!.style.pointerEvents = "none";

    // โหลดขอบประเทศ
    const abortCountry = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/thailand.geojson", {
          signal: abortCountry.signal,
        });
        if (!res.ok) throw new Error("failed to load thailand.geojson");
        const geojson = await res.json();
        if (cancelled) return;

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
        setCountryLoaded(true);
        setGeoError(null);

        if (!initialResetDoneRef.current) {
          initialResetDoneRef.current = true;

          resetToCountry(true);
        }
      } catch (err) {
        if (abortCountry.signal.aborted || cancelled) return;
        // console.error("[Map] cannot load thailand.geojson", err);
        setGeoError("country");
      }
    })();

    markersLayerRef.current = L.layerGroup().addTo(map);
    setMarkersReady(true);

    // ปุ่ม Zoom out

    const ZoomOutControl = L.Control.extend({
      options: { position: "topleft" as L.ControlPosition },

      onAdd: () => {
        const wrap = L.DomUtil.create("div", "leaflet-bar");

        wrap.style.display = "none";

        const btn = L.DomUtil.create("button", "", wrap);

        btn.style.padding = "6px 10px";

        btn.style.background = "#ffffffff";

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

    // คลิกหมุด => ซูม + ซ่อน overlay + ถอดชั้นพื้นที่

    const onLayerAdd = (ev: any) => {
      const layer = ev?.layer;

      if (
        layer &&
        (layer instanceof L.Marker || (layer.getLatLng && layer.on))
      ) {
        if (!(layer as any).__zoomToPinBound) {
          (layer as any).__zoomToPinBound = true;

          layer.on("click", () => {
            try {
              const ll = layer.getLatLng();

              if (ll) zoomToLatLng(ll);
            } catch {}
          });
        }
      }
    };

    map.on("layeradd", onLayerAdd);

    return () => {
      cancelled = true;
      abortCountry.abort();
      map.off("layeradd", onLayerAdd);

      map.remove();

      mapRef.current = null;
      setMapReady(false);
      setMarkersReady(false);
      setCountryLoaded(false);
      setProvincesLoaded(false);
      setGeoError(null);
    };
  }, []);

  // แสดง/ซ่อนปุ่ม Zoom out

  useEffect(() => {
    const el = zoomOutWrapRef.current;

    if (!el) return;

    el.style.display = canZoomOut && !lockZoomOut ? "block" : "none";
  }, [canZoomOut, lockZoomOut]);

  /** ---------- provinces layer + labels ---------- */

  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    if (provincesLayerRef.current) return;

    const abortProvinces = new AbortController();
    (async () => {
      try {
        const res = await fetch("/data/provinces.geojson", {
          signal: abortProvinces.signal,
        });
        if (!res.ok) throw new Error("failed to load provinces");
        const provinces = await res.json();
        const layer = L.geoJSON(provinces, {
          style: styleProvinceDefault,

          onEachFeature: (feature, layer) => {
            const nameTH = feature?.properties?.pro_th as string | undefined;

            const nameEN = feature?.properties?.pro_en as string | undefined;

            if (nameTH) {
              const c = (layer as any).getBounds().getCenter();

              provinceCentersRef.current[nameTH] = { lat: c.lat, lng: c.lng };

              provinceBoundsRef.current[nameTH] = {
                center: { lat: c.lat, lng: c.lng },
              };

              if (nameEN)
                provinceCentersRef.current[nameEN] = { lat: c.lat, lng: c.lng };

              if (nameEN)
                provinceBoundsRef.current[nameEN] = {
                  center: { lat: c.lat, lng: c.lng },
                };
            }

            (layer as L.Path).bindTooltip(nameTH ?? nameEN ?? "", {
              direction: "top",

              sticky: true,

              offset: L.point(0, -12),

              className: "province-label",

              pane: "provinceLabels",
            });

            layer.on("mouseover", () => {
              if (isDrillingRef.current) return;
              (layer as L.Path).setStyle(styleProvinceHover);
              (layer as any).openTooltip?.();
            });

            layer.on("mouseout", () => {
              (layer as L.Path).setStyle(
                provinceDefaultStyleFor(feature, provinceVariantRef.current)
              );

              (layer as any).closeTooltip?.();
            });

            // คลิกจังหวัด → แจ้ง parent (จะมี transition ซูมเข้าใน useEffect ด้านล่าง)
            layer.on("click", () => {
              if (zoomAnimatingRef.current) return;
              onProvinceChange?.(nameTH || nameEN || "all");
            });
          },
        }).addTo(map);

        provincesLayerRef.current = layer;
        setProvincesLoaded(true);
        setGeoError(null);

        // ไม่ auto-drilldown ใน Leaflet แล้ว; province selection จะไป Longdo 3D ผ่าน state ของ MapPanel

        // render markers ครั้งแรก

        renderMarkers(
          map,

          markersLayerRef.current,

          notis,

          aggregateBySite,

          severityFilter,

          provinceCentersRef.current,

          sitePoints,

          undefined,

          t
        );

        // ผูก click กับหมุดที่ถูกสร้างก่อนหน้า (กัน timing)

        try {
          markersLayerRef.current?.eachLayer((ly: any) => {
            if (ly && (ly instanceof L.Marker || (ly.getLatLng && ly.on))) {
              if (!(ly as any).__zoomToPinBound) {
                (ly as any).__zoomToPinBound = true;

                ly.on("click", () => {
                  try {
                    const ll = ly.getLatLng();

                    if (ll) zoomToLatLng(ll);
                  } catch {}
                });
              }
            }
          });
        } catch {}
      } catch (err) {
        if (abortProvinces.signal.aborted) return;
        // console.error("[Map] cannot load provinces.geojson", err);
        setGeoError("provinces");
      }
    })();
    return () => {
      abortProvinces.abort();
    };
  }, [notis, aggregateBySite, severityFilter, t, i18n.language]);

  // อัปเดตหมุดทุกครั้งที่ข้อมูล/ตัวกรองเปลี่ยน

  useEffect(() => {
    const map = mapRef.current;

    const grp = markersLayerRef.current;

    if (!map || !grp || !markersReady) return;

    try {
      grp.clearLayers();
    } catch {}

    renderMarkers(
      map,

      grp,

      notis,

      aggregateBySite,

      severityFilter,

      provinceCentersRef.current,

      sitePoints,

      undefined,

      t
    );
  }, [notis, aggregateBySite, severityFilter, sitePoints, t, i18n.language, markersReady]);

  // Hide mask/dim layers only when 3D view is fully ready
  useEffect(() => {
    if (province3DActive && longdoReady) {
      setDimPaneVisible(false);
      setShadePaneVisible(false);
    }
  }, [province3DActive, longdoReady]);

  // โฟกัสจังหวัดจาก dropdown (null = ทุกพื้นที่)
  // - เริ่ม: ใช้ Leaflet zoom แบบช้า + mask ให้เหลือเฉพาะจังหวัด
  // - แล้วค่อยสลับไป Longdo 3D แบบล็อก (zoom 15.7, ห้ามลาก/หมุน/ใช้ tools)

  useEffect(() => {
    const map = mapRef.current;
    const provincesLayer = provincesLayerRef.current;
    const transitionToken = ++provinceTransitionTokenRef.current;

    prevFocusRef.current = focusProvinceKey ?? null;
    setProvince3DActive(false);
    setLongdoReady(false);

    // ถ้ายังมี focusSiteCenter อยู่ ให้ข้ามการ drilldown จังหวัด
    if (focusSiteCenter) return;

    // กลับ All → reset อย่างเดิม
    if (!focusProvinceKey) {
      if (map) resetToCountry(true);
      return;
    }

    if (!map || !provincesLayer) return;

    // หา layer ของจังหวัดที่เลือก
    let matched: any | null = null;
    provincesLayer.eachLayer((ly: any) => {
      const p = ly?.feature?.properties || {};
      const th: string = p.pro_th || "";
      const en: string = p.pro_en || "";
      if (th === focusProvinceKey || en === focusProvinceKey) matched = ly;
    });

    if (!matched) return;

    // เตรียม overlay ให้แสดงเฉพาะจังหวัด
    try {
      cancelPendingMoveEndHandlers();
      map.stop?.();
    } catch {}

    const feature = matched?.feature;
    const ringsProv = feature ? extractRingsLatLng((feature as any).geometry) : null;

    setInnerShade(false);
    setShadePaneVisible(false);
    setDimPaneVisible(true);
    setMaskByRings(ringsProv);
    if (maskLayerRef.current) {
      maskLayerRef.current.setStyle({
        fillOpacity: 1,
        opacity: 0.35,
        weight: 1.5,
      });
    }

    // แอนิเมชันซูมเข้าช้าๆ ไปที่จังหวัด (บังคับ zoom-in เท่านั้น)
    const center = (matched as any).getBounds?.().getCenter?.();
    const target = center
      ? ({ lat: center.lat, lng: center.lng } as { lat: number; lng: number })
      : provinceCentersRef.current[focusProvinceKey] ??
        ({ lat: 13.736717, lng: 100.523186 } as { lat: number; lng: number });

    const bounds = (matched as any).getBounds?.() as L.LatLngBounds | undefined;

    // Start animation flag
    if (!beginZoomAnimation()) return;

    const currentZoom = map.getZoom();
    const zoomFloor = currentZoom + 0.8;
    let targetZoom = 11.5;

    if (bounds && bounds.isValid()) {
      const fitZoom = map.getBoundsZoom(bounds, false, L.point(32, 32));
      targetZoom = Math.min(11.5, Math.max(zoomFloor, fitZoom));
    } else {
      targetZoom = Math.min(11.5, Math.max(zoomFloor, 10.5));
    }

    map.flyTo([target.lat, target.lng] as any, targetZoom as any, {
      animate: true,
      duration: 0.9,
      easeLinearity: 0.25,
    } as any);

    registerMoveEndHandler(() => {
      if (provinceTransitionTokenRef.current !== transitionToken) return;
      endZoomAnimation();
      setProvince3DActive(true);
    });
  }, [focusProvinceKey, focusSiteCenter, mapReady, provincesLoaded]);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    if (isProvince3DView) {
      if (!lockZoomOut) onProvinceChange?.("all");
      return;
    }

    if (!(lockZoomOut && isAtProvinceView())) zoomOut();
  };

  useEffect(() => {
    if (!mapReady || !focusSiteCenter) return;
    // ใช้ zoomToLatLng เพื่อให้พฤติกรรมเหมือนคลิกที่ marker:
    // - ถอดชั้นจังหวัด/อำเภอ/ตำบล
    // - ปิด dim/mask ตามตรรกะเดิม
    const ll = L.latLng(focusSiteCenter.lat, focusSiteCenter.lng);
    zoomToLatLng(ll);
  }, [focusSiteCenter, mapReady]);

  // เมื่อยกเลิก focusSiteCenter (เช่น เลือก "ทั้งหมด") ให้กู้คืนชั้น overlay กลับเป็นมุมมองประเทศเสมอ
  // Only fire when transitioning FROM a real center TO null — not on initial mount.
  useEffect(() => {
    const prev = prevSiteCenterRef.current;
    prevSiteCenterRef.current = focusSiteCenter ?? null;

    if (!mapReady) return;
    if (focusSiteCenter) return;
    // Skip on initial mount (prev is undefined) or when there was no previous center
    if (prev === undefined || prev === null) return;
    // Skip auto-reset while resizing
    if (resizingGuardRef.current) return;
    resetToCountry(true);
  }, [focusSiteCenter, mapReady]);

  /* lockZoomOut -> minZoom guard */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lockZoomOut) {
      // prevent zooming out below current zoom
      map.setMinZoom(map.getZoom());
      return;
    }
    // restore country min zoom when lock is removed
    map.setMinZoom(countryMinZoomRef.current);
    map.setMaxZoom(19);
  }, [lockZoomOut, mapReady]);

  const isLoading = !geoError && (!countryLoaded || !provincesLoaded);

  const longdoCenter =
    (focusProvinceKey && provinceBoundsRef.current[focusProvinceKey]?.center) ||
    (focusProvinceKey && provinceCentersRef.current[focusProvinceKey]) ||
    ({ lat: 13.736717, lng: 100.523186 } as { lat: number; lng: number });

  return (
    <div className="relative">
      <div
        id="th-map"
        className={
          "relative z-0 h-[680px] w-full rounded-lg bg-gray-200 md:h-[560px] sm:h-[440px] transition-opacity duration-500" +
          (isProvince3DView ? " opacity-0 pointer-events-none" : "")
        }
        onContextMenu={onContextMenu}
        aria-busy={isLoading ? "true" : "false"}
      />

      {shouldShowLongdo && (
        <div
          className={
            "absolute inset-0 z-10 h-[680px] w-full rounded-lg md:h-[560px] sm:h-[440px] transition-opacity duration-500" +
            (longdoReady ? " opacity-100" : " opacity-0 pointer-events-none")
          }
          onContextMenu={onContextMenu}
        >
          <LongdoMap3D
            center={longdoCenter}
            zoom={15.7}
            pitch={45}
            interactive={false}
            onReady={() => setLongdoReady(true)}
          />

          {!lockZoomOut && longdoReady && (
            <div className="absolute left-3 top-3 z-20">
              <div className="leaflet-bar">
                <button
                  type="button"
                  title="Zoom out"
                  onClick={() => onProvinceChange?.("all")}
                  style={{
                    padding: "6px 10px",
                    background: "#ffffffff",
                    border: "1px solid #ddd",
                    cursor: "pointer",
                  }}
                >
                  Zoom out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {(isLoading || geoError) && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 text-sm text-slate-600"
          aria-live="polite"
        >
          {geoError
            ? t("map.loadError", {
                defaultValue: "โหลดชั้นแผนที่ไม่สำเร็จ โปรดลองรีเฟรช",
              })
            : t("map.loading", { defaultValue: "กำลังโหลดแผนที่..." })}
        </div>
      )}
    </div>
  );
}
