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
  requestSessionStats: () => void;
  sendSwitchModel: (model: AvailableModel) => void;
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
  _setSessionStats: (stats) => set({ sessionStats: stats }),
  requestSessionStats: () => {
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "getStats",
    });
  },
  sendSwitchModel: (model) => {
    const text = `/model ${model.provider}:${model.id}`;
    // Send as a command through the normal input path
    Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
      type: "prompt",
      payload: { message: text },
    });
    // Optimistically update the model display
    set({ model: { provider: model.provider, id: model.id } });
  },
}));
