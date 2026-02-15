import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import type { Noti } from "../../data/Dashboard/notis";
import type { Props, SitePoint } from "./MapTypes";

declare global {
  interface Window {
    longdo?: any;
  }
}

type LonLat = { lon: number; lat: number };
type Geometry = { type: string; coordinates: any };
type Feature = { type: "Feature"; properties?: Record<string, any>; geometry: Geometry };
type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };

type Level = "country" | "province" | "district";

const DEFAULT_LONGDO_KEY = "014d3a8670f605c055dfadcbb59a35a2";

let longdoScriptPromise: Promise<void> | null = null;

const resolveLongdoKey = () => {
  const envKey = (import.meta as any)?.env?.VITE_LONGDO_MAP_KEY as string | undefined;
  return envKey || DEFAULT_LONGDO_KEY;
};

const loadLongdoMap2D = async () => {
  if (typeof window === "undefined") return;
  if (window.longdo) return;
  if (longdoScriptPromise) {
    await longdoScriptPromise;
    return;
  }

  const key = resolveLongdoKey();
  longdoScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-longdo="map2"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Longdo Map script")));
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.longdo = "map2";
    script.src = `https://api.longdo.com/map/?key=${encodeURIComponent(key)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Longdo Map script"));
    document.head.appendChild(script);
  });

  await longdoScriptPromise;
};

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
    return (coords || []).map((polygon) => ringToLonLat(polygon[0] || []));
  }
  return [];
}

function geometryCentroid(geometry?: Geometry | null): LonLat | null {
  const rings = geometryToOuterRings(geometry);
  const points = rings.flat();
  if (!points.length) return null;
  const sum = points.reduce(
    (acc, p) => ({ lon: acc.lon + p.lon, lat: acc.lat + p.lat }),
    { lon: 0, lat: 0 }
  );
  return { lon: sum.lon / points.length, lat: sum.lat / points.length };
}

function featuresBound(features: Feature[]): { minLon: number; minLat: number; maxLon: number; maxLat: number } | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const feature of features) {
    const rings = geometryToOuterRings(feature.geometry);
    for (const ring of rings) {
      for (const point of ring) {
        if (point.lon < minLon) minLon = point.lon;
        if (point.lon > maxLon) maxLon = point.lon;
        if (point.lat < minLat) minLat = point.lat;
        if (point.lat > maxLat) maxLat = point.lat;
      }
    }
  }

  if (!Number.isFinite(minLon)) return null;
  return { minLon, minLat, maxLon, maxLat };
}

function buildFallbackSitePoints(notis: Noti[]): SitePoint[] {
  const byName = new globalThis.Map<string, SitePoint>();
  for (const item of notis) {
    const lat = item.coords?.lat ?? item.lat;
    const lng = item.coords?.lng ?? item.lng;
    const name = item.siteName || item.site || "Unknown";
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    if (byName.has(name)) continue;
    byName.set(name, {
      name,
      lat,
      lng,
      code: item.siteCode,
      id: item.siteId,
    });
  }
  return [...byName.values()];
}

function isProvinceMatch(feature: Feature, provinceKey: string) {
  const key = String(provinceKey || "").trim();
  if (!key) return false;
  const proTh = String(feature.properties?.pro_th ?? "").trim();
  const proEn = String(feature.properties?.pro_en ?? "").trim();
  return key === proTh || key === proEn;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return earthRadius * c;
}

export default function Map({
  notis,
  focusProvince,
  focusSiteCenter,
  onProvinceChange,
  onPinClick,
  onZoomOutToCountry,
  lockZoomOut = false,
  sitePoints,
  pinStatusBySite,
}: Props) {
  const { t } = useTranslation(["dashboard"]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkerRef = useRef<L.Marker | null>(null);
  const leafletLevelMarkersRef = useRef<L.Marker[]>([]);
  const initializedRef = useRef(false);

  const provincesRef = useRef<Feature[]>([]);
  const districtsRef = useRef<Feature[]>([]);

  const provinceByOverlayRef = useRef<globalThis.Map<any, Feature>>(new globalThis.Map());
  const districtByOverlayRef = useRef<globalThis.Map<any, Feature>>(new globalThis.Map());
  const pinByOverlayRef = useRef<globalThis.Map<any, SitePoint>>(new globalThis.Map());

  const provinceOverlaysRef = useRef<any[]>([]);
  const districtOverlaysRef = useRef<any[]>([]);
  const markerOverlaysRef = useRef<any[]>([]);
  const visibleMarkerSitesRef = useRef<SitePoint[]>([]);
  const siteByKeyRef = useRef<globalThis.Map<string, SitePoint>>(new globalThis.Map());
  const lastHoveredPinRef = useRef<{
    site: SitePoint;
    clientX: number;
    clientY: number;
    at: number;
  } | null>(null);
  const suppressOverlayClickUntilRef = useRef(0);
  const maskOverlayRef = useRef<any[] | null>(null);

  const selectedProvinceRef = useRef<Feature | null>(null);
  const selectedPinRef = useRef<SitePoint | null>(null);

  const [level, setLevel] = useState<Level>("country");
  const [mapReady, setMapReady] = useState(false);
  const levelRef = useRef<Level>("country");
  const districtReturnLevelRef = useRef<"country" | "province">("province");
  const [districtViewState, setDistrictViewState] = useState<{
    center: { lat: number; lng: number };
    lockMapToCenter: boolean;
    markerSite: SitePoint | null;
  } | null>(null);
  const ignoreFocusSiteKeyRef = useRef<string | null>(null);
  const [pinTooltip, setPinTooltip] = useState<{
    visible: boolean;
    text: string;
    left: number;
    top: number;
  }>({ visible: false, text: "", left: 0, top: 0 });

  const focusProvinceKey =
    focusProvince && String(focusProvince).toLowerCase() !== "all" ? String(focusProvince) : null;

  const zoomOutButtonInlineStyle: CSSProperties = {
    padding: "6px 10px",
    background: "#ffffff",
    border: "1px solid #ddd",
    cursor: "pointer",
    fontSize: "14px",
    lineHeight: "20px",
    height: "34px",
    minWidth: "84px",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const allSitePoints = useMemo(() => {
    if (Array.isArray(sitePoints) && sitePoints.length > 0) return sitePoints;
    return buildFallbackSitePoints(notis);
  }, [notis, sitePoints]);

  const resolveSiteElectricStatus = (site: { name: string; code?: string; id?: string }) => {
    const statusByCode = site.code ? pinStatusBySite?.[String(site.code)] : undefined;
    const statusById = site.id ? pinStatusBySite?.[String(site.id)] : undefined;
    const statusByName = pinStatusBySite?.[String(site.name)];
    return statusByCode ?? statusById ?? statusByName;
  };

  const resolveSitePinColor = (site: { name: string; code?: string; id?: string }) => {
    const electricStatus = resolveSiteElectricStatus(site);
    if (!electricStatus?.hasElectric) return "#003a81";
    if (electricStatus.electricOffline > 0) return "#EF4444";
    return "#16A34A";
  };

  const isSiteAlertPin = (site: { name: string; code?: string; id?: string }) => {
    const electricStatus = resolveSiteElectricStatus(site);
    return !!electricStatus?.hasElectric && electricStatus.electricOffline > 0;
  };

  const buildPinSvg = (pinColor: string) => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="41" viewBox="0 0 28 41"><path d="M14 0c7.732 0 14 6.268 14 14 0 9.941-14 27-14 27S0 23.941 0 14C0 6.268 6.268 0 14 0z" fill="${pinColor}"/><circle cx="14" cy="13.5" r="6" fill="#FFFFFF"/></svg>`;
  };

  const createLeafletSiteIcon = (site: SitePoint) => {
    const pinColor = resolveSitePinColor(site);
    const svg = buildPinSvg(pinColor);

    return L.divIcon({
      className: "bps-leaflet-pin",
      html: `<span class="bps-leaflet-pin-inner">${svg}</span>`,
      iconSize: [28, 41],
      iconAnchor: [14, 41],
      tooltipAnchor: [0, -34],
    });
  };

  const clearOverlayList = (listRef: React.MutableRefObject<any[]>) => {
    const map = mapRef.current;
    if (!map) return;
    for (const overlay of listRef.current) {
      try {
        map.Overlays.remove(overlay);
      } catch {}
    }
    listRef.current = [];
  };

  const clearMask = () => {
    const map = mapRef.current;
    if (!map || !maskOverlayRef.current) return;
    maskOverlayRef.current.forEach((mask) => {
      try {
        map.Overlays.remove(mask);
      } catch {}
    });
    maskOverlayRef.current = null;
  };

  const setMapInteractive = (enabled: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.Ui?.Mouse?.enableDrag(enabled);
      map.Ui?.Mouse?.enableWheel(enabled);
      map.Ui?.Mouse?.enableClick(true);
      map.Ui?.Keyboard?.enable(enabled);
    } catch {}
  };

  const setZoomRange = (min: number, max: number) => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.zoomRange({ min, max });
    } catch {}
  };

  const fitFeatures = (features: Feature[], allowZoomIn = true) => {
    const map = mapRef.current;
    if (!map || !features.length) return;
    const bound = featuresBound(features);
    if (!bound) return;
    try {
      map.bound(
        {
          minLon: bound.minLon,
          minLat: bound.minLat,
          maxLon: bound.maxLon,
          maxLat: bound.maxLat,
        },
        undefined,
        allowZoomIn
      );
    } catch {}
  };

  const addProvinceOverlays = () => {
    const map = mapRef.current;
    const longdo = window.longdo;
    if (!map || !longdo) return;

    clearOverlayList(provinceOverlaysRef);
    provinceByOverlayRef.current.clear();

    const provinceStyle = {
      lineColor: "rgba(2,132,199,0.95)",
      fillColor: "rgba(2,132,199,0.16)",
    };

    for (const feature of provincesRef.current) {
      const rings = geometryToOuterRings(feature.geometry);
      for (const ring of rings) {
        if (!ring.length) continue;
        const polygon = new longdo.Polygon(ring, {
          lineWidth: 1.25,
          lineColor: provinceStyle.lineColor,
          fillColor: provinceStyle.fillColor,
          clickable: true,
          pointer: true,
        });

        provinceOverlaysRef.current.push(polygon);
        provinceByOverlayRef.current.set(polygon, feature);
        map.Overlays.add(polygon);
      }
    }
  };

  const addDistrictOverlaysForProvince = (province: Feature) => {
    const map = mapRef.current;
    const longdo = window.longdo;
    if (!map || !longdo) return;

    clearOverlayList(districtOverlaysRef);
    districtByOverlayRef.current.clear();

    const selectedProCode = String(province.properties?.pro_code ?? "");
    const inProvince = districtsRef.current.filter(
      (d) => String(d.properties?.pro_code ?? "") === selectedProCode
    );

    for (const district of inProvince) {
      const rings = geometryToOuterRings(district.geometry);
      for (const ring of rings) {
        if (!ring.length) continue;
        const polygon = new longdo.Polygon(ring, {
          lineWidth: 1,
          lineColor: "rgba(2,132,199,0.95)",
          fillColor: "rgba(173,216,230,0.30)",
          clickable: true,
          pointer: true,
        });
        districtOverlaysRef.current.push(polygon);
        districtByOverlayRef.current.set(polygon, district);
        map.Overlays.add(polygon);
      }
    }
  };

  const addMarkers = (clipToProvince: Feature | null) => {
    const map = mapRef.current;
    const longdo = window.longdo;
    if (!map || !longdo) return;

    clearOverlayList(markerOverlaysRef);
    pinByOverlayRef.current.clear();
    siteByKeyRef.current.clear();

    const points = allSitePoints;
    let filtered = points;

    if (clipToProvince) {
      const proCode = String(clipToProvince.properties?.pro_code ?? "");
      const districtFeatures = districtsRef.current.filter(
        (feature) => String(feature.properties?.pro_code ?? "") === proCode
      );

      filtered = points.filter((site) => {
        const probe = { lon: site.lng, lat: site.lat };
        return districtFeatures.some((feature) => {
          const rings = geometryToOuterRings(feature.geometry);
          return rings.some((ring) => {
            try {
              return !!longdo.Util?.contains?.(probe, ring);
            } catch {
              return false;
            }
          });
        });
      });
    }

    filtered = [...filtered].sort((a, b) => {
      const aAlert = isSiteAlertPin(a);
      const bAlert = isSiteAlertPin(b);
      if (aAlert === bAlert) return 0;
      return aAlert ? 1 : -1;
    });

    visibleMarkerSitesRef.current = filtered;

    const pinColorDetectCache = new globalThis.Map<string, boolean>();

    const isRedMarkerNode = (node: HTMLImageElement) => {
      const src = node.getAttribute("src") || "";
      if (!src.startsWith("data:image/svg+xml;base64,")) return false;
      if (pinColorDetectCache.has(src)) return !!pinColorDetectCache.get(src);

      let isRed = false;
      try {
        const base64 = src.slice(src.indexOf(",") + 1);
        const svg = atob(base64);
        isRed = svg.includes("#EF4444");
      } catch {
        isRed = false;
      }

      pinColorDetectCache.set(src, isRed);
      return isRed;
    };

    const applyMarkerPriority = (node: HTMLImageElement) => {
      const isRed = isRedMarkerNode(node);
      const priority = isRed ? "2147483647" : "2000";
      let current: HTMLElement | null = node;

      for (let depth = 0; depth < 10 && current; depth += 1) {
        current.style.setProperty("z-index", priority, "important");
        if (!current.style.position || current.style.position === "static") {
          current.style.setProperty("position", "relative", "important");
        }
        current = current.parentElement;
      }
    };

    for (const site of filtered) {
      const pinColor = resolveSitePinColor(site);
      const iconSvg = buildPinSvg(pinColor);
      const iconUrl = `data:image/svg+xml;base64,${btoa(iconSvg)}`;
      const siteKey = `${site.code ?? site.id ?? site.name}__${site.lat},${site.lng}`;
      siteByKeyRef.current.set(siteKey, site);

      const marker = new longdo.Marker(
        { lon: site.lng, lat: site.lat },
        {
          title: site.name,
          icon: {
            url: iconUrl,
            offset: { x: 14, y: 41 },
          },
          weight: longdo.OverlayWeight?.Top,
        }
      );

      markerOverlaysRef.current.push(marker);
      pinByOverlayRef.current.set(marker, site);
      map.Overlays.add(marker);
    }

    const bindAndPrioritizeMarkerDom = () => {
      const root = mapContainerRef.current;
      if (!root) return;
      try {
        const markerElements = Array.from(
          root.querySelectorAll('img[src^="data:image/svg+xml;base64"], img[src^="data:image/svg"]')
        ) as HTMLImageElement[];

        const markerTail = markerElements.slice(-filtered.length);

        markerTail.forEach((node, index) => {
          const site = filtered[index];
          if (!site || !node) return;
          const siteKey = `${site.code ?? site.id ?? site.name}__${site.lat},${site.lng}`;
          node.title = site.name;
          node.setAttribute("aria-label", site.name);
          node.dataset.siteName = site.name;
          node.dataset.siteKey = siteKey;
          node.style.pointerEvents = "auto";
          applyMarkerPriority(node);

          if (node.dataset.pinHoverBound === "1") return;

          const onEnter = (ev: MouseEvent) => {
            if (levelRef.current === "district") return;
            const rect = root.getBoundingClientRect();
            setPinTooltip({
              visible: true,
              text: site.name,
              left: ev.clientX - rect.left,
              top: ev.clientY - rect.top - 14,
            });
          };

          const onMove = (ev: MouseEvent) => {
            if (levelRef.current === "district") return;
            const rect = root.getBoundingClientRect();
            setPinTooltip((prev) =>
              prev.visible
                ? {
                    ...prev,
                    left: ev.clientX - rect.left,
                    top: ev.clientY - rect.top - 14,
                  }
                : prev
            );
          };

          const onLeave = () => {
            setPinTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
          };

          node.addEventListener("mouseenter", onEnter);
          node.addEventListener("mousemove", onMove);
          node.addEventListener("mouseleave", onLeave);
          node.dataset.pinHoverBound = "1";
        });

        markerElements.forEach((node) => {
          const siteKey = node.dataset.siteKey || "";
          const site = siteByKeyRef.current.get(siteKey);
          if (!site) return;

          node.dataset.siteName = site.name;
          node.dataset.siteKey = siteKey;
          applyMarkerPriority(node);
        });
      } catch {}
    };

    [80, 180, 360].forEach((delay) => {
      window.setTimeout(() => {
        bindAndPrioritizeMarkerDom();
      }, delay);
    });
  };

  const resolveMarkerSiteFromPointer = (clientX: number, clientY: number): SitePoint | null => {
    if (typeof document === "undefined") return null;

    const stack = document.elementsFromPoint(clientX, clientY);
    for (const el of stack) {
      if (!(el instanceof HTMLImageElement)) continue;
      const src = el.getAttribute("src") || "";
      if (!src.startsWith("data:image/svg")) continue;

      const siteKey = el.dataset.siteKey || "";
      if (siteKey) {
        const byKey = siteByKeyRef.current.get(siteKey);
        if (byKey) return byKey;
      }

      const name = el.dataset.siteName || el.getAttribute("aria-label") || el.title || "";
      if (!name.trim()) continue;
      const byName = visibleMarkerSitesRef.current.find((site) => site.name === name.trim());
      if (byName) return byName;
    }

    return null;
  };

  const resolveHoveredPinFromPointer = (clientX: number, clientY: number) => {
    const markerSite = resolveMarkerSiteFromPointer(clientX, clientY);
    if (markerSite) {
      return {
        site: markerSite,
        name: markerSite.name,
        left: clientX,
        top: clientY,
      };
    }

    const root = mapContainerRef.current;
    if (!root) return null;

    const markerElements = Array.from(
      root.querySelectorAll('img[data-site-name], img[aria-label][src^="data:image/svg+xml;base64"], img[aria-label][src^="data:image/svg"]')
    ) as HTMLImageElement[];

    for (const markerEl of markerElements) {
      const rect = markerEl.getBoundingClientRect();
      const hitPad = 6;
      const hit =
        clientX >= rect.left - hitPad &&
        clientX <= rect.right + hitPad &&
        clientY >= rect.top - hitPad &&
        clientY <= rect.bottom + hitPad;
      if (!hit) continue;

      const name =
        markerEl.dataset.siteName || markerEl.getAttribute("aria-label") || markerEl.title || "";
      if (name.trim()) {
        const markerSiteByName = visibleMarkerSitesRef.current.find((site) => site.name === name.trim()) || null;
        return {
          site: markerSiteByName,
          name: name.trim(),
          left: clientX,
          top: clientY,
        };
      }
    }

    return null;
  };

  const handleLongdoPointerMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (levelRef.current === "district") return;
    const root = mapContainerRef.current;
    if (!root) return;

    const hovered = (() => {
      const byDom = resolveHoveredPinFromPointer(event.clientX, event.clientY);
      if (byDom) return byDom;

      const map = mapRef.current;
      const longdo = window.longdo;
      if (!map || !longdo) return null;

      let pointerLoc: any = null;
      try {
        pointerLoc = map.location(longdo.LocationMode.Pointer);
      } catch {
        pointerLoc = null;
      }

      if (!pointerLoc || !Number.isFinite(pointerLoc.lat) || !Number.isFinite(pointerLoc.lon)) {
        return null;
      }

      let currentZoom = 6;
      try {
        const z = map.zoom?.();
        if (Number.isFinite(z)) currentZoom = Number(z);
      } catch {}

      const metersPerPixel =
        (156543.03392 * Math.cos((Number(pointerLoc.lat) * Math.PI) / 180)) /
        Math.pow(2, currentZoom);
      const hoverRadiusMeters = Math.max(80, metersPerPixel * 24);

      let nearest: SitePoint | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const site of visibleMarkerSitesRef.current) {
        const distance = haversineMeters(
          { lat: Number(pointerLoc.lat), lng: Number(pointerLoc.lon) },
          { lat: site.lat, lng: site.lng }
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = site;
        }
      }

      if (!nearest || nearestDistance > hoverRadiusMeters) return null;

      return {
        site: nearest,
        name: nearest.name,
        left: event.clientX,
        top: event.clientY,
      };
    })();

    if (!hovered) {
      lastHoveredPinRef.current = null;
      setPinTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    if (hovered.site) {
      lastHoveredPinRef.current = {
        site: hovered.site,
        clientX: event.clientX,
        clientY: event.clientY,
        at: Date.now(),
      };
    }

    const rect = root.getBoundingClientRect();
    setPinTooltip({
      visible: true,
      text: hovered.name,
      left: hovered.left - rect.left,
      top: hovered.top - rect.top - 14,
    });
  };

  const handleLongdoPointerLeave: React.MouseEventHandler<HTMLDivElement> = () => {
    lastHoveredPinRef.current = null;
    setPinTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  };

  const handleLongdoRootClickCapture: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (levelRef.current === "district") return;

    const now = Date.now();
    const hovered = lastHoveredPinRef.current;
    let markerSite: SitePoint | null = null;

    if (hovered && now - hovered.at <= 1400) {
      const dx = event.clientX - hovered.clientX;
      const dy = event.clientY - hovered.clientY;
      if (dx * dx + dy * dy <= 30 * 30) {
        markerSite = hovered.site;
      }
    }

    if (!markerSite) {
      markerSite = resolveMarkerSiteFromPointer(event.clientX, event.clientY);
    }

    if (!markerSite) return;

    event.preventDefault();
    event.stopPropagation();
    suppressOverlayClickUntilRef.current = Date.now() + 300;
    handlePinSelection(markerSite, true);
    setPinTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  };

  const resolveLeafletMarkers = () => {
    const inProvince = selectedProvinceRef.current;
    if (!inProvince) return allSitePoints;

    const proCode = String(inProvince.properties?.pro_code ?? "");
    const districtFeatures = districtsRef.current.filter(
      (feature) => String(feature.properties?.pro_code ?? "") === proCode
    );

    return allSitePoints.filter((site) => {
      const probe = { lon: site.lng, lat: site.lat };
      return districtFeatures.some((feature) => {
        const rings = geometryToOuterRings(feature.geometry);
        return rings.some((ring) => {
          try {
            return !!window.longdo?.Util?.contains?.(probe, ring);
          } catch {
            return false;
          }
        });
      });
    });
  };

  const enterCountryLevel = () => {
    selectedProvinceRef.current = null;
    selectedPinRef.current = null;
    setLevel("country");
    levelRef.current = "country";
    districtReturnLevelRef.current = "country";
    setPinTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));

    clearOverlayList(districtOverlaysRef);
    addProvinceOverlays();
    clearMask();
    addMarkers(null);
    setDistrictViewState(null);

    setMapInteractive(false);
    setZoomRange(5.2, 16);
    fitFeatures(provincesRef.current, true);

    onProvinceChange?.("all");
    onZoomOutToCountry?.();
  };

  const enterProvinceLevel = (province: Feature, preserveSelectedPin = false) => {
    selectedProvinceRef.current = province;
    if (!preserveSelectedPin) {
      selectedPinRef.current = null;
    }
    setLevel("province");
    levelRef.current = "province";
    districtReturnLevelRef.current = "province";
    setPinTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));

    clearOverlayList(provinceOverlaysRef);
    clearMask();
    addDistrictOverlaysForProvince(province);
    addMarkers(province);
    setDistrictViewState(null);

    setMapInteractive(false);
    setZoomRange(7, 17);
    fitFeatures([province], true);

    const selectedName =
      String(province.properties?.pro_th ?? "") || String(province.properties?.pro_en ?? "") || "all";
    onProvinceChange?.(selectedName as string | "all");
  };

  const pointerToLocation = (): LonLat | null => {
    const map = mapRef.current;
    const longdo = window.longdo;
    if (!map || !longdo) return null;
    try {
      const loc = map.location(longdo.LocationMode.Pointer);
      if (loc && Number.isFinite(loc.lon) && Number.isFinite(loc.lat)) return { lon: loc.lon, lat: loc.lat };
    } catch {}
    return null;
  };

  const resolveOverlayFromEventArg = (eventArg: any) => {
    if (!eventArg) return null;
    if (pinByOverlayRef.current.has(eventArg)) return eventArg;
    if (eventArg.overlay && pinByOverlayRef.current.has(eventArg.overlay)) return eventArg.overlay;
    if (eventArg.target && pinByOverlayRef.current.has(eventArg.target)) return eventArg.target;
    if (eventArg.object && pinByOverlayRef.current.has(eventArg.object)) return eventArg.object;
    return null;
  };

  const extractClientPointFromEventArg = (eventArg: any) => {
    const raw = eventArg?.event || eventArg?.originalEvent || eventArg;
    const clientX = raw?.clientX;
    const clientY = raw?.clientY;
    if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
      return { clientX: Number(clientX), clientY: Number(clientY) };
    }
    return null;
  };

  const enterDistrictLevel = (
    center: LonLat,
    lockMapToCenter: boolean,
    markerSite: SitePoint | null = null,
    returnLevel: "country" | "province" = "province"
  ) => {
    setLevel("district");
    levelRef.current = "district";
    districtReturnLevelRef.current = returnLevel;
    setDistrictViewState({
      center: { lat: center.lat, lng: center.lon },
      lockMapToCenter,
      markerSite,
    });

    visibleMarkerSitesRef.current = [];

    clearMask();
    setPinTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    setMapInteractive(false);
  };

  const handlePinSelection = (site: SitePoint, lockMapToCenter: boolean) => {
    selectedPinRef.current = site;
    const sourceLevel = levelRef.current;
    const returnLevel: "country" | "province" = sourceLevel === "country" ? "country" : "province";

    if (!selectedProvinceRef.current) {
      const province = provincesRef.current.find((feature) => {
        const proCode = String(feature.properties?.pro_code ?? "");
        return districtsRef.current
          .filter((d) => String(d.properties?.pro_code ?? "") === proCode)
          .some((d) => {
            const rings = geometryToOuterRings(d.geometry);
            return rings.some((ring) => {
              try {
                return !!window.longdo?.Util?.contains?.({ lon: site.lng, lat: site.lat }, ring);
              } catch {
                return false;
              }
            });
          });
      });
      if (province) {
        enterProvinceLevel(province);
      }
    }

    enterDistrictLevel({ lon: site.lng, lat: site.lat }, lockMapToCenter, site, returnLevel);
    onPinClick?.(site);
  };

  const handleZoomOut = () => {
    if (level === "district") {
      if (focusSiteCenter) {
        ignoreFocusSiteKeyRef.current = `${focusSiteCenter.lat},${focusSiteCenter.lng}`;
      }
      if (districtReturnLevelRef.current === "country") {
        enterCountryLevel();
        return;
      }
      const selectedProvince = selectedProvinceRef.current;
      if (selectedProvince) {
        enterProvinceLevel(selectedProvince, true);
      } else {
        enterCountryLevel();
      }
      return;
    }

    if (level === "province") {
      enterCountryLevel();
    }
  };

  useEffect(() => {
    let cancelled = false;
    let overlayClickHandler: ((overlay: any) => void) | null = null;
    const hoverBindings: Array<{ eventName: string; handler: (eventArg: any) => void }> = [];

    (async () => {
      if (!mapContainerRef.current) return;
      await loadLongdoMap2D();
      if (cancelled || !mapContainerRef.current || !window.longdo) return;

      const longdo = window.longdo;

      const [provincesGeo, districtsGeo] = await Promise.all([
        fetch("/data/provinces.geojson").then((r) => r.json()) as Promise<FeatureCollection>,
        fetch("/data/districts.geojson").then((r) => r.json()) as Promise<FeatureCollection>,
      ]);

      if (cancelled) return;

      provincesRef.current = provincesGeo.features || [];
      districtsRef.current = districtsGeo.features || [];

      mapContainerRef.current.innerHTML = "";
      const map = new longdo.Map({
        placeholder: mapContainerRef.current,
        location: { lon: 100.523186, lat: 13.736717 },
        zoom: 6,
        ui: longdo.UiComponent?.None,
        layer: longdo.Layers?.NORMAL_EN || longdo.Layers?.NORMAL,
        zoomRange: { min: 4.5, max: 18 },
        input: true,
        smoothZoom: true,
      });

      try {
        map.Ui?.Crosshair?.visible?.(false);
      } catch {}

      mapRef.current = map;
      initializedRef.current = true;

      overlayClickHandler = (overlay: any) => {
        if (Date.now() <= suppressOverlayClickUntilRef.current) {
          return;
        }
        const pin = pinByOverlayRef.current.get(overlay);
        if (pin) {
          handlePinSelection(pin, true);
          return;
        }

        if (levelRef.current === "country") {
          const province = provinceByOverlayRef.current.get(overlay);
          if (province) {
            enterProvinceLevel(province);
          }
          return;
        }

        if (levelRef.current === "province") {
          const district = districtByOverlayRef.current.get(overlay);
          if (district) {
            const pointer = pointerToLocation();
            const centroid = geometryCentroid(district.geometry);
            const center = pointer || centroid;
            if (!center) return;
            enterDistrictLevel(center, false, null);
          }
        }
      };

      map.Event.bind("overlayClick", overlayClickHandler);

      const bindOverlayHover = (eventName: string, handler: (eventArg: any) => void) => {
        try {
          map.Event.bind(eventName, handler);
          hoverBindings.push({ eventName, handler });
        } catch {}
      };

      bindOverlayHover("overlayMouseOver", (eventArg: any) => {
        if (levelRef.current === "district") return;
        const overlay = resolveOverlayFromEventArg(eventArg);
        if (!overlay) return;

        const pin = pinByOverlayRef.current.get(overlay);
        if (!pin) return;

        const root = mapContainerRef.current;
        if (!root) return;

        const rootRect = root.getBoundingClientRect();
        const point = extractClientPointFromEventArg(eventArg);
        const left = point ? point.clientX - rootRect.left : rootRect.width / 2;
        const top = point ? point.clientY - rootRect.top - 14 : rootRect.height / 2;

        setPinTooltip({
          visible: true,
          text: pin.name,
          left,
          top,
        });
      });

      bindOverlayHover("overlayMouseMove", (eventArg: any) => {
        if (levelRef.current === "district") return;
        const overlay = resolveOverlayFromEventArg(eventArg);
        if (!overlay) return;

        const pin = pinByOverlayRef.current.get(overlay);
        if (!pin) return;

        const root = mapContainerRef.current;
        if (!root) return;

        const point = extractClientPointFromEventArg(eventArg);
        if (!point) return;

        const rootRect = root.getBoundingClientRect();
        setPinTooltip({
          visible: true,
          text: pin.name,
          left: point.clientX - rootRect.left,
          top: point.clientY - rootRect.top - 14,
        });
      });

      bindOverlayHover("overlayMouseOut", (eventArg: any) => {
        const overlay = resolveOverlayFromEventArg(eventArg);
        if (!overlay) return;
        const pin = pinByOverlayRef.current.get(overlay);
        if (!pin) return;
        setPinTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      });

      enterCountryLevel();
      setMapReady(true);
    })().catch((err) => {
      console.error("[Map] Longdo init failed", err);
    });

    return () => {
      cancelled = true;
      const map = mapRef.current;
      if (map && overlayClickHandler) {
        try {
          map.Event.unbind("overlayClick", overlayClickHandler);
        } catch {}
      }
      if (map && hoverBindings.length) {
        hoverBindings.forEach(({ eventName, handler }) => {
          try {
            map.Event.unbind(eventName, handler);
          } catch {}
        });
      }
      try {
        clearMask();
        clearOverlayList(markerOverlaysRef);
        clearOverlayList(districtOverlaysRef);
        clearOverlayList(provinceOverlaysRef);
      } catch {}
      try {
        leafletMarkerRef.current?.remove();
        leafletMarkerRef.current = null;
        leafletMapRef.current?.remove();
        leafletMapRef.current = null;
      } catch {}
      initializedRef.current = false;
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !initializedRef.current) return;

    if (!focusProvinceKey) {
      if (level !== "country") {
        enterCountryLevel();
      }
      return;
    }

    const province = provincesRef.current.find((feature) => isProvinceMatch(feature, focusProvinceKey));
    if (!province) return;

    const currentPro = selectedProvinceRef.current;
    if (!currentPro || currentPro !== province || level === "country") {
      enterProvinceLevel(province);
    }
  }, [focusProvinceKey, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    if (!focusSiteCenter) {
      ignoreFocusSiteKeyRef.current = null;
      if (levelRef.current === "district") {
        if (districtReturnLevelRef.current === "country") {
          enterCountryLevel();
        } else {
          const selectedProvince = selectedProvinceRef.current;
          if (selectedProvince) enterProvinceLevel(selectedProvince);
          else enterCountryLevel();
        }
      }
      return;
    }

    const focusKey = `${focusSiteCenter.lat},${focusSiteCenter.lng}`;
    if (ignoreFocusSiteKeyRef.current && ignoreFocusSiteKeyRef.current === focusKey) {
      return;
    }
    ignoreFocusSiteKeyRef.current = null;

    const matched = allSitePoints.find(
      (site) => site.lat === focusSiteCenter.lat && site.lng === focusSiteCenter.lng
    );

    if (matched) {
      handlePinSelection(matched, true);
      return;
    }

    enterDistrictLevel({ lon: focusSiteCenter.lng, lat: focusSiteCenter.lat }, true, null);
  }, [focusSiteCenter, mapReady, allSitePoints]);

  useEffect(() => {
    if (!mapReady || !initializedRef.current) return;
    if (level === "country") {
      addMarkers(null);
    } else if (level === "province") {
      addMarkers(selectedProvinceRef.current);
    }
  }, [allSitePoints, pinStatusBySite, mapReady, level]);

  useEffect(() => {
    if (level !== "district" || !districtViewState) return;
    const container = leafletContainerRef.current;
    if (!container) return;

    let map = leafletMapRef.current;
    if (!map) {
      map = L.map(container, {
        zoomControl: false,
        attributionControl: true,
        minZoom: 12,
        maxZoom: 18,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        minZoom: 2,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      leafletMapRef.current = map;
    }

    const target = districtViewState.center;
    map.setView([target.lat, target.lng], 14, { animate: true });
    map.setMinZoom(12);
    map.setMaxZoom(18);

    if (districtViewState.lockMapToCenter) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      map.touchZoom.disable();
      map.setView([target.lat, target.lng], map.getZoom(), { animate: false });
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.touchZoom.enable();
    }

    if (leafletMarkerRef.current) {
      leafletMarkerRef.current.remove();
      leafletMarkerRef.current = null;
    }
    if (leafletLevelMarkersRef.current.length) {
      leafletLevelMarkersRef.current.forEach((marker) => marker.remove());
      leafletLevelMarkersRef.current = [];
    }

    if (districtViewState.lockMapToCenter && districtViewState.markerSite) {
      const markerLat = districtViewState.markerSite.lat;
      const markerLng = districtViewState.markerSite.lng;
      const markerTitle = districtViewState.markerSite.name;

      leafletMarkerRef.current = L.marker([markerLat, markerLng], {
        title: markerTitle,
        icon: createLeafletSiteIcon(districtViewState.markerSite),
      }).addTo(map);

      leafletMarkerRef.current.bindTooltip(markerTitle, {
        direction: "top",
        offset: [0, -12],
      });
    } else {
      const pins = resolveLeafletMarkers();
      pins.forEach((site) => {
        const marker = L.marker([site.lat, site.lng], {
          title: site.name,
          icon: createLeafletSiteIcon(site),
        }).addTo(map);
        marker.bindTooltip(site.name, {
          direction: "top",
          offset: [0, -12],
        });
        leafletLevelMarkersRef.current.push(marker);
      });
    }

    window.setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 40);
  }, [level, districtViewState]);

  useEffect(() => {
    if (level === "district") return;

    try {
      leafletMarkerRef.current?.remove();
      leafletMarkerRef.current = null;
    } catch {}

    try {
      if (leafletLevelMarkersRef.current.length) {
        leafletLevelMarkersRef.current.forEach((marker) => marker.remove());
        leafletLevelMarkersRef.current = [];
      }
    } catch {}

    try {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    } catch {}

    try {
      if (leafletContainerRef.current) {
        leafletContainerRef.current.innerHTML = "";
      }
    } catch {}
  }, [level]);

  useEffect(() => {
    if (level === "district") return;
    const map = mapRef.current;
    if (!map) return;

    const t1 = window.setTimeout(() => {
      try {
        map.resize?.();
      } catch {}
      try {
        map.repaint?.();
      } catch {}
    }, 40);

    const t2 = window.setTimeout(() => {
      try {
        map.resize?.();
      } catch {}
      try {
        map.repaint?.();
      } catch {}
    }, 180);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [level]);

  const showZoomOut = level !== "country";
  const allowZoomOutButton = level === "district" ? true : !lockZoomOut || !!selectedPinRef.current;

  return (
    <div
      className="longdo-map-root relative"
      onClickCapture={handleLongdoRootClickCapture}
      onMouseMove={handleLongdoPointerMove}
      onMouseLeave={handleLongdoPointerLeave}
    >
      <style>{`
        .longdo-map-root .bps-leaflet-pin {
          background: transparent !important;
          border: 0 !important;
        }

        .longdo-map-root .bps-leaflet-pin-inner {
          display: inline-flex;
          width: 28px;
          height: 41px;
        }

        .longdo-map-root .bps-leaflet-pin-inner svg {
          display: block;
          width: 28px;
          height: 41px;
        }

        .longdo-map-root .ldmap_center_mark,
        .longdo-map-root .ldmap-center-mark,
        .longdo-map-root [class*="center"][class*="mark"],
        .longdo-map-root [class*="crosshair"],
        .longdo-map-root div[style*="position: absolute"][style*="left: 50%"][style*="top: 50%"][style*="transform"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }
      `}</style>
      <div
        ref={mapContainerRef}
        className={
          "relative z-0 h-[900px] w-full overflow-hidden rounded-lg bg-[#dff1ff] md:h-[750px] sm:h-[600px] transition-opacity duration-300" +
          (level === "district" ? " opacity-0 pointer-events-none" : " opacity-100")
        }
      />

      <div
        ref={leafletContainerRef}
        className={
          "absolute inset-0 z-10 h-[900px] w-full overflow-hidden rounded-lg md:h-[750px] sm:h-[600px] transition-opacity duration-300" +
          (level === "district" ? " opacity-100" : " opacity-0 pointer-events-none")
        }
      />

      <div
        className={
          "absolute z-30 pointer-events-none" + (pinTooltip.visible ? " block" : " hidden")
        }
        style={{
          left: pinTooltip.left,
          top: pinTooltip.top,
          transform: "translate(-50%, -100%)",
        }}
      >
        <div className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white shadow-lg whitespace-nowrap">
          {pinTooltip.text}
        </div>
      </div>

      {showZoomOut && allowZoomOutButton && (
        <div className="absolute left-3 top-3 z-20">
          <button type="button" title={t("map.zoomOut") || "Zoom out"} onClick={handleZoomOut} style={zoomOutButtonInlineStyle}>
            Zoom out
          </button>
        </div>
      )}
    </div>
  );
}
