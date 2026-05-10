// src/lib/http.ts
//
// Lightweight fetch wrapper that replaces axios. Owned by Redux thunks —
// callers import { request, requestBlob, ApiError } from "../lib/http".
//
// Preserves the contract previously implemented by src/api/axios.ts:
//   - Cookie-based session via `credentials: "include"`
//   - CSRF double-submit (reads `XSRF-TOKEN` cookie, sends `X-XSRF-TOKEN` header
//     on POST/PUT/PATCH/DELETE unless skipCsrf:true)
//   - 401 → redirect to /login (unless silent401 or on a public path)
//   - V1 envelope unwrap: { ok, data } / { ok, items } / { ok:false, error }
//   - Legacy /api carve-out for SSE/IoT (legacy:true)

const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? "/api/v1"
  : "https://zyta.net/api/v1";
const configuredBaseUrl =
  typeof import.meta.env.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : "";

export const API_BASE_URL = (configuredBaseUrl || DEFAULT_API_BASE_URL).replace(
  /\/+$/,
  ""
);
export const LEGACY_API_BASE_URL = API_BASE_URL.replace(/\/v1\/?$/, "");

const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/verify-email",
  "/forgot",
  "/reset",
]);

export type ApiErrorDetail = {
  field?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly details: ApiErrorDetail[] | undefined;
  readonly traceId: string | undefined;

  constructor(opts: {
    code: string;
    message: string;
    status?: number;
    details?: ApiErrorDetail[];
    traceId?: string;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
    this.traceId = opts.traceId;
  }
}

export type RequestOptions = Omit<RequestInit, "body"> & {
  /** JSON body — auto-stringified, content-type set to application/json. */
  json?: unknown;
  /** Already-encoded body (FormData, Blob, string). Bypasses JSON handling. */
  body?: BodyInit | null;
  /** Query params appended to the path. */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** Skip CSRF header on this request (used for login/register before cookie set). */
  skipCsrf?: boolean;
  /** Don't redirect on 401 — caller will handle (used by bootstrapAuth probe). */
  silent401?: boolean;
  /** Hit legacy /api base instead of /api/v1 (SSE, IoT). */
  legacy?: boolean;
  /** Return the raw Response without unwrapping. Used for blob downloads. */
  raw?: boolean;
};

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

function buildUrl(path: string, base: string, params?: RequestOptions["params"]): string {
  const target = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  if (!params) return target;
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    usp.set(key, String(value));
  }
  const qs = usp.toString();
  if (!qs) return target;
  const sep = target.includes("?") ? "&" : "?";
  return `${target}${sep}${qs}`;
}

function isAuthEndpoint(path: string): boolean {
  return (
    path.includes("/auth/login") ||
    path.includes("/auth/register") ||
    path.includes("/auth/logout")
  );
}

function bounceToLogin() {
  if (typeof window === "undefined") return;
  const here = window.location?.pathname || "";
  if (PUBLIC_PATHS.has(here)) return;
  window.location.href = "/login";
}

