# Pi GUI — Implementation Plan

## Project Overview

Pi GUI is a desktop GUI wrapper around the [Pi coding agent](https://pi.dev). It provides a chat-based interface for interacting with Pi as an agentic coding assistant, with the key feature that **you can ask Pi to extend the GUI itself** — adding panels, tools, and views — and they appear live without reloading.

**Goal:** A minimal, extensible desktop frontend for Pi that follows the same philosophy as Pi itself: small core, everything else is an extension. The user talks to Pi through the GUI; Pi can write new GUI extensions on the fly.

**Ethos:**
- **Agent-extensible.** The primary way to add UI is to ask the agent. It writes a `.tsx` file, the app picks it up live.
- **Simple stack.** React + Vite for the webview, Neutralinojs for the desktop shell, the Pi SDK embedded directly in the backend.
- **No subprocess.** Pi's SDK runs in-process with the Neutralino backend.
- **TypeScript end to end.** Extensions are `.tsx` files with full types. esbuild compiles them at runtime.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Desktop shell | [Neutralinojs](https://neutralino.js.org/) | ~5MB binary, native webview, Node.js backend for Pi SDK |
| Agent integration | `@earendil-works/pi-coding-agent` SDK | Embed Pi directly — no subprocess, no JSONL, type-safe events |
| Frontend | React + Vite | Agent writes React/JSX more naturally than string concatenation. Declarative UI maps to how the agent thinks about state — "when this changes, update this." Streaming transcript, tool call rendering, and extension UI all benefit. |
| State | Zustand | Minimal, single store, connects Pi events to React components. Four functions, zero boilerplate. |
| Extension compiler | esbuild | Agent writes `.tsx` → esbuild strips types + compiles JSX at runtime → webview mounts component. No build step for the user. |
| Distribution | Neutralino `neu build` | Generates platform binaries (exe, dmg, AppImage) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Neutralinojs Desktop App                                   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Node.js Backend Process                           │    │
│  │                                                    │    │
│  │  // Pi SDK embedded directly — no subprocess       │    │
│  │  const session = await createAgentSession({...})   │    │
│  │                                                    │    │
│  │  // Pi events → webview via Neutralino IPC         │    │
│  │  session.subscribe(e => broadcast("pi:event", e))  │    │
│  │                                                    │    │
│  │  // Extension watcher — compiles at runtime        │    │
│  │  fs.watch("~/.pi/gui-extensions/", (file) => {     │    │
│  │    esbuild.build({ entryPoints: [file.tsx] })       │    │
│  │    broadcast("ext:update", { id, code })            │    │
│  │  })                                                 │    │
│  │                                                    │    │
│  └──────────┬─────────────────────────────────────────┘    │
│             │ Neutralino events (built-in IPC)              │
│  ┌──────────▼─────────────────────────────────────────┐    │
│  │  Native Webview (WebKit / WebView2 / webkitgtk)    │    │
│  │                                                    │    │
│  │  Built by Vite, loaded as static files             │    │
│  │                                                    │    │
│  │  index.html ← loads ← neutralino built            │    │
│  │  App.tsx      — Transcript + Composer + Sidebar    │    │
│  │  ExtensionHost — receives esbuild output, mounts   │    │
│  │  pi-store.ts  — Zustand store, bridged from        │    │
│  │                 Neutralino.events.on("pi:event")    │    │
│  │                                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  ~/.pi/gui-extensions/*.tsx                                  │
│    agent writes → esbuild compiles → broadcast to webview   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 0: Scaffold

### 0.2 Install dependencies

Pi is already installed globally, so the SDK (`@earendil-works/pi-coding-agent`) is available. The project just needs the desktop framework and frontend tooling:

```bash
# Desktop framework CLI
npm install -D @neutralinojs/neu

# Frontend
npm install react react-dom zustand
npm install -D vite @vitejs/plugin-react

# Extension compilation at runtime
npm install -D esbuild
```

Five new dependencies total (3 runtime, 2 dev). The Pi SDK (`@earendil-works/pi-coding-agent`) is not installed locally — it resolves from Pi's global npm installation. The backend will resolve it via the global node_modules path at runtime.

### 0.3 Neutralino config

```json
// neutralino.config.json
{
  "applicationId": "dev.pi.gui",
  "version": "1.0.0",
  "defaultMode": "window",
  "port": 0,
  "documentRoot": "/resources/webview",
  "enableNativeAPI": true,
  "nativeBlockList": [],
  "modes": {
    "window": {
      "title": "Pi GUI",
      "width": 1100,
      "height": 700,
      "fullScreen": false
    }
  },
  "cli": {
    "binaryName": "pi-gui",
    "resourcesPath": "/resources/",
    "extensionsPath": "/extensions/"
  }
}
```

### 0.4 Vite config

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist/webview",
  },
});
```

### 0.5 Folder structure

```
pi-gui/
  package.json
  neutralino.config.json
  vite.config.ts
  src/
    backend/
      main.js                 # Neutralino entry — Pi session + watcher
      pi-bridge.js             # createAgentSession setup
      extension-watcher.js     # fs.watch + esbuild
    webview/
      index.html
      main.tsx                 # React entry
      App.tsx                  # Layout shell
      components/
        Transcript.tsx
        Composer.tsx
        StatusBar.tsx
        ExtensionHost.tsx
      stores/
        pi-store.ts            # Zustand store
      lib/
        use-pi.ts              # React hooks
    style.css                  # Global styles (imported in main.tsx)
  resources/                   # Neutralino asset output
~/.pi/gui-extensions/          # Agent writes .tsx files here
```

---

## Phase 1: Pi SDK Bridge

### 1.1 Create the Pi session (backend)

```javascript
// src/backend/pi-bridge.js
import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  ModelRegistry,
  SessionManager,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";

export async function createPiSession() {
  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);
  const settingsManager = SettingsManager.create();
  const loader = new DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir: "~/.pi/agent",
  });
  await loader.reload();

  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
    authStorage,
    modelRegistry,
    settingsManager,
    resourceLoader: loader,
  });

  return session;
}
```

### 1.2 Bridge events to the webview (backend)

```javascript
// src/backend/main.js
import { createPiSession } from "./pi-bridge.js";
import { startExtensionWatcher } from "./extension-watcher.js";

async function main() {
  const session = await createPiSession();

  // All Pi events → webview
  session.subscribe((event) => {
    Neutralino.events.broadcast("pi:event", event);
  });

  // Incoming messages from webview → Pi session
  Neutralino.events.on("pi:input", (event) => {
    const { type, payload } = event.detail;
    if (type === "prompt") {
      session.prompt(payload.message, { images: payload.images });
    } else if (type === "abort") {
      session.abort();
    }
  });

  startExtensionWatcher();

  // Signal webview that Pi is ready
  Neutralino.events.broadcast("pi:ready", {});
}

main().catch(console.error);
```

---

## Phase 2: React State Bridge

### 2.1 Zustand store (webview)

```typescript
// src/webview/stores/pi-store.ts
import { create } from "zustand";

interface PiState {
  isReady: boolean;
  messages: Message[];
  isStreaming: boolean;
  model: string | null;
}

interface PiActions {
  sendPrompt: (text: string) => void;
  abort: () => void;
}

export const usePiStore = create<PiState & PiActions>((set) => ({
  isReady: false,
  messages: [],
  isStreaming: false,
  model: null,

  sendPrompt: (text) => {
    Neutralino.events.broadcast("pi:input", {
      type: "prompt",
      payload: { message: text },
    });
  },

  abort: () => {
    Neutralino.events.broadcast("pi:input", { type: "abort" });
  },
}));
```

### 2.2 Bridge Neutralino events to Zustand

```typescript
// src/webview/lib/use-pi.ts
import { usePiStore } from "../stores/pi-store";

// Listen for Pi events and pipe into Zustand store
Neutralino.events.on("pi:event", (raw) => {
  const event = raw.detail as AgentSessionEvent;

  switch (event.type) {
    case "message_update":
      if (event.assistantMessageEvent.type === "text_delta") {
        // Append delta to the current streaming message
        usePiStore.setState((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant") {
            msgs[msgs.length - 1] = {
              ...last,
              content: last.content + event.assistantMessageEvent.delta,
            };
          }
          return { messages: msgs };
        });
      }
      break;

    case "message_start":
      usePiStore.setState((s) => ({
        messages: [...s.messages, event.message],
        isStreaming: true,
      }));
      break;

    case "agent_end":
      usePiStore.setState({ isStreaming: false });
      break;

    case "message_end":
      // Replace the partial message with the final version
      usePiStore.setState((s) => ({
        messages: s.messages.map((m) =>
          m.id === event.message.id ? event.message : m
        ),
      }));
      break;
  }
});

Neutralino.events.on("pi:ready", () => {
  usePiStore.setState({ isReady: true });
});

// React hooks
export function usePi() {
  return usePiStore();
}

export function useSendMessage() {
  return usePiStore((s) => s.sendPrompt);
}
```

---

## Phase 3: UI Shell

### 3.1 HTML entry

```html
<!-- src/webview/index.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pi GUI</title>
</head>
<body>
  <div id="root"></div>
  <script src="https://neutralino.js.org/lib/neutralino.js"></script>
  <script type="module" src="/main.tsx"></script>
</body>
</html>
```

### 3.2 React entry

```tsx
// src/webview/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "../style.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 3.3 App layout

```tsx
// src/webview/App.tsx
import { usePi } from "./lib/use-pi";
import { Transcript } from "./components/Transcript";
import { Composer } from "./components/Composer";
import { StatusBar } from "./components/StatusBar";
import { ExtensionSlots } from "./components/ExtensionHost";

export function App() {
  const isReady = usePi((s) => s.isReady);

  if (!isReady) {
    return <div className="loading">Starting Pi...</div>;
  }

  return (
    <div className="app-layout">
      <main className="main-area">
        <Transcript />
        <Composer />
      </main>
      <aside className="sidebar" id="sidebar">
        <ExtensionSlots />
      </aside>
      <footer className="status-bar">
        <StatusBar />
      </footer>
    </div>
  );
}
```

### 3.4 Core components

**Transcript** — renders messages with streaming support. Auto-scrolls on new content. Different styling for user, assistant, tool calls, thinking blocks.

**Composer** — textarea with Enter-to-send, Shift+Enter for newline, send button. Disabled while streaming or before Pi is ready.

**StatusBar** — model name, thinking level, message count, streaming indicator. All read from Zustand.

---

## Phase 4: Extension System

### 4.1 File watcher + esbuild (backend)

```javascript
// src/backend/extension-watcher.js
import * as esbuild from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";

const EXTENSIONS_DIR = path.resolve(
  process.env.HOME || process.env.USERPROFILE || "~",
  ".pi",
  "gui-extensions"
);

fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });

export function startExtensionWatcher() {
  // Compile any extensions that already exist
  compileAllExisting();

  // Watch for new/changed files
  fs.watch(EXTENSIONS_DIR, async (eventType, filename) => {
    if (!filename || !(filename.endsWith(".ts") || filename.endsWith(".tsx"))) return;
    await compileExtension(filename);
  });
}

async function compileExtension(filename) {
  const filePath = path.join(EXTENSIONS_DIR, filename);
  try {
    const result = await esbuild.build({
      entryPoints: [filePath],
      bundle: true,
      format: "esm",
      platform: "browser",
      jsx: "automatic",           // React JSX transform
      external: [
        "react",                  // Provided by the webview
        "react-dom",
        "react-dom/client",
        "zustand",
        "pi-gui",                 // Our own hook library
      ],
      sourcemap: "inline",
      write: false,
    });

    const extensionId = filename.replace(/\.(ts|tsx)$/, "");

    Neutralino.events.broadcast("ext:update", {
      id: extensionId,
      code: result.outputFiles[0].text,
    });
  } catch (err) {
    Neutralino.events.broadcast("ext:error", {
      id: filename,
      error: err.message,
    });
  }
}
```

### 4.2 Extension host (webview)

```tsx
// src/webview/components/ExtensionHost.tsx
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

interface Extension {
  id: string;
  title: string;
  Component: React.ComponentType<{ pi: ReturnType<typeof usePiStore.getState> }>;
}

const extensions = new Map<string, Extension>();

// Receive compiled extensions from the backend
Neutralino.events.on("ext:update", (raw) => {
  const { id, code } = raw.detail as { id: string; code: string };

  try {
    // esbuild with `format: "esm"` produces an ES module.
    // Wrap it so we can eval it and extract the exports.
    const exports: Record<string, unknown> = {};
    const module = { exports };

    // Provide the imports the extension expects
    const require = (name: string) => {
      const modules: Record<string, unknown> = {
        "react": React,
        "react-dom": ReactDOM,
        "react-dom/client": ReactDOM,
        "zustand": { create: (await import("zustand")).create },
        "pi-gui": { usePi: () => usePiStore() },
      };
      if (modules[name]) return modules[name];
      throw new Error(`Extension cannot import "${name}"`);
    };

    const fn = new Function("exports", "module", "require", code);
    fn(exports, module, require);

    const ext = module.exports.default || module.exports as Extension;
    extensions.set(id, ext);

    // Force re-render
    window.dispatchEvent(new CustomEvent("extensions:changed"));
  } catch (err) {
    console.error(`Extension ${id} failed to load:`, err);
  }
});

export function ExtensionSlots() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener("extensions:changed", handler);
    return () => window.removeEventListener("extensions:changed", handler);
  }, []);

  const extList = Array.from(extensions.values());

  if (extList.length === 0) return null;

  return (
    <>
      {extList.map((ext) => (
        <div key={ext.id} className="extension-panel">
          {ext.title && <h3 className="ext-title">{ext.title}</h3>}
          <ext.Component pi={usePiStore.getState()} />
        </div>
      ))}
    </>
  );
}
```

### 4.3 What the agent writes

```tsx
// ~/.pi/gui-extensions/status-panel.tsx
import { usePi } from "pi-gui";

export default {
  id: "status-panel",
  title: "Status",
  Component: () => {
    const pi = usePi();
    return (
      <div className="status-panel">
        <p>Messages: {pi.messages.length}</p>
        <p>Streaming: {pi.isStreaming ? "Yes" : "No"}</p>
        <p>Model: {pi.model || "—"}</p>
      </div>
    );
  },
};
```

The agent writes a `.tsx` file → esbuild strips types, compiles JSX, bundles imports → Neutralino broadcasts the compiled code → the webview evals and mounts the component. The whole round trip is under 100ms.

---

## Phase 5: Build Pipeline

### 5.1 Package scripts

```json
{
  "scripts": {
    "dev:webview": "vite build --watch",
    "dev:backend": "node src/backend/main.js",
    "dev": "concurrently \"npm run dev:webview\" \"npm run dev:backend\"",
    "build": "npm run build:webview && neu build",
    "build:webview": "vite build",
    "start": "neu run"
  }
}
```

### 5.2 Dev workflow

1. `npm run dev` starts Vite watching the React source + the Neutralino backend
2. Vite outputs to `dist/webview/`
3. Neutralino loads from `dist/webview/` (configured in `neutralino.config.json`'s `documentRoot`)
4. When agent writes an extension, the backend compiles it and broadcasts to the webview

### 5.3 Production build

1. `npm run build` runs `vite build` → outputs static HTML/CSS/JS to `dist/webview/`
2. `neu build` packages `dist/webview/` + backend code into a platform binary
3. Output: `dist/pi-gui.exe` (Windows), `dist/pi-gui.dmg` (macOS), `dist/pi-gui.AppImage` (Linux)

---

## Phase 6: Milestones

| # | Milestone | What it means | Effort |
|---|---|---|---|
| M1 | **Neutralino + Vite scaffold** | `neu run` opens a window with a React app showing "Starting Pi..." | 1 session |
| M2 | **Pi SDK embedded** | Backend calls `createAgentSession()`. Webview receives `pi:ready` and transitions to chat UI. | 1 session |
| M3 | **Transcript streams** | Send a prompt, see streaming text in real time. Tool calls and results render with proper styling. | 1 session |
| M4 | **Composer works** | Textarea sends prompts. Enter to send, Shift+Enter for newline. Disabled while streaming. | 1 session |
| M5 | **Extension system** | Agent writes a `.tsx` to `~/.pi/gui-extensions/`. It appears in the sidebar within ~100ms. | 1 session |
| M6 | **Model selection** | Dropdown or command to switch models. Status bar shows current model and thinking level. | 1 session |
| M7 | **Production binary** | `npm run build` produces a standalone binary. | 1 session |
| M8 | **Polish** | Auto-scroll, copy buttons, error states, keyboard shortcuts, theming. | ongoing |

---

## Key Patterns for the Agent

When asking Pi to build features, include these:

1. **State in Zustand.** All Pi events update the Zustand store. Components read from it. No local state for data from Pi.
2. **Extensions are `.tsx` files.** Backend compiles with esbuild, broadcasts to webview, ExtensionHost mounts them. Agents must mark esbuild externals as provided.
3. **Pi runs via the SDK.** `createAgentSession()` in the Neutralino backend. No subprocess, no `pi --mode rpc`, no JSONL.
4. **Neutralino events bridge the gap.** `broadcast("pi:event", data)` from backend, `Neutralino.events.on("pi:event", ...)` in webview.

---
