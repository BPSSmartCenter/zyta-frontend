// src/api/adminUsers.ts
import { api } from "./axios";

export type Role = "admin" | "officer" | "user";

export type AdminUserDto = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  active: boolean; // temporary mapped from emailVerified until DB field added
};

export async function listUsers(): Promise<AdminUserDto[]> {
  const { data } = await api.get("/users");
  return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
}

export async function createUser(payload: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
}): Promise<AdminUserDto> {
  const { data } = await api.post("/users", payload);
  return data;
}

export async function updateUser(id: string, payload: Partial<{ firstName: string; lastName: string; email: string; role: Role; active: boolean }>): Promise<AdminUserDto> {
  const { data } = await api.patch(`/users/${encodeURIComponent(id)}`, payload);
  return data;
}

export async function deleteUser(id: string): Promise<{ id: string }> {
  const { data } = await api.delete(`/users/${encodeURIComponent(id)}`);
  return data;
}

export async function resetUserPassword(id: string, newPassword: string): Promise<{ id: string }>{
  const { data } = await api.post(`/users/${encodeURIComponent(id)}/reset-password`, { password: newPassword });
  return data;
}

