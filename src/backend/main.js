// src/backend/main.js
// Neutralinojs extension entry point.
// Reads connection info from stdin, connects via WebSocket,
// initializes Pi SDK, and bridges events between Pi and the webview.

import { createPiSession } from "./pi-bridge.js";
import { startExtensionWatcher } from "./extension-watcher.js";
import { searchFiles } from "./file-search.js";
import { createBuiltinRegistry } from "./builtins.js";
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

const registry = createBuiltinRegistry({
  broadcast: broadcastToApp,
  callMethod,
  broadcastCommands,
});

function subscribeSession() {
  sessionUnsub = session.subscribe((event) => {
    broadcastToApp("pi:event", event).catch((e) =>
      log(`Broadcast failed: ${e.message}`, "ERROR")
    );
    // Broadcast session stats after agent completes a turn
    if (event.type === "agent_end" || event.type === "message_end") {
      broadcastSessionStats();
    }
  });
}

function listCommands() {
  const out = registry.list();
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

function getAvailableModels() {
  if (!session) return [];
  try {
    return session.modelRegistry.getAvailable().map((m) => ({
      provider: m.provider,
      id: m.id,
      name: m.name,
      contextWindow: m.contextWindow,
      maxTokens: m.maxTokens,
      reasoning: m.reasoning,
      input: m.input,
    }));
  } catch (err) {
    log(`getAvailableModels: ${err.message}`, "ERROR");
    return [];
  }
}

function broadcastModels() {
  return broadcastToApp("pi:models", { models: getAvailableModels() }).catch((e) =>
    log(`Broadcast models failed: ${e.message}`, "ERROR")
  );
}

function broadcastSessionStats() {
  if (!session) return;
  try {
    const stats = session.getSessionStats();
    broadcastToApp("pi:stats", {
      stats: {
        sessionId: stats.sessionId,
        sessionName: session.sessionName || null,
        sessionFile: stats.sessionFile || null,
        userMessages: stats.userMessages,
        assistantMessages: stats.assistantMessages,
        toolCalls: stats.toolCalls,
        toolResults: stats.toolResults,
        totalMessages: stats.totalMessages,
        tokens: {
          input: stats.tokens.input,
          output: stats.tokens.output,
          cacheRead: stats.tokens.cacheRead,
          cacheWrite: stats.tokens.cacheWrite,
          total: stats.tokens.total,
        },
        cost: stats.cost,
        contextUsage: stats.contextUsage || null,
      },
    }).catch((e) => log(`Broadcast stats failed: ${e.message}`, "ERROR"));
  } catch (err) {
    log(`getSessionStats failed: ${err.message}`, "ERROR");
  }
}

function parseCommand(text) {
  const spaceIdx = text.indexOf(" ");
  const name = spaceIdx === -1 ? text.slice(1) : text.slice(1, spaceIdx);
  const args = spaceIdx === -1 ? "" : text.slice(spaceIdx + 1).trim();
  return { name, args };
}

async function tryBuiltin(text) {
  const { name, args } = parseCommand(text);
  const result = await registry.run(name, args, () => session);
  if (result === null) return false;

  if (result?._recreateSession) {
    if (sessionUnsub) sessionUnsub();
    session = result._recreateSession;
    subscribeSession();
    await broadcastToApp("pi:reset", { cwd: process.cwd() });
    await broadcastCommands();
    broadcastSessionStats();
  }

  if (result?.event) {
    await broadcastToApp(result.event, result.eventData || {});
  }

  if (result?.text) {
    await broadcastToApp("pi:notice", {
      text: result.text,
      isError: !!result.isError,
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
    } else if (type === "getStats") {
      broadcastSessionStats();
    }
  } catch (err) {
    await broadcastToApp("pi:notice", {
      text: err.message || String(err),
      isError: true,
    });
    await broadcastToApp("pi:command_done", {});
  }
}

// ── Input queue: serialize pi:input messages so that commands
//    (/model, /new, etc.) always complete before the next prompt
//    is dispatched to the session.
let inputQueue = Promise.resolve();

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

    // Signal webview that Pi is ready — embed initial stats so the UI
    // has them immediately without requiring a separate getStats request.
    let initialStats = null;
    try {
      if (session) {
        const s = session.getSessionStats();
        initialStats = {
          sessionId: s.sessionId,
          sessionName: session.sessionName || null,
          sessionFile: s.sessionFile || null,
          userMessages: s.userMessages,
          assistantMessages: s.assistantMessages,
          toolCalls: s.toolCalls,
          toolResults: s.toolResults,
          totalMessages: s.totalMessages,
          tokens: {
            input: s.tokens.input,
            output: s.tokens.output,
            cacheRead: s.tokens.cacheRead,
            cacheWrite: s.tokens.cacheWrite,
            total: s.tokens.total,
          },
          cost: s.cost,
          contextUsage: s.contextUsage || null,
        };
      }
    } catch (err) {
      log(`Initial stats failed: ${err.message}`, "ERROR");
    }
    await broadcastToApp("pi:ready", { cwd: process.cwd(), stats: initialStats });
    // Send current model info
    if (session.model) {
      await broadcastToApp("pi:model", {
        model: { provider: session.model.provider, id: session.model.id },
      });
    }
    await broadcastCommands();
    await broadcastModels();
    broadcastSessionStats();
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

    // Handle events from the webview (dispatched via extensions.dispatch).
    // Chain through inputQueue so commands complete before the next prompt
    // reaches session.prompt().  Without this, a /model command and a
    // user prompt can race inside the session, corrupting its state.
    if (msg.event === "pi:input") {
      inputQueue = inputQueue
        .then(() => handleWebviewInput(msg.data))
        .catch((err) =>
          log(`handleWebviewInput failed: ${err.message}`, "ERROR")
        );
    }

    // Webview just connected — rebroadcast current status
    if (msg.event === "pi:hello") {
      log("Received pi:hello from webview — rebroadcasting pi:ready with stats");
      let helloStats = null;
      try {
        if (session) {
          const s = session.getSessionStats();
          helloStats = {
            sessionId: s.sessionId,
            sessionName: session.sessionName || null,
            sessionFile: s.sessionFile || null,
            userMessages: s.userMessages,
            assistantMessages: s.assistantMessages,
            toolCalls: s.toolCalls,
            toolResults: s.toolResults,
            totalMessages: s.totalMessages,
            tokens: {
              input: s.tokens.input,
              output: s.tokens.output,
              cacheRead: s.tokens.cacheRead,
              cacheWrite: s.tokens.cacheWrite,
              total: s.tokens.total,
            },
            cost: s.cost,
            contextUsage: s.contextUsage || null,
          };
        }
      } catch (err) {
        log(`Hello stats failed: ${err.message}`, "ERROR");
      }
      broadcastToApp("pi:ready", { cwd: process.cwd(), stats: helloStats }).catch((e) =>
        log(`Rebroadcast ready failed: ${e.message}`, "ERROR")
      );
      if (session) {
        if (session.model) {
          broadcastToApp("pi:model", {
            model: { provider: session.model.provider, id: session.model.id },
          }).catch(() => {});
        }
        broadcastCommands();
        broadcastModels();
        broadcastSessionStats();
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
