// src/context/FaceRecContext.tsx
import React from "react";
import { listFaceRecEvents, faceRecStreamUrl, type FaceRecWebhookPayload } from "../api/facerec";
import type { Noti } from "../data/Dashboard/notis";
import { GREEN_BOX_SVG, type FaceScanRow, type LicensePlateRow } from "../components/FaceRec/faceRec.constant";

export type FaceRecEventDTO = {
  raw: FaceRecWebhookPayload;
  faceRow: FaceScanRow;
  dashboardNoti: Noti & { img?: string };
};

function dataUrl(b64?: string) {
  if (!b64) return undefined;
  return `data:image/jpeg;base64,${String(b64).replace(/^data:[^,]*,/, "").trim()}`;
}

function toFaceRow(raw: FaceRecWebhookPayload): FaceScanRow {
  const img = dataUrl(raw.picture) || GREEN_BOX_SVG;
  const iso = new Date(raw.dateTimestamp || Date.now()).toISOString();
  const gender = (String(raw.gender || "MALE").toUpperCase() as any) === "FEMALE" ? "FEMALE" : "MALE";
  return {
    id: raw.id,
    picture: img,
    fullName: raw.fullName || "-",
    gender,
    province: raw.province || "-",
    inout: "IN",
    timeInISO: iso,
    timeOutISO: iso,
    cameraName: (raw as any)?.cameraName || undefined,
  };
}

function toFaceNoti(raw: FaceRecWebhookPayload): Noti & { img?: string } {
  const img = dataUrl(raw.picture);
  const iso = new Date(raw.dateTimestamp || Date.now()).toISOString();
  const dateOnly = iso.slice(0, 10);
  return {
    type: "normal",
    img,
    titleKey: "notis.faceDetected",
    title: "Face detected",
    site: raw.province || "-",
    date: dateOnly,
  } as any;
}

function toPlateRow(raw: any): LicensePlateRow {
  const img = dataUrl(raw?.picture) || GREEN_BOX_SVG;
  const plateImg = dataUrl(raw?.platePicture) || img;
  const iso = new Date(raw?.dateTimestamp || raw?.timestamp || Date.now()).toISOString();
  return {
    id: raw?.id ?? String(Math.random()),
    picture: img,
    platePicture: plateImg,
    plateText: raw?.plateText ?? "-",
    province: raw?.province ?? "-",
    confidenceHeader: Array.isArray(raw?.confidenceHeader) && raw.confidenceHeader.length ? raw.confidenceHeader : ["-","-","-","-","-","-"],
    cameraName: raw?.cameraName ?? "-",
    timestamp: iso,
  } as any;
}

function toPlateNoti(row: LicensePlateRow): Noti & { img?: string } {
  return {
    type: "normal",
    img: row.platePicture || row.picture,
    titleKey: "notis.plateDetected",
    title: "License plate detected",
    site: row.province,
    date: row.timestamp.slice(0, 10),
  } as any;
}

export type FaceRecState = {
  dashboardNotis: ReadonlyArray<Noti & { img?: string }>;
  faceRows: ReadonlyArray<FaceScanRow>;
  faceList: ReadonlyArray<{ fullName?: string; gender?: string; timestamp?: string }>;
  faceDetail: { fullName: string; gender: string; province: string; status: string; timeIn: string; timeOut: string };
  plateRows: ReadonlyArray<LicensePlateRow>;
  plateList: ReadonlyArray<{ plate?: string; province?: string; timestamp?: string }>;
  plateDetail: { plate: string; province: string; type: string; owner: string; color: string; camera: string; timestamp: string };
  plateConfidenceHeader: ReadonlyArray<string>;
};

const defaultState: FaceRecState = {
  dashboardNotis: [],
  faceRows: [],
  faceList: [],
  faceDetail: { fullName: "-", gender: "-", province: "-", status: "-", timeIn: "-", timeOut: "-" },
  plateRows: [],
  plateList: [],
  plateDetail: { plate: "-", province: "-", type: "-", owner: "-", color: "-", camera: "-", timestamp: "-" },
  plateConfidenceHeader: ["-","-","-","-","-","-"],
};

const FaceRecCtx = React.createContext<FaceRecState>(defaultState);

