// src/context/FaceRecContext.tsx
import React from "react";
import { listFaceRecEvents, faceRecStreamUrl, type FaceRecWebhookPayload, type PlateWebhookPayload } from "../features/facerec";
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
  const full = dataUrl((raw as any)?.fullFrame) || dataUrl(raw.picture) || GREEN_BOX_SVG;
  const crop = dataUrl((raw as any)?.cropPicture) || full || GREEN_BOX_SVG;
  const iso = new Date(raw.dateTimestamp || Date.now()).toISOString();
  const gender = (String(raw.gender || "MALE").toUpperCase() as any) === "FEMALE" ? "FEMALE" : "MALE";
  const siteCode = (raw as any)?.siteCode ?? (raw as any)?.site ?? undefined;
  const siteName = (raw as any)?.siteName ?? (raw as any)?.site ?? undefined;
  const siteId = (raw as any)?.siteId ?? (raw as any)?.site_id ?? undefined;
  return {
    id: raw.id,
    picture: crop || full,
    fullFrame: full || crop,
    fullName: raw.fullName || "-",
    gender,
    province: raw.province || "-",
    siteCode: siteCode || raw.province || undefined,
    siteName: siteName || raw.province || undefined,
    siteId: siteId ? String(siteId) : undefined,
    inout: "IN",
    timeInISO: iso,
    timeOutISO: iso,
    cameraName: (raw as any)?.cameraName || undefined,
  };
}

function toFaceNoti(raw: FaceRecWebhookPayload): Noti & { img?: string } {
  const frame = dataUrl((raw as any)?.fullFrame) || dataUrl(raw.picture);
  const crop = dataUrl((raw as any)?.cropPicture) || frame;
  const img = crop || frame;
  const iso = new Date(raw.dateTimestamp || Date.now()).toISOString();
  const dateOnly = iso.slice(0, 10);
  const siteCode = (raw as any)?.siteCode ?? (raw as any)?.site ?? raw.province;
  const siteId = (raw as any)?.siteId ?? (raw as any)?.site_id;
  const siteName = (raw as any)?.siteName ?? (raw as any)?.site;
  return {
    type: "normal",
    img,
    titleKey: "notis.faceDetected",
    title: "Face detected",
    site: siteCode || raw.province || "-",
    meta: {
      kind: "face",
      rawId: raw.id ?? raw.fullName ?? dateOnly,
      siteCode: siteCode ?? null,
      siteId: siteId ?? null,
      siteName: siteName ?? null,
      province: raw.province ?? null,
      faceCropImg: crop || img || null,
      faceFullImg: frame || crop || img || null,
    },
    occurredAt: iso,
    date: dateOnly,
  } as any;
}

function toPlateRow(raw: PlateWebhookPayload | (PlateWebhookPayload & { timestamp?: string }) | any): LicensePlateRow {
  const img = dataUrl(raw?.picture) || GREEN_BOX_SVG;
  const plateImg = dataUrl(raw?.platePicture) || img;
  const iso = new Date(raw?.dateTimestamp || raw?.timestamp || Date.now()).toISOString();
  const siteCode = raw?.siteCode ?? raw?.site ?? undefined;
  const siteName = raw?.siteName ?? raw?.site ?? undefined;
  const siteId = raw?.siteId ?? raw?.site_id ?? undefined;
  return {
    id: raw?.id ?? String(Math.random()),
    picture: img,
    platePicture: plateImg,
    plateText: raw?.plateText ?? "-",
    province: raw?.province ?? "-",
    siteCode: siteCode || raw?.province || undefined,
    siteName: siteName || raw?.province || undefined,
    siteId: siteId ? String(siteId) : undefined,
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
    site: row.siteCode || row.province,
    meta: {
      kind: "plate",
      rawId: row.id ?? row.plateText ?? row.timestamp,
      siteCode: row.siteCode ?? null,
      siteId: row.siteId ?? null,
      siteName: row.siteName ?? null,
      province: row.province ?? null,
    },
    occurredAt: row.timestamp,
    date: row.timestamp.slice(0, 10),
  } as any;
}

