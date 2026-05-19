import { useMemo } from "react";
import { usePi } from "../lib/use-pi";
import { PresenceDot } from "./ember";

export function StatusBar() {
  const isReady = usePi((s) => s.isReady);
  const isStreaming = usePi((s) => s.isStreaming);
  const model = usePi((s) => s.model);
  const messages = usePi((s) => s.messages);
  const messageCount = messages.length;

  const totalChars = useMemo(
    () =>
      messages.reduce((sum, m) => {
        for (const b of m.blocks) {
          if (b.type === "text") sum += b.text.length;
          else if (b.type === "thinking") sum += b.text.length;
          else if (b.type === "toolResult") sum += b.text.length;
        }
        return sum;
      }, 0),
    [messages]
  );

  const formatChars = (n: number) => {
    if (n < 1000) return `${n} chars`;
    if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k chars`;
    return `${(n / 1_000_000).toFixed(1)}M chars`;
  };

  const connectionState = isReady ? "ready" : "idle";
  const activityState = isStreaming ? "thinking" : isReady ? "ready" : "idle";

  return (
    <div className="status-bar-inner">
      <span className="status-item">
        <PresenceDot state={connectionState} size={6} />
        {isReady ? "connected" : "disconnected"}
      </span>
      <span className="status-sep">·</span>
      <span className="status-item">
        <PresenceDot state={activityState} size={6} />
        {isStreaming ? "streaming" : "idle"}
      </span>
      {model && (
        <>
          <span className="status-sep">·</span>
          <span className="status-item">{model}</span>
        </>
      )}
      <span style={{ flex: 1 }} />
      <span className="status-dim">{messageCount} msgs</span>
      <span className="status-sep">·</span>
      <span className="status-dim">{formatChars(totalChars)}</span>
    </div>
  );
}
