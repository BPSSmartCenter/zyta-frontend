import L from "leaflet";
import type { ViewState } from "./MapTypes";
import { extractRingsLatLng } from "./MapUtils";
import {
  styleDistrictDefault,
  styleDistrictHover,
  styleSubdistrictDefault,
} from "./MapStyles";

/** โหลด “อำเภอ” ของจังหวัด */
export function loadDistrictsForProvince(
  map: L.Map,
  pro_code: string,
  _nameTH: string | undefined,
  ringsProv: L.LatLngExpression[][] | undefined,
  pushView: (state: ViewState) => void,
  setMaskByRings: (rings: L.LatLngExpression[][]) => void,
  loadSubdistrictsForDistrictCb: (
    amp_code: string,
    ringsDist?: L.LatLngExpression[][]
  ) => void,
  setDistrictsLayer: (layer: L.GeoJSON<any> | null) => void,
  setSubdistrictsLayer: (layer: L.GeoJSON<any> | null) => void,
  beginAnimation?: () => boolean,
  endAnimation?: () => void,
  registerMoveEnd?: (cb: () => void) => void
) {
  if (!map) return;

  if (setDistrictsLayer) setDistrictsLayer(null);
  if (setSubdistrictsLayer) setSubdistrictsLayer(null);

  fetch("/data/districts.geojson")
    .then((r) => r.json())
    .then((allDistricts) => {
      const filtered = {
        type: "FeatureCollection",
        features: (allDistricts.features || []).filter(
          (f: any) => String(f.properties?.pro_code) === String(pro_code)
        ),
      };

      const dLayer = L.geoJSON(filtered as any, {
        style: styleDistrictDefault,
        onEachFeature: (feature, layer) => {
          const ampCode = feature?.properties?.amp_code as string | undefined;
          const ampTH = feature?.properties?.amp_th as string | undefined;

          layer.on("mouseover", () =>
            (layer as L.Path).setStyle(styleDistrictHover)
          );
          layer.on("mouseout", () =>
            (layer as L.Path).setStyle(styleDistrictDefault)
          );
          if (ampTH)
            (layer as any).bindTooltip(ampTH, {
              sticky: true,
              direction: "top",
              opacity: 0.98,
            });

          // คลิกอำเภอ → เข้า “ทุกตำบลในอำเภอ”
          layer.on("click", () => {
            if (!ampCode) return;
            if (beginAnimation && !beginAnimation()) return;

            const currentCenter = map.getCenter();
            const currentZoom = map.getZoom();
            const bb = (dLayer as any).getBounds() as L.LatLngBounds;
            const toLiteral: L.LatLngBoundsLiteral = [
              [bb.getSouthWest().lat, bb.getSouthWest().lng],
              [bb.getNorthEast().lat, bb.getNorthEast().lng],
            ];
            pushView({
              bounds: toLiteral,
              center: { lat: currentCenter.lat, lng: currentCenter.lng },
              zoom: currentZoom,
              padding: [12, 12],
              maxZoom: 10,
              level: "province",
              rings: ringsProv,
            });

            const ringsDist = extractRingsLatLng((feature as any).geometry);
            setMaskByRings(ringsDist);

            // ทำให้ชั้นอำเภอทั้งชั้น “จางลงเล็กน้อย” เมื่อเจาะเข้ามา
            (dLayer as L.GeoJSON).setStyle({ fillOpacity: 0.12 });

            const b = (layer as any).getBounds() as L.LatLngBounds;
            map.flyToBounds(b, {
              animate: true,
              padding: [10, 10],
              maxZoom: 12,
              duration: 0.6,
            });
            const done = () => endAnimation?.();
            if (registerMoveEnd) registerMoveEnd(done);
            else map.once("moveend", done);

            loadSubdistrictsForDistrictCb(ampCode, ringsDist);
          });
        },
      }).addTo(map);

      setDistrictsLayer(dLayer);
    });
}

/** โหลด “ตำบล” ของอำเภอ */
export function loadSubdistrictsForDistrict(
  map: L.Map,
  amp_code: string,
  ringsDist: L.LatLngExpression[][] | undefined,
  pushView: (state: ViewState) => void,
  setMaskByRings: (rings: L.LatLngExpression[][]) => void,
  setSubdistrictsLayer: (layer: L.GeoJSON<any> | null) => void,
  beginAnimation?: () => boolean,
  endAnimation?: () => void,
  registerMoveEnd?: (cb: () => void) => void
) {
  if (!map) return;

  if (setSubdistrictsLayer) setSubdistrictsLayer(null);

  fetch("/data/subdistricts.geojson")
    .then((r) => r.json())
    .then((allSubs) => {
      const feats = (allSubs.features || []) as any[];
      const withAmp = feats.filter((f) => f.properties?.amp_code !== undefined);
      const filtered = withAmp.filter(
        (f) => String(f.properties?.amp_code) === String(amp_code)
      );
      const collection = {
        type: "FeatureCollection",
        features: filtered.length ? filtered : feats.slice(0, 0),
      };

      const sLayer = L.geoJSON(collection as any, {
        style: styleSubdistrictDefault,
        onEachFeature: (feature, layer) => {
          const tamTH = feature?.properties?.tam_th as string | undefined;
          if (tamTH)
            (layer as any).bindTooltip(tamTH, {
              sticky: true,
              direction: "top",
              opacity: 0.95,
              offset: L.point(0, -14),
            });

          // คลิกตำบล → zoom เจาะเฉพาะตำบล + ถมรอบข้างทั้งหมด
          layer.on("click", () => {
            if (beginAnimation && !beginAnimation()) return;
            const currentCenter = map.getCenter();
            const currentZoom = map.getZoom();
            const ringsTam = extractRingsLatLng((feature as any).geometry);
            const bb = (sLayer as any).getBounds() as L.LatLngBounds;
            const toLiteral: L.LatLngBoundsLiteral = [
              [bb.getSouthWest().lat, bb.getSouthWest().lng],
              [bb.getNorthEast().lat, bb.getNorthEast().lng],
            ];

            pushView({
              bounds: toLiteral,
              center: { lat: currentCenter.lat, lng: currentCenter.lng },
              zoom: currentZoom,
              padding: [10, 10],
              maxZoom: 12,
              level: "district",
              rings: ringsDist,
            });

            setMaskByRings(ringsTam);

            // เมื่อเจาะ “ระดับตำบล” ให้ชั้นอำเภอทั้งชั้นจางลงอีกนิด
            try {
              (map as any)._layers &&
                Object.values((map as any)._layers).forEach((ly: any) => {
                  if (ly && ly.feature && ly.feature.properties?.amp_code) {
                    (ly as L.Path).setStyle({ fillOpacity: 0.1 });
                  }
                });
            } catch {}

            const b = (layer as any).getBounds() as L.LatLngBounds;
            map.flyToBounds(b, {
              animate: true,
              padding: [10, 10],
              maxZoom: 14,
              duration: 0.6,
            });
            const done = () => endAnimation?.();
            if (registerMoveEnd) registerMoveEnd(done);
            else map.once("moveend", done);
          });
        },
      }).addTo(map);

      setSubdistrictsLayer(sLayer);
    });
}
