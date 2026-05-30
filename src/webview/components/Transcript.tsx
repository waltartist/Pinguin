import { useEffect, useRef, useState } from "react";
import { usePi } from "../lib/use-pi";
import type { Block, Message } from "../stores/pi-store";
import { useFileViewStore } from "../stores/file-view-store";
import { Icon } from "./ember";

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
            <BlockView key={i} block={b} />
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
            <BlockView key={i} block={b} />
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
          <BlockView key={i} block={b} />
        ))}
      </div>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "text": {
      const mdFiles = extractMdFilesFromText(block.text);
      return (
        <div className="message-content">
          {mdFiles.length > 0 ? splitWithLinks(block.text, mdFiles, true) : block.text}
        </div>
      );
    }
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

  // Extract markdown file paths from tool result text
  const mdFiles = extractMdFiles(text, toolName);

  // Build the preview with clickable file links
  const previewEl = mdFiles.length > 0
    ? splitWithLinks(text, mdFiles)
    : (<span className="block-tool-summary">{preview}</span>);

  return (
    <div className={`block-toolresult${isError ? " block-toolresult-error" : ""}`}>
      <button className="block-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="block-chevron">{open ? "▾" : "▸"}</span>{" "}
        <span className="block-tool-name">{toolName || "tool"}</span>{" "}
        {previewEl}
      </button>
      {open && (
        <pre className="block-tool-args">
          {mdFiles.length > 0
            ? splitWithLinks(text, mdFiles, true)
            : text}
        </pre>
      )}
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

// ── Markdown file detection ────────────────────────────────────────────────

const MD_EXT = /\.md$/i;

/** Detects if a tool is one that creates/modifies files. */
function isFileTool(name: string | undefined): boolean {
  return name === "write" || name === "edit";
}

interface MdFileMatch {
  path: string;
  start: number;
  end: number;
}

/** Extract markdown file paths from ANY text. Strips leading @ (from @-mentions).
 *  Matches absolute/relative paths ending in .md. */
function extractMdFilesFromText(text: string): MdFileMatch[] {
  const results: MdFileMatch[] = [];
  const re = /((?:[A-Za-z]:[\\/])?[^\s()<>]+\.md)\b/gi;

  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const raw = match[1];
    // Strip leading wrappers from @-mentions / inline code (e.g. `@EMBER.md`)
    const lead = raw.match(/^[`'"@]+/);
    const leadLen = lead ? lead[0].length : 0;
    const trail = raw.match(/[`'"]+$/);
    const trailLen = trail ? trail[0].length : 0;
    const path = raw.slice(leadLen, raw.length - trailLen);
    if (!path) continue;
    const start = match.index + leadLen;
    const end = match.index + raw.length - trailLen;
    if (results.some((r) => r.path === path && r.start === start)) continue;
    results.push({ path, start, end });
  }

  return results;
}

/** Extract markdown file paths from tool result text. Only returns matches
 *  when the tool is write or edit. */
function extractMdFiles(text: string, toolName: string | undefined): MdFileMatch[] {
  if (!isFileTool(toolName)) return [];
  return extractMdFilesFromText(text);
}

/** Split text into segments, replacing .md file paths with clickable links.
 *  Returns React nodes in a fragment. */
function splitWithLinks(
  text: string,
  files: MdFileMatch[],
  multiline?: boolean
): React.ReactNode {
  if (files.length === 0) return text;

  const openFile = (path: string) => {
    useFileViewStore.getState().open(path);
  };

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const file of files) {
    if (file.start < lastEnd) continue; // skip overlapping

    // Text before this file path
    if (file.start > lastEnd) {
      parts.push(text.slice(lastEnd, file.start));
    }

    // Clickable file link
    parts.push(
      <span
        key={`md-${file.start}`}
        className="block-md-link"
        onClick={(e) => {
          e.stopPropagation();
          openFile(file.path);
        }}
        title={`Open ${file.path}`}
      >
        <Icon.File width={11} height={11} />
        {file.path}
      </span>
    );

    lastEnd = file.end;
  }

  // Remaining text after last file path
  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd));
  }

  return multiline ? <>{parts}</> : <span className="block-tool-summary">{parts}</span>;
}
