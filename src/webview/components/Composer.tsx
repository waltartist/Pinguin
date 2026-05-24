import { useState, useRef, useEffect, useMemo, useCallback, KeyboardEvent } from "react";
import { usePi } from "../lib/use-pi";
import type { SlashCommand, FileSuggestion, AvailableModel } from "../stores/pi-store";
import { Icon } from "./ember";

// Same delimiter set as pi-tui's CombinedAutocompleteProvider. The @-token
// extends from the cursor back to the most recent delimiter — so "look at
// @src/" treats `@src/` as the active prefix.
const AT_DELIMITERS = new Set([" ", "\t", "\n", '"', "'", "="]);

interface AtPrefix {
  query: string; // text after the `@`, may be empty
  start: number; // index of the `@` in the textarea value
  end: number;   // cursor position
}

function findAtPrefix(text: string, caret: number): AtPrefix | null {
  // Walk back from caret to the nearest delimiter (or start of string).
  let i = caret - 1;
  while (i >= 0 && !AT_DELIMITERS.has(text[i]!)) i--;
  const tokenStart = i + 1;
  if (text[tokenStart] !== "@") return null;
  return { query: text.slice(tokenStart + 1, caret), start: tokenStart, end: caret };
}

export function Composer() {
  const isReady = usePi((s) => s.isReady);
  const isStreaming = usePi((s) => s.isStreaming);
  const error = usePi((s) => s.error);
  const sendPrompt = usePi((s) => s.sendPrompt);
  const abort = usePi((s) => s.abort);
  const model = usePi((s) => s.model);
  const commands = usePi((s) => s.commands);
  const availableModels = usePi((s) => s.availableModels);
  const sendSwitchModel = usePi((s) => s.sendSwitchModel);
  const searchFiles = usePi((s) => s.searchFiles);

  const [input, setInput] = useState("");
  const [caret, setCaret] = useState(0);
  const [slashIdx, setSlashIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Model popup: detect "/model" or "/model <filter>" ───────────
  const modelQuery = useMemo<string | null>(() => {
    if (!input.startsWith("/model")) return null;
    const rest = input.slice(6); // after "/model"
    if (rest === "" || rest.startsWith(" ")) {
      return rest.startsWith(" ") ? rest.slice(1).toLowerCase() : "";
    }
    return null; // e.g. "/modelsomething" — not our command
  }, [input]);

  const modelOpen = modelQuery !== null && availableModels.length > 0;

  // All models sorted with current model first — used by the chip popup.
  const sortedModels = useMemo<AvailableModel[]>(() => {
    if (availableModels.length === 0) return [];
    return [...availableModels].sort((a, b) => {
      const aCur = model && a.provider === model.provider && a.id === model.id;
      const bCur = model && b.provider === model.provider && b.id === model.id;
      if (aCur && !bCur) return -1;
      if (!aCur && bCur) return 1;
      if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
      return a.id.localeCompare(b.id);
    });
  }, [availableModels, model]);

  // ── Slash autocomplete (existing) ───────────────────────────────
  const slashQuery = useMemo<string | null>(() => {
    if (modelOpen) return null; // model popup wins
    if (!input.startsWith("/")) return null;
    const firstSpace = input.indexOf(" ");
    if (firstSpace !== -1) return null;
    return input.slice(1).toLowerCase();
  }, [input, modelOpen]);

  const filteredCommands = useMemo<SlashCommand[]>(() => {
    if (slashQuery === null) return [];
    if (slashQuery === "") return commands;
    return commands.filter((c) => c.name.toLowerCase().includes(slashQuery));
  }, [commands, slashQuery]);

  const slashOpen = slashQuery !== null && filteredCommands.length > 0;

  useEffect(() => {
    setSlashIdx(0);
  }, [slashQuery, filteredCommands.length]);

  const acceptCommand = (cmd: SlashCommand) => {
    setInput(`/${cmd.name} `);
    textareaRef.current?.focus();
  };

  const [modelPopupOpen, setModelPopupOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);

  // ── Model popup: filter + state ─────────────────────────────────
  const [modelIdx, setModelIdx] = useState(0);

  const filteredModels = useMemo<AvailableModel[]>(() => {
    if (modelQuery === null) return [];
    const q = (modelQuery ?? "").toLowerCase();
    if (q === "") return sortedModels;
    return availableModels.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        `${m.provider}:${m.id}`.toLowerCase().includes(q) ||
        (m.name && m.name.toLowerCase().includes(q))
    );
  }, [availableModels, modelQuery, sortedModels]);

  useEffect(() => {
    setModelIdx(0);
  }, [modelQuery, filteredModels.length]);

  const acceptModel = useCallback(
    (m: AvailableModel) => {
      sendSwitchModel(m);
      // Build a nice transcript line
      setInput("");
      setCaret(0);
      textareaRef.current?.focus();
    },
    [sendSwitchModel]
  );

  // Separate handler for the chip popup — doesn't clear input
  const acceptModelFromChip = useCallback(
    (m: AvailableModel) => {
      sendSwitchModel(m);
      setModelPopupOpen(false);
      textareaRef.current?.focus();
    },
    [sendSwitchModel]
  );

  // ── Model chip popup: close on outside click ──────────────────
  useEffect(() => {
    if (!modelPopupOpen) return;
    const handler = (e: MouseEvent) => {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        setModelPopupOpen(false);
      }
    };
    // Use capturing phase to catch clicks before they close the popup
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [modelPopupOpen]);

  const handleChipClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setModelPopupOpen((prev) => !prev);
  }, []);

  // ── @-mention file autocomplete ─────────────────────────────────
  // Recompute prefix from textarea value + caret on every input/select event.
  const atPrefix = useMemo<AtPrefix | null>(() => {
    if (slashOpen || modelOpen) return null; // slash/model popup wins
    return findAtPrefix(input, caret);
  }, [input, caret, slashOpen, modelOpen]);

  const [atItems, setAtItems] = useState<FileSuggestion[]>([]);
  const [atIdx, setAtIdx] = useState(0);
  const atReqRef = useRef(0);

  useEffect(() => {
    if (atPrefix === null) {
      setAtItems([]);
      return;
    }
    // Debounce so each keystroke doesn't fire a backend walk.
    const myReq = ++atReqRef.current;
    const handle = setTimeout(async () => {
      const items = await searchFiles(atPrefix.query);
      // Drop stale results — only the latest request wins.
      if (myReq !== atReqRef.current) return;
      setAtItems(items);
      setAtIdx(0);
    }, 80);
    return () => clearTimeout(handle);
  }, [atPrefix?.query, atPrefix === null, searchFiles]);

  const atOpen = atPrefix !== null && atItems.length > 0;

  const acceptAt = useCallback(
    (item: FileSuggestion) => {
      if (!atPrefix) return;
      // Directories: insert without trailing space so the user can keep
      // drilling in (matches pi-tui behavior).
      const inserted = item.isDirectory ? `@${item.path}/` : `@${item.path} `;
      const before = input.slice(0, atPrefix.start);
      const after = input.slice(atPrefix.end);
      const next = before + inserted + after;
      const nextCaret = atPrefix.start + inserted.length;
      setInput(next);
      // Restore caret after React commits the new value.
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.focus();
        ta.setSelectionRange(nextCaret, nextCaret);
        setCaret(nextCaret);
      });
    },
    [atPrefix, input]
  );

  // ── Input handling ──────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setCaret(e.target.selectionStart ?? e.target.value.length);
  };

  // Caret can move without value changing (arrow keys, click). Refresh state
  // so the @-prefix detector stays in sync.
  const syncCaret = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart ?? 0;
    if (pos !== caret) setCaret(pos);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    sendPrompt(text);
    setInput("");
    setCaret(0);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (modelOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setModelIdx((i) => Math.min(i + 1, Math.max(0, filteredModels.length - 1)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setModelIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        const chosen = filteredModels[modelIdx];
        if (chosen) acceptModel(chosen);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInput("");
        return;
      }
      // Don't let Enter propagate to handleSend
      if (e.key === "Enter") {
        e.preventDefault();
        return;
      }
      return; // All other keys go to textarea for search filtering
    }
    if (slashOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIdx((i) => Math.min(i + 1, filteredCommands.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        const chosen = filteredCommands[slashIdx];
        if (chosen) acceptCommand(chosen);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInput("");
        return;
      }
    }
    if (atOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAtIdx((i) => Math.min(i + 1, atItems.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAtIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        const chosen = atItems[atIdx];
        if (chosen) acceptAt(chosen);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        // Close the popup but keep what the user has typed.
        setAtItems([]);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="composer">
      {error && <div className="composer-error">{error}</div>}
      {modelOpen && (
        <ModelPopup
          models={filteredModels}
          activeIdx={modelIdx}
          currentModel={model}
          onPick={acceptModel}
          onHoverIdx={setModelIdx}
        />
      )}
      {!modelOpen && slashOpen && (
        <SlashPopup
          commands={filteredCommands}
          activeIdx={slashIdx}
          onPick={acceptCommand}
          onHoverIdx={setSlashIdx}
        />
      )}
      {atOpen && (
        <FilePopup
          items={atItems}
          activeIdx={atIdx}
          onPick={acceptAt}
          onHoverIdx={setAtIdx}
        />
      )}
      <div className="composer-row">
        <textarea
          ref={textareaRef}
          className="composer-input"
          value={input}
          onChange={handleChange}
          onKeyUp={syncCaret}
          onClick={syncCaret}
          onSelect={syncCaret}
          onKeyDown={handleKeyDown}
          placeholder={isReady ? "Ask Pi…  (type @ to attach files)" : "Starting Pi…"}
          disabled={!isReady}
          rows={1}
        />
        <div className="composer-actions">
          {isStreaming ? (
            <button className="btn btn-abort" onClick={abort}>
              Stop
            </button>
          ) : (
            <button
              className="btn btn-send"
              onClick={handleSend}
              disabled={!isReady || !input.trim()}
            >
              Send <Icon.Send width={11} height={11} />
            </button>
          )}
        </div>
      </div>
      {model && (
        <div
          ref={chipRef}
          style={{
            display: "flex",
            flexDirection: "column-reverse",
            alignItems: "flex-start",
            gap: 4,
            marginTop: 8,
            paddingLeft: 2,
          }}
        >
          {modelPopupOpen && (
            <ModelPopup
              models={sortedModels}
              activeIdx={modelIdx}
              currentModel={model}
              onPick={acceptModelFromChip}
              onHoverIdx={setModelIdx}
            />
          )}
          <span
            className="btn-chip"
            onClick={handleChipClick}
            title="Click to switch model"
            style={{ cursor: "pointer", userSelect: "none" }}
          >
            <span className="status-dim">{model.provider}:</span>
            {model.id}
          </span>
        </div>
      )}
    </div>
  );
}

interface SlashPopupProps {
  commands: SlashCommand[];
  activeIdx: number;
  onPick: (cmd: SlashCommand) => void;
  onHoverIdx: (idx: number) => void;
}

function SlashPopup({ commands, activeIdx, onPick, onHoverIdx }: SlashPopupProps) {
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <div className="composer-slash" role="listbox">
      {commands.map((c, i) => {
        const active = i === activeIdx;
        return (
          <div
            key={`${c.source}:${c.name}`}
            ref={active ? activeRef : undefined}
            className={`composer-slash-item${active ? " composer-slash-item-active" : ""}`}
            role="option"
            aria-selected={active}
            onMouseEnter={() => onHoverIdx(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(c);
            }}
          >
            <span className="composer-slash-arrow">{active ? "→" : " "}</span>
            <span className="composer-slash-name">{c.name}</span>
            {c.description && (
              <span className="composer-slash-desc">{c.description}</span>
            )}
            {c.source !== "builtin" && (
              <span className="composer-slash-source">{c.source}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Model popup: shows available models with search/filter ────────
interface ModelPopupProps {
  models: AvailableModel[];
  activeIdx: number;
  currentModel: { provider: string; id: string } | null;
  onPick: (model: AvailableModel) => void;
  onHoverIdx: (idx: number) => void;
}

function formatContext(cw: number | undefined): string {
  if (!cw) return "";
  if (cw >= 1_000_000) {
    const m = cw / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (cw >= 1_000) {
    const k = cw / 1_000;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return `${cw}`;
}

function ModelPopup({ models, activeIdx, currentModel, onPick, onHoverIdx }: ModelPopupProps) {
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  if (models.length === 0) {
    return (
      <div className="composer-slash" role="listbox">
        <div className="composer-slash-item" style={{ opacity: 0.6, fontStyle: "italic" }}>
          <span className="composer-slash-arrow"> </span>
          <span className="composer-slash-name">No matching models</span>
        </div>
      </div>
    );
  }

  return (
    <div className="composer-slash composer-model" role="listbox">
      {models.map((m, i) => {
        const active = i === activeIdx;
        const isCurrent = currentModel && m.provider === currentModel.provider && m.id === currentModel.id;
        const ctxStr = formatContext(m.contextWindow);
        return (
          <div
            key={`${m.provider}:${m.id}`}
            ref={active ? activeRef : undefined}
            className={`composer-slash-item${active ? " composer-slash-item-active" : ""}`}
            role="option"
            aria-selected={active}
            onMouseEnter={() => onHoverIdx(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(m);
            }}
          >
            <span className="composer-slash-arrow">{active ? "→" : " "}</span>
            <span className="composer-slash-name">
              {m.id}
              {isCurrent && (
                <span style={{ color: "var(--color-success, #4ade80)", marginLeft: 4 }}>✓</span>
              )}
            </span>
            <span className="composer-slash-source">{m.provider}</span>
            {ctxStr && (
              <span className="composer-slash-desc" style={{ marginLeft: "auto" }}>
                {ctxStr}
              </span>
            )}
          </div>
        );
      })}
      <div className="composer-slash-item" style={{ opacity: 0.5, fontSize: "0.85em", paddingTop: 6, borderTop: "1px solid var(--color-border-subtle, #333)" }}>
        <span className="composer-slash-arrow"> </span>
        <span className="composer-slash-desc">
          ↑↓ navigate &nbsp; ↵ select &nbsp; Esc cancel &nbsp; type to filter
        </span>
      </div>
    </div>
  );
}

// ── File (@-mention) popup ────────────────────────────────────────
interface FilePopupProps {
  items: FileSuggestion[];
  activeIdx: number;
  onPick: (item: FileSuggestion) => void;
  onHoverIdx: (idx: number) => void;
}

function FilePopup({ items, activeIdx, onPick, onHoverIdx }: FilePopupProps) {
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <div className="composer-slash composer-at" role="listbox">
      {items.map((item, i) => {
        const active = i === activeIdx;
        const label = item.isDirectory ? `${item.name}/` : item.name;
        return (
          <div
            key={item.path}
            ref={active ? activeRef : undefined}
            className={`composer-slash-item${active ? " composer-slash-item-active" : ""}`}
            role="option"
            aria-selected={active}
            onMouseEnter={() => onHoverIdx(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(item);
            }}
          >
            <span className="composer-slash-arrow">{active ? "→" : " "}</span>
            <span className="composer-slash-name">{label}</span>
            <span className="composer-slash-desc">{item.path}</span>
            {item.isDirectory && (
              <span className="composer-slash-source">dir</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
