import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { syncResourcesPlugin } from "./vite-plugins/sync-resources";

export default defineConfig({
  plugins: [react(), syncResourcesPlugin()],
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: ".tmp/webview",
  },
});
