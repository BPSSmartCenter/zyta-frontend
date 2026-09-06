// src/features/siteSelection/siteSelectionStorage.ts
//
// sessionStorage persistence helper for the current site scope (per user).
// ย้ายมาจาก FiltersContext เพื่อรวม logic ที่เดียว
// TTL 15 นาที — หลัง refresh ยังจำได้ แต่ไม่ค้างนานเกิน
//
// The whole scope is stored, not only the site value: choosing a main location
// (group) or a utility sets selectedSite = "all" plus the group/utility, and a
// refresh must bring back that same view rather than "All Sites".

const STORAGE_PREFIX = "filters:selectedSite";
const TTL_MS = 1000 * 60 * 15; // 15 minutes

export type StoredScopeRef = { id: string; label: string };

export type StoredSiteScope = {
  value: string;
  group: StoredScopeRef | null;
  utility: StoredScopeRef | null;
};

type StoredPayload = {
  value: string;
  group?: StoredScopeRef | null;
  utility?: StoredScopeRef | null;
  expiresAt: number;
};

function keyFor(uid: string): string {
  return `${STORAGE_PREFIX}:${uid}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

function toScopeRef(value: unknown): StoredScopeRef | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  if (!id) return null;
  return { id, label: label || id };
}

/**
 * อ่าน scope ที่ persist ไว้ — คืน null ถ้าไม่มี/หมดอายุ/parse ไม่ได้
 */
export function readStoredScope(uid: string): StoredSiteScope | null {
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
    return {
      value: parsed.value,
      group: toScopeRef(parsed.group),
      utility: toScopeRef(parsed.utility),
    };
  } catch {
    return null;
  }
}

/**
 * อ่านเฉพาะค่า selected site (คงไว้ให้ caller เดิม)
 */
export function readStoredSite(uid: string): string | null {
  return readStoredScope(uid)?.value ?? null;
}

/**
 * บันทึก scope ทั้งชุด + refresh TTL
 */
export function writeStoredScope(uid: string, scope: StoredSiteScope): void {
  if (!isBrowser() || !uid) return;
  try {
    const payload: StoredPayload = {
      value: scope.value,
      group: scope.group,
      utility: scope.utility,
      expiresAt: Date.now() + TTL_MS,
    };
    window.sessionStorage.setItem(keyFor(uid), JSON.stringify(payload));
  } catch {
    // quota exceeded / storage disabled — เงียบไว้
  }
}

/**
 * บันทึกเฉพาะ site (ล้าง group/utility) — ใช้เมื่อเลือกไซต์ตรง ๆ
 */
export function writeStoredSite(uid: string, value: string): void {
  writeStoredScope(uid, { value, group: null, utility: null });
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
