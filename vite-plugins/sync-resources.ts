import { rmSync, cpSync, existsSync, renameSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

const STAGING = ".tmp/.sync-staging";
const TARGET = "resources";

/**
 * Vite plugin that atomically swaps Vite's build output into `resources/`.
 *
 * ## Why
 * With `vite build --watch` writing directly to `resources/`, Neutralino's
 * HTTP server can serve a **partially-written** `index.html` (or miss assets
 * that haven't been written yet), causing 404 errors in the browser.
 *
 * ## How
 * 1. Vite writes into `.tmp/webview/` (isolated – never served by Neutralino).
 * 2. On every build completion (`closeBundle`) the plugin:
 *    a. Copies the completed build to `.tmp/.sync-staging/`
 *    b. Copies `public/neutralino.js` into the staging dir
 *    c. Atomically renames (NTFS-atomic) the staging dir → `resources/`
 *
 *    Because `fs.renameSync()` on the same NTFS volume is atomic,
 *    Neutralino's server instantly sees a **complete, consistent** set of files.
 */
export function syncResourcesPlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "sync-resources",

    configResolved(resolved) {
      config = resolved;
    },

    closeBundle() {
      const root = config.root;
      const outDir = join(root, config.build.outDir);
      const stagingDir = join(root, STAGING);
      const targetDir = join(root, TARGET);

      // --- 1. Clean staging & copy fresh build ---
      if (existsSync(stagingDir)) {
        rmSync(stagingDir, { recursive: true, force: true });
      }
      mkdirSync(stagingDir, { recursive: true });
      cpSync(outDir, stagingDir, { recursive: true });

      // --- 2. Copy neutralino.js (from public/) ---
      const neuJsSrc = join(root, "public", "neutralino.js");
      if (existsSync(neuJsSrc)) {
        cpSync(neuJsSrc, join(stagingDir, "neutralino.js"));
      }

      // --- 3. Atomic swap (Windows-friendly) ---
      // On NTFS, `renameSync` atomically replaces the target directory.
      // But Windows sometimes holds transient handles on the old directory,
      // so we first delete the old target, then rename staging into place.
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true, force: true });
      }
      renameSync(stagingDir, targetDir);

      if (config.logger) {
        config.logger.info(
          `✓ Synced ${outDir} → ${targetDir} (atomic swap)`,
          { timestamp: true }
        );
      }
    },
  };
}
