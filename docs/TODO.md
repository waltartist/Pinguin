# Pi TUI Features Not Yet Implemented in Pi GUI

Based on a thorough audit of the Pi TUI documentation (usage, keybindings, themes, extensions, sessions, TUI components), the existing Pi GUI codebase, and the implementation plan, here is every feature gap:

---

## 1. Session Management

| Feature | TUI | GUI Status |
|---------|-----|------------|
| `/resume` — browse & select from previous sessions | ✅ Full interactive choose list | ❌ **Stub only** (returns "Not yet available in GUI") |
| `/fork` — create new session from earlier user message | ✅ Full implementation | ❌ **Stub only** |
| `/clone` — duplicate active branch into new session | ✅ Full implementation | ❌ **Stub only** |
| `/tree` — session tree navigation & branch visualization | ✅ Full implementation | ❌ **Stub only** |
| `/import` — import a session or file | ✅ Full implementation | ❌ **Stub only** |
| `/share` — upload session as private GitHub gist | ✅ Full implementation | ❌ **Stub only** |
| Session auto-save to `~/.pi/agent/sessions/` | ✅ Automatic | ❌ **Not wired** — the GUI creates sessions via `createAgentSession()` but has no session history viewer, no session persistence UI, no `/continue` equivalent |
| `pi -c` / `pi -r` — continue or resume sessions from CLI | ✅ | ❌ Not surfaced in GUI startup |

---

## 2. Message Queue (Steering & Follow-up)

| Feature | TUI | GUI Status |
|---------|-----|------------|
| **Steering message** — type Enter while agent streams, queues message for after current tool call | ✅ | ❌ **Not implemented** — Composer is simply disabled during streaming |
| **Follow-up message** — Alt+Enter queues for after agent finishes all work | ✅ | ❌ **Not implemented** |
| Escape to restore queued messages back to editor | ✅ | ❌ Not implemented |
| Alt+Up to retrieve queued messages | ✅ | ❌ Not implemented |
| Configure steering/follow-up delivery via settings | ✅ | ❌ Not wired |

---

## 3. Editor Features (Rich Input)

| Feature | TUI | GUI Status |
|---------|-----|------------|
| **Shell command** — `!command` runs and sends output to model | ✅ | ❌ **Not implemented** |
| **Hidden shell command** — `!!command` runs without sending output | ✅ | ❌ Not implemented |
| **External editor** — Ctrl+G opens `$VISUAL` / `$EDITOR` | ✅ | ❌ Not applicable (GUI context) |
| **Word navigation** — Alt+Left/Right, Ctrl+Left/Right, Alt+B/F | ✅ | ❌ Native textarea handles some, but no word-jump bindings |
| **Line start/end** — Ctrl+A, Ctrl+E | ✅ | ❌ Not bound (native textarea may handle some) |
| **Jump to character** — Ctrl+], Ctrl+Alt+] | ✅ | ❌ Not implemented |
| **Kill ring** — Ctrl+W (delete word back), Alt+D (delete word forward), Ctrl+K (delete to line end), Ctrl+U (delete to line start), Ctrl+Y (yank), Alt+Y (yank-pop) | ✅ | ❌ Not implemented |
| **Undo** — Ctrl+- | ✅ | ❌ Not bound |
| **Paste images** — Ctrl+V, Alt+V (Windows), drag into terminal | ✅ | ❌ **Not implemented** — no image paste handling in Composer |
| **Multi-line selection** — Shift+arrow, Shift+click | ✅ | ❌ Not implemented for selection-based commands |

---

## 4. Keybinding Customization

| Feature | TUI | GUI Status |
|---------|-----|------------|
| Custom keybindings from `~/.pi/agent/keybindings.json` | ✅ Full customizable | ❌ **Not implemented** — all keyboard handling is hardcoded in components |
| `/reload` to hot-reload keybindings | ✅ | ❌ Not wired |
| All 60+ namespaced keybinding actions | ✅ | ❌ None are configurable |


---

## 6. Settings UI

