// src/backend/main.js
// Neutralinojs extension entry point.
// Reads connection info from stdin, connects via WebSocket,
// initializes Pi SDK, and bridges events between Pi and the webview.

import { createPiSession } from "./pi-bridge.js";
import { startExtensionWatcher } from "./extension-watcher.js";
import { searchFiles } from "./file-search.js";
import * as fs from "node:fs";

// ── Read connection info from stdin (Neutralino sends it at spawn) ──
const processInput = JSON.parse(
  fs.readFileSync(process.stdin.fd, "utf-8")
);
const NL_PORT = processInput.nlPort;
const NL_TOKEN = processInput.nlToken;
const NL_CTOKEN = processInput.nlConnectToken;
const NL_EXTID = processInput.nlExtensionId;

const log = (msg, type = "INFO") => {
  const prefix = `[${NL_EXTID}]`;
  const ts = new Date().toISOString().slice(11, 19);
  if (type === "ERROR") console.error(`${ts} ${prefix} ${msg}`);
  else console.log(`${ts} ${prefix} ${msg}`);
};

// ── Connect to Neutralino main process ──
const wsUrl = `ws://127.0.0.1:${NL_PORT}?extensionId=${NL_EXTID}&connectToken=${NL_CTOKEN}`;
const ws = new WebSocket(wsUrl);

// Simple JSON-RPC style: send a native method call and get a response
const pendingCalls = new Map();

function callMethod(method, data = {}) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    pendingCalls.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, accessToken: NL_TOKEN, data }));
  });
}

// Broadcast an event to all app instances (the webview)
function broadcastToApp(event, data) {
  return callMethod("app.broadcast", { event, data });
}

// Module-level Pi session reference (set once on connect, replaced on /new)
let session = null;
let sessionUnsub = null;

function subscribeSession() {
  sessionUnsub = session.subscribe((event) => {
    broadcastToApp("pi:event", event).catch((e) =>
      log(`Broadcast failed: ${e.message}`, "ERROR")
    );
  });
}

// ── Built-in slash commands ───────────────────────────────────────
// Pi's CLI handles these directly; the SDK does not. Reimplement here so
// the GUI exposes the same vocabulary.

const builtinDescriptions = {
  new: "Start a new session",
  compact: "Manually compact the session context",
  reload: "Reload extensions, skills, prompts, themes",
  export: "Export session (HTML default, or specify path: .html/.jsonl)",
  copy: "Copy last agent message to clipboard",
  name: "Set session display name",
  session: "Show session info and stats",
  quit: "Quit Pi GUI",
  model: "Show or switch model",
  "scoped-models": "Show scoped models",
  settings: "Show settings",
  hotkeys: "Show all keyboard shortcuts",
  changelog: "Show Pi SDK changelog",
};

