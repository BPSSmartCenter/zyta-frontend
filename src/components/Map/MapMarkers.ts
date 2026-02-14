// src/components/Map/MapMarkers.ts
import L from "leaflet";
import type { Noti, Severity, NotiType } from "../../data/Dashboard/notis";
import type { SeverityFilter, SitePoint, SitePinStatus } from "./MapTypes";

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
  sitePoints: SitePoint[] | undefined,
  pinStatusBySite: Record<string, SitePinStatus> | undefined,
  t: (key: string, opts?: any) => string,
  onPinClick?: (site: SitePoint) => void,
  pane?: string,
  clipBounds?: L.LatLngBounds | null
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

  // โหมด A: ถ้ามี sitePoints → วาดหมุดทุกไซต์ แล้วระบายสีตาม noti ล่าสุด (ผ่าน filter) ถ้ามี
  if (Array.isArray(sitePoints) && sitePoints.length > 0) {
    // สร้างดัชนีเหตุการณ์ล่าสุดต่อ site (ตามชื่อ noti.site)
    let pool = notis.filter((n) => severityPass(n, severityFilter));
    if (aggregateBySite) pool = groupBySiteLatest(pool);
    const latestBySiteName = new Map<string, Noti>();
    for (const n of pool) {
      const key = String(n.site ?? "");
      if (!key) continue;
      const prev = latestBySiteName.get(key);
      if (!prev || new Date(n.date).getTime() > new Date(prev.date).getTime()) {
        latestBySiteName.set(key, n);
      }
    }

    const siteLabel = t("map.site", { defaultValue: "Site" });
    const dateLabel = t("map.date", { defaultValue: "Date" });
    const NEUTRAL = makePin("#003a81ff");
    const ELECTRIC_OK = makePin("#16A34A");
    const ELECTRIC_DOWN = makePin("#EF4444");

    sitePoints.forEach((sp) => {
      // If clipBounds provided, skip pins outside the bounds (hide neighbor province pins)
      if (clipBounds && !clipBounds.contains(L.latLng(sp.lat, sp.lng))) return;

      const n = latestBySiteName.get(String(sp.name));
      const statusByCode = sp.code ? pinStatusBySite?.[String(sp.code)] : undefined;
      const statusById = sp.id ? pinStatusBySite?.[String(sp.id)] : undefined;
      const statusByName = pinStatusBySite?.[String(sp.name)];
      const electricStatus = statusByCode ?? statusById ?? statusByName;

      let icon = n ? getPinForNoti(n) : NEUTRAL;
      if (electricStatus?.hasElectric) {
        icon = electricStatus.electricOffline > 0 ? ELECTRIC_DOWN : ELECTRIC_OK;
      }
      const markerOpts: L.MarkerOptions = { icon };
      if (pane) markerOpts.pane = pane;
      const marker = L.marker([sp.lat, sp.lng], markerOpts);

      // Pin click → trigger Level 3 (3D) transition
      if (onPinClick) {
        marker.on("click", (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          onPinClick(sp);
        });
      }

      marker.addTo(layerGroup);

      if (n) {
        const title = n.titleKey
          ? t(n.titleKey, { defaultValue: n.title })
          : n.title;
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
        marker.bindTooltip(labelHtml, {
          direction: "top",
          permanent: false,
          sticky: true,
          opacity: 1,
          className: "marker-label",
          offset: L.point(0, -14),
        });
      } else {
        // ไม่มีเหตุการณ์ → แสดง badge แค่ชื่อ Site ด้วยสไตล์เดิม
        const labelHtml = `
          <div style="
            background:#000; color:#fff;
            border-radius:8px; padding:6px 8px;
            box-shadow:0 4px 12px rgba(0,0,0,.45);
            pointer-events:none; white-space:nowrap;
          ">
            <div style="font-weight:700;font-size:12px">${sp.name}</div>
          </div>
        `;
        marker.bindTooltip(labelHtml, {
          direction: "top",
          permanent: false,
          sticky: true,
          opacity: 1,
          className: "marker-label",
          offset: L.point(0, -14),
        });
      }
    });
    return;
  }

  // โหมด B (ย้อนกลับได้): ไม่มี sitePoints → วาดตาม noti ที่มี coords แบบเดิม
  let list = notis.filter((n) => !!n.coords && severityPass(n, severityFilter));
  if (aggregateBySite) list = groupBySiteLatest(list);
  list.forEach((n) => {
    const { lat, lng } = n.coords!;
    const mOpts: L.MarkerOptions = { icon: getPinForNoti(n) };
    if (pane) mOpts.pane = pane;
    const marker = L.marker([lat, lng], mOpts);
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
        <div style=\"font-weight:700;font-size:12px;margin-bottom:2px\">${title}</div>
        <div style=\"font-size:11px;opacity:.9\">${siteLabel}: ${n.site}</div>
        <div style=\"font-size:11px;opacity:.9\">${dateLabel}: ${fmtDate(
      n.date as any
    )}</div>
      </div>
    `;
    marker.addTo(layerGroup);
    marker.bindTooltip(labelHtml, {
      direction: "top",
      permanent: false,
      sticky: true,
      opacity: 1,
      className: "marker-label",
      offset: L.point(0, -14),
    });
  });
}