async function readEnvelope<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      throw new ApiError({
        code: "HTTP_ERROR",
        message: response.statusText || `HTTP ${response.status}`,
        status: response.status,
      });
    }
    return undefined as T;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new ApiError({
        code: "HTTP_ERROR",
        message: response.statusText || `HTTP ${response.status}`,
        status: response.status,
      });
    }
    return text as unknown as T;
  }

  if (parsed && typeof parsed === "object") {
    const body = parsed as Record<string, unknown>;
    const traceId =
      body.meta && typeof body.meta === "object"
        ? (body.meta as Record<string, unknown>).traceId
        : undefined;

    if (body.ok === false) {
      const err = (body.error || {}) as Record<string, unknown>;
      throw new ApiError({
        code: typeof err.code === "string" ? err.code : "API_ERROR",
        message:
          typeof err.message === "string"
            ? err.message
            : response.statusText || "Request failed",
        details: Array.isArray(err.details) ? (err.details as ApiErrorDetail[]) : undefined,
        traceId: typeof traceId === "string" ? traceId : undefined,
        status: response.status,
      });
    }

    if (!response.ok) {
      throw new ApiError({
        code: typeof body.code === "string" ? body.code : "HTTP_ERROR",
        message:
          typeof body.message === "string"
            ? body.message
            : response.statusText || `HTTP ${response.status}`,
        status: response.status,
        traceId: typeof traceId === "string" ? traceId : undefined,
      });
    }

    // Envelope unwrap: prefer data, then items, else the whole body.
    if ("data" in body) return body.data as T;
    if ("items" in body) return body as unknown as T; // caller picks between items/data
    return body as T;
  }

  if (!response.ok) {
    throw new ApiError({
      code: "HTTP_ERROR",
      message: response.statusText || `HTTP ${response.status}`,
      status: response.status,
    });
  }
  return parsed as T;
}

async function dispatchRequest(path: string, options: RequestOptions = {}): Promise<Response> {
  const {
    json,
    body,
    params,
    skipCsrf,
    silent401,
    legacy,
    raw: _raw,
    method,
    headers: headersInit,
    ...rest
  } = options;

  const base = legacy ? LEGACY_API_BASE_URL : API_BASE_URL;
  const url = buildUrl(path, base, params);
  const finalMethod = (method || (json !== undefined || body !== undefined ? "POST" : "GET")).toUpperCase();

  const headers = new Headers(headersInit);
  let finalBody: BodyInit | null | undefined = body;
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    finalBody = JSON.stringify(json);
  }

  if (UNSAFE_METHODS.has(finalMethod) && !skipCsrf) {
    const token = readCookie(CSRF_COOKIE_NAME);
    if (token && !headers.has(CSRF_HEADER_NAME)) {
      headers.set(CSRF_HEADER_NAME, token);
    }
  }

  const response = await fetch(url, {
    ...rest,
    method: finalMethod,
    headers,
    body: finalBody,
    credentials: "include",
  });

  if (response.status === 401 && !silent401 && !isAuthEndpoint(path)) {
    bounceToLogin();
  }

  if (response.status === 403 && import.meta.env.DEV) {
    const cloned = response.clone();
    void cloned
      .json()
      .then((b) => {
        const code = (b as { code?: string } | null)?.code;
        if (code === "CSRF_TOKEN_MISMATCH" || code === "INVALID_CSRF") {
          console.warn(
            "[http] CSRF token mismatch — try a GET (e.g. /users/me) to refresh the XSRF-TOKEN cookie"
          );
        }
      })
      .catch(() => undefined);
  }

  return response;
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await dispatchRequest(path, options);
  if (options.raw) {
    if (!response.ok) {
      throw new ApiError({
        code: "HTTP_ERROR",
        message: response.statusText || `HTTP ${response.status}`,
        status: response.status,
      });
    }
    return response as unknown as T;
  }
  return readEnvelope<T>(response);
}

export async function requestBlob(
  path: string,
  options: RequestOptions = {}
): Promise<Blob> {
  const response = await dispatchRequest(path, options);
  if (!response.ok) {
    throw new ApiError({
      code: "HTTP_ERROR",
      message: response.statusText || `HTTP ${response.status}`,
      status: response.status,
    });
  }
  return response.blob();
}

/** Helper for endpoints whose top-level shape is `{ ok, items }`. */
export async function requestList<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T[]> {
  const body = await request<unknown>(path, options);
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object") {
    const r = body as Record<string, unknown>;
    if (Array.isArray(r.items)) return r.items as T[];
    if (Array.isArray(r.data)) return r.data as T[];
    if (r.data && typeof r.data === "object") {
      const inner = (r.data as Record<string, unknown>).items;
      if (Array.isArray(inner)) return inner as T[];
    }
  }
  return [];
}