const builtins = {
  async new() {
    if (sessionUnsub) sessionUnsub();
    session = await createPiSession();
    subscribeSession();
    await broadcastToApp("pi:reset", { cwd: process.cwd() });
    await broadcastCommands();
    return { text: "New session started." };
  },

  async compact(args) {
    await session.compact(args || undefined);
    return { text: "Context compacted." };
  },

  async reload() {
    await session.reload();
    await broadcastCommands();
    return { text: "Reloaded extensions, skills, prompts, themes." };
  },

  async export(args) {
    const trimmed = args?.trim();
    const path = trimmed && trimmed.endsWith(".jsonl")
      ? session.exportToJsonl(trimmed)
      : await session.exportToHtml(trimmed || undefined);
    return { text: `Exported session → ${path}` };
  },

  async copy() {
    const text = session.getLastAssistantText();
    if (!text) return { text: "No assistant message to copy.", isError: true };
    await callMethod("clipboard.writeText", { data: text });
    return { text: "Copied last assistant message." };
  },

  async name(args) {
    if (!args) return { text: "Usage: /name <session name>", isError: true };
    session.setSessionName(args);
    return { text: `Session named: ${args}` };
  },

  async session() {
    const stats = session.getSessionStats();
    return { text: formatStats(stats) };
  },

  async quit() {
    // Allow the notice to flush before exit.
    setTimeout(() => callMethod("app.exit", {}).catch(() => {}), 100);
    return { text: "Exiting…" };
  },

  async model(args) {
    const trimmed = args?.trim();
    const available = session.modelRegistry.getAvailable();
    if (!trimmed) {
      const current = session.model;
      const lines = ["Available models:"];
      for (const m of available) {
        const mark = current && m.provider === current.provider && m.id === current.id ? "* " : "  ";
        lines.push(`${mark}${m.provider}:${m.id}${m.name ? ` — ${m.name}` : ""}`);
      }
      lines.push("");
      lines.push("Switch: /model <provider>:<id>  or  /model <id>");
      return { text: lines.join("\n") };
    }
    let provider;
    let id;
    if (trimmed.includes(":")) {
      const idx = trimmed.indexOf(":");
      provider = trimmed.slice(0, idx);
      id = trimmed.slice(idx + 1);
    } else {
      id = trimmed;
    }
    const found = provider
      ? available.find((m) => m.provider === provider && m.id === id)
      : available.find((m) => m.id === id);
    if (!found) return { text: `Model not found: ${trimmed}`, isError: true };
    await session.setModel(found);
    // Notify webview of the model change
    broadcastToApp("pi:model", {
      model: { provider: found.provider, id: found.id },
    }).catch(() => {});
    return { text: `Model → ${found.provider}:${found.id}` };
  },

  async "scoped-models"() {
    const scoped = session.scopedModels;
    if (!scoped || scoped.length === 0) {
      return { text: "No scoped models configured." };
    }
    const lines = ["Scoped models:"];
    for (const s of scoped) {
      const lvl = s.thinkingLevel ? ` (${s.thinkingLevel})` : "";
      lines.push(`  ${s.model.provider}:${s.model.id}${lvl}`);
    }
    return { text: lines.join("\n") };
  },

  async settings() {
    const model = session.model;
    const lines = [
      `model: ${model ? `${model.provider}:${model.id}` : "(none)"}`,
      `thinkingLevel: ${session.thinkingLevel}`,
      `steeringMode: ${session.steeringMode}`,
      `followUpMode: ${session.followUpMode}`,
      `autoCompactionEnabled: ${session.autoCompactionEnabled}`,
      `sessionId: ${session.sessionId}`,
      `sessionName: ${session.sessionName || "(none)"}`,
    ];
    return { text: lines.join("\n") };
  },

  async hotkeys() {
    return {
      text: [
        "Composer:",
        "  Enter           Send",
        "  Shift+Enter     Newline",
        "",
        "Slash commands:",
        "  /new                  Start new session",
        "  /compact [hint]       Manually compact context",
        "  /reload               Reload extensions/skills/prompts/themes",
        "  /export [path]        Export session (HTML or .jsonl)",
        "  /copy                 Copy last assistant message",
        "  /name <name>          Name session",
        "  /session              Session stats",
        "  /model [provider:id]  Show or switch model",
        "  /scoped-models        Show scoped models",
        "  /settings             Show settings",
        "  /hotkeys              This list",
        "  /changelog            Show Pi SDK changelog",
        "  /quit                 Exit",
      ].join("\n"),
    };
  },

  async changelog() {
    try {
      const { readFile } = await import("node:fs/promises");
      const pathMod = await import("node:path");
      const osMod = await import("node:os");
      const sdkDir = pathMod.join(
        process.env.APPDATA || pathMod.join(osMod.homedir(), ".npm-global"),
        "npm",
        "node_modules",
        "@earendil-works",
        "pi-coding-agent"
      );
      const content = await readFile(pathMod.join(sdkDir, "CHANGELOG.md"), "utf-8");
      const lines = content.split("\n").slice(0, 80);
      return { text: lines.join("\n") };
    } catch (err) {
      return { text: `Changelog unavailable: ${err.message || err}`, isError: true };
    }
  },
};

function listCommands() {
  const out = [];
  for (const [name, desc] of Object.entries(builtinDescriptions)) {
    out.push({ name, description: desc, source: "builtin" });
  }
  if (!session) return out;
  try {
    for (const c of session.extensionRunner.getRegisteredCommands()) {
      out.push({
        name: c.invocationName,
        description: c.description || "",
        source: "extension",
      });
    }
  } catch (err) {
    log(`listCommands extensions: ${err.message}`, "ERROR");
  }
  try {
    for (const t of session.promptTemplates) {
      out.push({
        name: t.name,
        description: t.description || "",
        source: "prompt",
      });
    }
  } catch {}
  try {
    for (const s of session.resourceLoader.getSkills().skills) {
      out.push({
        name: `skill:${s.name}`,
        description: s.description || "",
        source: "skill",
      });
    }
  } catch {}
  return out;
}

function broadcastCommands() {
  return broadcastToApp("pi:commands", { commands: listCommands() }).catch((e) =>
    log(`Broadcast commands failed: ${e.message}`, "ERROR")
  );
}

function formatStats(stats) {
  const lines = [];
  for (const [k, v] of Object.entries(stats)) {
    const val = v && typeof v === "object" ? JSON.stringify(v) : v;
    lines.push(`${k}: ${val}`);
  }
  return lines.join("\n");
}

