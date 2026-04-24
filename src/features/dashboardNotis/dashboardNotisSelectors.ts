import { createSelector } from "@reduxjs/toolkit";
import { alertImage } from "../../assets";
import type { Noti } from "../../data/Dashboard/notis";
import { selectNotisFeedItems } from "../notisFeed";
import {
  buildNotiKeywordBag,
  resolveDefaultNotiImage,
  sortByNewest,
} from "../../utils/notis";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const FALL_KEYWORDS = [
  "notis.falldetected",
  "fall",
  "fall detected",
  "ตรวจพบคนล้ม",
  "คนล้ม",
];

const SLEEP_KEYWORDS = [
  "notis.sleepinglong",
  "sleep",
  "sleeping",
  "ตรวจพบคนหลับ",
  "หลับ",
  "นอนหลับ",
];

const EXCLUDED_KEYWORDS = [
  "notis.firedetected",
  "fire",
  "ไฟไหม้",
  "เพลิง",
  "notis.motiondetected",
  "motion",
  "เคลื่อนไหว",
  "ตรวจพบการเคลื่อนไหว",
  "offline",
  "camera offline",
  "device offline",
  "ออฟไลน์",
];

const includesAny = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const normalizeQuery = (value: string) => value.toLowerCase().trim();

const normalizeText = (value?: unknown) =>
  value === undefined || value === null ? undefined : String(value);

function isFaceOrPlateNoti(noti: Noti): boolean {
  const key = String(noti.titleKey || "").toLowerCase();
  return key === "notis.facedetected" || key === "notis.platedetected";
}

export function isDashboardWellBeingNoti(noti: Noti): boolean {
  const image = resolveDefaultNotiImage(noti);
  if (!image || image === alertImage) return false;

  const bag = buildNotiKeywordBag(noti);
  if (!bag) return false;
  if (includesAny(bag, EXCLUDED_KEYWORDS)) return false;
  if (!includesAny(bag, FALL_KEYWORDS) && !includesAny(bag, SLEEP_KEYWORDS)) {
    return false;
  }

  const type = String(noti.type || "").toLowerCase();
  const severity = String(noti.severity || "").toLowerCase();
  return (
    type === "alert" ||
    type === "warning" ||
    severity === "critical" ||
    severity === "medium"
  );
}

export function isDashboardZytaNoti(noti: Noti): boolean {
  const key = String(noti.titleKey || "").toLowerCase();
  return key.startsWith("zytanotis.");
}

export function toDashboardFaceRecognizeItem(noti: Noti): Noti {
  const meta = isRecord(noti.meta) ? noti.meta : {};
  const row = isRecord(meta.row) ? meta.row : {};
  const faceRow = isRecord(meta.faceRow) ? meta.faceRow : {};
  const device = isRecord(meta.device) ? meta.device : {};
  const deviceHeaders = isRecord(meta.deviceHeaders) ? meta.deviceHeaders : {};
  const person = isRecord(meta.person) ? meta.person : {};
  const key = String(noti.titleKey || noti.title || "").toLowerCase();
  const isFace = key.includes("facedetected");
  const isPlate = key.includes("platedetected");
  const occurredAt = noti.occurredAt ?? noti.date ?? new Date().toISOString();
  const rawId =
    normalizeText(meta.rawId) ??
    normalizeText(row.id) ??
    normalizeText(faceRow.id) ??
    noti.id ??
    occurredAt;
  const cameraName =
    normalizeText(meta.cameraName) ??
    normalizeText(device.name) ??
    normalizeText(deviceHeaders.deviceKey);
  const siteLabel =
    noti.site ?? normalizeText(meta.siteName) ?? normalizeText(meta.siteCode) ?? "-";
  const title = isFace
    ? normalizeText(person.fullName) ?? noti.title ?? "Face detected"
    : normalizeText(meta.plateText) ?? noti.title ?? "License plate detected";
  const img = isFace
    ? normalizeText(meta.faceCropImg) ??
      normalizeText(meta.faceFullImg) ??
      normalizeText(meta.picture) ??
      noti.img
    : normalizeText(meta.platePicture) ??
      normalizeText(meta.picture) ??
      noti.img;

  return {
    ...noti,
    id: rawId ?? noti.id ?? occurredAt,
    title,
    site: siteLabel,
    occurredAt,
    date: occurredAt,
    img,
    meta: {
      ...meta,
      kind: isPlate ? "plate" : "face",
      rawId,
      cameraName,
    },
  };
}

export function collectDashboardAlertEvents(
  items: ReadonlyArray<Noti>
): Noti[] {
  return sortByNewest([...items]);
}

export function collectDashboardWellBeingEvents(
  items: ReadonlyArray<Noti>
): Noti[] {
  return sortByNewest(items.filter(isDashboardWellBeingNoti));
}

export function collectDashboardZytaEvents(
  items: ReadonlyArray<Noti>
): Noti[] {
  return sortByNewest(items.filter(isDashboardZytaNoti));
}

export function collectDashboardFaceRecognizeItems(
  items: ReadonlyArray<Noti>
): Noti[] {
  return sortByNewest(
    items.filter(isFaceOrPlateNoti).map(toDashboardFaceRecognizeItem)
  );
}

export function filterDashboardAlertEvents(
  items: ReadonlyArray<Noti>,
  query: string
): Noti[] {
  const normalized = normalizeQuery(query);
  const sorted = sortByNewest([...items]);
  if (!normalized) return sorted;

  return sorted.filter((item) => {
    const haystack = [
      buildNotiKeywordBag(item),
      item.site,
      item.title,
      item.type,
      item.date,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export function filterDashboardWellBeingEvents(
  items: ReadonlyArray<Noti>,
  query: string
): Noti[] {
  const normalized = normalizeQuery(query);
  const sorted = sortByNewest([...items]);
  if (!normalized) return sorted;
  return sorted.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(normalized)
  );
}

export function filterDashboardZytaEvents(
  items: ReadonlyArray<Noti>,
  query: string
): Noti[] {
  const normalized = normalizeQuery(query);
  const sorted = sortByNewest([...items]);
  if (!normalized) return sorted;

  return sorted.filter((item) =>
    [item.titleKey, item.title, item.site, item.type, item.date]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
}

export function filterDashboardFaceRecognizeItems(
  items: ReadonlyArray<Noti>,
  query: string
): Noti[] {
  const normalized = normalizeQuery(query);
  const sorted = sortByNewest([...items]);
  if (!normalized) return sorted;
  return sorted.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(normalized)
  );
}

export function combineDashboardNotis(
  ...groups: Array<ReadonlyArray<Noti>>
): Noti[] {
  return sortByNewest(groups.flatMap((group) => [...group]));
}

export const selectDashboardRawNotis = selectNotisFeedItems;

export const selectDashboardAlertEventItems = createSelector(
  [selectDashboardRawNotis],
  (items) => collectDashboardAlertEvents(items)
);

export const selectDashboardWellBeingItems = createSelector(
  [selectDashboardRawNotis],
  (items) => collectDashboardWellBeingEvents(items)
);

export const selectDashboardZytaItems = createSelector(
  [selectDashboardRawNotis],
  (items) => collectDashboardZytaEvents(items)
);

export const selectDashboardFaceRecognizeItems = createSelector(
  [selectDashboardRawNotis],
  (items) => collectDashboardFaceRecognizeItems(items)
);