const cleanImage = (val?: string | null): string | undefined => {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  return trimmed.length ? trimmed : undefined;
};

const pickFaceCropImage = (meta: any): string | undefined => {
  const candidates = [
    meta?.faceCropImg,
    meta?.cropImg,
    meta?.crop,
    meta?.face?.cropImg,
    meta?.face?.crop,
    meta?.faceRow?.cropImg,
    meta?.faceRow?.cropPicture,
    meta?.faceRow?.crop,
  ];
  for (const candidate of candidates) {
    const img = cleanImage(candidate);
    if (img) return img;
  }
  return undefined;
};

const pickFaceFrameImage = (meta: any, fallback?: string): string | undefined => {
  const candidates = [
    meta?.faceFullImg,
    meta?.fullFrame,
    meta?.frameImg,
    meta?.picture,
    meta?.faceRow?.fullFrame,
    meta?.faceRow?.frame,
    fallback,
  ];
  for (const candidate of candidates) {
    const img = cleanImage(candidate);
    if (img) return img;
  }
  return undefined;
};

const sortFaceRowsDesc = (rows: ReadonlyArray<FaceScanRow>) =>
  [...rows].sort(
    (a, b) =>
      new Date(b.timeInISO).getTime() - new Date(a.timeInISO).getTime()
  );

const sortPlateRowsDesc = (rows: ReadonlyArray<LicensePlateRow>) =>
  [...rows].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

const sortNotisDesc = (list: ReadonlyArray<Noti & { img?: string }>) =>
  [...list].sort(
    (a, b) =>
      new Date((b as any).occurredAt ?? b.date).getTime() -
      new Date((a as any).occurredAt ?? a.date).getTime()
  );

