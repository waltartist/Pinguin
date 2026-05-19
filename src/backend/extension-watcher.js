// src/backend/extension-watcher.js
// Watches ~/.pi/gui-extensions/ for .tsx files and compiles them with esbuild.
// Compiled code is broadcast to the webview via Neutralino events.

import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// esbuild is CJS — use createRequire
const require = createRequire(import.meta.url);
const esbuild = require("esbuild");

const EXTENSIONS_DIR = path.join(
  os.homedir(),
  ".pi",
  "gui-extensions"
);

fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });

export function startExtensionWatcher(Neutralino) {
  // Compile any extensions that already exist
  compileAllExisting(Neutralino);

  // Watch for new/changed files
  fs.watch(EXTENSIONS_DIR, { recursive: true }, async (eventType, filename) => {
    if (!filename || !(filename.endsWith(".ts") || filename.endsWith(".tsx"))) return;
    await compileExtension(filename, Neutralino);
  });

  console.log(`[extension-watcher] Watching ${EXTENSIONS_DIR}`);
}

async function compileAllExisting(Neutralino) {
  try {
    const files = fs.readdirSync(EXTENSIONS_DIR);
    for (const file of files) {
      if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        await compileExtension(file, Neutralino);
      }
    }
  } catch (err) {
    console.error("[extension-watcher] Failed to read extensions dir:", err);
  }
}

async function compileExtension(filename, Neutralino) {
  const filePath = path.join(EXTENSIONS_DIR, filename);
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

    const extensionId = filename.replace(/\.(ts|tsx)$/, "");

    Neutralino.events.broadcast("ext:update", {
      id: extensionId,
      code: result.outputFiles[0].text,
    });

    console.log(`[extension-watcher] Compiled ${filename}`);
  } catch (err) {
    console.error(`[extension-watcher] Failed to compile ${filename}:`, err.message);

    Neutralino.events.broadcast("ext:error", {
      id: filename,
      error: err.message,
    });
  }
}
