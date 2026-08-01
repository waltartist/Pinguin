import { usePiStore, _resolveFileSearch, type Block, type Message } from "../stores/pi-store";

// ── Bridge Neutralino events into Zustand ──

// Pi AssistantMessage.content is (TextContent | ThinkingContent | ToolCall)[].
// UserMessage.content is string | (TextContent | ImageContent)[]. Project each
// block to the store's tagged-union Block type.
function toBlocks(content: unknown): Block[] {
  if (typeof content === "string") return content ? [{ type: "text", text: content }] : [];
  if (!Array.isArray(content)) return [];
  const out: Block[] = [];
  for (const c of content as any[]) {
    if (!c || typeof c !== "object") continue;
    if (c.type === "text" && typeof c.text === "string") {
      out.push({ type: "text", text: c.text });
    } else if (c.type === "thinking" && typeof c.thinking === "string") {
      out.push({ type: "thinking", text: c.thinking });
    } else if (c.type === "toolCall") {
      out.push({ type: "toolCall", id: c.id, name: c.name, args: c.arguments });
    }
    // image / unknown: skip for v1
  }
  return out;
}

// Pi messages have no `id`, only `timestamp`. The same logical message goes
// through multiple events (message_start partial, message_start final,
// message_end) all carrying the same timestamp. Use it as the stable id.
function normalizePiMessage(m: any): Message | null {
  if (!m) return null;
  const role = m.role;
  const ts = typeof m.timestamp === "number" ? m.timestamp : Date.now();
  if (role === "user" || role === "assistant") {
    return { id: `${role}-${ts}`, role, blocks: toBlocks(m.content), timestamp: ts };
  }
  if (role === "toolResult") {
    const text = (Array.isArray(m.content) ? m.content : [])
      .filter((c: any) => c?.type === "text" && typeof c.text === "string")
      .map((c: any) => c.text)
      .join("");
    return {
      id: `toolResult-${m.toolCallId}-${ts}`,
      role: "toolResult",
      blocks: [
        {
          type: "toolResult",
          toolCallId: m.toolCallId,
          toolName: m.toolName,
          text,
          isError: Boolean(m.isError),
        },
      ],
      timestamp: ts,
    };
  }
  return null;
}

