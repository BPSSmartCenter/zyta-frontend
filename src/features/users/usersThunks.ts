// src/features/users/usersThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { request, requestList } from "../../lib/http";
import {
  normalizeMeResponse,
  type AdminUserDto,
  type CreateUserInput,
  type MeResponse,
  type UpdateUserInput,
  type UserSearchDto,
  type UserStatsResponse,
} from "./usersTypes";

/** GET /users/me — silent401 lets the bootstrap probe handle 401 itself. */
export const fetchMe = createAsyncThunk<MeResponse, { silent401?: boolean } | void>(
  "users/fetchMe",
  async (arg) => {
    const data = await request<unknown>("/users/me", {
      silent401: arg && typeof arg === "object" ? arg.silent401 : false,
    });
    return normalizeMeResponse(data);
  }
);

/** GET /users/stats — total + per-role counts, optionally scoped to a site. */
export const fetchUserStats = createAsyncThunk<UserStatsResponse, string | undefined>(
  "users/fetchStats",
  async (siteCode) => {
    const data = await request<UserStatsResponse>("/users/stats", {
      params: siteCode ? { site: siteCode } : undefined,
    });
    return data;
  }
);

// ---------------------------------------------------------------------------
// Admin user CRUD (formerly api/adminUsers.ts)
// ---------------------------------------------------------------------------

export const fetchAdminUserList = createAsyncThunk<AdminUserDto[]>(
  "users/fetchAdminList",
  async () => {
    return requestList<AdminUserDto>("/users");
  }
);

export const fetchAdminUserById = createAsyncThunk<AdminUserDto, string>(
  "users/fetchAdminById",
  async (id) => {
    return request<AdminUserDto>(`/users/${encodeURIComponent(id)}`);
  }
);

export const createAdminUser = createAsyncThunk<AdminUserDto, CreateUserInput>(
  "users/createAdmin",
  async (payload) => {
    return request<AdminUserDto>("/users", { method: "POST", json: payload });
  }
);

export const updateAdminUser = createAsyncThunk<
  AdminUserDto,
  { id: string; payload: UpdateUserInput }
>("users/updateAdmin", async ({ id, payload }) => {
  return request<AdminUserDto>(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: payload,
  });
});

export const deleteAdminUser = createAsyncThunk<{ id: string }, string>(
  "users/deleteAdmin",
  async (id) => {
    return request<{ id: string }>(`/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
);

export const resetAdminUserPassword = createAsyncThunk<
  { id: string },
  { id: string; password: string }
>("users/resetAdminPassword", async ({ id, password }) => {
  return request<{ id: string }>(
    `/users/${encodeURIComponent(id)}/reset-password`,
    { method: "POST", json: { password } }
  );
});

export const searchAdminUsersByEmail = createAsyncThunk<UserSearchDto[], string>(
  "users/searchByEmail",
  async (email) => {
    return requestList<UserSearchDto>("/users/search", { params: { email } });
  }
);

export const assignAdminUserSites = createAsyncThunk<
  { id: string; siteIds: string[] },
  { id: string; siteIds?: string[] }
>("users/assignSites", async ({ id, siteIds }) => {
  return request<{ id: string; siteIds: string[] }>(
    `/users/${encodeURIComponent(id)}/assign-sites`,
    { method: "POST", json: { siteIds } }
  );
});
