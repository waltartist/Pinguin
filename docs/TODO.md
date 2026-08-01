# Pi TUI Features Not Yet Implemented in Pinguin

Pinguin currently exposes a chat-only interface with streaming transcript,
model selection, slash commands, thinking blocks, tool call rendering, and
project-local GUI extensions. The following Pi TUI features do not yet have
GUI equivalents.

---

## Session Management

| Feature | TUI | GUI Status |
|---------|-----|------------|
| `/resume` — browse & select from previous sessions | ✅ Full interactive choose list | ❌ Stub only |
| `/fork` — create new session from earlier user message | ✅ Full implementation | ❌ Stub only |
| `/clone` — duplicate active branch into new session | ✅ Full implementation | ❌ Stub only |
| `/tree` — session tree navigation & branch visualization | ✅ Full implementation | ❌ Stub only |
| `/import` — import a session or file | ✅ Full implementation | ❌ Stub only |

---

## Message Queue (Steering & Follow-up)

| Feature | TUI | GUI Status |
|---------|-----|------------|
| Steering message — type Enter while agent streams | ✅ | ❌ Not implemented |
| Follow-up message — Alt+Enter queues for after agent finishes | ✅ | ❌ Not implemented |
| Escape to restore queued messages back to editor | ✅ | ❌ Not implemented |
| Configure steering/follow-up delivery via settings | ✅ | ❌ Not wired |

---

## Editor Features

| Feature | TUI | GUI Status |
|---------|-----|------------|
| Shell command — `!command` runs and sends output to model | ✅ | ❌ Not implemented |
| Hidden shell command — `!!command` runs without sending output | ✅ | ❌ Not implemented |
| External editor — Ctrl+G opens `$VISUAL` / `$EDITOR` | ✅ | ❌ N/A (GUI context) |
| Kill ring — Ctrl+W, Alt+D, Ctrl+K, Ctrl+U, Ctrl+Y, Alt+Y | ✅ | ❌ Not implemented |
| Word navigation — Alt+Left/Right, Ctrl+Left/Right | ✅ | ❌ Partial (native textarea) |

---

## Settings & Keybindings

| Feature | TUI | GUI Status |
|---------|-----|------------|
| `/settings` — interactive full-screen settings menu | ✅ | ❌ Text output only |
| Custom keybindings from `~/.pi/agent/keybindings.json` | ✅ | ❌ Not implemented |
| Theme support | ✅ | ❌ Not implemented |

---

## Extension API Surface

Pi extensions can call `ctx.ui` methods that have no GUI equivalents:

- `ctx.ui.custom()` — render interactive components
- `ctx.ui.notify()` — toast notifications
- `ctx.ui.select()`, `ctx.ui.confirm()`, `ctx.ui.input()` — simple prompts
- Global `~/.pi/gui-extensions/*.tsx` watcher — not yet supported
- Per-extension sidecar GUI watcher — not yet supported

---

## Other

- Image paste support in composer
- Token/cost/cache statistics display
- Startup header showing loaded context files, skills, extensions
- Model cycling (Ctrl+P in TUI)
- Provider logout from the GUI (`/logout` dispatches to backend but has no dedicated UI)