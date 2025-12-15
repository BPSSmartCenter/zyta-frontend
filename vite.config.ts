import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api/devices": {
          target: env.VITE_IOT_API_TARGET || "http://172.20.10.4:3000",
          changeOrigin: true,
        },
      },
    },
  };
});
