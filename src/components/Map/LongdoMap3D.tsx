import { useEffect, useMemo, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };

declare global {
  interface Window {
    longdo?: any;
  }
}

const DEFAULT_LONGDO_KEY = "014d3a8670f605c055dfadcbb59a35a2";

let longdoScriptPromise: Promise<void> | null = null;

export function loadLongdoMap3(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.longdo) return Promise.resolve();
  if (longdoScriptPromise) return longdoScriptPromise;

  longdoScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-longdo="map3"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Longdo Map script"))
      );
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.longdo = "map3";
    script.src = `https://api.longdo.com/map3/?key=${encodeURIComponent(key)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Longdo Map script"));
    document.head.appendChild(script);
  });

  return longdoScriptPromise;
}

export function resolveLongdoKey(apiKey?: string) {
  const envKey = (import.meta as any)?.env?.VITE_LONGDO_MAP_KEY as
    | string
    | undefined;
  return apiKey || envKey || DEFAULT_LONGDO_KEY;
}

export function preloadLongdoMap3(apiKey?: string) {
  return loadLongdoMap3(resolveLongdoKey(apiKey));
}

type Props = {
  apiKey?: string;
  center: LatLng;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  pitch?: number;
  interactive?: boolean;
  markerLocation?: LatLng | null;
  markerTitle?: string;
  markerDetail?: string;
  markerColor?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
};

export default function LongdoMap3D({
  apiKey,
  center,
  zoom = 11,
  minZoom = 15,
  maxZoom = 19,
  pitch = 45,
  interactive = false,
  markerLocation,
  markerTitle,
  markerDetail,
  markerColor,
  onReady,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const markerRef = useRef<any>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const blockerRef = useRef<HTMLDivElement | null>(null);
  const markerElementRef = useRef<HTMLElement | null>(null);
  const hoverHandlersRef = useRef<{
    enter?: (ev: MouseEvent) => void;
    leave?: () => void;
    move?: (ev: MouseEvent) => void;
    click?: (ev: MouseEvent) => void;
  }>({});

  // Refs to hold latest marker props so init effect can read current values
  const latestMarkerLocationRef = useRef(markerLocation);
  const latestMarkerTitleRef = useRef(markerTitle);
  const latestMarkerDetailRef = useRef(markerDetail);
  const latestMarkerColorRef = useRef(markerColor);
  latestMarkerLocationRef.current = markerLocation;
  latestMarkerTitleRef.current = markerTitle;
  latestMarkerDetailRef.current = markerDetail;
  latestMarkerColorRef.current = markerColor;

  const key = useMemo(() => resolveLongdoKey(apiKey), [apiKey]);

  const renderTooltip = (
    title?: string,
    detail?: string,
    bgColor?: string,
    visible = false,
    position?: { left: number; top: number }
  ) => {
    if (!tooltipRef.current) return;
    if (!visible || !title) {
      tooltipRef.current.style.display = "none";
      return;
    }

    tooltipRef.current.innerHTML = `
      <div style="
        background:${bgColor || "#000"}; color:#fff;
        border-radius:8px; padding:6px 8px;
        box-shadow:0 4px 12px rgba(0,0,0,.45);
        pointer-events:none; white-space:nowrap;
      ">
        <div style="font-weight:700;font-size:12px;${detail ? "margin-bottom:2px" : ""}">${title}</div>
        ${detail ? `<div style="font-size:11px;opacity:.9">${detail}</div>` : ""}
      </div>
    `;

    if (position) {
      tooltipRef.current.style.left = `${position.left}px`;
      tooltipRef.current.style.top = `${position.top}px`;
      tooltipRef.current.style.transform = "translate(-50%, -100%)";
    }

    tooltipRef.current.style.display = "block";
  };

  const hideTooltip = () => renderTooltip(undefined, undefined, undefined, false);

  const detachMarkerHoverHandlers = () => {
    const markerEl = markerElementRef.current;
    const handlers = hoverHandlersRef.current;
    if (markerEl) {
      try {
        if (handlers.enter) markerEl.removeEventListener("mouseenter", handlers.enter);
        if (handlers.leave) markerEl.removeEventListener("mouseleave", handlers.leave);
        if (handlers.move) markerEl.removeEventListener("mousemove", handlers.move);
        if (handlers.click) markerEl.removeEventListener("click", handlers.click);
      } catch {}
    }
    markerElementRef.current = null;
    hoverHandlersRef.current = {};
    hideTooltip();
  };

  const markerTooltipPosition = (ev: MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { left: 0, top: 0 };
    const rect = container.getBoundingClientRect();
    return {
      left: ev.clientX - rect.left,
      top: ev.clientY - rect.top - 14,
    };
  };

  const markerTooltipPositionFromElement = (el: HTMLElement) => {
    const container = containerRef.current;
    if (!container) return { left: 0, top: 0 };
    const containerRect = container.getBoundingClientRect();
    const markerRect = el.getBoundingClientRect();
    return {
      left: markerRect.left - containerRect.left + markerRect.width / 2,
      top: markerRect.top - containerRect.top - 10,
    };
  };

  // Helper function to add marker with hover tooltip
  const addMarkerToMap = (
    map: any,
    longdo: any,
    location: LatLng,
    title?: string,
    detail?: string,
    color?: string
  ) => {
    if (!map || !longdo) return;

    detachMarkerHoverHandlers();

    // Remove previous marker
    if (markerRef.current) {
      try {
        if (typeof map.Overlays?.remove === "function") {
          map.Overlays.remove(markerRef.current);
        }
      } catch {}
      markerRef.current = null;
    }

    try {
      // Create custom pin icon as data URL
      const pinColor = color || "#003a81";
      const pinSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="41" viewBox="0 0 28 41">
  <path d="M14 0c7.732 0 14 6.268 14 14 0 9.941-14 27-14 27S0 23.941 0 14C0 6.268 6.268 0 14 0z" fill="${pinColor}"/>
  <circle cx="14" cy="13.5" r="6" fill="#FFFFFF"/>
</svg>`;
      const iconUrl = "data:image/svg+xml;base64," + btoa(pinSvg);

      const markerOpts: any = {
        icon: {
          url: iconUrl,
          offset: { x: 14, y: 41 },
        },
      };

      const marker = new longdo.Marker(
        { lon: location.lng, lat: location.lat },
        markerOpts
      );

      if (typeof map.Overlays?.add === "function") {
        map.Overlays.add(marker);
      }
      markerRef.current = marker;

      // Bind marker element hooks
      setTimeout(() => {
        const container = containerRef.current;
        if (!container) return;

        const markerElements = container.querySelectorAll(
          'img[src^="data:image/svg+xml;base64"], img[src^="data:image/svg"]'
        );
        const markerEl = markerElements[markerElements.length - 1] as HTMLElement | undefined;
        if (!markerEl) return;

        markerElementRef.current = markerEl;
        markerEl.style.pointerEvents = "auto";

        if (interactive && title) {
          markerEl.style.cursor = "pointer";
          const onEnter = (ev: MouseEvent) => {
            renderTooltip(title, detail, pinColor, true, markerTooltipPosition(ev));
          };
          const onMove = (ev: MouseEvent) => {
            renderTooltip(title, detail, pinColor, true, markerTooltipPosition(ev));
          };
          const onLeave = () => {
            hideTooltip();
          };

          markerEl.addEventListener("mouseenter", onEnter);
          markerEl.addEventListener("mousemove", onMove);
          markerEl.addEventListener("mouseleave", onLeave);
          hoverHandlersRef.current = { enter: onEnter, move: onMove, leave: onLeave };
        } else if (!interactive && title) {
          markerEl.style.cursor = "pointer";
          const onClick = () => {
            const currentlyVisible = tooltipRef.current?.style.display === "block";
            if (currentlyVisible) {
              hideTooltip();
            } else {
              renderTooltip(
                title,
                detail,
                pinColor,
                true,
                markerTooltipPositionFromElement(markerEl)
              );
            }
          };
          markerEl.addEventListener("click", onClick as unknown as EventListener);
          hoverHandlersRef.current = { click: onClick as unknown as (ev: MouseEvent) => void };
        }
      }, 120);
    } catch (e) {
      console.error("[LongdoMap3D] failed to add marker", e);
      hideTooltip();
    }
  };

  useEffect(() => {
    let cancelled = false;
    let wheelHandler: (() => void) | null = null;
    let eventApi: any = null;
    let clampZoomRef: (() => void) | null = null;

    (async () => {
      if (!containerRef.current) return;
      try {
        await loadLongdoMap3(key);
        if (cancelled) return;

        // Clean any previous instance attached to this DOM node.
        try {
          containerRef.current.innerHTML = "";
        } catch {}

        const longdo = window.longdo;
        if (!longdo) return;

        mapRef.current = new longdo.Map({
          placeholder: containerRef.current,
          location: { lon: center.lng, lat: center.lat },
          zoom,
          minZoom,
          maxZoom,
          pitch,
        });

        const readZoom = () => {
          try {
            if (typeof mapRef.current?.zoom === "function") return Number(mapRef.current.zoom());
            if (typeof mapRef.current?.Zoom === "function") return Number(mapRef.current.Zoom());
          } catch {}
          return NaN;
        };

        const writeZoom = (z: number) => {
          try {
            if (typeof mapRef.current?.zoom === "function") {
              mapRef.current.zoom(z);
              return;
            }
            if (typeof mapRef.current?.Zoom === "function") {
              mapRef.current.Zoom(z);
            }
          } catch {}
        };

        const clampZoom = () => {
          const z = readZoom();
          if (!Number.isFinite(z)) return;
          if (z < minZoom) writeZoom(minZoom);
          else if (z > maxZoom) writeZoom(maxZoom);
        };
        clampZoomRef = clampZoom;

        // Clamp once after init, then keep clamping on wheel/gesture events.
        setTimeout(clampZoom, 0);
        wheelHandler = () => setTimeout(clampZoom, 0);
        containerRef.current.addEventListener("wheel", wheelHandler, { passive: true });

        eventApi = mapRef.current?.Event;
        if (eventApi && typeof eventApi.bind === "function") {
          eventApi.bind("zoom", clampZoom);
          eventApi.bind("drop", clampZoom);
        }

        initializedRef.current = true;
        setMapInitialized(true);
        onReady?.();

        // Add initial marker if location is already provided
        // Read from refs to get the LATEST prop values (not stale closure values)
        const latestLoc = latestMarkerLocationRef.current;
        if (latestLoc) {
          setTimeout(() => {
            addMarkerToMap(
              mapRef.current,
              longdo,
              latestLoc,
              latestMarkerTitleRef.current,
              latestMarkerDetailRef.current,
              latestMarkerColorRef.current
            );
          }, 100);
        }
      } catch (e) {
        // Best-effort: fail silently so the UI doesn't crash.
        console.error("[LongdoMap3D] init failed", e);
        onError?.(e as Error);
      }
    })();

    return () => {
      cancelled = true;
      initializedRef.current = false;
      setMapInitialized(false);
      // Longdo map doesn't have a documented destroy method in all builds;
      // removing DOM content is enough to release the canvas in practice.
      try {
        detachMarkerHoverHandlers();
        if (containerRef.current && wheelHandler) {
          containerRef.current.removeEventListener("wheel", wheelHandler as EventListener);
        }
        if (eventApi && typeof eventApi.unbind === "function" && clampZoomRef) {
          eventApi.unbind("zoom", clampZoomRef);
          eventApi.unbind("drop", clampZoomRef);
        }
        mapRef.current = null;
      } catch {}
      try {
        if (containerRef.current) containerRef.current.innerHTML = "";
      } catch {}
    };
  }, [key, zoom, minZoom, maxZoom, pitch]);

  useEffect(() => {
    if (!initializedRef.current || !mapRef.current) return;

    try {
      const map = mapRef.current;
      const longdo = window.longdo;
      if (!longdo) return;

      // Use location() method to pan to new center
      if (typeof map.location === "function") {
        map.location({ lon: center.lng, lat: center.lat }, true);
      }
    } catch (e) {
      console.error("[LongdoMap3D] failed to update center", e);
    }
  }, [center.lat, center.lng]);

  // Effect to manage marker overlay
  // Depends on mapInitialized (state) so it re-runs after async init completes
  useEffect(() => {
    if (!mapInitialized || !initializedRef.current || !mapRef.current) return;

    const map = mapRef.current;
    const longdo = window.longdo;
    if (!longdo) return;

    if (markerLocation) {
      addMarkerToMap(map, longdo, markerLocation, markerTitle, markerDetail, markerColor);
    } else {
      // Remove marker if no location
      if (markerRef.current) {
        try {
          if (typeof map.Overlays?.remove === "function") {
            map.Overlays.remove(markerRef.current);
          }
        } catch {}
        markerRef.current = null;
      }
      detachMarkerHoverHandlers();
    }
  }, [mapInitialized, markerLocation?.lat, markerLocation?.lng, markerTitle, markerDetail, markerColor]);

  useEffect(() => {
    if (interactive) return;
    const blocker = blockerRef.current;
    if (!blocker) return;

    const onBlockerClick = (ev: MouseEvent) => {
      if (!markerTitle) return;
      const markerEl = markerElementRef.current;
      const container = containerRef.current;
      if (!markerEl || !container) return;

      const markerRect = markerEl.getBoundingClientRect();
      const insideX = ev.clientX >= markerRect.left - 16 && ev.clientX <= markerRect.right + 16;
      const insideY = ev.clientY >= markerRect.top - 16 && ev.clientY <= markerRect.bottom + 16;
      if (!(insideX && insideY)) return;

      const currentlyVisible = tooltipRef.current?.style.display === "block";
      if (currentlyVisible) {
        hideTooltip();
        return;
      }

      renderTooltip(
        markerTitle,
        markerDetail,
        markerColor || "#003a81",
        true,
        markerTooltipPositionFromElement(markerEl)
      );
    };

    blocker.addEventListener("click", onBlockerClick);
    return () => blocker.removeEventListener("click", onBlockerClick);
  }, [interactive, markerTitle, markerDetail, markerColor]);

  return (
    <div className="longdo-map3d-root relative h-full w-full rounded-lg">
      <style>{`
        /* Hide common control containers (MapLibre/Mapbox-style) */
        .longdo-map3d-root :where(.mapboxgl-control-container, .maplibregl-control-container, .mapboxgl-ctrl, .maplibregl-ctrl) {
          display: none !important;
        }
        /* Hide Longdo's default red crosshair center marker - comprehensive approach */
        .longdo-map3d-root .ldmap_center_mark,
        .longdo-map3d-root .ldmap-center-mark,
        .longdo-map3d-root [class*="center"][class*="mark"],
        .longdo-map3d-root [class*="crosshair"],
        .longdo-map3d-root canvas + div[style*="position: absolute"][style*="pointer-events: none"],
        .longdo-map3d-root canvas ~ div[style*="position: absolute"][style*="width: 100%"][style*="height: 100%"] > div:first-child,
        .longdo-map3d-root div[style*="position: absolute"][style*="left: 50%"][style*="top: 50%"][style*="transform"],
        .longdo-map3d-root img[src*="crosshair"],
        .longdo-map3d-root img[src*="center"][src*="mark"],
        .longdo-map3d-root svg[style*="position: absolute"][style*="pointer-events: none"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }
        /* Target any small centered element that looks like a crosshair */
        .longdo-map3d-root > div > div[style*="position: absolute"] > div[style*="width"][style*="height"] {
          display: none !important;
        }
      `}</style>

      <div ref={containerRef} className="h-full w-full rounded-lg" />

      {/* Custom tooltip for hover */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none"
        style={{
          display: "none",
          left: "50%",
          top: "45%",
          transform: "translate(-50%, -100%)",
          zIndex: 1000,
        }}
      />

      {!interactive && (
        <div
          ref={blockerRef}
          className="absolute inset-0 z-10"
          style={{ background: "transparent" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
