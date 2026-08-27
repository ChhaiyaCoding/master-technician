import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

/**
 * GitHub Pages serves a project site from a sub-path — /master-technician/ —
 * not from the domain root the way Netlify did. Every absolute URL the build
 * emits has to carry that prefix, and so do the PWA manifest's scope and
 * start_url, or the installed app opens a 404.
 *
 * `vite preview` serves the built output, so it needs the same base — but its
 * `command` is "serve", not "build". Checking only the command left preview
 * hosting at the root while index.html asked for /master-technician/..., and
 * every asset silently fell through to the SPA fallback: a blank page with no
 * console error. Only the dev server runs at "/".
 */
const BASE = "/master-technician/";

// https://vitejs.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? BASE : "/",
  plugins: [
    react(),
    // PWA — installable on a phone, and offline-capable, which matters for a
    // workshop with poor connectivity (mvp-scope.md "Offline" direction).
    VitePWA({
      // "prompt", not "autoUpdate": autoUpdate lets a new service worker take
      // over and reload the page whenever it lands, which could interrupt a
      // mechanic mid-diagnosis. AppStatus surfaces the waiting update and lets
      // them choose the moment (UX Audit v1 / P2-9).
      registerType: "prompt",
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
        // Must match `base`. An installed PWA whose start_url points at the
        // domain root would open GitHub's 404 page, not the app.
        start_url: BASE,
        scope: BASE,
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
    // Take the port from the environment when one is assigned, so several
    // sessions can preview the app at once instead of colliding on 5173.
    // Falls back to Vite's own default when PORT is unset.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
  test: {
    environment: "jsdom",
  },
}));
