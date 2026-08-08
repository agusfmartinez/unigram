import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// GitHub Pages sirve el sitio bajo /<repo>/. Vercel y dev usan la raíz "/".
const BASE = "/unigram/";

export default defineConfig(({ command }) => ({
  base: command === "build" && !process.env.VERCEL ? BASE : "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Navegación: intenta red primero (HTML siempre fresco online); si no
        // hay red, usa el caché. Evita quedar pegado a una versión vieja en el
        // navegador. Los assets tienen hash → se cachean inmutables aparte.
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html",
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      manifest: {
        name: "Unigram",
        short_name: "Unigram",
        description: "Seguimiento de carrera universitaria — SIU Guaraní",
        theme_color: "#0b1622",
        background_color: "#0b1622",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        scope: ".",
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
