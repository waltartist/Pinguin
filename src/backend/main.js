// src/backend/main.js
// Neutralinojs extension entry point.
// Reads connection info from stdin, connects via WebSocket,
// initializes Pi SDK, and bridges events between Pi and the webview.

import { createPiSession } from "./pi-bridge.js";
import { startExtensionWatcher } from "./extension-watcher.js";
import { searchFiles } from "./file-search.js";
import { createBuiltinRegistry } from "./builtins.js";
import * as fs from "node:fs";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { spawn, execSync } from "node:child_process";

// ── Connection info cache ──
// On manual reload, the old process spawns a child and exits. The child
// inherits the same stdin/stdout pipes but stdin data is already consumed.
// We cache the connection info so the child can find it.
const CONNECTION_CACHE =
  process.env.PINGUIN_CONNECTION_CACHE ||
  path.join(os.tmpdir(), `pinguin-connection-${process.pid}-${crypto.randomUUID()}.json`);

function writeConnectionCache(data) {
  fs.writeFileSync(CONNECTION_CACHE, JSON.stringify(data), { mode: 0o600 });
}

function removeConnectionCache() {
  try {
    fs.unlinkSync(CONNECTION_CACHE);
  } catch {}
}

// ── Cleanup on crash / signal so the temp file with tokens doesn't linger ──
function cleanup() {
  removeConnectionCache();
  if (backendWatcher) { try { backendWatcher.close(); } catch {} }
  if (resourcesIndex) { try { fs.unwatchFile(resourcesIndex); } catch {} }
}
process.on("exit", cleanup);
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    cleanup();
    process.exit(0);
  });
}

function getConnectionInfo() {
  // On reload spawn, the child is started with --reloaded flag.
  // It bypasses stdin (already consumed) and reads directly from cache.
  if (process.argv.includes("--reloaded")) {
    try {
      return JSON.parse(fs.readFileSync(CONNECTION_CACHE, "utf-8"));
    } catch {
      console.error("FATAL: Cannot read connection info from cache (reload)");
      process.exit(1);
    }
  }

  // Try stdin first (normal Neutralino spawn)
  try {
    const raw = fs.readFileSync(process.stdin.fd, "utf-8").trim();
    if (raw.length > 0) {
      const data = JSON.parse(raw);
      writeConnectionCache(data);
      return data;
    }
  } catch {}

  // Fall back to cache (edge case)
  try {
    return JSON.parse(fs.readFileSync(CONNECTION_CACHE, "utf-8"));
  } catch {
    console.error("FATAL: Cannot read connection info from stdin or cache");
    process.exit(1);
  }
}

