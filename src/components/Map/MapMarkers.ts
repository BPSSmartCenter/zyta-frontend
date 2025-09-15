// src/components/Map/MapMarkers.ts
import L from "leaflet";
import type { Noti, Severity, NotiType } from "../../data/Dashboard/notis";
import type { SeverityFilter } from "./MapTypes";

/** สร้าง DivIcon พินสีเรียบ */
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
    iconAnchor: [9, 18], // ปลายพินชี้พิกัด
  });
}

/** สีตาม NotiType (fallback เมื่อไม่มี severity) */
function getPinByType(type?: NotiType) {
  switch (type) {
    case "alert":
      return makePin("#EF4444"); // แดง
    case "warning":
      return makePin("#F97316"); // ส้ม
    case "info":
      return makePin("#3B82F6"); // ฟ้า
    case "normal":
    default:
      return makePin("#06B6D4"); // cyan
  }
}

/** สีตาม Severity (ใช้เป็นหลัก) */
function getPinBySeverity(sev?: Severity) {
  switch (sev) {
    case "critical":
      return makePin("#EF4444"); // แดง
    case "medium":
      return makePin("#F97316"); // ส้ม
    case "low":
      return makePin("#3B82F6"); // ฟ้า
    default:
      return makePin("#06B6D4"); // ไม่มี severity → ค่าเริ่มต้น
  }
}

/** เลือกพิน: ถ้ามี severity ใช้อันนั้นก่อน, ไม่มีก็ใช้ type */
function getPinForNoti(n: Noti) {
  return n.severity ? getPinBySeverity(n.severity) : getPinByType(n.type);
}

/** ฟิลเตอร์ความรุนแรงแบบ typed */
function severityPass(n: Noti, filter?: SeverityFilter): boolean {
  if (!filter || filter === "all") return true;
  return n.severity === filter;
}

/** รวมเหตุการณ์ล่าสุดต่อ 1 site (เวลาลงหมุดแบบ aggregate) */
function groupBySiteLatest(notis: Noti[]): Noti[] {
  const m = new Map<string, Noti>();
  for (const n of notis) {
    const prev = m.get(n.site);
    if (!prev) {
      m.set(n.site, n);
    } else if (new Date(n.date).getTime() > new Date(prev.date).getTime()) {
      m.set(n.site, n);
    }
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

/**
 * วาดหมุดลงแผนที่
 */
export function renderMarkers(
  _map: L.Map,
  layerGroup: L.LayerGroup | null,
  notisIn: Noti[] | unknown,
  aggregateBySite: boolean,
  severityFilter: SeverityFilter,
  _provinceCenters: Record<string, L.LatLngLiteral>,
  t: (key: string, opts?: any) => string
) {
  void _map;
  void _provinceCenters;
  // ✅ ใช้ layerGroup ให้ถูกตัว (เวอร์ชันก่อนหน้าพิมพ์เป็น layer ทำให้ undefined)
  if (!layerGroup) return;

  const notis: Noti[] = Array.isArray(notisIn) ? (notisIn as Noti[]) : [];

  // เคลียร์ของเก่าก่อน
  try {
    layerGroup.clearLayers();
  } catch {}

  // 1) คัดเฉพาะที่มี coords + ผ่าน severity filter
  let list = notis.filter((n) => !!n.coords && severityPass(n, severityFilter));

  // 2) ถ้าต้องการ aggregate ให้เหลือล่าสุดต่อ site
  if (aggregateBySite) list = groupBySiteLatest(list);

  // 3) วาดหมุด
  list.forEach((n) => {
    const { lat, lng } = n.coords!; // ผ่าน filter แล้ว จึง non-null

    const marker = L.marker([lat, lng], {
      icon: getPinForNoti(n),
      pane: "markersPane", // อยู่เหนือ dim/shade
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

    marker.addTo(layerGroup);

    marker.bindTooltip(labelHtml, {
      direction: "top",
      permanent: false, // hover เท่านั้น
      sticky: true,
      opacity: 1,
      className: "marker-label",
      pane: "markerLabels", // ป้ายอยู่ชั้นสูงกว่าหมุด
      offset: L.point(0, -14),
    });
  });
}
