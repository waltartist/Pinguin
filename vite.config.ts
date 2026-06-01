import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { syncResourcesPlugin } from "./vite-plugins/sync-resources";

export default defineConfig({
  plugins: [react(), syncResourcesPlugin()],
  base: "./",
  server: {
    port: Number.parseInt(process.env.PINGUIN_DEV_PORT || "5173", 10),
    strictPort: true,
  },
  build: {
    outDir: ".tmp/webview",
  },
});