export function FaceRecProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<FaceRecState>(defaultState);

  React.useEffect(() => {
    let es: EventSource | null = null;

    async function bootstrap() {
      try {
        const data = await listFaceRecEvents();
        const faceItems: any[] = Array.isArray((data as any)?.items) ? (data as any).items : [];
        const plateItems: any[] = Array.isArray((data as any)?.plateItems) ? (data as any).plateItems : [];
        const faceRows = faceItems.map((d: any) => (d?.faceRow ? d.faceRow : toFaceRow(d?.raw ?? d)));
        const plateRows = plateItems.map((p: any) => (p?.row ? p.row : toPlateRow(p?.raw ?? p)));
        const dashboardNotis = [
          ...faceItems.map((d: any) => (d?.dashboardNoti ? d.dashboardNoti : toFaceNoti(d?.raw ?? d))),
          ...plateRows.map((r) => toPlateNoti(r)),
        ];
        const latestFace = faceRows[faceRows.length - 1];
        setState((s) => ({
          ...s,
          faceRows,
          plateRows,
          dashboardNotis,
          faceList: faceRows.slice(-5).reverse().map((r) => ({ fullName: r.fullName, gender: r.gender, timestamp: new Date(r.timeInISO).toLocaleString() })),
          faceDetail: latestFace
            ? { fullName: latestFace.fullName, gender: latestFace.gender, province: latestFace.province, status: latestFace.inout, timeIn: new Date(latestFace.timeInISO).toLocaleString(), timeOut: new Date(latestFace.timeOutISO).toLocaleString() }
            : s.faceDetail,
          plateList: plateRows.slice(-5).reverse().map((r) => ({ plate: r.plateText, province: r.province, timestamp: new Date(r.timestamp).toLocaleString() })),
          plateDetail: plateRows.length ? { plate: plateRows[plateRows.length-1].plateText, province: plateRows[plateRows.length-1].province, type: "-", owner: "-", color: "-", camera: plateRows[plateRows.length-1].cameraName, timestamp: new Date(plateRows[plateRows.length-1].timestamp).toLocaleString() } : s.plateDetail,
          plateConfidenceHeader: plateRows.length ? plateRows[plateRows.length-1].confidenceHeader : s.plateConfidenceHeader,
        }));
      } catch {}

      try {
        const url = faceRecStreamUrl();
        es = new EventSource(url, { withCredentials: true } as any);

        const handlePayload = (ev: MessageEvent) => {
          try {
            const parsed = JSON.parse(ev.data || "{}");
            const type = String(parsed?.type || "");
            if (type === "plate") {
              const row = (parsed?.payload?.row) ?? toPlateRow(parsed?.payload?.raw ?? parsed?.payload ?? parsed);
              setState((prev) => {
                const plateRows = [...prev.plateRows, row].slice(-100);
                return {
                  ...prev,
                  plateRows,
                  plateList: plateRows.slice(-5).reverse().map((r) => ({ plate: r.plateText, province: r.province, timestamp: new Date(r.timestamp).toLocaleString() })),
                  plateDetail: { plate: row.plateText, province: row.province, type: "-", owner: "-", color: "-", camera: row.cameraName, timestamp: new Date(row.timestamp).toLocaleString() },
                  plateConfidenceHeader: row.confidenceHeader || prev.plateConfidenceHeader,
                  dashboardNotis: [...prev.dashboardNotis, toPlateNoti(row)].slice(-100),
                };
              });
              return;
            }
            const dto = parsed?.payload as any;
            const raw = dto?.raw ?? parsed?.raw ?? parsed;
            const next = dto?.faceRow ? dto : { raw, faceRow: toFaceRow(raw), dashboardNoti: toFaceNoti(raw) };
            setState((prev) => {
              const faceRows = [...prev.faceRows, next.faceRow].slice(-100);
              const latest = faceRows[faceRows.length - 1];
              return {
                ...prev,
                faceRows,
                faceList: faceRows.slice(-5).reverse().map((r) => ({ fullName: r.fullName, gender: r.gender, timestamp: new Date(r.timeInISO).toLocaleString() })),
                faceDetail: latest ? { fullName: latest.fullName, gender: latest.gender, province: latest.province, status: latest.inout, timeIn: new Date(latest.timeInISO).toLocaleString(), timeOut: new Date(latest.timeOutISO).toLocaleString() } : prev.faceDetail,
                dashboardNotis: [...prev.dashboardNotis, next.dashboardNoti].slice(-100),
              };
            });
          } catch {}
        };

        // Backend emits named event: "facerec"; listen explicitly
        es.addEventListener("facerec", handlePayload as any);
        // Fallback: if server switches to default event, keep this too
        es.onmessage = handlePayload as any;
      } catch {}
    }

    bootstrap();
    return () => {
      try { es?.close?.(); } catch {}
    };
  }, []);

  return <FaceRecCtx.Provider value={state}>{children}</FaceRecCtx.Provider>;
}

export function useFaceRec() {
  return React.useContext(FaceRecCtx);
}
