// Installs Pinguin's extension API docs and types into the project-local
// gui-extensions directory.
//
// 1. `<project>/gui-extensions/README.md` — Overwritten on every launch from repo.
// 2. `<project>/gui-extensions/pi-gui.d.ts` — Overwritten on every launch from repo.
// 3. `<project>/gui-extensions/example.tsx.disabled` — Written ONCE if absent.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TARGET_DIR = path.join(REPO_ROOT, "gui-extensions");

const SOURCE_DOCS = path.join(REPO_ROOT, "docs", "extension-api.md");
const TARGET_DOCS = path.join(TARGET_DIR, "README.md");

const SOURCE_TYPES = path.join(REPO_ROOT, "src", "webview", "extension-api.d.ts");
const TARGET_TYPES = path.join(TARGET_DIR, "pi-gui.d.ts");

const EXAMPLE_PATH = path.join(TARGET_DIR, "example.tsx.disabled");

const EXAMPLE_CONTENT = `import { usePi, Icon, PresenceDot } from "pi-gui";

export default {
  id: "example-counter",
  title: "Example Counter",
  Component: () => {
    const pi = usePi();
    return (
      <div className="extension-panel">
        <div className="ext-header">
          <Icon.Sparkle width={12} height={12} />
          <span className="ext-title">Counter</span>
          <span className="ext-tag">ext</span>
        </div>
        <div className="ext-body">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PresenceDot state={pi.isStreaming ? "thinking" : "ready"} />
            <span style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>
              Messages: {pi.messages.length}
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Edit this file in gui-extensions/ to see hot-reloading in action.
          </p>
        </div>
      </div>
    );
  }
};
`;

export function installExtensionDocs() {
  try {
    fs.mkdirSync(TARGET_DIR, { recursive: true });

    // Sync README
    if (fs.existsSync(SOURCE_DOCS)) {
      const content = fs.readFileSync(SOURCE_DOCS, "utf-8");
      fs.writeFileSync(TARGET_DOCS, content, "utf-8");
    }

    // Sync Types
    if (fs.existsSync(SOURCE_TYPES)) {
      const content = fs.readFileSync(SOURCE_TYPES, "utf-8");
      fs.writeFileSync(TARGET_TYPES, content, "utf-8");
    }

    // Scaffold Example (once)
    if (!fs.existsSync(EXAMPLE_PATH)) {
      fs.writeFileSync(EXAMPLE_PATH, EXAMPLE_CONTENT, "utf-8");
    }

    console.log(`[extension-docs] API docs and types synced → ${TARGET_DIR}`);
  } catch (err) {
    console.error(`[extension-docs] Install failed:`, err.message);
  }
}
