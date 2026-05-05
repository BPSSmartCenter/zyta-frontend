// src/api/axios.ts
import axios, {
  isAxiosError,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

const DEFAULT_API_BASE_URL = import.meta.env.DEV ? "/api" : "https://zyta.net/api";
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = (configuredApiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

export function unwrapApiData<T = unknown>(payload: unknown): T {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const looksLikeEnvelope =
      "success" in record || "meta" in record || "error" in record;

    if (looksLikeEnvelope && "data" in record) {
      return record.data as T;
    }
  }

  return payload as T;
}

/**
 * Extended config flags:
 * - `_silent401`   : ถ้า true → interceptor จะไม่ redirect/log เมื่อเจอ 401
 *                    (เหมาะกับ "probe" request เช่น bootstrap auth check)
 * - `_skipCsrf`    : ถ้า true → request นี้จะไม่แนบ CSRF header (ใช้ตอน login/register
 *                    ซึ่งยังไม่มี cookie CSRF)
 */
export type ExtendedRequestConfig = InternalAxiosRequestConfig & {
  _silent401?: boolean;
  _skipCsrf?: boolean;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ส่ง/รับ cookie (session + CSRF) อัตโนมัติ
  headers: { "Content-Type": "application/json" },
  // xsrf* config ของ axios เอง — ใช้ double-submit cookie pattern
  // ดูเพิ่มเติม: https://axios-http.com/docs/req_config
  xsrfCookieName: "XSRF-TOKEN", // ชื่อ cookie ที่ backend set
  xsrfHeaderName: "X-XSRF-TOKEN", // ชื่อ header ที่ axios จะแนบกลับไป
});

// ------------------------------------------------------------------
// CSRF protection (Double-Submit Cookie pattern)
// ------------------------------------------------------------------
// Backend ต้อง:
//   1. Set cookie ชื่อ XSRF-TOKEN (non-HttpOnly, Secure, SameSite=Lax/Strict)
//      ตอน GET /users/me หรือ /auth/csrf-token
//   2. ตรวจว่า header X-XSRF-TOKEN == cookie XSRF-TOKEN สำหรับ mutating methods
//      (POST/PUT/PATCH/DELETE)
//
// axios รองรับ pattern นี้ใน browser อยู่แล้ว (ผ่าน xsrfCookieName/xsrfHeaderName)
// แต่เราเพิ่ม manual fallback ให้กรณี cookie path mismatch หรือ SSR
// ------------------------------------------------------------------

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const c of cookies) {
    if (c.startsWith(prefix)) {
      try {
        return decodeURIComponent(c.substring(prefix.length));
      } catch {
        return c.substring(prefix.length);
      }
    }
  }
  return null;
}

api.interceptors.request.use((config) => {
  const extended = config as ExtendedRequestConfig;
  const method = (config.method || "get").toLowerCase();

  // แนบ CSRF header เฉพาะ mutating methods และยังไม่ skip
  if (UNSAFE_METHODS.has(method) && !extended._skipCsrf) {
    const token = readCookie(CSRF_COOKIE_NAME);
    if (token && config.headers) {
      // ถ้ายังไม่มี header ตั้งอยู่แล้ว ค่อย set
      if (!config.headers[CSRF_HEADER_NAME]) {
        config.headers[CSRF_HEADER_NAME] = token;
      }
    }
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (isAxiosError(err)) {
      const status = err.response?.status;
      const url = err.config?.url ?? "";
      const extended = err.config as ExtendedRequestConfig | undefined;
      const silent401 = extended?._silent401 === true;

      // ⛔️ ข้ามการ redirect ถ้าเป็น endpoint auth เอง (login/register/logout)
      const isAuthEndpoint =
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/logout");

      // 403 + CSRF mismatch → log เตือน dev, อย่า redirect
      if (status === 403) {
        const code = (err.response?.data as { code?: string } | undefined)?.code;
        if (code === "CSRF_TOKEN_MISMATCH" || code === "INVALID_CSRF") {
          if (import.meta.env.DEV) {
            console.warn(
              "[axios] CSRF token mismatch — cookie XSRF-TOKEN อาจหมดอายุ หรือยังไม่ถูก set. " +
                "ลองเรียก GET endpoint ก่อน (เช่น /auth/csrf-token หรือ /users/me) เพื่อให้ backend set cookie ใหม่"
            );
          }
        }
      }

      if (status === 401 && !isAuthEndpoint && !silent401) {
        const publicPaths = [
          "/",
          "/register",
          "/verify-email",
          "/forgot",
          "/reset",
        ];
        const atPublic =
          typeof window !== "undefined" &&
          publicPaths.includes(window.location?.pathname || "");
        if (atPublic) {
          // Avoid redirect loops on public routes (e.g., root login)
          return Promise.reject(err);
        }
        // for protected APIs only: bounce to login
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);
