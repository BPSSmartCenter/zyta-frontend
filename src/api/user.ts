// src/api/user.ts
import { api } from "./axios";


export type MeResponse = {
  id: string;
  email: string;
  role: "admin" | "officer" | "user";
  firstName: string;
  lastName: string;
  sites: Array<{ id: string; code: string; name: string; province_code: string; lat: number; lng: number }>;
};

export async function me(): Promise<MeResponse> {
  const { data } = await api.get("/users/me");
  return data;
}

export type UserStatsResponse = {
  total: number;
  byRole: { admin: number; officer: number; user: number };
};

export async function getUserStats(site?: string): Promise<UserStatsResponse> {
  const url = site ? `/users/stats?site=${encodeURIComponent(site)}` : "/users/stats";
  const { data } = await api.get(url);
  return data;
}
