// src/api/user.ts
import { api } from "./axios";
import { me as mockMe } from "../data/Dashboard/auth";

export type MeResponse = {
  id: string;
  email: string;
  role: "admin" | "officer" | "user";
  firstName: string;
  lastName: string;
  sites: Array<{ id: string; code: string; name: string; province_code: string; lat: number; lng: number }>;
};

export async function me(): Promise<MeResponse> {
  try {
    const { data } = await api.get("/users/me");
    return data;
  } catch (error) {
    console.warn("API Me failed, trying mock...", error);
    const u = mockMe();
    if (!u) throw error;
    // Map mock user to MeResponse
    return {
      id: u.id,
      email: u.email,
      role: u.role as any,
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      sites: [], // Mock sites defaults empty or need logic if crucial
    };
  }
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
