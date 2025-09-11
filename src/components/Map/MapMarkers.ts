// src/components/Map/MapMarkers.ts
import L from "leaflet";
import type { Noti } from "../../data/Dashboard/notis";

function makePin(color: string) {
  return L.divIcon({
    className: "custom-pin",
    html: `
      <div>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 28 36">
      <!-- body -->
      <path d="M14 0c7.732 0 14 6.268 14 14 0 9.941-14 22-14 22S0 23.941 0 14C0 6.268 6.268 0 14 0z"
            fill="${color}"/>
      <!-- highlight -->
      <path d="M7 6.5c2-2.4 4.8-3.8 7-4-3.6.8-6.6 3.2-8 7-.2.4-.8.4-1 .1-.2-.3-.1-.7.2-1.1.6-1 1.1-1.6 1.8-2z"
            fill=""/>
      <!-- white dot -->
      <circle cx="14" cy="13.5" r="6" fill="#FFFFFF"/>
    </svg>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function getPinByType(type: string | undefined) {
  switch (type) {
    case "alert":
      return makePin("#EF4444"); // แดง
    case "warning":
      return makePin("#F97316"); // ส้ม
    case "info":
      return makePin("#3B82F6"); // ฟ้า
    default:
      return makePin("#06B6D4"); // ค่าเริ่มต้น (cyan เดิม)
  }
}

function severityPass(n: Noti, filter?: string): boolean {
  if (!filter || filter === "all") return true;
  return (n as any).severity === filter;
}

function groupBySiteLatest(notis: Noti[]): Noti[] {
  const m = new Map<string, Noti>();
  for (const n of notis) {
    const prev = m.get(n.site);
    if (!prev) m.set(n.site, n);
    else if (new Date(n.date).getTime() > new Date(prev.date).getTime())
      m.set(n.site, n);
  }
  return [...m.values()];
}

function fmtDate(d: string, locale?: string) {
  const dt = new Date(d);
  if (isNaN(+dt)) return d;
  return dt.toLocaleDateString(locale || undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function renderMarkers(
  _map: L.Map,
  layer: L.LayerGroup | null,
  notis: Noti[],
  aggregateBySite: boolean | undefined,
  severityFilter: string | undefined,
  _provinceCenters: Record<string, L.LatLngLiteral>,
  t: (k: string, opts?: any) => string
) {
  if (!layer) return;

  layer.clearLayers();

  let list = notis.filter((n) => !!n.coords && severityPass(n, severityFilter));
  if (aggregateBySite) list = groupBySiteLatest(list);

  list.forEach((n) => {
    const { lat, lng } = n.coords;
    const marker = L.marker([lat, lng], {
      icon: getPinByType(n.type),
      pane: "markersPane",
    });

    const title = n.titleKey
      ? t(n.titleKey, { defaultValue: n.title })
      : n.title;
    const siteLabel = t("map.site", { defaultValue: "Site" });
    const dateLabel = t("map.date", { defaultValue: "Date" });

    const labelHtml = `
      <div style="
        background:#000; color:#fff;
        border-radius:8px; padding:6px 8px;
        box-shadow:0 4px 12px rgba(0,0,0,.45);
        pointer-events:none; white-space:nowrap;
      ">
        <div style="font-weight:700;font-size:12px;margin-bottom:2px">${title}</div>
        <div style="font-size:11px;opacity:.9">${siteLabel}: ${n.site}</div>
        <div style="font-size:11px;opacity:.9">${dateLabel}: ${fmtDate(
      n.date as any
    )}</div>
      </div>
    `;

    marker.addTo(layer);

    marker.bindTooltip(labelHtml, {
      direction: "top",
      permanent: false, // hover only
      sticky: true,
      opacity: 1,
      className: "marker-label",
      pane: "markerLabels",
      offset: L.point(0, -14),
    });
  });
}
