import L from "leaflet";

export function makeSvgPin(color: string, size = 32) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${
    size * 1.25
  }" viewBox="0 0 32 40">
    <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="rgba(0,0,0,0.35)"/></filter></defs>
    <g filter="url(#shadow)">
      <path d="M16 2 C9.924 2 5 6.924 5 13c0 7.5 8.2 14.5 10.1 16.1a1.5 1.5 0 0 0 1.8 0C19.8 27.5 28 20.5 28 13 28 6.924 23.076 2 17 2h-1z" fill="${color}"/>
      <circle cx="16" cy="13" r="5.2" fill="#ffffffff"/>
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

export function normalizeSeverity(
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

export function responsivePadding(containerW: number, containerH: number, vw?: number) {
  const side = Math.max(1, Math.min(containerW, containerH));
  const basePad = Math.max(10, Math.round(side * 0.04));
  const vww = vw ?? containerW;
  const padY =
    vww >= 375 && vww <= 510
      ? Math.max(basePad, Math.round(side * 0.38))
      : basePad;
  return { x: basePad, y: padY };
}

export function zoomForExactHeight(
  map: L.Map,
  boundsExpr: L.LatLngBoundsExpression,
  innerHeight: number
) {
  const b = L.latLngBounds(boundsExpr as any);
  const MIN_Z = 2, MAX_Z = 19;
  let lo = MIN_Z, hi = MAX_Z;
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

export function extractRingsLatLng(geo: any): L.LatLngExpression[][] {
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
