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
          target: "http://203.159.95.162:3000",
          changeOrigin: true,
        },
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
  };
});