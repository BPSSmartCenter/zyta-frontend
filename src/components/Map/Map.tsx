// src/components/Map/Map.tsx

import { useEffect, useRef, useState } from "react";

import L, { type LeafletEvent } from "leaflet";

import { TH_BOUNDS } from "../Dashboard/dashboard.constants";

import { useTranslation } from "react-i18next";

import type { Props, ViewState } from "./MapTypes";

import {
  responsivePadding,
  zoomForExactHeight,
  extractRingsLatLng,
} from "./MapUtils";

import {
  EDGE,
  styleProvinceDefault,
  styleProvinceHover,
  provinceDefaultStyleFor,
  styleDistrictDefault,
  styleSubdistrictDefault,
} from "./MapStyles";

import { renderMarkers } from "./MapMarkers";

import {
  loadDistrictsForProvince,
  loadSubdistrictsForDistrict,
} from "./MapLayers";

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

  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const viewStackRef = useRef<ViewState[]>([]);
  // Guard to avoid resetting view on container resize
  const resizingGuardRef = useRef(false);

  const [mapReady, setMapReady] = useState(false);
  const [canZoomOut, setCanZoomOut] = useState(false);

  const zoomOutWrapRef = useRef<HTMLDivElement | null>(null);

  const provinceVariantRef = useRef<"strong" | "dim">("strong");

  const isDrillingRef = useRef(false);

  const prevFocusRef = useRef<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [countryLoaded, setCountryLoaded] = useState(false);
  const [provincesLoaded, setProvincesLoaded] = useState(false);
  const [markersReady, setMarkersReady] = useState(false);
  const fitRetryRef = useRef(0);

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

  const replaceDistrictsLayer = (next: L.GeoJSON<any> | null) => {
    const map = mapRef.current;
    const prev = districtsLayerRef.current;

    if (prev && prev !== next) {
      if (map && map.hasLayer(prev)) map.removeLayer(prev);
      else
        try {
          prev.remove();
        } catch {}
    }
    districtsLayerRef.current = next;

    // บังคับสไตล์อำเภอทันที (ครั้งแรก)
    if (next) {
      try {
        next.setStyle({ ...styleDistrictDefault });
        next.bringToFront();
      } catch {}
    }
  };

  const replaceSubdistrictsLayer = (next: L.GeoJSON<any> | null) => {
    const map = mapRef.current;
    const prev = subdistrictsLayerRef.current;

    if (prev && prev !== next) {
      if (map && map.hasLayer(prev)) map.removeLayer(prev);
      else
        try {
          prev.remove();
        } catch {}
    }
    subdistrictsLayerRef.current = next;

    // บังคับสไตล์ตำบลทันที (ครั้งแรก)
    if (next) {
      try {
        next.setStyle({ ...styleSubdistrictDefault });
        next.bringToFront();
      } catch {}
    }
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

    const vw = typeof window !== "undefined" ? window.innerWidth : sz.x;

    const pad = responsivePadding(sz.x, sz.y, vw);

    const innerH = Math.max(1, sz.y - pad.y * 2.5);

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

    activeRingsRef.current =
      rings && rings.length > 0 ? rings : thRingsRef.current;

    if (maskLayerRef.current) {
      map.removeLayer(maskLayerRef.current);

      maskLayerRef.current = null;
    }

    if (rings && rings.length > 0 && dimRendererRef.current) {
      const worldRing: L.LatLngExpression[] = [
        [-90, -180],

        [-90, 180],

        [90, 180],

        [90, -180],
      ];

      maskLayerRef.current = L.polygon([worldRing, ...rings], {
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
    viewStackRef.current.push(state);

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
    const map = mapRef.current;

    if (!map || !countryLoaded) return;

    viewStackRef.current = [];

    setCanZoomOut(false);

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

    setMaskByRings(thRingsRef.current);

    setInnerShade(true);

    isDrillingRef.current = false;

    setProvincesVariant("strong");

    fitThailandTight(animate);
  }

  const zoomOut = () => {
    const map = mapRef.current;

    if (!map) return;

    if (lockZoomOut && isAtProvinceView()) return;

    const prev = popView();

    // หมด stack → กลับประเทศ + sync dropdown + ปิด tooltip

    if (!prev) {
      resetToCountry(true);

      onProvinceChange?.("all");

      map.closeTooltip?.();

      return;
    }

    // ใส่ชั้นที่เคยถอดตอน zoom-to-pin กลับมาก่อน

    reattachRegionLayersAfterPinView();

    // ถ้า view ก่อนหน้าเป็น country หรือ province → กลับประเทศทันที (คลิกเดียว)

    if (prev.level === "country" || prev.level === "province") {
      resetToCountry(true);

      onProvinceChange?.("all"); // ให้ MapPanel ตั้ง All Location + remount

      map.closeTooltip?.(); // ปิด tooltip ที่ค้าง

      return;
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

    map.flyToBounds(L.latLngBounds(prev.bounds), {
      animate: true,

      padding: prev.padding ?? [12, 12],

      maxZoom: prev.maxZoom ?? 19,
    });
  };

  /** ซูมไปยังพิกัดหมุดให้ชัดที่สุด + เอา overlay ออกชั่วคราว (ซ่อน pane + ถอดชั้นพื้นที่) */

  const zoomToLatLng = (ll: L.LatLngExpression) => {
    const map = mapRef.current;

    if (!map) return;

    // เก็บสภาพก่อนซูม (รวม rings เดิมเพื่อกู้คืน)

    pushView({
      bounds: map.getBounds() as unknown as L.LatLngBoundsLiteral,

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

    map.flyTo(ll as any, targetZoom, { animate: true });
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
        console.error("[Map] cannot load thailand.geojson", err);
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
            const proCode = feature?.properties?.pro_code as string | undefined;

            const nameTH = feature?.properties?.pro_th as string | undefined;

            const nameEN = feature?.properties?.pro_en as string | undefined;

            if (nameTH) {
              const c = (layer as any).getBounds().getCenter();

              provinceCentersRef.current[nameTH] = { lat: c.lat, lng: c.lng };

              if (nameEN)
                provinceCentersRef.current[nameEN] = { lat: c.lat, lng: c.lng };
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

            const setMaskForLower = (rings: L.LatLngExpression[][] | null) => {
              // ระดับอำเภอ/ตำบลไม่ใช้ inner shade
              setShadePaneVisible(false);
              setDimPaneVisible(true);

              setMaskByRings(rings);

              // ทำให้ mask โปร่งลงตั้งแต่ครั้งแรก
              if (maskLayerRef.current) {
                maskLayerRef.current.setStyle({
                  fillOpacity: 1, // เดิมคุณตั้ง 1 ทำให้ทึบ
                  opacity: 0.35,
                  weight: 1.5,
                });
              }
            };

            // คลิกจังหวัด → ซูมเข้า + mask ตามจังหวัด + sync Dropdown

            const handleEnterProvince = (opts?: { fromDropdown?: boolean }) => {
              if (!proCode) return;

              pushView({
                bounds: TH_BOUNDS as any,
                padding: [12, 12],
                maxZoom: 19,
                level: "country",
                rings: thRingsRef.current,
              });

              setInnerShade(false);

              isDrillingRef.current = true;
              setProvincesVariant("dim");

              (layer as L.Path).setStyle(
                provinceDefaultStyleFor(
                  feature,
                  opts?.fromDropdown ? "dim" : "dim"
                )
              );

              provincesLayerRef.current?.bringToBack();

              const ringsProv = extractRingsLatLng((feature as any).geometry);
              setDimPaneVisible(true);
              setShadePaneVisible(true);
              setMaskByRings(ringsProv);

              onProvinceChange?.(nameTH || nameEN || "all");

              const b = (layer as any).getBounds() as L.LatLngBounds;
              map.flyToBounds(b, {
                animate: true,
                padding: [12, 12],
                maxZoom: 10,
              });

              // หลังซูมเสร็จ ค่อยเปิด hover กลับ + ย้ำ dim ให้ทุกจังหวัดอีกครั้ง
              map.once("moveend", () => {
                isDrillingRef.current = false;
              });

              if (opts?.fromDropdown) {
                // ย้ำเฉพาะจังหวัดที่เลือก
                (layer as L.Path).setStyle(
                  provinceDefaultStyleFor(feature, "dim")
                );

                // และย้ำทั้งชั้นจังหวัดหลังกล้องหยุดเคลื่อน
                map.once("moveend", () => {
                  setProvincesVariant("dim"); // ทั้ง layer
                  (layer as L.Path).setStyle(
                    provinceDefaultStyleFor(feature, "dim")
                  ); // ตัวที่เลือก
                });
              }

              loadDistrictsForProvince(
                map,
                proCode,
                nameTH,
                ringsProv,
                pushView,
                setMaskForLower,
                (amp, ringsDist) =>
                  loadSubdistrictsForDistrict(
                    map,
                    amp,
                    ringsDist,
                    pushView,
                    setMaskForLower,
                    replaceSubdistrictsLayer
                  ),
                replaceDistrictsLayer,
                replaceSubdistrictsLayer
              );
            };

            layer.on("click", () =>
              handleEnterProvince({ fromDropdown: true })
            );

            (layer as any).__enterProvince = (opts?: {
              fromDropdown?: boolean;
            }) => {
              handleEnterProvince(opts);
            };
          },
        }).addTo(map);

        provincesLayerRef.current = layer;
        setProvincesLoaded(true);
        setGeoError(null);

        if (prevFocusRef.current) {
          const want = prevFocusRef.current;
          let matched: any | null = null;
          provincesLayerRef.current.eachLayer((ly: any) => {
            const p = ly?.feature?.properties || {};
            const th: string = p.pro_th || "";
            const en: string = p.pro_en || "";
            if (th === want || en === want) matched = ly;
          });
          if (matched && matched.__enterProvince) {
            matched.__enterProvince({ fromDropdown: true });
          }
        }

        // render markers ครั้งแรก

        renderMarkers(
          map,

          markersLayerRef.current,

          notis,

          aggregateBySite,

          severityFilter,

          provinceCentersRef.current,

          sitePoints,

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
        console.error("[Map] cannot load provinces.geojson", err);
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

      t
    );
  }, [notis, aggregateBySite, severityFilter, sitePoints, t, i18n.language, markersReady]);

  // โฟกัสจังหวัดจาก dropdown (null = ทุกพื้นที่)

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !provincesLayerRef.current) {
      prevFocusRef.current = focusProvince ?? null;
      return;
    }

    // จาก Dropdown: กลับ All → reset อย่างเดิม
    if (prevFocusRef.current && !focusProvince) {
      resetToCountry(true);
      prevFocusRef.current = null;
      return;
    }
    prevFocusRef.current = focusProvince ?? null;
    if (!focusProvince) return;

    // ถ้ามี focusSiteCenter อยู่ ให้ข้ามการ drilldown จังหวัด (เรากำลังโฟกัสที่พิกัดไซต์)
    if (focusSiteCenter) return;

    // Ensure overlays are present before entering province (in case coming back from pin view)
    reattachRegionLayersAfterPinView();

    // ✅ เผื่อเพิ่งซูมจากหมุด: ใส่ชั้นพื้นที่กลับมาก่อนเสมอ
    reattachRegionLayersAfterPinView();

    // ✅ ย้ำให้ทั้งชั้น "dim" ก่อน drilldown เพื่อกัน race
    isDrillingRef.current = true; // กัน hover ยิงทับระหว่างแอนิเมชัน
    setProvincesVariant("dim"); // dim ทั้งชั้นจังหวัดทันที
    provincesLayerRef.current.bringToBack(); // กันมาทับเลเวลลึก

    // หา province แล้วค่อยเข้าเหมือนเดิม
    let matched: any | null = null;
    provincesLayerRef.current.eachLayer((ly: any) => {
      const p = ly?.feature?.properties || {};
      const th: string = p.pro_th || "";
      const en: string = p.pro_en || "";
      if (th === focusProvince || en === focusProvince) matched = ly;
    });

    if (matched && matched.__enterProvince) {
      isDrillingRef.current = true;
      setProvincesVariant("dim"); // เริ่มด้วยทั้งชั้น dim
      matched.__enterProvince({ fromDropdown: true });

      map.once("moveend", () => {
        setProvincesVariant("dim"); // ย้ำทั้งชั้น dim อีกรอบ
        isDrillingRef.current = false;
      });
    }
  }, [focusProvince, focusSiteCenter, mapReady, provincesLoaded]);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

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
  useEffect(() => {
    if (!mapReady) return;
    if (focusSiteCenter) return;
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
    } else {
      // restore global min
      map.setMinZoom(2);
    }
  }, [lockZoomOut, mapReady]);

  const isLoading = !geoError && (!countryLoaded || !provincesLoaded);

  return (
    <div className="relative">
      <div
        id="th-map"
        className="relative z-0 h-[680px] w-full rounded-lg bg-gray-200 md:h-[560px] sm:h-[440px]"
        onContextMenu={onContextMenu}
        aria-busy={isLoading ? "true" : "false"}
      />
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
