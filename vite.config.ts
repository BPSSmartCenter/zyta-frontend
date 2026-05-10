import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = (env.VITE_API_PROXY_TARGET || "https://zyta.net").trim();

  // Backend sets cookies with `Domain=.zyta.net`. When proxying through
  // localhost the browser rejects them (domain mismatch) — strip the Domain
  // attribute so the cookie defaults to the request host (localhost).
  const proxyCommon = {
    target: proxyTarget,
    changeOrigin: true,
    cookieDomainRewrite: "",
    secure: false, // staging IP has no TLS
  } as const;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api/devices": proxyCommon,
        "/api": proxyCommon,
        "/site-branding": proxyCommon,
        "/user-branding": proxyCommon,
      },
    },
  };
});
