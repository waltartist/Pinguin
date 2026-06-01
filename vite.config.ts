import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { neutralinoDevGlobalsPlugin } from "./vite-plugins/neutralino-dev-globals";
import { syncResourcesPlugin } from "./vite-plugins/sync-resources";

export default defineConfig({
  plugins: [react(), neutralinoDevGlobalsPlugin(), syncResourcesPlugin()],
  base: "./",
  server: {
    host: "127.0.0.1",
    port: Number.parseInt(process.env.PINGUIN_DEV_PORT || "5173", 10),
    strictPort: true,
  },
  build: {
    outDir: ".tmp/webview",
  },
});
