import { useState, useRef, KeyboardEvent } from "react";
import { usePi } from "../lib/use-pi";
import { Icon } from "./ember";

export function Composer() {
  const isReady = usePi((s) => s.isReady);
  const isStreaming = usePi((s) => s.isStreaming);
  const error = usePi((s) => s.error);
  const sendPrompt = usePi((s) => s.sendPrompt);
  const abort = usePi((s) => s.abort);
  const model = usePi((s) => s.model);

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    sendPrompt(text);
    setInput("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="composer">
      {error && <div className="composer-error">{error}</div>}
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