const dedupeItems = <T,>(items: ReadonlyArray<T>, makeKey: (item: T) => string): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  items.forEach((item) => {
    const key = makeKey(item) || "";
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
};

const faceRowKey = (row: FaceScanRow) =>
  [
    "face",
    row?.id ?? "",
    row?.fullName ?? "",
    row?.timeInISO ?? "",
    row?.cameraName ?? "",
  ]
    .map((part) => String(part).trim())
    .join("|");

const plateRowKey = (row: LicensePlateRow) =>
  [
    "plate",
    row?.id ?? "",
    row?.plateText ?? "",
    row?.timestamp ?? "",
    row?.cameraName ?? "",
  ]
    .map((part) => String(part).trim())
    .join("|");

const notiKey = (n: Noti & { img?: string }) =>
  [
    "noti",
    (n as any)?.meta?.rawId ?? (n as any)?.id ?? "",
    (n as any)?.occurredAt ?? n.date ?? "",
    (n as any)?.titleKey ?? (n as any)?.title ?? "",
    typeof n.img === "string" ? n.img.slice(0, 64) : "",
  ]
    .map((part) => String(part).trim())
    .join("|");

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
        const rawId =
          meta?.faceRow?.id ??
          meta?.rawId ??
          meta?.person?.id ??
          meta?.person?.rawId ??
          n.id;
        const id = String(rawId ?? occurred);
        const genderRaw = String(person.gender || "").toUpperCase();
        const frameImg =
          pickFaceFrameImage(meta, cleanImage(n.img as string) || cleanImage(meta?.picture)) ||
          GREEN_BOX_SVG;
        const cropImg = pickFaceCropImage(meta) || frameImg;
        const avatarImg = cropImg || frameImg || GREEN_BOX_SVG;
        const siteCode =
          meta?.siteCode ??
          meta?.site_code ??
          meta?.site?.code ??
          n.siteCode ??
          n.site ??
          undefined;
        const siteName =
          meta?.siteName ??
          meta?.site_name ??
          meta?.site?.name ??
          n.siteName ??
          n.site ??
          undefined;
        const siteId =
          meta?.siteId ??
          meta?.site_id ??
          meta?.site?.id ??
          n.siteId ??
          (n as any)?.site_id ??
          undefined;
        const row: FaceScanRow = {
          id,
          picture: avatarImg,
          fullFrame: frameImg || avatarImg,
          fullName: person.fullName ?? n.title ?? "-",
          gender: genderRaw === "FEMALE" ? "FEMALE" : "MALE",
          province: meta?.province ?? n.site ?? "-",
          siteCode: siteCode ?? meta?.province ?? n.site ?? undefined,
          siteName: siteName ?? meta?.province ?? n.site ?? undefined,
          siteId: siteId ? String(siteId) : undefined,
          inout: meta?.inout ?? "IN",
          timeInISO: occurred,
          timeOutISO: occurred,
          cameraName: meta?.cameraName ?? meta?.camera ?? undefined,
        };
        faces.push(row);
        const metaClone =
          meta && typeof meta === "object" && !Array.isArray(meta) ? { ...meta } : { ...(meta ?? {}) };
        metaClone.faceCropImg = avatarImg;
        metaClone.faceFullImg = frameImg;
        if (!metaClone.siteCode) metaClone.siteCode = siteCode ?? null;
        if (!metaClone.siteName) metaClone.siteName = siteName ?? null;
        if (!metaClone.siteId) metaClone.siteId = siteId ?? null;
        faceNotis.push({
          ...n,
          img: avatarImg,
          type: n.type,
          meta: metaClone,
          occurredAt: occurred,
        } as any);
      } else if (kind === "plate") {
        const occurred = new Date(n.occurredAt ?? n.date ?? Date.now()).toISOString();
        const rawId =
          meta?.row?.id ??
          meta?.rawId ??
          meta?.plateId ??
          (meta?.plate ?? meta?.plateText) ??
          n.id;
        const id = String(rawId ?? occurred);
        const confidenceHeader = Array.isArray(meta?.confidenceHeader) && meta.confidenceHeader.length
          ? meta.confidenceHeader
          : ["-","-","-","-","-","-"];
        const siteCode =
          meta?.siteCode ??
          meta?.site_code ??
          meta?.site?.code ??
          n.siteCode ??
          n.site ??
          undefined;
        const siteName =
          meta?.siteName ??
          meta?.site_name ??
          meta?.site?.name ??
          n.siteName ??
          n.site ??
          undefined;
        const siteId =
          meta?.siteId ??
          meta?.site_id ??
          meta?.site?.id ??
          n.siteId ??
          (n as any)?.site_id ??
          undefined;
        const row: LicensePlateRow = {
          id,
          picture: meta?.picture || (n.img as string) || GREEN_BOX_SVG,
          platePicture: meta?.platePicture || meta?.picture || (n.img as string) || GREEN_BOX_SVG,
          plateText: meta?.plateText ?? meta?.plate ?? n.title ?? "-",
          province: meta?.province ?? n.site ?? "-",
          siteCode: siteCode ?? meta?.province ?? n.site ?? undefined,
          siteName: siteName ?? meta?.province ?? n.site ?? undefined,
          siteId: siteId ? String(siteId) : undefined,
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

  const combinedFaceRows = React.useMemo(() => {
    const merged = [...derivedFromNotis.faceRows, ...state.faceRows];
    return sortFaceRowsDesc(dedupeItems(merged, faceRowKey));
  }, [state.faceRows, derivedFromNotis.faceRows]);

  const combinedPlateRows = React.useMemo(() => {
    const merged = [...derivedFromNotis.plateRows, ...state.plateRows];
    return sortPlateRowsDesc(dedupeItems(merged, plateRowKey));
  }, [state.plateRows, derivedFromNotis.plateRows]);

  const combinedDashboardNotis = React.useMemo(() => {
    const merged = [
      ...state.dashboardNotis,
      ...derivedFromNotis.faceDashboard,
      ...derivedFromNotis.plateDashboard,
    ];
    return sortNotisDesc(dedupeItems(merged, notiKey));
  }, [
    state.dashboardNotis,
    derivedFromNotis.faceDashboard,
    derivedFromNotis.plateDashboard,
  ]);

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