const processInput = getConnectionInfo();
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
    log(`session event: ${event.type}${event.type === "error" ? ` (${event.error})` : ""}`);
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
    return session.extensionRunner.getModelRegistry().getAvailable().map((m) => ({
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

// ── Shared stats serializer (used by broadcastSessionStats, pi:ready, pi:hello) ──
function serializeStats() {
  if (!session) return null;
  const s = session.getSessionStats();
  return {
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

function broadcastSessionStats() {
  if (!session) return;
  try {
    const stats = serializeStats();
    if (!stats) return;
    broadcastToApp("pi:stats", { stats }).catch((e) =>
      log(`Broadcast stats failed: ${e.message}`, "ERROR")
    );
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
    if (type === "switchModel") {
      // Match Pi's approach: handle model switching directly, not through
      // the prompt pipeline or input queue — no race conditions.
      const { provider, id } = payload || {};
      log(`handleWebviewInput: switchModel to ${provider}:${id}`);
      // Refresh registry to pick up models.json changes (Pi TUI does this too)
      const modelRegistry = session.extensionRunner.getModelRegistry();
      await modelRegistry.refresh();
      const available = modelRegistry.getAvailable();
      const found = provider
        ? available.find((m) => m.provider === provider && m.id === id)
        : available.find((m) => m.id === id);
      if (!found) {
        log(`switchModel: model not found ${provider}:${id}`, "ERROR");
        await broadcastToApp("pi:notice", {
          text: `Model not found: ${provider}:${id}`,
          isError: true,
        });
        return;
      }
      try {
        await session.setModel(found);
        log(`switchModel: set to ${found.provider}:${found.id}`);
        await broadcastToApp("pi:model", {
          model: { provider: found.provider, id: found.id },
        });
        await broadcastToApp("pi:notice", {
          text: `Model → ${found.provider}:${found.id}`,
        });
      } catch (err) {
        log(`switchModel: failed: ${err.message}`, "ERROR");
        await broadcastToApp("pi:notice", {
          text: err.message || String(err),
          isError: true,
        });
      }
      return;
    }
    if (type === "prompt") {
      const text = payload?.message || "";
      log(`handleWebviewInput: prompt "${text}" (model: ${session.model?.provider}:${session.model?.id})`);
      if (text.startsWith("/")) {
        const handled = await tryBuiltin(text);
        if (handled) {
          await broadcastToApp("pi:command_done", {});
          log(`handleWebviewInput: builtin handled "${text}"`);
          return;
        }
      }
      log(`handleWebviewInput: calling session.prompt() with model ${session.model?.provider}:${session.model?.id}`);
      await session.prompt(text, { images: payload?.images || [] });
      log(`handleWebviewInput: session.prompt() resolved, isStreaming=${session.isStreaming}`);
      // Extension commands return immediately without firing the agent loop.
      // Unstick the streaming UI in that case.
      if (!session.isStreaming) {
        log(`handleWebviewInput: not streaming, broadcasting command_done`);
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
    } else if (type === "getProviders") {
      broadcastProviders();
    } else if (type === "login") {
      await handleLogin(payload?.providerId, payload?.authType);
    } else if (type === "loginResponse") {
      // Frontend responded to a login prompt
      const { requestId, value, error } = payload || {};
      const pending = pendingLoginPrompts.get(requestId);
      if (pending) {
        pendingLoginPrompts.delete(requestId);
        if (error) pending.reject(new Error(error));
        else pending.resolve(value);
      }
    } else if (type === "logout") {
      await handleLogout(payload?.providerId);
    } else if (type === "checkUpdate") {
      // Manual update check from the UI
      await checkForUpdate(true);
    } else if (type === "runUpdate") {
      // User clicked the Update button
      await runUpdate();
    } else if (type === "reload_backend") {
      // User clicked "Reload" in the frontend.
      // Spawn a fresh process that inherits our stdio pipes, then exit.
      // The child starts with --reloaded and reads connection info from cache.
      log("Reloading backend...");
      // Ensure cache is fresh
      writeConnectionCache({
        nlPort: NL_PORT,
        nlToken: NL_TOKEN,
        nlConnectToken: NL_CTOKEN,
        nlExtensionId: NL_EXTID,
      });
      const child = spawn(process.execPath, [process.argv[1], "--reloaded"], {
        stdio: "inherit",
        detached: true,
        windowsHide: true,
        env: { ...process.env, PINGUIN_CONNECTION_CACHE: CONNECTION_CACHE },
      });
      child.unref();
      // Brief delay so the child can start before we close the WebSocket
      await new Promise((r) => setTimeout(r, 300));
      process.exit(0);
    }
  } catch (err) {
    log(`handleWebviewInput ERROR: ${err.message || err}`, "ERROR");
    await broadcastToApp("pi:notice", {
      text: err.message || String(err),
      isError: true,
    });
    await broadcastToApp("pi:command_done", {});
  }
}

// ── File watcher: detect backend source changes and prompt
//    the webview to show a Reload button (user clicks to trigger reload).
let backendWatcher = null;
try {
  const watchDir = path.dirname(fileURLToPath(import.meta.url));
  backendWatcher = fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
    if (!filename || filename.startsWith(".")) return;
    log(`File changed: ${filename} — broadcasting pi:reload`);
    broadcastToApp("pi:reload", {}).catch((e) =>
      log(`broadcast pi:reload failed: ${e.message}`, "ERROR")
    );
  });
} catch (err) {
  log(`File watcher setup failed (non-fatal): ${err.message}`, "ERROR");
}

// ── File watcher: detect webview resource changes (built assets in
//    resources/) and auto-reload the webview. Uses fs.watchFile (polling)
//    instead of fs.watch because the sync-resources Vite plugin atomically
//    swaps the resources/ directory (delete + rename), which breaks
//    fs.watch watchers on the directory itself.
let resourcesIndex = null;
try {
  const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)), "..", ".."
  );
  resourcesIndex = path.join(projectRoot, "resources", "index.html");
  let lastWebviewReload = 0;
  fs.watchFile(resourcesIndex, { interval: 2000 }, () => {
    const now = Date.now();
    if (now - lastWebviewReload < 3000) return; // debounce
    lastWebviewReload = now;
    log("Webview resources changed — broadcasting pi:webview_reload");
    broadcastToApp("pi:webview_reload", {}).catch((e) =>
      log(`broadcast pi:webview_reload failed: ${e.message}`, "ERROR")
    );
  });
} catch (err) {
  log(`Webview watcher setup failed (non-fatal): ${err.message}`, "ERROR");
}

// ── Update checker ──────────────────────────────────────────────────────────
// Compares the local package.json version against the one on GitHub.
// On startup and on pi:hello, it fetches the raw package.json from the
// main branch and broadcasts pi:update_available if the remote version
// is newer.

const GITHUB_RAW_URL =
  "https://raw.githubusercontent.com/waltartist/Pinguin/main/package.json";

function readLocalVersion() {
  try {
    const pkgPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json"
    );
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.version || null;
  } catch {
    return null;
  }
}

