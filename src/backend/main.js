// src/backend/main.js
// Neutralinojs extension entry point.
// Reads connection info from stdin, connects via WebSocket,
// initializes Pi SDK, and bridges events between Pi and the webview.

import { createPiSession } from "./pi-bridge.js";
import { startExtensionWatcher } from "./extension-watcher.js";
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

// Module-level Pi session reference (set once on connect)
let session = null;

// Handle incoming messages from the webview
function handleWebviewInput(data) {
  if (!session) return;
  const { type, payload } = data || {};
  if (type === "prompt") {
    session.prompt(payload.message, { images: payload.images || [] });
  } else if (type === "abort") {
    session.abort();
  }
}

// ── WebSocket event handlers ──

ws.addEventListener("open", async () => {
  log("Connected to Neutralino");

  try {
    session = await createPiSession();
    log("Pi session created");

    // All Pi events → broadcast to webview
    session.subscribe((event) => {
      broadcastToApp("pi:event", event).catch((e) =>
        log(`Broadcast failed: ${e.message}`, "ERROR")
      );
    });

    // Start extension file watcher. The watcher expects a Neutralino-like
    // shape with .events.broadcast(event, data) — wrap our RPC fn.
    startExtensionWatcher({
      events: { broadcast: (event, data) => broadcastToApp(event, data) },
    });

    // Signal webview that Pi is ready
    await broadcastToApp("pi:ready", { cwd: process.cwd() });
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
      handleWebviewInput(msg.data);
    }

    // Webview just connected — rebroadcast current status
    if (msg.event === "pi:hello") {
      log("Received pi:hello from webview — rebroadcasting pi:ready");
      broadcastToApp("pi:ready", { cwd: process.cwd() }).catch((e) =>
        log(`Rebroadcast ready failed: ${e.message}`, "ERROR")
      );
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
