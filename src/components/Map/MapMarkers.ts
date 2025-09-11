import L from "leaflet";

type RenderMarkersOptions = {
  showPins?: boolean;
  preferNotisMarkers?: boolean;
  t: (k: string, o?: any) => string;
  provinceCenters: Record<string, L.LatLngLiteral>;
  aggregateBySite?: boolean;
  severityFilter?: string | null;
};

function getLatLngForNoti(
  noti: any,
  siteCoords?: Record<string, { lat: number; lng: number }>,
  provinceCenters?: Record<string, L.LatLngLiteral>
): L.LatLngLiteral | null {
  if (typeof noti?.lat === "number" && typeof noti?.lng === "number") {
    return { lat: noti.lat, lng: noti.lng };
  }
  if (noti?.site && siteCoords?.[noti.site]) {
    return siteCoords[noti.site];
  }
  if (noti?.province && provinceCenters?.[noti.province]) {
    return provinceCenters[noti.province];
  }
  return null;
}

export function renderMarkers(
  map: L.Map,
  layerRef: L.LayerGroup | null,
  notis: any[],
  siteCoords: Record<string, { lat: number; lng: number }> | undefined,
  aggregateBySite: boolean | undefined,
  severityFilter: string | null | undefined,
  provinceCenters: Record<string, L.LatLngLiteral>,
  t: (k: string, o?: any) => string,
  opt?: Partial<RenderMarkersOptions>
) {
  const { showPins = true, preferNotisMarkers = true } = opt || {};
  if (!layerRef) return;

  console.groupCollapsed("[MapMarkers] render");
  console.debug("input:", {
    showPins,
    preferNotisMarkers,
    notisCount: notis?.length ?? 0,
    severityFilter,
  });

  layerRef.clearLayers();
  if (!showPins) {
    console.debug("showPins=false → skip drawing markers");
    console.groupEnd();
    return;
  }

  const markers: Array<{ latlng: L.LatLngLiteral; data: any }> = [];

  if (preferNotisMarkers) {
    for (const n of notis || []) {
      if (severityFilter && n?.severity && n.severity !== severityFilter) {
        continue;
      }
      const latlng = getLatLngForNoti(n, siteCoords, provinceCenters);
      if (!latlng) continue;
      markers.push({ latlng, data: n });
    }
  } else if (siteCoords) {
    if (aggregateBySite) {
      for (const [name, latlng] of Object.entries(siteCoords)) {
        const related = (notis || []).filter((n) => n.site === name);
        markers.push({ latlng, data: { site: name, notis: related } });
      }
    } else {
      for (const [name, latlng] of Object.entries(siteCoords)) {
        markers.push({ latlng, data: { site: name } });
      }
    }
  }

  console.debug("markers after filter:", markers.length);
  if (!markers.length) {
    console.warn("[MapMarkers] No markers to draw");
  }

  markers.forEach((m) => {
    const icon = L.divIcon({
      className: "map-pin",
      html: `
        <div style="
          width:18px;height:18px;border-radius:50%;
          background:#0ea5e9;border:2px solid #fff;
          box-shadow:0 0 0 2px rgba(14,165,233,.25);
        "></div>`,
      iconAnchor: [9, 9],
    });

    const marker = L.marker(m.latlng, {
      icon,
      pane: "markersPane",    // ✅ ให้อยู่บนสุด
      zIndexOffset: 2000,     // ✅ ดันเพิ่ม
      bubblingMouseEvents: true,
    }).addTo(layerRef);

    const title =
      (m.data?.titleKey && t(m.data.titleKey)) ||
      m.data?.title ||
      t("dashboard:notis.unknown");

    const siteText = m.data?.site ? `<div><b>Site:</b> ${m.data.site}</div>` : "";
    const dateText = m.data?.date ? `<div><b>Date:</b> ${m.data.date}</div>` : "";

    marker.bindPopup(
      `<div class="bps-popup">
         <div class="bps-popup-title">${title}</div>
         <div class="bps-popup-sub">${siteText}${dateText}</div>
       </div>`,
      { className: "bps-popup-wrap", closeButton: true }
    );
  });

  console.groupEnd();
}
