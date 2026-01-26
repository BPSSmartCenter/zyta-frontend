// src/utils/notis.ts
import type { Noti, Severity } from "../data/Dashboard/notis";
import {
  fireNoti,
  fallingNoti,
  sleepingNoti,
  deviceNoti,
  motionNoti,
  alertImage,
  insuranceImage,
  faceImage,
  plateImage,
} from "../assets/index";

type DateValueLike = { y: number; m: number; d: number };

const pad2 = (v: number) => v.toString().padStart(2, "0");

export type DateKeyInput = string | Date | DateValueLike | null | undefined;

export const toDateKey = (input: DateKeyInput): string | null => {
  if (input == null) return null;

  const fromDate = (value: Date) => {
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(
      value.getDate()
    )}`;
  };

  if (input instanceof Date) {
    return fromDate(input);
  }

  if (
    typeof input === "object" &&
    "y" in input &&
    "m" in input &&
    "d" in input
  ) {
    const { y, m, d } = input as DateValueLike;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  const str = String(input).trim();
  if (!str) return null;

  // parse string first so ISO timestamps (UTC) ถูกตีความเป็นเวลา local ก่อน
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const localKey = fromDate(parsed);
    if (localKey) return localKey;
  }

  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  return null;
};

const collectSiteHints = (input: any): string[] => {
  const raw = [
    input?.site,
    input?.siteId,
    input?.site_id,
    input?.siteCode,
    input?.site_code,
    input?.siteName,
    input?.site_name,
    input?.siteLabel,
    input?.site_label,
    input?.province,
    input?.province_code,
    input?.provinceCode,
    input?.cameraSite,
    input?.group,
    input?.group_code,
    input?.groupCode,
    input?.groupName,
    input?.location,
    input?.location_code,
    input?.locationCode,
    input?.locationName,
    input?.site?.id,
    input?.site?.code,
    input?.site?.name,
    input?.meta?.siteCode,
    input?.meta?.site,
    input?.meta?.site_id,
    input?.meta?.site_code,
    input?.meta?.siteName,
    input?.meta?.location,
  ];
  return Array.from(
    new Set(
      raw
        .filter((val) => typeof val === "string" && val.trim().length)
        .map((val) => val.trim())
    )
  );
};

export const collectSiteKeys = (n: Noti | Record<string, any>): string[] =>
  collectSiteHints(n);

export const matchesSiteInfo = (
  info: Record<string, any>,
  siteCode?: string | null
): boolean => {
  if (!siteCode || siteCode === "all") return true;
  const code = String(siteCode).toLowerCase();
  return collectSiteHints(info)
    .map((k) => k.toLowerCase())
    .includes(code);
};

export const matchesSite = (
  n: Noti,
  siteCode?: string | null
): boolean => matchesSiteInfo(n as Record<string, any>, siteCode);

const lowered = (value?: any) =>
  typeof value === "string" ? value.toLowerCase() : String(value ?? "").toLowerCase();

export const buildNotiKeywordBag = (
  n: Partial<Noti> | Record<string, any>
): string =>
  [
    (n as any)?.titleKey,
    (n as any)?.title,
    (n as any)?.detail,
    (n as any)?.type,
    (n as any)?.subtype,
    (n as any)?.category,
    (n as any)?.event,
    (n as any)?.label,
    (n as any)?.severity,
    (n as any)?.meta?.eventKey,
    (n as any)?.meta?.event,
    (n as any)?.meta?.category,
    (n as any)?.meta?.label,
    (n as any)?.meta?.kind,
    (n as any)?.meta?.alertType,
    JSON.stringify((n as any)?.meta ?? {}),
  ]
    .filter(Boolean)
    .map((v) => lowered(v))
    .join(" ");

export type AlertEventKey =
  | "fire"
  | "motion"
  | "offline"
  | "fall"
  | "sleep"
  | "face"
  | "plate";

const FIRE_KEYWORDS = [
  "notis.firedetected",
  "fire",
  "fire detected",
  "ไฟ",
  "ไฟไหม้",
  "เพลิง",
];
const MOTION_KEYWORDS = [
  "notis.motiondetected",
  "motion",
  "motion detected",
  "movement",
  "เคลื่อนไหว",
  "ตรวจพบการเคลื่อนไหว",
];
const OFFLINE_KEYWORDS = [
  "notis.cameraoffline",
  "notis.deviceoffline",
  "camera offline",
  "device offline",
  "offline",
  "ออฟไลน์",
];
const FALL_KEYWORDS = [
  "notis.falldetected",
  "fall",
  "ตก",
  "ล้ม",
  "ตรวจพบคนล้ม",
];
const SLEEP_KEYWORDS = [
  "notis.sleepinglong",
  "notis.sleepdetected",
  "sleepdetected",
  "sleep detected",
  "sleep",
  "sleeping",
  "นอน",
  "หลับ",
  "ตรวจพบคนหลับ",
];
const FACE_KEYWORDS = [
  "notis.facedetected",
  "face",
  "ใบหน้า",
  "จดจำใบหน้า",
];
const PLATE_KEYWORDS = [
  "notis.platedetected",
  "plate",
  "license",
  "ทะเบียน",
];

const containsKeyword = (text: string, keywords: string[]) => {
  if (!text) return false;
  return keywords.some((kw) => text.includes(kw));
};

const DIRECT_EVENT_MAP: Record<string, AlertEventKey> = {
  "notis.firedetected": "fire",
  "notis.fireDetected": "fire",
  "fire": "fire",
  "ไฟไหม้": "fire",
  "เพลิงไหม้": "fire",
  "เพลิง": "fire",
  "blaze": "fire",
  "notis.motiondetected": "motion",
  "notis.motionDetected": "motion",
  "motion": "motion",
  "ตรวจพบการเคลื่อนไหว": "motion",
  "ตรวจจับการเคลื่อนไหว": "motion",
  "movement": "motion",
  "notis.cameraoffline": "offline",
  "notis.deviceoffline": "offline",
  "notis.cameraOffline": "offline",
  "notis.deviceOffline": "offline",
  "camera offline": "offline",
  "device offline": "offline",
  "offline": "offline",
  "กล้องออฟไลน์": "offline",
  "ออฟไลน์": "offline",
  "notis.falldetected": "fall",
  "notis.fallDetected": "fall",
  "fall": "fall",
  "ตก": "fall",
  "ล้ม": "fall",
  "ตรวจพบคนล้ม": "fall",
  "ตรวจพบการล้ม": "fall",
  "notis.sleepinglong": "sleep",
  "notis.sleepDetected": "sleep",
  "notis.sleepdetected": "sleep",
  "sleepdetected": "sleep",
  "sleep": "sleep",
  "sleeping": "sleep",
  "นอนหลับ": "sleep",
  "หลับ": "sleep",
  "ตรวจพบคนหลับนานกว่าปกติ": "sleep",
  "notis.facedetected": "face",
  "notis.platedetected": "plate",
  "face": "face",
  "plate": "plate",
};

export const resolveAlertEventKey = (
  n: Partial<Noti> | Record<string, any>
): AlertEventKey | null => {
  const meta = (n as any)?.meta ?? {};
  const directCandidates = [
    (n as any)?.event,
    (n as any)?.titleKey,
    (n as any)?.title,
    meta?.eventKey,
    meta?.event,
    meta?.category,
    meta?.label,
    meta?.kind,
    meta?.alertType,
    (n as any)?.category,
    (n as any)?.type,
    (n as any)?.subtype,
  ]
    .filter(Boolean)
    .map((val) => lowered(val));

  for (const candidate of directCandidates) {
    if (!candidate) continue;
    const mapped = DIRECT_EVENT_MAP[candidate];
    if (mapped) return mapped;
  }

  const bag = buildNotiKeywordBag(n);
  const texts = [...directCandidates, bag];

  for (const text of texts) {
    if (!text) continue;
    if (containsKeyword(text, FIRE_KEYWORDS)) return "fire";
    if (containsKeyword(text, OFFLINE_KEYWORDS)) return "offline";
    if (containsKeyword(text, FALL_KEYWORDS)) return "fall";
    if (containsKeyword(text, SLEEP_KEYWORDS)) return "sleep";
    if (containsKeyword(text, FACE_KEYWORDS)) return "face";
    if (containsKeyword(text, PLATE_KEYWORDS)) return "plate";
    if (containsKeyword(text, MOTION_KEYWORDS)) return "motion";
  }

  return null;
};

export const notiSeverity = (n: Noti): Severity => {
  const s = (n.severity || "").toLowerCase();
  if (s === "medium" || s === "critical") return s as Severity;
  if (s === "low") return "low";
  const type = (n.type || "").toLowerCase();
  if (type === "alert") return "critical";
  if (type === "warning") return "medium";
  return "low";
};

export const sortByNewest = (items: Noti[]) =>
  [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

const matchBag = (n: Noti): string => {
  const parts = [
    n.titleKey,
    n.title,
    (n.meta as any)?.category,
    (n.meta as any)?.event,
    (n.meta as any)?.label,
  ];
  return parts
    .filter(Boolean)
    .map((v) => String(v).toLowerCase())
    .join(" | ");
};

const containsAny = (haystack: string, needles: string[]) =>
  needles.some((needle) => haystack.includes(needle));

export type FaceRecKind = "face" | "plate";

export const resolveFaceRecKind = (
  n: Partial<Noti> | null | undefined
): FaceRecKind | null => {
  if (!n) return null;

  const explicitKind = (
    ((n as any)?.meta?.kind ?? (n as any)?.kind ?? "") as string
  )
    .toString()
    .toLowerCase()
    .trim();

  if (explicitKind === "face") return "face";
  if (
    explicitKind === "plate" ||
    explicitKind === "license" ||
    explicitKind === "licenseplate"
  ) {
    return "plate";
  }

  const bag = [
    matchBag(n as Noti),
    JSON.stringify(((n as any)?.meta ?? {}) as any),
  ]
    .filter(Boolean)
    .map((part) => String(part).toLowerCase())
    .join(" ");

  if (containsAny(bag, ["notis.facedetected", "face", "เนเธเธซเธเนเธฒ"])) {
    return "face";
  }
  if (
    containsAny(bag, [
      "notis.platedetected",
      "plate",
      "license",
      "เธ—เธฐเน€เธเธตเธขเธ",
    ])
  ) {
    return "plate";
  }

  return null;
};

export const resolveDefaultNotiImage = (n: Noti): string | undefined => {
  const key = String(n.titleKey || "").toLowerCase();
  if (key === "zytanotis.sos") return alertImage;
  if (key === "zytanotis.assistant") return insuranceImage;

  const eventKey = resolveAlertEventKey(n);
  if (eventKey === "fire") return fireNoti;
  if (eventKey === "motion") return motionNoti;
  if (eventKey === "offline") return deviceNoti;
  if (eventKey === "fall") return fallingNoti;
  if (eventKey === "sleep") return sleepingNoti;
  if (eventKey === "face") return faceImage;
  if (eventKey === "plate") return plateImage;

  const title = String(n.title || "").toLowerCase();
  const bag = matchBag(n);
  const type = String(n.type || "").toLowerCase();
  const metaText = JSON.stringify(n.meta ?? {}).toLowerCase();

  if (
    title.includes("ตรวจพบอุปกรณ์ออฟไลน์") ||
    key.includes("deviceoffline") ||
    key.includes("cameraoffline")
  ) {
    return deviceNoti;
  }

  const fireNeedles = ["fire", "ไฟไหม้", "notis.firedetected"];
  if (
    containsAny(key, fireNeedles) ||
    containsAny(title, fireNeedles) ||
    containsAny(bag, fireNeedles)
  ) {
    return fireNoti;
  }

  const fallNeedles = ["fall", "ล้ม", "notis.falldetected"];
  if (
    containsAny(key, fallNeedles) ||
    containsAny(title, fallNeedles) ||
    containsAny(bag, fallNeedles)
  ) {
    return fallingNoti;
  }

  const sleepNeedles = ["sleep", "หลับ", "notis.sleepinglong", "notis.sleepdetected"];
  if (
    containsAny(key, sleepNeedles) ||
    containsAny(title, sleepNeedles) ||
    containsAny(bag, sleepNeedles)
  ) {
    return sleepingNoti;
  }

  const offlineNeedles = [
    "offline",
    "ออฟ",
    "ตรวจพบอุปกรณ์ออฟไลน์",
    "อุปกรณ์ offline",
    "ตรวจพบอุปกรณ์ offline",
    "device offline",
    "camera offline",
    "notis.cameraoffline",
    "notis.deviceoffline",
    "deviceoffline",
    "cameraoffline",
    "device_offline",
    "camera_offline",
  ];
  const offlineAggregate = `${key} ${title} ${bag} ${metaText} ${type}`;
  const hasOfflineWord =
    /offline|ออฟไลน์/.test(offlineAggregate) || type.includes("offline");
  const hasDeviceWord =
    /device|camera|อุปกรณ์|กล้อง/.test(offlineAggregate) ||
    key.includes("device") ||
    key.includes("camera");

  if (hasOfflineWord && hasDeviceWord) {
    return deviceNoti;
  }
  if (
    containsAny(key, offlineNeedles) ||
    containsAny(title, offlineNeedles) ||
    containsAny(bag, offlineNeedles)
  ) {
    return deviceNoti;
  }

  const motionNeedles = ["motion", "เคลื่อนไหว", "notis.motiondetected"];
  if (
    containsAny(key, motionNeedles) ||
    containsAny(title, motionNeedles) ||
    containsAny(bag, motionNeedles)
  ) {
    return motionNoti;
  }

  return alertImage;
};

export function isFaceRecNoti(n: any): boolean {
  const key = String(n?.titleKey || n?.title || "").toLowerCase();
  // รองรับทั้ง faceDetected และ plateDetected
  if (key === "notis.facedetected" || key === "notis.platedetected") return true;

  // บางระบบอาจแท็ก category/type เพิ่มไว้
  const cat = String(n?.category || "").toLowerCase();
  if (cat === "facerec" || cat === "faceplate") return true;

  return false;
}

export const decorateNotiForDisplay = (n: Noti): Noti => {
  if ((n as any).__prepared) return n;

  const trimmedImg =
    typeof n.img === "string" && n.img.trim().length ? n.img.trim() : undefined;
  const rawShot =
    typeof (n as any).screenshot === "string" && (n as any).screenshot.trim().length
      ? (n as any).screenshot.trim()
      : undefined;

  const next: Noti = {
    ...n,
    img: trimmedImg,
  };

  if (rawShot) {
    (next as any).screenshot = rawShot;
  }

  (next as any).__prepared = true;
  return next;
};
