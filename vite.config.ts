import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api/devices": {
          target: "https://zyta.net",
          changeOrigin: true,
        },
        "/api": {
          target: "https://zyta.net",
          changeOrigin: true,
        },
        "/site-branding": {
          target: "https://zyta.net",
          changeOrigin: true,
        },
        "/user-branding": {
          target: "https://zyta.net",
          changeOrigin: true,
        },
      },
    },
  };
});
