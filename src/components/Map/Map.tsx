import { useEffect, useRef, useState } from "react";
import L from "leaflet";
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
  const [canZoomOut, setCanZoomOut] = useState(false);
  const zoomOutWrapRef = useRef<HTMLDivElement | null>(null);

  // จำสถานะสไตล์จังหวัดปัจจุบัน (strong | dim)
  const provinceVariantRef = useRef<"strong" | "dim">("strong");
  const prevFocusRef = useRef<string | null>(null);

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

      /* ----------- สไตล์ Tooltip ของ "จังหวัด" ----------- */
      .leaflet-tooltip.province-label {
        background: #ffffff;
        border: 1px solid rgba(15,23,42,0.08);
        box-shadow: 0 2px 8px rgba(15,23,42,0.12);
        color: #0f172a;          /* slate-900 */
        font-weight: 600;
        font-size: 12px;
        line-height: 1.2;
        padding: 6px 8px;
        border-radius: 8px;

        /* ไม่ให้ tooltip ขวาง event ของ polygon ด้านล่าง */
        pointer-events: none;
        white-space: nowrap;
      }

      @media (min-width:1024px){
        .leaflet-tooltip.province-label { font-size: 12px; }
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
        interactive: false,
        smoothFactor: 2.0,
      }).addTo(map);
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

  /** เปลี่ยนความเข้มของ “ชั้นจังหวัด” ทั้งชั้นตามระดับมุมมอง */
  function setProvincesVariant(variant: "strong" | "dim") {
    provinceVariantRef.current = variant;
    const g = provincesLayerRef.current;
    if (!g) return;
    g.setStyle((f: any) => provinceDefaultStyleFor(f, variant));
  }

  /** รีเซ็ตเป็นมุมมองประเทศ + ลบอำเภอ/ตำบล + ใส่ shade */
  function resetToCountry(animate = true) {
    const map = mapRef.current;
    if (!map) return;

    // เคลียร์ stack และ layer ย่อย
    viewStackRef.current = [];
    setCanZoomOut(false);

    if (districtsLayerRef.current) {
      map.removeLayer(districtsLayerRef.current);
      districtsLayerRef.current = null;
    }
    if (subdistrictsLayerRef.current) {
      map.removeLayer(subdistrictsLayerRef.current);
      subdistrictsLayerRef.current = null;
    }

    // คืน mask เป็นทั้งประเทศ + ใส่เฉด + จังหวัดเข้ม
    setMaskByRings(thRingsRef.current);
    setInnerShade(true);
    setProvincesVariant("strong");
    fitThailandTight(animate);
  }

  const zoomOut = () => {
    const map = mapRef.current;
    if (!map) return;
    const prev = popView();
    if (!prev) {
      resetToCountry(true);
      return;
    }
    const ringsToUse =
      prev.rings && prev.rings.length > 0 ? prev.rings : thRingsRef.current;
    setMaskByRings(ringsToUse);

    if (prev.level === "country") {
      setProvincesVariant("strong");
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

    // panes & z-index ladder
    map.createPane("shadeUnder");
    map.getPane("shadeUnder")!.style.zIndex = "300";

    map.createPane("dimPane");
    map.getPane("dimPane")!.style.zIndex = "450";
    dimRendererRef.current = L.svg({ pane: "dimPane" }).addTo(map);

    // ✅ label pane: สูงกว่า mask เพื่อไม่โดน overlay กลืน
    map.createPane("provinceLabels");
    map.getPane("provinceLabels")!.style.zIndex = "660";
    map.getPane("provinceLabels")!.style.pointerEvents = "none";

    // ✅ markers pane: ชั้นของตัวหมุด
    map.createPane("markersPane");
    map.getPane("markersPane")!.style.zIndex = "700";

    // ✅ markerLabels pane: ชั้นของ "label หมุด" ให้อยู่เหนือ pin
    map.createPane("markerLabels");
    map.getPane("markerLabels")!.style.zIndex = "720";
    map.getPane("markerLabels")!.style.pointerEvents = "none";

    // โหลดขอบประเทศ
    fetch("/data/thailand.geojson")
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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = zoomOutWrapRef.current;
    if (!el) return;
    el.style.display = canZoomOut ? "block" : "none";
  }, [canZoomOut]);

  /** ---------- provinces layer + labels ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (provincesLayerRef.current) return;

    fetch("/data/provinces.geojson")
      .then((r) => r.json())
      .then((provinces) => {
        const layer = L.geoJSON(provinces, {
          style: styleProvinceDefault,
          onEachFeature: (feature, layer) => {
            const proCode = feature?.properties?.pro_code as string | undefined;
            const nameTH = feature?.properties?.pro_th as string | undefined;
            const nameEN = feature?.properties?.pro_en as string | undefined;

            // บันทึก center ของจังหวัด (TH/EN)
            if (nameTH) {
              const c = (layer as any).getBounds().getCenter();
              provinceCentersRef.current[nameTH] = { lat: c.lat, lng: c.lng };
              if (nameEN)
                provinceCentersRef.current[nameEN] = { lat: c.lat, lng: c.lng };
            }

            // Tooltip จังหวัด (บังคับภาษาไทย, ลอยเหนือเมาส์)
            (layer as L.Path).bindTooltip(nameTH ?? nameEN ?? "", {
              direction: "top",
              sticky: true,
              offset: L.point(0, -12),
              className: "province-label",
              pane: "provinceLabels",
            });

            // hover: ปรับสไตล์ + เปิด/ปิด tooltip
            layer.on("mouseover", () => {
              (layer as L.Path).setStyle(styleProvinceHover);
              (layer as any).openTooltip?.();
            });
            layer.on("mouseout", () => {
              (layer as L.Path).setStyle(
                provinceDefaultStyleFor(feature, provinceVariantRef.current)
              );
              (layer as any).closeTooltip?.();
            });

            // คลิกเข้า "จังหวัด"
            const handleEnterProvince = () => {
              if (!proCode) return;
              // จด state ปัจจุบันไว้สำหรับ zoom out
              pushView({
                bounds: TH_BOUNDS as any,
                padding: [12, 12],
                maxZoom: 19,
                level: "country",
                rings: thRingsRef.current,
              });
              setInnerShade(false);
              setProvincesVariant("dim");

              // เจาะ mask เฉพาะจังหวัด
              const ringsProv = extractRingsLatLng((feature as any).geometry);
              setMaskByRings(ringsProv);

              // ซูมเข้าจังหวัด
              const b = (layer as any).getBounds() as L.LatLngBounds;
              map.flyToBounds(b, {
                animate: true,
                padding: [12, 12],
                maxZoom: 10,
              });

              // โหลดอำเภอ/ตำบล
              loadDistrictsForProvince(
                map,
                proCode,
                nameTH,
                ringsProv,
                pushView,
                setMaskByRings,
                (amp, ringsDist) =>
                  loadSubdistrictsForDistrict(
                    map,
                    amp,
                    ringsDist,
                    pushView,
                    setMaskByRings,
                    (ly) => (subdistrictsLayerRef.current = ly)
                  ),
                (ly) => (districtsLayerRef.current = ly),
                (ly) => (subdistrictsLayerRef.current = ly)
              );
            };

            layer.on("click", handleEnterProvince);
            (layer as any).__enterProvince = handleEnterProvince;
          },
        }).addTo(map);

        provincesLayerRef.current = layer;

        // render markers ครั้งแรก (จะไปใช้ pane: "markersPane" ภายใน MapMarkers)
        renderMarkers(
          map,
          markersLayerRef.current,
          notis,
          aggregateBySite,
          severityFilter,
          provinceCentersRef.current,
          t
        );
      });
  }, [notis, aggregateBySite, severityFilter, t, i18n.language]);

  // โฟกัสเข้าจังหวัดจากภายนอก (เช่น dropdown) + รีเซ็ตเมื่อเลือก "ทุกพื้นที่"
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !provincesLayerRef.current) {
      prevFocusRef.current = focusProvince ?? null;
      return;
    }

    // กรณี "จากมี province → เป็น null" = เลือกทุกพื้นที่
    if (prevFocusRef.current && !focusProvince) {
      resetToCountry(true);
      prevFocusRef.current = null;
      return;
    }
    prevFocusRef.current = focusProvince ?? null;

    if (!focusProvince) return;
    let matched: any | null = null;
    provincesLayerRef.current.eachLayer((ly: any) => {
      const p = ly?.feature?.properties || {};
      const th: string = p.pro_th || "";
      const en: string = p.pro_en || "";
      if (th === focusProvince || en === focusProvince) matched = ly;
    });
    if (matched && matched.__enterProvince) matched.__enterProvince();
  }, [focusProvince]);

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
