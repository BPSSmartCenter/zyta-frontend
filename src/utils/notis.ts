// src/utils/notis.ts
import type { Noti, Severity } from "../data/Dashboard/notis";
import {
  fireNoti,
  fallingNoti,
  sleepingNoti,
  deviceNoti,
  motionNoti,
  alertImage,
} from "../assets/index";

type DateValueLike = { y: number; m: number; d: number };

const pad2 = (v: number) => v.toString().padStart(2, "0");

export type DateKeyInput = string | Date | DateValueLike | null | undefined;

export const toDateKey = (input: DateKeyInput): string | null => {
  if (input == null) return null;

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return `${input.getFullYear()}-${pad2(input.getMonth() + 1)}-${pad2(
      input.getDate()
    )}`;
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

  const str = String(input);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(
      parsed.getDate()
    )}`;
  }
  return null;
};

export const collectSiteKeys = (n: Noti): string[] => {
  const raw = [
    n.site,
    n.siteId,
    (n as any).site_id,
    n.siteCode,
    (n as any).site_code,
    n.siteName,
    (n as any).site_name,
    (n as any)?.site?.id,
    (n as any)?.site?.code,
    (n as any)?.site?.name,
  ];
  return Array.from(
    new Set(
      raw
        .filter(Boolean)
        .map((val) => String(val).trim())
        .filter(Boolean)
    )
  );
};

export const matchesSite = (n: Noti, siteCode?: string | null): boolean => {
  if (!siteCode || siteCode === "all") return true;
  const code = String(siteCode).toLowerCase();
  return collectSiteKeys(n)
    .map((k) => k.toLowerCase())
    .includes(code);
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
  const title = String(n.title || "").toLowerCase();
  const bag = matchBag(n);
  const type = String(n.type || "").toLowerCase();
  const metaText = JSON.stringify(n.meta ?? {}).toLowerCase();

  if (title.includes("ตรวจพบอุปกรณ์ออฟไลน์") || key.includes("deviceoffline")) {
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

  const sleepNeedles = ["sleep", "หลับ", "notis.sleepinglong"];
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

export const isFaceRecNoti = (n: Noti): boolean =>
  resolveFaceRecKind(n) !== null;

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
