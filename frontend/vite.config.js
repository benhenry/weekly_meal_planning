import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = process.env.VITE_BACKEND_URL || "http://localhost:3001";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
    },
  },
});