// Simple semver-like comparison: split on "." and "-" to compare
// numeric parts. Returns true if `remote` is newer than `local`.
function isNewerVersion(local, remote) {
  if (!local || !remote) return false;
  const parseParts = (v) =>
    v.split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
  const lp = parseParts(local);
  const rp = parseParts(remote);
  for (let i = 0; i < Math.max(lp.length, rp.length); i++) {
    const l = lp[i] || 0;
    const r = rp[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

let lastUpdateCheck = 0;
let cachedRemoteVersion = null;

async function checkForUpdate(force = false) {
  // Throttle: don't check more than once per 10 minutes unless forced
  const now = Date.now();
  if (!force && now - lastUpdateCheck < 10 * 60 * 1000) return;
  lastUpdateCheck = now;

  const localVersion = readLocalVersion();
  if (!localVersion) {
    log("checkForUpdate: cannot read local version");
    return;
  }

  try {
    const res = await fetch(GITHUB_RAW_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      log(`checkForUpdate: HTTP ${res.status}`, "ERROR");
      return;
    }
    const remotePkg = await res.json();
    const remoteVersion = remotePkg.version || null;
    cachedRemoteVersion = remoteVersion;

    if (isNewerVersion(localVersion, remoteVersion)) {
      log(`Update available: ${localVersion} → ${remoteVersion}`);
      await broadcastToApp("pi:update_available", {
        localVersion,
        remoteVersion,
      });
    } else {
      log(`Up to date: ${localVersion} (remote: ${remoteVersion || "unknown"})`);
    }
  } catch (err) {
    log(`checkForUpdate failed: ${err.message}`, "ERROR");
  }
}

// ── Update executor ──────────────────────────────────────────────────────────
// Runs git pull, npm install, and npm run build:webview in sequence,
// broadcasting progress to the webview. After success, the user needs to
// restart the app (or we can trigger a backend reload).

async function runUpdate() {
  const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)), "..", ".."
  );

  const steps = [
    { label: "Pulling latest code…", cmd: "git", args: ["pull", "--ff-only"] },
    { label: "Installing dependencies…", cmd: "npm", args: ["install"] },
    { label: "Building webview…", cmd: "npm", args: ["run", "build:webview"] },
  ];

  for (const step of steps) {
    await broadcastToApp("pi:update_progress", { step: step.label, status: "running" });
    log(`runUpdate: ${step.label}`);

    try {
      await new Promise((resolve, reject) => {
        const child = spawn(step.cmd, step.args, {
          cwd: projectRoot,
          stdio: ["ignore", "pipe", "pipe"],
          shell: process.platform === "win32",
        });

        let stderr = "";
        child.stderr?.on("data", (d) => { stderr += d.toString(); });
        child.stdout?.on("data", (d) => { /* could log if verbose */ });

        child.on("close", (code) => {
          if (code === 0) resolve(undefined);
          else reject(new Error(`${step.cmd} exited with code ${code}${stderr ? ": " + stderr.slice(-500) : ""}`));
        });
        child.on("error", reject);
      });

      await broadcastToApp("pi:update_progress", { step: step.label, status: "done" });
    } catch (err) {
      log(`runUpdate failed at "${step.label}": ${err.message}`, "ERROR");
      await broadcastToApp("pi:update_progress", { step: step.label, status: "error", error: err.message });
      await broadcastToApp("pi:update_done", { ok: false, error: err.message });
      return;
    }
  }

  log("runUpdate: all steps complete");
  await broadcastToApp("pi:update_done", { ok: true });
}

// ── Pending login prompts: maps requestId → { resolve, reject }
//    Used to bridge async AuthInteraction.prompt() callbacks through
//    Neutralino events back to the webview.
const pendingLoginPrompts = new Map();

// ── Login provider list ─────────────────────────────────────────────────────
// Returns all registered providers with their auth methods and status.
function getProviderList() {
  if (!session) return [];
  const runtime = session.modelRuntime;
  const providers = runtime.getProviders();
  return providers.map((p) => {
    const authStatus = runtime.getProviderAuthStatus(p.id);
    const hasApiKey = !!p.auth?.apiKey;
    const hasOAuth = !!p.auth?.oauth;
    const authTypes = [];
    if (hasApiKey) authTypes.push("api_key");
    if (hasOAuth) authTypes.push("oauth");
    return {
      id: p.id,
      name: p.name ?? p.id,
      authTypes,
      configured: authStatus?.configured ?? false,
      authSource: authStatus?.source ?? null,
      authLabel: authStatus?.label ?? null,
    };
  });
}

function broadcastProviders() {
  return broadcastToApp("pi:providers", { providers: getProviderList() }).catch((e) =>
    log(`Broadcast providers failed: ${e.message}`, "ERROR")
  );
}