| Feature | TUI | GUI Status |
|---------|-----|------------|
| `/settings` — interactive full-screen settings menu (thinking level, theme, message delivery, transport, tools, etc.) | ✅ Full menu with keyboard navigation | ❌ **Not implemented** — there is no visual settings panel. Only `/settings` text output via the builtin |
| Thinking level visual indicator (editor border color changes) | ✅ Border changes color | ❌ No visual thinking level indicator anywhere |

---

## 7. TUI Extension API (not yet surfaced as GUI equivalents)

Pi extensions can call these `ctx.ui` methods in the TUI. They have no GUI equivalents:

| Method | TUI | GUI Status |
|--------|-----|------------|
| `ctx.ui.custom(component)` — render interactive TUI components (selection dialogs, loaders, input forms) | ✅ Full component system | ❌ **No GUI equivalent** — extensions can only write `.tsx` dock panels |
| `ctx.ui.custom(component, { overlay: true })` — overlay components without clearing screen | ✅ | ❌ No overlay system |
| `ctx.ui.notify(text, level)` — toast notifications | ✅ | ❌ Only inline `pi:notice` system messages — no toast component |
| `ctx.ui.select(items)`, `ctx.ui.confirm()`, `ctx.ui.input()` — simple prompts | ✅ | ❌ Not available to extensions |

---

## 8. Model Cycling & Scoped Models

| Feature | TUI | GUI Status |
|---------|-----|------------|
| Ctrl+P to cycle through scoped models | ✅ | ❌ **Not implemented** — model switching is only via `/model` slash command or the model popup in Composer |
| `/scoped-models` management UI | ✅ Text-based management | ❌ Only `/scoped-models` text output via builtin, no visual management |

---

## 9. Startup Header

| Feature | TUI | GUI Status |
|---------|-----|------------|
| Shows shortcuts, loaded context files, prompt templates, skills, extensions on startup | ✅ Rich startup header | ❌ **Not implemented** — GUI just shows "Starting Pi..." spinner then goes directly to empty chat |
| Startup context file loading info | ✅ | ❌ Not displayed |


---

## 12. Extension Sidecar GUIs (Global Path)

| Feature | TUI | GUI Status |
|---------|-----|------------|
| Watches `~/.pi/gui-extensions/*.tsx` for global extensions | ✅ Documented in `extension-api.md` | ❌ **Watcher only looks at project-local `gui-extensions/`**, not `~/.pi/gui-extensions/` |
| Per-Pi-extension sidecars: `~/.pi/extensions/<name>/gui/*.tsx` | ✅ Documented | ❌ Not implemented |

---

## 13. Prompt Templates & Skills

| Feature | TUI | GUI Status |
|---------|-----|------------|
| Prompt templates visible in slash completion | ✅ | ❌ `listCommands()` tries to read `session.promptTemplates` and `session.resourceLoader.getSkills()` but the GUI has no way to browse or invoke them visually — they only appear as slash command entries |
| Skills visible as `/skill:name` commands | ✅ | ❌ Same — listed in commands but no dedicated browser/manager UI |

---

## Summary

**Critical gaps** (user-facing, everyday usage):
1. Session management (resume, fork, clone, tree, history browser)
2. Message queue (steering messages while streaming)
3. Settings panel (visual `/settings` equivalent)
4. Theme support
5. Keybinding customization
6. Token/cost/cache statistics in status bar
7. Image paste support in composer

**Extension-facing gaps** (for extension authors):
8. `ctx.ui.custom()` / overlays / select/confirm/input prompts
9. Toast notifications
10. Custom footer/widget/status/working-indicator hooks
11. Global `~/.pi/gui-extensions/` watcher
12. Per-extension sidecar GUI watcher (`~/.pi/extensions/<name>/gui/*.tsx`)

**Minor gaps** (nice-to-have):
13. Shell commands (`!command`, `!!command`)
14. Rich editor keybindings (kill ring, word jump, jump-to-char)
15. Session export/sharing management
16. Startup header showing loaded resources