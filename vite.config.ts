import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA — installable on a phone, and offline-capable, which matters for a
    // workshop with poor connectivity (mvp-scope.md "Offline" direction).
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "icon.svg"],
      manifest: {
        name: "Master Technician",
        short_name: "MasterTech",
        description: "ជំនួយការវិនិច្ឆ័យសម្រាប់ជាងម៉ាស៊ីនរថយន្តអាជីព",
        lang: "km",
        theme_color: "#0b0f14",
        background_color: "#0b0f14",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cache the app shell + assets so a diagnosis can continue offline.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Google Fonts are loaded from a CDN — cache them so Khmer text still
        // renders correctly without a connection.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Milestone 12 — keep the two big, rarely-changing pieces in their own
        // chunks. The DTC knowledge base is by far the largest asset and only
        // the diagnosis/DTC screens need it, so splitting it out both keeps it
        // off the initial download and lets it stay cached when app code ships.
        manualChunks(id) {
          if (id.includes("/src/data/dtc")) return "dtc-data";
          if (
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/")
          ) {
            return "vendor-react";
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: "jsdom",
  },
});
