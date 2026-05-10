// src/features/users/usersApi.ts
import { request, requestList } from "../../lib/http";
import { normalizeMeResponse, type MeResponse } from "./usersTypes";
import type {
  AdminUserDto,
  CreateUserInput,
  UpdateUserInput,
  UserSearchDto,
  UserStatsResponse,
} from "./usersTypes";

export async function me(opts?: { silent401?: boolean }): Promise<MeResponse> {
  const data = await request<unknown>("/users/me", {
    silent401: opts?.silent401,
  });
  return normalizeMeResponse(data);
}

export async function getUserStats(site?: string): Promise<UserStatsResponse> {
  return request<UserStatsResponse>("/users/stats", {
    params: site ? { site } : undefined,
  });
}

// ---- Admin user CRUD ----

export async function listUsers(): Promise<AdminUserDto[]> {
  return requestList<AdminUserDto>("/users");
}

export async function createUser(payload: CreateUserInput): Promise<AdminUserDto> {
  return request<AdminUserDto>("/users", { method: "POST", json: payload });
}

export async function updateUser(
  id: string,
  payload: UpdateUserInput
): Promise<AdminUserDto> {
  return request<AdminUserDto>(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: payload,
  });
}

export async function deleteUser(id: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function resetUserPassword(
  id: string,
  newPassword: string
): Promise<{ id: string }> {
  return request<{ id: string }>(
    `/users/${encodeURIComponent(id)}/reset-password`,
    { method: "POST", json: { password: newPassword } }
  );
}

export async function getUser(id: string): Promise<AdminUserDto> {
  return request<AdminUserDto>(`/users/${encodeURIComponent(id)}`);
}

export async function searchUsersByEmail(email: string): Promise<UserSearchDto[]> {
  return requestList<UserSearchDto>("/users/search", { params: { email } });
}

export async function assignUserSites(
  id: string,
  payload?: { siteIds?: string[] }
): Promise<{ id: string; siteIds: string[] }> {
  return request<{ id: string; siteIds: string[] }>(
    `/users/${encodeURIComponent(id)}/assign-sites`,
    { method: "POST", json: payload ?? {} }
  );
}
