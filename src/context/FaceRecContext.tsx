// src/context/FaceRecContext.tsx
import React from "react";
import { listFaceRecEvents, faceRecStreamUrl, type FaceRecWebhookPayload } from "../api/facerec";
import type { Noti } from "../data/Dashboard/notis";
import { useNotisFeed } from "./NotisContext";
import { sortByNewest } from "../utils/notis";
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
  const { items: notisItems } = useNotisFeed();

  const derivedFromNotis = React.useMemo(() => {
    const faces: FaceScanRow[] = [];
    const faceNotis: Array<Noti & { img?: string }> = [];
    const plates: LicensePlateRow[] = [];
    const plateNotis: Array<Noti & { img?: string }> = [];

    sortByNewest(notisItems).forEach((n) => {
      const meta = (n.meta ?? {}) as any;
      const kind = (meta?.kind ?? "").toString().toLowerCase();
      if (kind === "face") {
        const occurred = new Date(n.occurredAt ?? n.date ?? Date.now()).toISOString();
        const person = meta?.person ?? {};
        const id = `noti-face-${n.id ?? meta?.rawId ?? occurred}`;
        const genderRaw = String(person.gender || "").toUpperCase();
        const row: FaceScanRow = {
          id,
          picture: (n.img as string) || meta?.picture || GREEN_BOX_SVG,
          fullName: person.fullName ?? n.title ?? "-",
          gender: genderRaw === "FEMALE" ? "FEMALE" : "MALE",
          province: meta?.province ?? n.site ?? "-",
          inout: meta?.inout ?? "IN",
          timeInISO: occurred,
          timeOutISO: occurred,
          cameraName: meta?.cameraName ?? meta?.camera ?? undefined,
        };
        faces.push(row);
        faceNotis.push({
          ...n,
          img: (n.img as string) || meta?.picture,
          type: n.type,
          occurredAt: occurred,
        } as any);
      } else if (kind === "plate") {
        const occurred = new Date(n.occurredAt ?? n.date ?? Date.now()).toISOString();
        const id = `noti-plate-${n.id ?? meta?.rawId ?? occurred}`;
        const confidenceHeader = Array.isArray(meta?.confidenceHeader) && meta.confidenceHeader.length
          ? meta.confidenceHeader
          : ["-","-","-","-","-","-"];
        const row: LicensePlateRow = {
          id,
          picture: meta?.picture || (n.img as string) || GREEN_BOX_SVG,
          platePicture: meta?.platePicture || meta?.picture || (n.img as string) || GREEN_BOX_SVG,
          plateText: meta?.plateText ?? meta?.plate ?? n.title ?? "-",
          province: meta?.province ?? n.site ?? "-",
          confidenceHeader,
          cameraName: meta?.cameraName ?? meta?.camera ?? "-",
          timestamp: occurred,
        };
        plates.push(row);
        plateNotis.push({
          ...n,
          img: row.platePicture,
          occurredAt: occurred,
        } as any);
      }
    });

    return {
      faceRows: faces,
      faceDashboard: faceNotis,
      plateRows: plates,
      plateDashboard: plateNotis,
    };
  }, [notisItems]);

  const mergeById = <T,>(
    base: ReadonlyArray<T>,
    extra: ReadonlyArray<T>,
    getId: (item: T) => string,
    getTime: (item: T) => number
  ): T[] => {
    const map = new Map<string, T>();
    base.forEach((item) => map.set(getId(item), item));
    extra.forEach((item) => map.set(getId(item), item));
    return Array.from(map.values()).sort((a, b) => getTime(b) - getTime(a));
  };

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

  const combinedFaceRows = React.useMemo(
    () =>
      mergeById(
        state.faceRows,
        derivedFromNotis.faceRows,
        (r) => r.id,
        (r) => new Date(r.timeInISO).getTime()
      ),
    [state.faceRows, derivedFromNotis.faceRows]
  );

  const combinedPlateRows = React.useMemo(
    () =>
      mergeById(
        state.plateRows,
        derivedFromNotis.plateRows,
        (r) => r.id,
        (r) => new Date(r.timestamp).getTime()
      ),
    [state.plateRows, derivedFromNotis.plateRows]
  );

  const combinedDashboardNotis = React.useMemo(
    () =>
      mergeById(
        state.dashboardNotis,
        [...derivedFromNotis.faceDashboard, ...derivedFromNotis.plateDashboard],
        (n) => String(n.id ?? `${n.site}-${n.date}-${n.titleKey ?? n.title}`),
        (n) => new Date((n as any).occurredAt ?? n.date).getTime()
      ),
    [state.dashboardNotis, derivedFromNotis.faceDashboard, derivedFromNotis.plateDashboard]
  );

  const faceList = React.useMemo(
    () =>
      combinedFaceRows
        .slice(-5)
        .reverse()
        .map((r) => ({
          fullName: r.fullName,
          gender: r.gender,
          timestamp: new Date(r.timeInISO).toLocaleString(),
        })),
    [combinedFaceRows]
  );

  const plateList = React.useMemo(
    () =>
      combinedPlateRows
        .slice(-5)
        .reverse()
        .map((r) => ({
          plate: r.plateText,
          province: r.province,
          timestamp: new Date(r.timestamp).toLocaleString(),
        })),
    [combinedPlateRows]
  );

  const latestFace = combinedFaceRows[combinedFaceRows.length - 1];
  const latestPlate = combinedPlateRows[combinedPlateRows.length - 1];

  const value: FaceRecState = {
    dashboardNotis: combinedDashboardNotis.slice(-100),
    faceRows: combinedFaceRows,
    faceList,
    faceDetail: latestFace
      ? {
          fullName: latestFace.fullName,
          gender: latestFace.gender,
          province: latestFace.province,
          status: latestFace.inout,
          timeIn: new Date(latestFace.timeInISO).toLocaleString(),
          timeOut: new Date(latestFace.timeOutISO).toLocaleString(),
        }
      : state.faceDetail,
    plateRows: combinedPlateRows,
    plateList,
    plateDetail: latestPlate
      ? {
          plate: latestPlate.plateText,
          province: latestPlate.province,
          type: "-",
          owner: "-",
          color: "-",
          camera: latestPlate.cameraName,
          timestamp: new Date(latestPlate.timestamp).toLocaleString(),
        }
      : state.plateDetail,
    plateConfidenceHeader: latestPlate?.confidenceHeader ?? state.plateConfidenceHeader,
  };

  return <FaceRecCtx.Provider value={value}>{children}</FaceRecCtx.Provider>;
}

export function useFaceRec() {
  return React.useContext(FaceRecCtx);
}