function parseCommand(text) {
  const spaceIdx = text.indexOf(" ");
  const name = spaceIdx === -1 ? text.slice(1) : text.slice(1, spaceIdx);
  const args = spaceIdx === -1 ? "" : text.slice(spaceIdx + 1).trim();
  return { name, args };
}

async function tryBuiltin(text) {
  const { name, args } = parseCommand(text);
  const handler = builtins[name];
  if (!handler) return false;
  try {
    const result = await handler(args);
    if (result?.text) {
      await broadcastToApp("pi:notice", {
        text: result.text,
        isError: !!result.isError,
      });
    }
  } catch (err) {
    await broadcastToApp("pi:notice", {
      text: `/${name}: ${err.message || err}`,
      isError: true,
    });
  }
  return true;
}

// Handle incoming messages from the webview
async function handleWebviewInput(data) {
  if (!session) return;
  const { type, payload } = data || {};
  try {
    if (type === "prompt") {
      const text = payload?.message || "";
      if (text.startsWith("/")) {
        const handled = await tryBuiltin(text);
        if (handled) {
          await broadcastToApp("pi:command_done", {});
          return;
        }
      }
      await session.prompt(text, { images: payload?.images || [] });
      // Extension commands return immediately without firing the agent loop.
      // Unstick the streaming UI in that case.
      if (!session.isStreaming) {
        await broadcastToApp("pi:command_done", {});
      }
    } else if (type === "abort") {
      session.abort();
    } else if (type === "searchFiles") {
      // Composer @-mention autocomplete. Stateless lookup: walk cwd, score,
      // return the top N items keyed by the caller's requestId.
      const requestId = payload?.requestId;
      const query = typeof payload?.query === "string" ? payload.query : "";
      let items = [];
      try {
        items = searchFiles(query, process.cwd());
      } catch (err) {
        log(`searchFiles failed: ${err.message}`, "ERROR");
      }
      await broadcastToApp("pi:files_result", { requestId, items });
    }
  } catch (err) {
    await broadcastToApp("pi:notice", {
      text: err.message || String(err),
      isError: true,
    });
    await broadcastToApp("pi:command_done", {});
  }
}

// ── WebSocket event handlers ──

ws.addEventListener("open", async () => {
  log("Connected to Neutralino");

  try {
    session = await createPiSession();
    log("Pi session created");

    // All Pi events → broadcast to webview
    subscribeSession();

    // Start extension file watcher. The watcher expects a Neutralino-like
    // shape with .events.broadcast(event, data) — wrap our RPC fn.
    startExtensionWatcher({
      events: { broadcast: (event, data) => broadcastToApp(event, data) },
    });

    // Signal webview that Pi is ready
    await broadcastToApp("pi:ready", { cwd: process.cwd() });
    // Send current model info
    if (session.model) {
      await broadcastToApp("pi:model", {
        model: { provider: session.model.provider, id: session.model.id },
      });
    }
    await broadcastCommands();
    log("Pi GUI ready");
  } catch (err) {
    log(`Fatal: ${err.message}`, "ERROR");
    // Surface to webview instead of exiting silently.
    broadcastToApp("pi:event", {
      type: "error",
      error: `Pi failed to start: ${err.message}`,
    }).catch(() => {});
  }
});

ws.addEventListener("message", (event) => {
  try {
    const msg = JSON.parse(event.data);

    // Handle RPC responses
    if (msg.id && pendingCalls.has(msg.id)) {
      const { resolve, reject } = pendingCalls.get(msg.id);
      pendingCalls.delete(msg.id);
      if (msg.data?.success === false) {
        reject(new Error(msg.data.error?.message || "RPC error"));
      } else {
        resolve(msg.data?.returnValue ?? msg.data);
      }
      return;
    }

    // Handle events from the webview (dispatched via extensions.dispatch)
    if (msg.event === "pi:input") {
      handleWebviewInput(msg.data).catch((err) =>
        log(`handleWebviewInput failed: ${err.message}`, "ERROR")
      );
    }

    // Webview just connected — rebroadcast current status
    if (msg.event === "pi:hello") {
      log("Received pi:hello from webview — rebroadcasting pi:ready");
      broadcastToApp("pi:ready", { cwd: process.cwd() }).catch((e) =>
        log(`Rebroadcast ready failed: ${e.message}`, "ERROR")
      );
      if (session) {
        if (session.model) {
          broadcastToApp("pi:model", {
            model: { provider: session.model.provider, id: session.model.id },
          }).catch(() => {});
        }
        broadcastCommands();
      }
    }
  } catch (err) {
    log(`Message parse error: ${err.message}`, "ERROR");
  }
});

ws.addEventListener("close", () => {
  log("Connection closed — exiting");
  process.exit(0);
});

ws.addEventListener("error", (err) => {
  log(`WebSocket error: ${err.message || err}`, "ERROR");
});
