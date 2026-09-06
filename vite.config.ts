import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = (
    env.VITE_API_PROXY_TARGET || "https://staging.yousan-nim.com"
  ).trim();

  // Backend sets cookies with a Domain attribute scoped to the API host
  // (e.g. `.yousan-nim.com`). When proxying through `localhost` the browser
  // rejects cookies with that Domain — strip the attribute so the cookie
  // defaults to the request host (localhost).
  const proxyCommon = {
    target: proxyTarget,
    changeOrigin: true,
    cookieDomainRewrite: "",
    // staging now has a real TLS cert via Let's Encrypt; keep TLS verification
    // enabled. Only flip to false if you ever need to proxy to a host with
    // a self-signed / expired cert.
    secure: true,
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
    // Production serves `vite preview` behind nginx (pm2 "zyta-site", port 4001). Vite blocks any
    // Host header it does not know, so every public hostname that nginx forwards must be listed.
    preview: {
      allowedHosts: ["www.bpscaregiver.com"],
    },
  };
});
