// src/api/auth.ts
import { api } from "./axios";
import { login as mockLogin } from "../data/Dashboard/auth";


export async function register(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  // /api/auth/register ต้องการ firstName, lastName, email, password
  // (ตาม service) → คืน id/email ถ้าสำเร็จ
  const { data } = await api.post("/auth/register", input);
  return data;
}

export async function login(
  email: string,
  password: string,
  remember?: boolean
) {
  try {
    const { data } = await api.post("/auth/login", { email, password, remember });
    return data.user;
  } catch (error) {
    console.warn("API Login failed, trying mock...", error);
    const res = mockLogin({ email, password });
    if ("error" in res) throw res.error; // หรือ throw error เดิม
    return res.user;
  }
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function resendVerification(email: string) {
  return api.post("/auth/resend-verification", { email });
}

export async function verifyEmail(token: string) {
  return api.get("/auth/verify-email", { params: { token } });
}

export function checkEmailExists(email: string) {
  return api
    .post("/auth/check-email", { email })
    .then((res) => res.data as { ok: boolean; exists: boolean });
}

export async function requestPasswordReset(email: string) {
  return api.post("/auth/forgot-password", { email });
}

export function resetPassword(token: string, password: string) {
  return api.post("/auth/reset-password", { token, password });
}
