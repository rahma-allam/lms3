import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// 1. جعل المنافذ والمسارات اختيارية لتجنب الـ Crash
const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // تم حذف إضافات Replit (cartographer, dev-banner, runtimeErrorOverlay)
    // لأنها تسبب مشاكل Native Bindings على الويندوز
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: false,
    host: "0.0.0.0",
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        // مهم جداً عشان رفع الصور (multipart/form-data) يشتغل صح
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req: any) => {
            if (req.headers["content-type"]) {
              proxyReq.setHeader("content-type", req.headers["content-type"]);
            }
          });
        },
      },
    },
  },
  preview: {
    port,
    host: "localhost",
  },
});