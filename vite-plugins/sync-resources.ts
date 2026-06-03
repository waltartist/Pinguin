import {
  rmSync,
  cpSync,
  existsSync,
  renameSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

const STAGING = ".tmp/.sync-staging";
const TARGET = "resources";

/**
 * Vite plugin that publishes completed Vite builds into `resources/`.
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
 *    c. Moves the staging dir → `resources/`
 *
 *    `fs.renameSync()` is atomic on the same NTFS volume. If Neutralino holds a
 *    Windows directory handle that blocks rename, the plugin copies the complete
 *    staging tree into the empty target instead.
 */
export function syncResourcesPlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "sync-resources",

    configResolved(resolved) {
      config = resolved;
    },

    closeBundle() {
      // Skip sync during dev (vite dev). The dev server handles serving files.
      // HMR replaces modules in-place — no disk sync needed.
      if (config.command === "serve") return;

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

      // Vite preserves the CRLF input HTML but inserts tags with LF endings.
      // Normalize the generated file so production builds stay deterministic.
      const indexHtmlPath = join(stagingDir, "index.html");
      if (existsSync(indexHtmlPath)) {
        const html = readFileSync(indexHtmlPath, "utf8");
        writeFileSync(indexHtmlPath, html.replace(/\r\n?/g, "\n"), "utf8");
      }

      // --- 2. Copy neutralino.js (from public/) ---
      const neuJsSrc = join(root, "public", "neutralino.js");
      if (existsSync(neuJsSrc)) {
        cpSync(neuJsSrc, join(stagingDir, "neutralino.js"));
      }

      // --- 3. Replace output (Windows-friendly) ---
      // On NTFS, `renameSync` atomically replaces the target directory.
      // But Windows sometimes holds transient handles on the old directory,
      // so we first delete the old target, then rename staging into place.
      if (existsSync(targetDir)) {
        rmSync(targetDir, { recursive: true, force: true });
      }
      let syncMethod = "atomic swap";
      try {
        renameSync(stagingDir, targetDir);
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? error.code
            : undefined;
        if (code !== "EPERM" && code !== "EACCES") throw error;

        // Neutralino can hold a Windows directory handle that blocks rename.
        // The completed staging tree is still safe to copy into the empty target.
        cpSync(stagingDir, targetDir, { recursive: true });
        rmSync(stagingDir, { recursive: true, force: true });
        syncMethod = "Windows copy fallback";
      }

      if (config.logger) {
        config.logger.info(
          `✓ Synced ${outDir} → ${targetDir} (${syncMethod})`,
          { timestamp: true }
        );
      }
    },
  };
}