// ── Login interaction bridge ────────────────────────────────────────────────
// Bridges the AuthInteraction callbacks (prompt, notify) through Neutralino
// events so the webview can render the UI.
async function handleLogin(providerId, authType) {
  if (!session) return;
  const runtime = session.modelRuntime;
  const provider = runtime.getProvider(providerId);
  if (!provider) {
    await broadcastToApp("pi:login_done", {
      ok: false,
      error: `Unknown provider: ${providerId}`,
    });
    return;
  }

  const interaction = {
    signal: AbortSignal.timeout(300_000), // 5-minute timeout
    prompt: async (prompt) => {
      const requestId = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        pendingLoginPrompts.set(requestId, { resolve, reject });
        broadcastToApp("pi:login_prompt", { requestId, prompt }).catch((e) =>
          log(`login prompt broadcast failed: ${e.message}`, "ERROR")
        );
      });
    },
    notify: (event) => {
      broadcastToApp("pi:login_notify", { event }).catch((e) =>
        log(`login notify broadcast failed: ${e.message}`, "ERROR")
      );
    },
  };

  try {
    await runtime.login(providerId, authType, interaction);

    // After successful login, refresh models and pick a default if none is set.
    await runtime.refresh();
    const available = await runtime.getAvailable();
    let selectedModel = null;
    if (!session.model && available.length > 0) {
      // Pick the first available model from the provider we just logged in to.
      const providerModels = available.filter((m) => m.provider === providerId);
      if (providerModels.length > 0) {
        try {
          await session.setModel(providerModels[0]);
          selectedModel = { provider: providerModels[0].provider, id: providerModels[0].id };
        } catch (err) {
          log(`login: auto-select model failed: ${err.message}`, "ERROR");
        }
      }
    }

    await broadcastToApp("pi:login_done", {
      ok: true,
      providerId,
      providerName: provider.name ?? providerId,
      selectedModel,
    });

    // Broadcast updated state
    if (selectedModel) {
      await broadcastToApp("pi:model", { model: selectedModel });
    }
    await broadcastModels();
    await broadcastProviders();
    broadcastSessionStats();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await broadcastToApp("pi:login_done", {
      ok: false,
      error: msg === "Login cancelled" ? "Cancelled" : msg,
    });
  }
}

async function handleLogout(providerId) {
  if (!session) return;
  try {
    await session.modelRuntime.logout(providerId);
    await broadcastToApp("pi:login_done", {
      ok: true,
      logout: true,
      providerId,
    });
    await broadcastModels();
    await broadcastProviders();
  } catch (err) {
    await broadcastToApp("pi:login_done", {
      ok: false,
      error: err.message || String(err),
    });
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
    const initialStats = serializeStats();
    await broadcastToApp("pi:ready", { cwd: process.cwd(), stats: initialStats });
    // Send current model info
    if (session.model) {
      await broadcastToApp("pi:model", {
        model: { provider: session.model.provider, id: session.model.id },
      });
    }
    await broadcastCommands();
    await broadcastModels();
    await broadcastProviders();
    broadcastSessionStats();
    log("Pinguin ready");

    // Check for updates (non-blocking, silent)
    checkForUpdate().catch((e) => log(`Initial update check failed: ${e.message}`, "ERROR"));
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
    //
    // Abort is special: it must be processed *immediately* to interrupt the
    // currently executing prompt.  If it goes through the queue it has to
    // wait for session.prompt() to finish first — by which point there's
    // nothing left to abort.
    if (msg.event === "pi:input") {
      const data = msg.data;
      if (data?.type === "abort") {
        log("Processing abort immediately (outside inputQueue)");
        if (session) {
          session.abort().catch((err) =>
            log(`abort failed: ${err.message}`, "ERROR")
          );
        }
        return;
      }
      inputQueue = inputQueue
        .then(() => handleWebviewInput(data))
        .catch((err) =>
          log(`handleWebviewInput failed: ${err.message}`, "ERROR")
        );
    }

    // Webview just connected — rebroadcast current status
    if (msg.event === "pi:hello") {
      log("Received pi:hello from webview — rebroadcasting pi:ready with stats");
      const helloStats = serializeStats();
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
        broadcastProviders();
        broadcastSessionStats();
      }
      // Re-check for updates on reconnect
      checkForUpdate().catch((e) => log(`Update check on hello failed: ${e.message}`, "ERROR"));
    }
  } catch (err) {
    log(`Message parse error: ${err.message}`, "ERROR");
  }
});

ws.addEventListener("close", () => {
  cleanup();
  log("Connection closed — exiting");
  // Force exit in case file watchers or other handles keep the loop alive
  setTimeout(() => process.exit(0), 100);
});

ws.addEventListener("error", (err) => {
  log(`WebSocket error: ${err.message || err}`, "ERROR");
});
