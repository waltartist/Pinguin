import { useEffect, useRef, useState } from "react";
import { usePi } from "../lib/use-pi";
import type { Block, Message } from "../stores/pi-store";

export function Transcript() {
  const messages = usePi((s) => s.messages);
  const isStreaming = usePi((s) => s.isStreaming);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  return (
    <div className="transcript" ref={containerRef}>
      {messages.length === 0 && (
        <div className="transcript-empty">
          <h2>Pinguin</h2>
          <p>Ask Pi to do something — or ask it to extend this interface.</p>
        </div>
      )}
      {messages.map((msg) => (
        <MessageView key={msg.id} msg={msg} isStreaming={isStreaming} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageView({ msg, isStreaming }: { msg: Message; isStreaming: boolean }) {
  if (msg.role === "system") {
    const text = msg.blocks
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return (
      <div
        className={`message message-system${msg.isError ? " message-system-error" : ""}`}
      >
        <div className="message-system-body">{text}</div>
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div className="message message-user">
        <div className="message-content">
          {msg.blocks.map((b, i) => (
            <BlockView key={`${b.type}-${i}`} block={b} />
          ))}
        </div>
        <div className="message-role">you</div>
      </div>
    );
  }

  if (msg.role === "toolResult") {
    return (
      <div className="message message-toolResult">
        <div className="message-blocks">
          {msg.blocks.map((b, i) => (
            <BlockView key={`${b.type}-${i}`} block={b} />
          ))}
        </div>
      </div>
    );
  }

  // Assistant
  void isStreaming;
  return (
    <div className="message message-assistant">
      <div className="message-blocks">
        {msg.blocks.map((b, i) => (
          <BlockView key={`${b.type}-${i}`} block={b} />
        ))}
      </div>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return <div className="message-content">{block.text}</div>;
    case "thinking":
      return <ThinkingBlock text={block.text} />;
    case "toolCall":
      return <ToolCallBlock name={block.name} args={block.args} />;
    case "toolResult":
      return (
        <ToolResultBlock
          toolName={block.toolName}
          text={block.text}
          isError={block.isError}
        />
      );
  }
}

function ThinkingBlock({ text }: { text: string }) {
  return (
    <div className="block-thinking">
      <div className="block-thinking-label">thinking</div>
      <div className="block-thinking-body">{text}</div>
    </div>
  );
}

function ToolCallBlock({ name, args }: { name: string; args: any }) {
  const [open, setOpen] = useState(false);
  const argSummary = summarizeArgs(args);
  return (
    <div className="block-toolcall">
      <button className="block-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="block-chevron">{open ? "▾" : "▸"}</span>{" "}
        <span className="block-tool-name">{name}</span>
        {argSummary && <span className="block-tool-summary">{argSummary}</span>}
      </button>
      {open && <pre className="block-tool-args">{safeJson(args)}</pre>}
    </div>
  );
}

function ToolResultBlock({
  toolName,
  text,
  isError,
}: {
  toolName: string | undefined;
  text: string;
  isError: boolean;
}) {
  const [open, setOpen] = useState(false);
  const preview = text.split("\n")[0]?.slice(0, 120) || "(no output)";

  return (
    <div className={`block-toolresult${isError ? " block-toolresult-error" : ""}`}>
      <button className="block-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="block-chevron">{open ? "▾" : "▸"}</span>{" "}
        <span className="block-tool-name">{toolName || "tool"}</span>{" "}
        <span className="block-tool-summary">{preview}</span>
      </button>
      {open && <pre className="block-tool-args">{text}</pre>}
    </div>
  );
}

function summarizeArgs(args: any): string {
  if (!args || typeof args !== "object") return "";
  const entries = Object.entries(args);
  if (entries.length === 0) return "";
  const first = entries[0];
  const v = first[1];
  let vs: string;
  if (typeof v === "string") vs = v.length > 40 ? v.slice(0, 40) + "…" : v;
  else vs = String(v);
  return `${first[0]}: ${vs}`;
}

function safeJson(v: any): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}