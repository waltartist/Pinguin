import { create } from "zustand";

export interface ModelInfo {
  provider: string;
  id: string;
}

export interface AvailableModel {
  provider: string;
  id: string;
  name?: string;
  contextWindow?: number;
  maxTokens?: number;
  reasoning?: boolean;
  input?: string[];
}

export type Block =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "toolCall"; id: string; name: string; args: any }
  | { type: "toolResult"; toolCallId: string; toolName?: string; text: string; isError: boolean };

export interface Message {
  id: string;
  role: "user" | "assistant" | "toolResult" | "system";
  blocks: Block[];
  timestamp?: number;
  isError?: boolean;
}

export interface SlashCommand {
  name: string;
  description: string;
  source: "builtin" | "extension" | "skill" | "prompt";
}

export interface SessionStats {
  sessionId: string;
  sessionName: string | null;
  sessionFile: string | null;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  toolResults: number;
  totalMessages: number;
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  cost: number;
  contextUsage: {
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
  } | null;
}

export interface FileSuggestion {
  path: string;
  name: string;
  isDirectory: boolean;
}

// Pending @-mention file-search RPCs keyed by requestId. The bridge resolves
// these when it receives `pi:files_result`. Module-scoped (not in store
// state) since promises are not serializable.
const pendingFileSearches = new Map<string, (items: FileSuggestion[]) => void>();

export function _resolveFileSearch(requestId: string, items: FileSuggestion[]) {
  const resolve = pendingFileSearches.get(requestId);
  if (!resolve) return;
  pendingFileSearches.delete(requestId);
  resolve(items);
}

export interface ProviderInfo {
  id: string;
  name: string;
  authTypes: string[]; // "api_key" | "oauth"
  configured: boolean;
  authSource: string | null;
  authLabel: string | null;
}

export interface LoginPrompt {
  requestId: string;
  prompt: {
    type: "secret" | "text" | "manual_code" | "select";
    message: string;
    placeholder?: string;
    options?: { label: string; value: string }[];
  };
}

export interface LoginNotify {
  type: "auth_url" | "device_code" | "info" | "progress";
  url?: string;
  instructions?: string;
  message?: string;
  links?: { text: string; url: string }[];
  deviceCode?: string;
  userCode?: string;
  verificationUrl?: string;
}

export interface LoginState {
  active: boolean;
  step: "idle" | "provider_select" | "auth_type_select" | "prompt" | "notify" | "done";
  providerId: string | null;
  providerName: string | null;
  authType: string | null;
  prompt: LoginPrompt | null;
  notify: LoginNotify | null;
  error: string | null;
}

export interface UpdateState {
  available: boolean;
  localVersion: string | null;
  remoteVersion: string | null;
  running: boolean;
  step: string | null;
  stepStatus: "idle" | "running" | "done" | "error";
  error: string | null;
}

// ── Session management types ──

export interface SessionInfo {
  path: string;
  id: string;
  name: string | null;
  cwd: string;
  created: string;
  modified: string;
  messageCount: number;
  firstMessage: string;
  isCurrent: boolean;
}

export interface ForkMessage {
  entryId: string;
  text: string;
}

export interface SessionTreeNode {
  entryId: string;
  type: string;
  role?: string;
  text: string;
  label?: string;
  isLeaf: boolean;
  children: SessionTreeNode[];
}

export type SessionView =
  | { kind: "closed" }
  | { kind: "resume"; sessions: SessionInfo[]; allSessions: SessionInfo[]; loading: boolean }
  | { kind: "fork"; messages: ForkMessage[]; loading: boolean }
  | { kind: "tree"; tree: SessionTreeNode[]; leafId: string | null; loading: boolean }
  | { kind: "import" };

export interface QueueState {
  steering: string[];
  followUp: string[];
  steeringMode: "all" | "one-at-a-time";
  followUpMode: "all" | "one-at-a-time";
}

