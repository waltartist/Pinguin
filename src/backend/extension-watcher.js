// src/backend/extension-watcher.js
// Watches project-local gui-extensions/ for .tsx files and compiles them
// with esbuild. Compiled code is broadcast to the webview via Neutralino events.

import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// esbuild is CJS — use createRequire
const require = createRequire(import.meta.url);
const esbuild = require("esbuild");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const GUI_EXTENSIONS_DIR = path.join(REPO_ROOT, "gui-extensions");

fs.mkdirSync(GUI_EXTENSIONS_DIR, { recursive: true });

export function startExtensionWatcher(Neutralino) {
  // Compile any extensions that already exist
  compileAllExisting(Neutralino);

  // Watch for new/changed files in project-local gui-extensions
  fs.watch(GUI_EXTENSIONS_DIR, { recursive: true }, async (eventType, filename) => {
    if (!filename || !(filename.endsWith(".ts") || filename.endsWith(".tsx"))) return;
    const fullPath = path.join(GUI_EXTENSIONS_DIR, filename);
    const extensionId = filename.replace(/\.(ts|tsx)$/, "");

    // Detect deletion — the file no longer exists.
    if (!fs.existsSync(fullPath)) {
      console.log(`[extension-watcher] Extension removed: ${extensionId}`);
      Neutralino.events.broadcast("ext:remove", { id: extensionId });
      return;
    }

    await compileExtension(fullPath, extensionId, Neutralino);
  });

  console.log(`[extension-watcher] Watching ${GUI_EXTENSIONS_DIR}`);
}

async function compileAllExisting(Neutralino) {
  try {
    const files = fs.readdirSync(GUI_EXTENSIONS_DIR);
    for (const file of files) {
      if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        await compileExtension(path.join(GUI_EXTENSIONS_DIR, file), file.replace(/\.(ts|tsx)$/, ""), Neutralino);
      }
    }
  } catch (err) {
    console.error("[extension-watcher] Failed to read extensions dir:", err);
  }
}

async function compileExtension(filePath, extensionId, Neutralino) {
  try {
    // Use CJS so the webview can run the bundle inside a `new Function(
    // exports, module, require, code)` shim. ESM `import` syntax would be a
    // parse error in that context.
    const result = await esbuild.build({
      entryPoints: [filePath],
      bundle: true,
      format: "cjs",
      platform: "browser",
      jsx: "automatic",
      // jsxImportSource: react/jsx-runtime resolves to "react/jsx-runtime"
      // which our require shim doesn't know about — leave it external and
      // shim it in the host.
      external: [
        "react",
        "react/jsx-runtime",
        "react-dom",
        "react-dom/client",
        "zustand",
        "pi-gui",
      ],
      sourcemap: "inline",
      write: false,
    });

    Neutralino.events.broadcast("ext:update", {
      id: extensionId,
      code: result.outputFiles[0].text,
    });

    console.log(`[extension-watcher] Compiled ${extensionId} from ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`[extension-watcher] Failed to compile ${filePath}:`, err.message);

    Neutralino.events.broadcast("ext:error", {
      id: extensionId,
      error: err.message,
    });
  }
}