function initBridge() {
  if (typeof Neutralino === "undefined") {
    console.error("[pi-gui] Neutralino not available — is neutralino.js loaded?");
    // Try again after a short delay (Neutralino may not be ready at module eval time)
    setTimeout(initBridge, 200);
    return;
  }

  console.log("[pi-gui] Initializing bridge...");

  try {
    Neutralino.init();
    console.log("[pi-gui] Neutralino.init() called");
  } catch (err) {
    console.error("[pi-gui] Neutralino.init() failed:", err);
    return;
  }

  // When the WebSocket connects, request current state from the backend.
  // The backend may have broadcast pi:ready before we connected.
  // (Neutralino is narrowed above via typeof check — use ! for nested callbacks)
  Neutralino!.events.on("ready", () => {
    console.log("[pi-gui] WebSocket ready — dispatching pi:hello");
    Neutralino!.extensions
      .dispatch("pi-backend", "pi:hello", {})
      .then(() => console.log("[pi-gui] pi:hello dispatched OK"))
      .catch((err: any) =>
        console.error("[pi-gui] pi:hello dispatch failed:", err)
      );
  });

  Neutralino.events.on("pi:event", (raw: any) => {
    const event = raw.detail;
    console.log(`[pi:event] ${event.type}`);

    switch (event.type) {
      case "message_start": {
        const msg = normalizePiMessage(event.message);
        if (!msg) break;
        // User prompt already shown optimistically by sendPrompt — skip Pi's echo.
        if (msg.role === "user") break;
        console.log(`[pi:event] message_start: role=${msg.role}`);
        usePiStore.getState()._addMessage(msg);
        if (msg.role === "assistant") usePiStore.getState()._setStreaming(true);
        break;
      }

      case "message_update": {
        // Every AssistantMessageEvent carries `partial: AssistantMessage` with
        // the current accumulated content. Sync the whole block list off it
        // instead of tracking deltas — covers text, thinking, tool calls.
        const partial = event.assistantMessageEvent?.partial;
        if (!partial) break;
        const ts = typeof partial.timestamp === "number" ? partial.timestamp : null;
        if (ts == null) break;
        usePiStore
          .getState()
          ._updateAssistantBlocks(`assistant-${ts}`, toBlocks(partial.content));
        break;
      }

      case "message_end": {
        const msg = normalizePiMessage(event.message);
        if (!msg || msg.role === "user") break;
        usePiStore.getState()._finalizeMessage(msg);
        break;
      }

      case "agent_end": {
        usePiStore.getState()._setStreaming(false);
        break;
      }

      case "error": {
        usePiStore.getState()._setError(event.error || "Unknown error");
        usePiStore.getState()._setStreaming(false);
        break;
      }
    }
  });

  Neutralino.events.on("pi:ready", (raw: any) => {
    const cwd = raw?.detail?.cwd || raw?.cwd;
    console.log("[pi-gui] Received pi:ready — UI unlocked, cwd:", cwd);
    usePiStore.getState()._setReady(cwd);
    // Extract session stats embedded in the ready payload
    const stats = raw?.detail?.stats;
    if (stats && typeof stats === "object") {
      usePiStore.getState()._setSessionStats(stats);
    }
  });

  Neutralino.events.on("pi:model", (raw: any) => {
    const m = raw?.detail?.model;
    if (m && typeof m.provider === "string" && typeof m.id === "string") {
      usePiStore.getState()._setModel({ provider: m.provider, id: m.id });
    } else {
      usePiStore.getState()._setModel(null);
    }
  });

  // Built-in command feedback. The SDK does not emit agent events for
  // commands handled outside the agent loop (extension commands and our
  // own GUI builtins), so the backend pings these events to keep the UI
  // in sync.
  Neutralino.events.on("pi:notice", (raw: any) => {
    const text = raw?.detail?.text;
    const isError = !!raw?.detail?.isError;
    if (typeof text === "string" && text.length > 0) {
      usePiStore.getState()._addNotice(text, isError);
    }
  });

  Neutralino.events.on("pi:command_done", () => {
    usePiStore.getState()._setStreaming(false);
  });

  // ── Session management events ──
  Neutralino.events.on("pi:sessions", (raw: any) => {
    const { sessions, allSessions } = raw?.detail || {};
    if (Array.isArray(sessions) && Array.isArray(allSessions)) {
      usePiStore.getState()._setSessions(sessions, allSessions);
    }
  });

  Neutralino.events.on("pi:fork_messages", (raw: any) => {
    const messages = raw?.detail?.messages;
    if (Array.isArray(messages)) {
      usePiStore.getState()._setForkMessages(messages);
    }
  });

  Neutralino.events.on("pi:session_tree", (raw: any) => {
    const { tree, leafId } = raw?.detail || {};
    if (Array.isArray(tree)) {
      usePiStore.getState()._setSessionTree(tree, leafId ?? null);
    }
  });

  Neutralino.events.on("pi:composer_input", (raw: any) => {
    const text = raw?.detail?.text;
    if (typeof text === "string") {
      usePiStore.getState()._setPendingComposerInput(text);
    }
  });

  // ── Message queue events (steering & follow-up) ──
  Neutralino.events.on("pi:queue_update", (raw: any) => {
    const { steering, followUp } = raw?.detail || {};
    if (Array.isArray(steering) && Array.isArray(followUp)) {
      usePiStore.getState()._setQueue(steering, followUp);
    }
  });

  Neutralino.events.on("pi:queue_cleared", (raw: any) => {
    const { steering, followUp } = raw?.detail || {};
    if (Array.isArray(steering) && Array.isArray(followUp)) {
      usePiStore.getState()._setQueueCleared(steering, followUp);
    }
  });

  Neutralino.events.on("pi:reset", (raw: any) => {
    const cwd = raw?.detail?.cwd;
    usePiStore.getState()._resetMessages();
    if (typeof cwd === "string") usePiStore.getState()._setReady(cwd);
    // Reset session stats on /new
    usePiStore.getState()._setSessionStats(null);
  });

  Neutralino.events.on("pi:files_result", (raw: any) => {
    const requestId = raw?.detail?.requestId;
    const items = raw?.detail?.items;
    if (typeof requestId === "string" && Array.isArray(items)) {
      _resolveFileSearch(requestId, items);
    }
  });

  Neutralino.events.on("pi:commands", (raw: any) => {
    const list = raw?.detail?.commands;
    if (Array.isArray(list)) usePiStore.getState()._setCommands(list);
  });

  Neutralino.events.on("pi:models", (raw: any) => {
    const list = raw?.detail?.models;
    if (Array.isArray(list)) usePiStore.getState()._setAvailableModels(list);
  });

  // Provider list for login UI
  Neutralino.events.on("pi:providers", (raw: any) => {
    const list = raw?.detail?.providers;
    if (Array.isArray(list)) usePiStore.getState()._setProviders(list);
  });

  // Login interaction bridge
  Neutralino.events.on("pi:login_prompt", (raw: any) => {
    const { requestId, prompt } = raw?.detail || {};
    if (requestId && prompt) {
      usePiStore.getState()._loginSetPrompt({ requestId, prompt });
    }
  });

  Neutralino.events.on("pi:login_notify", (raw: any) => {
    const event = raw?.detail?.event;
    if (event) usePiStore.getState()._loginSetNotify(event);
  });

  Neutralino.events.on("pi:login_done", (raw: any) => {
    const { ok, error } = raw?.detail || {};
    usePiStore.getState()._loginDone(ok, error);
    // Reset after showing done state briefly
    if (ok) {
      setTimeout(() => usePiStore.getState()._loginReset(), 2000);
    }
  });

  Neutralino.events.on("pi:stats", (raw: any) => {
    const stats = raw?.detail?.stats;
    if (stats && typeof stats === "object") {
      usePiStore.getState()._setSessionStats(stats);
    }
  });

  // Backend detected a source change — show a Reload button.
  Neutralino.events.on("pi:reload", () => {
    console.log("[pi-gui] Backend source changed — showing Reload button");
    usePiStore.getState()._setNeedsRestart(true);
  });

  // ── Update events ──
  Neutralino.events.on("pi:update_available", (raw: any) => {
    const { localVersion, remoteVersion } = raw?.detail || {};
    if (localVersion && remoteVersion) {
      console.log(`[pi-gui] Update available: ${localVersion} → ${remoteVersion}`);
      usePiStore.getState()._setUpdateAvailable(localVersion, remoteVersion);
    }
  });

  Neutralino.events.on("pi:update_progress", (raw: any) => {
    const { step, status, error } = raw?.detail || {};
    if (step && status) {
      console.log(`[pi-gui] Update progress: ${step} — ${status}`);
      usePiStore.getState()._setUpdateProgress(step, status, error);
    }
  });

  Neutralino.events.on("pi:update_done", (raw: any) => {
    const { ok, error } = raw?.detail || {};
    console.log(`[pi-gui] Update done: ok=${ok}`);
    usePiStore.getState()._setUpdateDone(ok, error);
    if (ok) {
      // Auto-reload the page after a brief delay so the new build is picked up
      setTimeout(() => window.location.reload(), 1500);
    }
  });

  // ── Window close: exit the app cleanly so the Node extension is killed ──
  Neutralino.events.on("windowClose", () => {
    console.log("[pi-gui] windowClose — calling app.exit()");
    Neutralino!.app!.exit().catch((err: any) =>
      console.error("[pi-gui] app.exit() failed:", err)
    );
  });

  // Built webview assets changed — auto-reload the page to pick up new code.
  Neutralino.events.on("pi:webview_reload", () => {
    console.log("[pi-gui] Webview resources changed — reloading page");
    window.location.reload();
  });

  // ── Retry / fallback: if still not ready, re-request state ──
  let retries = 0;
  const retryHello = () => {
    if (usePiStore.getState().isReady) return;
    retries++;
    if (retries > 5) {
      console.error(
        "[pi-gui] Failed to connect to Pi backend after 5 retries"
      );
      usePiStore
        .getState()
        ._setConnectionError(
          "Could not connect to Pi backend. Check the terminal for errors."
        );
      return;
    }
    console.log(`[pi-gui] Not ready, retry ${retries}/5 — dispatching pi:hello`);
    Neutralino!.extensions
      .dispatch("pi-backend", "pi:hello", {})
      .catch((err: any) =>
        console.error(`[pi-gui] Retry ${retries} dispatch failed:`, err)
      );
    setTimeout(retryHello, 2000);
  };
  setTimeout(retryHello, 3000);
}

// Run bridge setup
initBridge();

// ── React hooks ──

export const usePi = usePiStore;

export function useSendMessage() {
  return usePiStore((s) => s.sendPrompt);
}
