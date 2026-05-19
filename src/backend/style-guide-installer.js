// Installs the Ember style guide into Pi's agent directory so every
// session prompt includes UI conventions. Re-runs on each startup to keep
// the file in sync with the repo's canonical EMBER_STYLE_GUIDE.md.

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SOURCE = path.join(REPO_ROOT, "EMBER_STYLE_GUIDE.md");
const TARGET_DIR = path.join(os.homedir(), ".pi", "agent");
const TARGET = path.join(TARGET_DIR, "ember-style-guide.md");
const INSTRUCTIONS = path.join(TARGET_DIR, "AGENTS.md");

const INSTRUCTIONS_HEADER = `# Pi GUI · Agent Instructions

You are running inside **Pi GUI**, a desktop app built on Neutralinojs +
React. Users can ask you to extend the GUI by writing \`.tsx\` files to
\`~/.pi/gui-extensions/\` — the running app picks them up live.

## When you write UI (any \`.tsx\` extension or change to the webview)

**Read \`ember-style-guide.md\` in this directory first** and follow it. The
short version:

- **Style:** Ember — warm dark, orange accent (oklch 0.75 0.17 55), IBM Plex
  Sans + Mono, soft elevation, Raycast-clean.
- **Always** reference CSS variables from \`:root\` (e.g.
  \`var(--surface)\`, \`var(--accent)\`, \`var(--text-muted)\`). Never
  hardcode hex colors.
- **Import primitives from \`pi-gui\`** in extensions:
  \`import { usePi, Icon, PresenceDot, StatusPill } from "pi-gui";\`
- **Accent is a spice, not a paint.** One orange element per region — the
  primary action, the streaming presence, or the focus ring. Not all
  three at once.
- **Mono font** for paths / IDs / status bars / section labels / badges /
  tool names. Sans for human prose.
- **One elevation tier:** flat or floating. No half-shadows.
- Use the canonical class names (\`btn\`, \`btn-send\`, \`btn-chip\`,
  \`input\`, \`badge\`, \`badge--success\`, \`toggle\`, \`checkbox\`,
  \`extension-panel\`, \`presence-dot\`). They're already styled — don't
  re-skin them.

## File locations

- Repo: cloned to the user's machine. Source in \`src/webview\`.
- Style tokens: \`src/webview/style.css\` (the source of truth).
- Style guide: \`EMBER_STYLE_GUIDE.md\` at repo root (also mirrored here).
- Ember primitives (Icons, PresenceDot): \`src/webview/components/ember.tsx\`.
- Extensions: \`~/.pi/gui-extensions/*.tsx\`.

If you're unsure whether a UI change matches Ember, default to plainer —
fewer borders, less color, more whitespace. The design is supposed to feel
quiet.
`;

export function installStyleGuide() {
  try {
    fs.mkdirSync(TARGET_DIR, { recursive: true });

    if (fs.existsSync(SOURCE)) {
      const content = fs.readFileSync(SOURCE, "utf-8");
      fs.writeFileSync(TARGET, content, "utf-8");
    } else {
      console.warn(`[style-guide] Source missing: ${SOURCE}`);
    }

    // Write AGENTS.md only if it doesn't already exist or if our auto-managed
    // header is detected (so user customizations aren't blown away).
    const existing = fs.existsSync(INSTRUCTIONS)
      ? fs.readFileSync(INSTRUCTIONS, "utf-8")
      : "";
    if (!existing || existing.startsWith("# Pi GUI · Agent Instructions")) {
      fs.writeFileSync(INSTRUCTIONS, INSTRUCTIONS_HEADER, "utf-8");
    }

    console.log(`[style-guide] Installed → ${TARGET_DIR}`);
  } catch (err) {
    console.error(`[style-guide] Install failed:`, err.message);
  }
}
