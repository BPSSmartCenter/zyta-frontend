// src/api/axios.ts
import axios from "axios";
import { isAxiosError } from "axios";

export const api = axios.create({
  // baseURL: "/api",
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  withCredentials: true, // ให้ส่ง/รับ cookie (token) ไปกับ request
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (isAxiosError(err)) {
      const status = err.response?.status;
      const url = err.config?.url ?? "";

      // ⛔️ ข้ามการ redirect ถ้าเป็นเอ็นด์พอยต์ auth เอง
      const isAuthEndpoint =
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/logout");

      if (status === 401 && !isAuthEndpoint) {
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
        window.location.href = "/";
        return;
      }
    }
    return Promise.reject(err);
  }
);
