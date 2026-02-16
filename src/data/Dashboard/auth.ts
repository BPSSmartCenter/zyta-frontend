// src/mocks/auth.ts
import { USERS, USER_SITES, SITES, COUNTRY_BBOX_TH } from "./data";
import { encodeMockJwt, decodeMockJwt, type JwtPayload } from "./jwt";

export type LoginRequest = { email: string; password: string };
export type LoginResponse =
  | {
      token: string;
      user: {
        id: string;
        email: string;
        role: "admin" | "manager" | "officer" | "user";
        sites: string[];
      };
    }
  | { error: "INVALID_CREDENTIALS" };

const STORAGE_KEY = "bps_mock_token";

export function login(req: LoginRequest): LoginResponse {
  const found = USERS.find(
    (u) => u.email.toLowerCase() === req.email.toLowerCase()
  );
  if (!found || found.password_hash !== req.password) {
    return { error: "INVALID_CREDENTIALS" };
  }

  const siteIds =
    found.role === "admin"
      ? [] // admin ไม่จำเป็นต้องแนบ (เข้าถึงทั้งหมด)
      : USER_SITES.filter((us) => us.user_id === found.id).map(
          (us) => us.site_id
        );

  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 8; // 8 ชั่วโมง
  const payload: JwtPayload = {
    sub: found.id,
    role: found.role,
    site_ids: siteIds,
    exp,
  };
  const token = encodeMockJwt(payload);

  // เก็บ token ไว้ให้ GET /auth/me ใช้
  localStorage.setItem(STORAGE_KEY, token);

  return {
    token,
    user: {
      id: found.id,
      email: found.email,
      role: found.role,
      sites: siteIds,
    },
  };
}

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function me(): {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  sites: string[];
} | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeMockJwt(token);
  if (!payload) return null;

  const u = USERS.find((x) => x.id === payload.sub);
  if (!u) return null;

  return {
    id: u.id,
    email: u.email,
    role: u.role,
    firstName: u.firstName,
    lastName: u.lastName,
    sites: payload.site_ids || [],
  };
}

// ----- GET /access/sites (ตามกติกา role) -----
export function accessSites(params?: {
  includeCountryBBox?: boolean;
  q?: string;
  limit?: number;
  cursor?: string | null;
}): {
  items: {
    id: string;
    name: string;
    code: string;
    province_code: string;
    lat: number;
    lng: number;
  }[];
  countryBBox?: [[number, number], [number, number]];
  nextCursor: string | null;
} | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeMockJwt(token);
  if (!payload) return null;

  const role = payload.role;
  const siteIds = payload.site_ids || [];

  let items = SITES;

  if (role === "officer" || role === "user") {
    items = SITES.filter((s) => siteIds.includes(s.id));
  }
  // admin เห็นทั้งหมด

  // search q
  if (params?.q) {
    const q = params.q.trim().toLowerCase();
    items = items.filter((s) =>
      `${s.name} ${s.code}`.toLowerCase().includes(q)
    );
  }

  // pagination (mock แบบง่าย)
  let nextCursor: string | null = null;
  if (params?.limit && params.limit > 0 && items.length > params.limit) {
    items = items.slice(0, params.limit);
    nextCursor = "cursor_mock";
  }

  const canAllLocation = role === "admin" || role === "officer";
  const includeBBox = !!params?.includeCountryBBox && canAllLocation;

  return {
    items: items.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      province_code: s.province_code,
      lat: s.lat,
      lng: s.lng,
    })),
    ...(includeBBox ? { countryBBox: COUNTRY_BBOX_TH } : {}),
    nextCursor,
  };
}
