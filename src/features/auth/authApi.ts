// src/features/auth/authApi.ts
//
// Plain async helpers for the /auth/* endpoints. Used directly by components
// (e.g. VerifyEmailPage) when a one-shot fetch makes more sense than dispatching
// a thunk. Reuses the same http wrapper that thunks use.

import { request } from "../../lib/http";
import { normalizeMeResponse, type MeResponse } from "../users/usersTypes";

export async function registerAccountApi(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  return request<unknown>("/auth/register", {
    method: "POST",
    json: input,
    skipCsrf: true,
  });
}

export async function loginApi(
  email: string,
  password: string,
  remember?: boolean
): Promise<MeResponse> {
  await request("/auth/login", {
    method: "POST",
    json: { email, password, remember },
    skipCsrf: true,
  });
  const meRaw = await request<unknown>("/users/me");
  return normalizeMeResponse(meRaw);
}

export async function logoutApi() {
  await request("/auth/logout", { method: "POST" });
}

export async function resendVerificationApi(email: string) {
  return request("/auth/resend-verification", {
    method: "POST",
    json: { email },
    skipCsrf: true,
  });
}

export async function verifyEmailApi(token: string): Promise<unknown> {
  return request<unknown>("/auth/verify-email", { params: { token } });
}

export async function checkEmailExistsApi(email: string) {
  return request<{ exists: boolean }>("/auth/check-email", {
    method: "POST",
    json: { email },
    skipCsrf: true,
  });
}

export async function requestPasswordResetApi(email: string) {
  return request("/auth/forgot-password", {
    method: "POST",
    json: { email },
    skipCsrf: true,
  });
}

export async function resetPasswordApi(token: string, password: string) {
  return request("/auth/reset-password", {
    method: "POST",
    json: { token, password },
    skipCsrf: true,
  });
}
