# Pinguin

Beta desktop GUI for the Pi coding agent. Neutralinojs shell, React webview,
extensions written as `.tsx` files to `gui-extensions/`.

See [`implementation-plan.md`](implementation-plan.md) for architecture.

## UI work — read this first

**All UI in this repo follows the Ember style.** Before touching any
`.tsx`, `.css`, or generating a new extension, read
[`docs/ember-style-guide.md`](docs/ember-style-guide.md).

Key rules:

- Use CSS variables from `:root` (`var(--bg)`, `var(--accent)`, etc.) —
  never hardcode colors.
- Fonts are **IBM Plex Sans** for prose, **IBM Plex Mono** for paths /
  IDs / labels / badges / status bars.
- Accent is **orange** (`oklch(0.75 0.17 55)`) — used sparingly: primary
  button, focus ring, streaming presence dot.
- One elevation tier (flat or floating). Floating panels use
  `--radius-lg` and the canonical shadow from §2 of the guide.
- Import shared primitives from `./components/ember`:
  `Icon`, `PresenceDot`, `StatusPill`.
- Extensions import the same set from the `pi-gui` module shim.

## Stack

- Neutralinojs (desktop shell) + extension binary for Pi SDK
- React 18 + Vite (webview)
- Zustand (state)
- esbuild (runtime compiler for `.tsx` extensions)

## Where things live

| Path | What |
|---|---|
| `src/webview/style.css` | All Ember tokens + classes |
| `src/webview/components/ember.tsx` | Icons, PresenceDot, StatusPill |
| `src/webview/components/ExtensionHost.tsx` | The `pi-gui` module shim |
| `src/backend/pi-bridge.js` | Pi session creation |
| `src/backend/extension-watcher.js` | fs.watch + esbuild for extensions |
| `docs/ember-style-guide.md` | Canonical Ember style guide (formerly EMBER_STYLE_GUIDE.md) |
