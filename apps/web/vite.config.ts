import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "ZUZU Laundry",
        short_name: "ZUZU",
        start_url: "/login",
        display: "standalone",
        background_color: "#F7F3EA",
        theme_color: "#F7F3EA",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