interface PiState {
  isReady: boolean;
  messages: Message[];
  isStreaming: boolean;
  model: ModelInfo | null;
  error: string | null;
  connectionError: string | null;
  cwd: string | null;
  commands: SlashCommand[];
  availableModels: AvailableModel[];
  sessionStats: SessionStats | null;
  needsRestart: boolean;
  pendingComposerInput: string | null;
  pinnedCommands: string[];
  providers: ProviderInfo[];
  login: LoginState;
  update: UpdateState;
  sessionView: SessionView;
  queue: QueueState;
}

interface PiActions {
  sendPrompt: (text: string) => void;
  abort: () => void;
  searchFiles: (query: string) => Promise<FileSuggestion[]>;
  retryConnect: () => void;
  _setReady: (cwd?: string) => void;
  _addMessage: (msg: Message) => void;
  _updateAssistantBlocks: (id: string, blocks: Block[]) => void;
  _finalizeMessage: (msg: Message) => void;
  _setStreaming: (v: boolean) => void;
  _setModel: (model: ModelInfo | null) => void;
  _setError: (err: string | null) => void;
  _setConnectionError: (err: string | null) => void;
  _addNotice: (text: string, isError?: boolean) => void;
  _resetMessages: () => void;
  _setCommands: (commands: SlashCommand[]) => void;
  _setAvailableModels: (models: AvailableModel[]) => void;
  _setSessionStats: (stats: SessionStats | null) => void;
  _setNeedsRestart: (v: boolean) => void;
  requestSessionStats: () => void;
  sendSwitchModel: (model: AvailableModel) => void;
  _setPendingComposerInput: (text: string | null) => void;
  _setPinnedCommands: (names: string[]) => void;
  _addPinnedCommand: (name: string) => void;
  _removePinnedCommand: (name: string) => void;
  _setProviders: (providers: ProviderInfo[]) => void;
  _loginStart: (providerId?: string) => void;
  _loginSelectProvider: (providerId: string) => void;
  _loginSelectAuthType: (authType: string) => void;
  _loginSetPrompt: (prompt: LoginPrompt) => void;
  _loginSetNotify: (notify: LoginNotify) => void;
  _loginRespond: (value: string) => void;
  _loginCancel: () => void;
  _loginDone: (ok: boolean, error?: string) => void;
  _loginReset: () => void;
  _setUpdateAvailable: (localVersion: string, remoteVersion: string) => void;
  _setUpdateProgress: (step: string, status: "running" | "done" | "error", error?: string) => void;
  _setUpdateDone: (ok: boolean, error?: string) => void;
  _resetUpdate: () => void;
  checkForUpdate: () => void;
  runUpdate: () => void;
  // Session management
  _openSessionView: (verb: string, target?: string) => void;
  _closeSessionView: () => void;
  _setSessions: (sessions: SessionInfo[], allSessions: SessionInfo[]) => void;
  _setForkMessages: (messages: ForkMessage[]) => void;
  _setSessionTree: (tree: SessionTreeNode[], leafId: string | null) => void;
  resumeSession: (sessionPath: string) => void;
  forkFromMessage: (entryId: string) => void;
  cloneCurrent: () => void;
  navigateToNode: (entryId: string, summarize: boolean) => void;
  importFromFile: (filePath: string) => void;
  // Message queue (steering & follow-up)
  steer: (text: string) => void;
  followUp: (text: string) => void;
  clearQueue: () => void;
  _setQueue: (steering: string[], followUp: string[]) => void;
  _setQueueCleared: (steering: string[], followUp: string[]) => void;
  setSteeringMode: (mode: "all" | "one-at-a-time") => void;
  setFollowUpMode: (mode: "all" | "one-at-a-time") => void;
}

