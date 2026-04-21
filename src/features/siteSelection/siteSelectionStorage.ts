// src/features/siteSelection/siteSelectionStorage.ts
//
// sessionStorage persistence helper for selected site (per user).
// ย้ายมาจาก FiltersContext เพื่อรวม logic ที่เดียว
// TTL 15 นาที — หลัง refresh ยังจำได้ แต่ไม่ค้างนานเกิน

const STORAGE_PREFIX = "filters:selectedSite";
const TTL_MS = 1000 * 60 * 15; // 15 minutes

type StoredPayload = {
  value: string;
  expiresAt: number;
};

function keyFor(uid: string): string {
  return `${STORAGE_PREFIX}:${uid}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

/**
 * อ่านค่าที่ persist ไว้ — คืน null ถ้าไม่มี/หมดอายุ/parse ไม่ได้
 */
export function readStoredSite(uid: string): string | null {
  if (!isBrowser() || !uid) return null;
  try {
    const raw = window.sessionStorage.getItem(keyFor(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPayload>;
    if (!parsed || typeof parsed.value !== "string") return null;
    if (typeof parsed.expiresAt === "number" && parsed.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(keyFor(uid));
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

/**
 * บันทึกค่า selected site + refresh TTL
 */
export function writeStoredSite(uid: string, value: string): void {
  if (!isBrowser() || !uid) return;
  try {
    const payload: StoredPayload = {
      value,
      expiresAt: Date.now() + TTL_MS,
    };
    window.sessionStorage.setItem(keyFor(uid), JSON.stringify(payload));
  } catch {
    // quota exceeded / storage disabled — เงียบไว้
  }
}

/**
 * ลบค่าที่ persist ไว้ (ใช้ตอน logout หรือ reset)
 */
export function clearStoredSite(uid: string): void {
  if (!isBrowser() || !uid) return;
  try {
    window.sessionStorage.removeItem(keyFor(uid));
  } catch {
    // ignore
  }
}

/**
 * ลบทุก selected site ของทุก uid (ใช้ตอน logout แบบไม่รู้ uid ก็ได้)
 */
export function clearAllStoredSites(): void {
  if (!isBrowser()) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(`${STORAGE_PREFIX}:`)) keys.push(k);
    }
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
