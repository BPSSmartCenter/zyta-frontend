// src/api/user.ts
import { api } from "./axios";


export type MeResponse = {
  id: string;
  email: string;
  role: "admin" | "manager" | "officer" | "user";
  firstName: string;
  lastName: string;
  sites: Array<{ id: string; code: string; name: string; province_code: string; lat: number; lng: number }>;
  brandingLogoUrl?: string | null;
};

/**
 * GET /users/me
 *
 * @param opts.silent401
 *   ถ้า true: axios interceptor จะไม่ redirect/log เมื่อเจอ 401
 *   เหมาะกับเคส "probe cookie" ตอน boot app เพื่อเช็คว่ามี session valid ไหม
 *   — 401 ที่นี่เป็น expected, ไม่ใช่ bug
 */
export async function me(opts?: { silent401?: boolean }): Promise<MeResponse> {
  const { data } = await api.get("/users/me", {
    // ส่ง flag ผ่าน request config เพื่อให้ axios interceptor รู้ว่า 401 ครั้งนี้ตั้งใจ
    // (ดู src/api/axios.ts)
    ...(opts?.silent401 ? { _silent401: true } : {}),
  } as import("axios").AxiosRequestConfig);
  return data;
}

export type UserStatsResponse = {
  total: number;
  byRole: { admin: number; manager: number; officer: number; user: number };
};

export async function getUserStats(site?: string): Promise<UserStatsResponse> {
  const url = site ? `/users/stats?site=${encodeURIComponent(site)}` : "/users/stats";
  const { data } = await api.get(url);
  return data;
}
