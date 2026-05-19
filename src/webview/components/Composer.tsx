import { useState, useRef, useEffect, useMemo, KeyboardEvent } from "react";
import { usePi } from "../lib/use-pi";
import type { SlashCommand } from "../stores/pi-store";
import { Icon } from "./ember";

export function Composer() {
  const isReady = usePi((s) => s.isReady);
  const isStreaming = usePi((s) => s.isStreaming);
  const error = usePi((s) => s.error);
  const sendPrompt = usePi((s) => s.sendPrompt);
  const abort = usePi((s) => s.abort);
  const model = usePi((s) => s.model);
  const commands = usePi((s) => s.commands);

  const [input, setInput] = useState("");
  const [slashIdx, setSlashIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Slash autocomplete. Active when the input starts with `/` and the
  // first token hasn't been closed by a space — i.e. we're still picking
  // a command name. Once a space appears we're typing arguments.
  const slashQuery = useMemo<string | null>(() => {
    if (!input.startsWith("/")) return null;
    const firstSpace = input.indexOf(" ");
    if (firstSpace !== -1) return null;
    return input.slice(1).toLowerCase();
  }, [input]);

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

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    sendPrompt(text);
    setInput("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="composer">
      {error && <div className="composer-error">{error}</div>}
      {slashOpen && (
        <SlashPopup
          commands={filteredCommands}
          activeIdx={slashIdx}
          onPick={acceptCommand}
          onHoverIdx={setSlashIdx}
        />
      )}
      <div className="composer-row">
        <textarea
          ref={textareaRef}
          className="composer-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isReady ? "Ask Pi…" : "Starting Pi…"}
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
          style={{
            display: "flex",
            gap: 6,
            marginTop: 8,
            paddingLeft: 2,
          }}
        >
          <span className="btn-chip">{model}</span>
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
  // Scroll active item into view when arrow keys move the cursor.
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