export const usePiStore = create<PiState & PiActions>()((set, get) => ({
  isReady: false,
  messages: [],
  isStreaming: false,
  model: null,
  error: null,
  connectionError: null,
  cwd: null,
  commands: [],
  availableModels: [],
  sessionStats: null,
  needsRestart: false,
  pendingComposerInput: null,
  pinnedCommands: ["new", "compact", "reload"],
  providers: [],
  login: { active: false, step: "idle", providerId: null, providerName: null, authType: null, prompt: null, notify: null, error: null },
  update: { available: false, localVersion: null, remoteVersion: null, running: false, step: null, stepStatus: "idle", error: null },
  sessionView: { kind: "closed" },
  queue: { steering: [], followUp: [], steeringMode: "all", followUpMode: "all" },

  sendPrompt: (text) => {
    if (!get().isReady || get().isStreaming) return;

    // Slash-prefixed input is a command echo, not a chat turn. Render it
    // distinctly so the transcript doesn't look like a user said "/quit".
    const isCommand = text.startsWith("/");
    const userMsg: Message = isCommand
      ? {
          id: crypto.randomUUID(),
          role: "system",
          blocks: [{ type: "text", text: `> ${text}` }],
          timestamp: Date.now(),
        }
      : {
          id: crypto.randomUUID(),
          role: "user",
          blocks: [{ type: "text", text }],
          timestamp: Date.now(),
        };
    set((s) => ({
      messages: [...s.messages, userMsg],
      isStreaming: true,
      error: null,
    }));

    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "prompt",
      payload: { message: text },
    });
  },

  abort: () => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", { type: "abort" });
  },

  searchFiles: (query) => {
    if (typeof Neutralino === "undefined") return Promise.resolve([]);
    const requestId = crypto.randomUUID();
    return new Promise<FileSuggestion[]>((resolve) => {
      pendingFileSearches.set(requestId, resolve);
      // Timeout so abandoned requests don't leak. 4s is generous for a
      // local walk; if it exceeds that the popup just stays empty.
      setTimeout(() => {
        if (pendingFileSearches.delete(requestId)) resolve([]);
      }, 4000);
      Neutralino!.extensions
        .dispatch("pi-backend", "pi:input", {
          type: "searchFiles",
          payload: { requestId, query },
        })
        .catch(() => {
          if (pendingFileSearches.delete(requestId)) resolve([]);
        });
    });
  },

  retryConnect: () => {
    set({ connectionError: null });
    if (typeof Neutralino !== "undefined") {
      Neutralino.extensions
        .dispatch("pi-backend", "pi:hello", {})
        .catch((err: any) =>
          set({ connectionError: `Failed to reach Pi: ${err.message || err}` })
        );
    }
  },

  _setReady: (cwd?: string) => set({ isReady: true, cwd: cwd ?? null }),
  _addMessage: (msg) =>
    set((s) => {
      if (s.messages.some((m) => m.id === msg.id)) return s;
      return { messages: [...s.messages, msg] };
    }),
  _updateAssistantBlocks: (id, blocks) =>
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === id);
      if (idx === -1) return s;
      const msgs = [...s.messages];
      msgs[idx] = { ...msgs[idx], blocks };
      return { messages: msgs };
    }),
  _finalizeMessage: (msg) =>
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === msg.id);
      if (idx === -1) {
        // Never saw message_start for this id; append.
        return { messages: [...s.messages, msg] };
      }
      const msgs = [...s.messages];
      msgs[idx] = msg;
      return { messages: msgs };
    }),
  _setStreaming: (v) => set({ isStreaming: v }),
  _setModel: (model) => set({ model }),
  _setError: (err) => set({ error: err }),
  _setConnectionError: (err) => set({ connectionError: err }),
  _addNotice: (text, isError) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: `system-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: "system",
          blocks: [{ type: "text", text }],
          timestamp: Date.now(),
          isError,
        },
      ],
    })),
  _resetMessages: () => set({ messages: [], isStreaming: false, error: null }),
  _setCommands: (commands) => set({ commands }),
  _setAvailableModels: (models) => set({ availableModels: models }),
  _setNeedsRestart: (v) => set({ needsRestart: v }),
  _setSessionStats: (stats) => set({ sessionStats: stats }),
  _setPendingComposerInput: (text) => set({ pendingComposerInput: text }),
  _setPinnedCommands: (names) => set({ pinnedCommands: names }),
  _addPinnedCommand: (name) =>
    set((s) => {
      if (s.pinnedCommands.includes(name)) return s;
      return { pinnedCommands: [...s.pinnedCommands, name] };
    }),
  _removePinnedCommand: (name) =>
    set((s) => ({
      pinnedCommands: s.pinnedCommands.filter((n) => n !== name),
    })),
  _setProviders: (providers) => set({ providers }),
  _loginStart: (providerId) => {
    // Request provider list from backend
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", { type: "getProviders" });
    set((s) => ({
      login: { ...s.login, active: true, step: providerId ? "auth_type_select" : "provider_select", providerId: providerId || null, error: null },
    }));
  },
  _loginSelectProvider: (providerId) => {
    const provider = get().providers.find((p) => p.id === providerId);
    set((s) => ({
      login: { ...s.login, providerId, providerName: provider?.name ?? providerId, step: "auth_type_select", error: null },
    }));
  },
  _loginSelectAuthType: (authType) => {
    const { login } = get();
    if (!login.providerId) return;
    set((s) => ({ login: { ...s.login, authType, step: "notify", error: null, notify: null } }));
    // Tell backend to start the login flow
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "login",
      payload: { providerId: login.providerId, authType },
    });
  },
  _loginSetPrompt: (prompt) => set((s) => ({ login: { ...s.login, prompt, step: "prompt", notify: null } })),
  _loginSetNotify: (notify) => set((s) => ({ login: { ...s.login, notify, step: "notify" } })),
  _loginRespond: (value) => {
    const { login } = get();
    if (!login.prompt) return;
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "loginResponse",
      payload: { requestId: login.prompt.requestId, value },
    });
    set((s) => ({ login: { ...s.login, prompt: null, step: "notify" } }));
  },
  _loginCancel: () => {
    const { login } = get();
    if (login.prompt) {
      Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
        type: "loginResponse",
        payload: { requestId: login.prompt.requestId, error: "Cancelled" },
      });
    }
    set((s) => ({ login: { ...s.login, active: false, step: "idle", prompt: null, notify: null, error: null } }));
  },
  _loginDone: (ok, error) => set((s) => ({
      login: {
        ...s.login,
        step: ok ? "done" : "idle",
        error: ok ? null : (error ?? null),
        active: ok ? s.login.active : false,
        prompt: null,
        notify: null,
      },
    })),
  _loginReset: () => set((s) => ({
      login: { active: false, step: "idle", providerId: null, providerName: null, authType: null, prompt: null, notify: null, error: null },
    })),
  _setUpdateAvailable: (localVersion, remoteVersion) => set((s) => ({
      update: { ...s.update, available: true, localVersion, remoteVersion },
    })),
  _setUpdateProgress: (step, status, error) => set((s) => ({
      update: { ...s.update, running: true, step, stepStatus: status, error: error ?? null },
    })),
  _setUpdateDone: (ok, error) => set((s) => ({
      update: { ...s.update, running: false, step: null, stepStatus: ok ? "done" : "error", error: error ?? null, available: ok ? false : s.update.available },
    })),
  _resetUpdate: () => set((s) => ({
      update: { available: false, localVersion: null, remoteVersion: null, running: false, step: null, stepStatus: "idle", error: null },
    })),
  checkForUpdate: () => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", { type: "checkUpdate" });
  },
  runUpdate: () => {
    set((s) => ({ update: { ...s.update, running: true, step: "Starting…", stepStatus: "running", error: null } }));
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", { type: "runUpdate" });
  },
  requestSessionStats: () => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "getStats",
    });
  },
  sendSwitchModel: (model) => {
    // Match Pi's approach: send a dedicated switchModel event, not a prompt.
    // This bypasses the prompt input queue entirely, avoiding race conditions
    // where a /model command and subsequent prompt could interfere.
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "switchModel",
      payload: { provider: model.provider, id: model.id },
    });
    // Optimistically update the model display; the backend will confirm via pi:model
    set({ model: { provider: model.provider, id: model.id } });
  },

  // ── Session management actions ──
  _openSessionView: (verb, target) => {
    switch (verb) {
      case "resume":
        set({ sessionView: { kind: "resume", sessions: [], allSessions: [], loading: true } });
        Neutralino?.extensions.dispatch("pi-backend", "pi:input", { type: "listSessions" });
        break;
      case "fork":
        set({ sessionView: { kind: "fork", messages: [], loading: true } });
        Neutralino?.extensions.dispatch("pi-backend", "pi:input", { type: "getForkMessages" });
        break;
      case "clone":
        // Clone is a one-shot — no UI needed, just dispatch and close
        Neutralino?.extensions.dispatch("pi-backend", "pi:input", { type: "cloneSession" });
        set({ sessionView: { kind: "closed" } });
        break;
      case "tree":
        set({ sessionView: { kind: "tree", tree: [], leafId: null, loading: true } });
        Neutralino?.extensions.dispatch("pi-backend", "pi:input", { type: "getSessionTree" });
        break;
      case "import":
        if (target) {
          // Direct import with path argument
          Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
            type: "importSession",
            payload: { filePath: target },
          });
          set({ sessionView: { kind: "closed" } });
        } else {
          set({ sessionView: { kind: "import" } });
        }
        break;
      default:
        set({ sessionView: { kind: "closed" } });
    }
  },
  _closeSessionView: () => set({ sessionView: { kind: "closed" } }),
  _setSessions: (sessions, allSessions) =>
    set((s) => s.sessionView.kind === "resume"
      ? { sessionView: { ...s.sessionView, sessions, allSessions, loading: false } }
      : s),
  _setForkMessages: (messages) =>
    set((s) => s.sessionView.kind === "fork"
      ? { sessionView: { ...s.sessionView, messages, loading: false } }
      : s),
  _setSessionTree: (tree, leafId) =>
    set((s) => s.sessionView.kind === "tree"
      ? { sessionView: { ...s.sessionView, tree, leafId, loading: false } }
      : s),
  resumeSession: (sessionPath) => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "resumeSession",
      payload: { sessionPath },
    });
    set({ sessionView: { kind: "closed" } });
  },
  forkFromMessage: (entryId) => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "forkSession",
      payload: { entryId },
    });
    set({ sessionView: { kind: "closed" } });
  },
  cloneCurrent: () => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", { type: "cloneSession" });
    set({ sessionView: { kind: "closed" } });
  },
  navigateToNode: (entryId, summarize) => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "navigateTree",
      payload: { entryId, summarize },
    });
    set({ sessionView: { kind: "closed" } });
  },
  importFromFile: (filePath) => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "importSession",
      payload: { filePath },
    });
    set({ sessionView: { kind: "closed" } });
  },

  // ── Message queue actions (steering & follow-up) ──
  steer: (text) => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "steer",
      payload: { message: text },
    });
  },
  followUp: (text) => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "followUp",
      payload: { message: text },
    });
  },
  clearQueue: () => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", { type: "clearQueue" });
  },
  _setQueue: (steering, followUp) =>
    set((s) => ({ queue: { ...s.queue, steering, followUp } })),
  _setQueueCleared: (steering, followUp) => {
    // Restore queued messages to the composer — concatenate all queued text
    const allText = [...steering, ...followUp].join("\n\n");
    set((s) => ({
      queue: { ...s.queue, steering: [], followUp: [] },
      pendingComposerInput: allText || null,
    }));
  },
  setSteeringMode: (mode) => {
    set((s) => ({ queue: { ...s.queue, steeringMode: mode } }));
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "setSteeringMode",
      payload: { mode },
    });
  },
  setFollowUpMode: (mode) => {
    set((s) => ({ queue: { ...s.queue, followUpMode: mode } }));
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "setFollowUpMode",
      payload: { mode },
    });
  },
}));
