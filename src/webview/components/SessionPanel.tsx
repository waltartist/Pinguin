import { useState, useMemo } from "react";
import { usePi } from "../lib/use-pi";
import type { SessionInfo, ForkMessage, SessionTreeNode } from "../stores/pi-store";
import { Icon } from "./ember";

// ── Session Panel ────────────────────────────────────────────────────────────
//
// Renders session management UIs as an overlay on top of the chat area.
// Driven by the `sessionView` state in pi-store. The backend sends data via:
//   pi:sessions       — list of previous sessions (for /resume)
//   pi:fork_messages  — user messages for fork selection (for /fork)
//   pi:session_tree   — session tree structure (for /tree)
//
// /clone is a one-shot — no UI shown, just dispatches and closes.
// /import shows a file path input dialog.

export function SessionPanel() {
  const sessionView = usePi((s) => s.sessionView);
  const _closeSessionView = usePi((s) => s._closeSessionView);

  if (sessionView.kind === "closed") return null;

  return (
    <div className="login-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="login-panel" style={{ maxWidth: 700, maxHeight: "80vh" }}>
        {sessionView.kind === "resume" && <ResumeView />}
        {sessionView.kind === "fork" && <ForkView />}
        {sessionView.kind === "tree" && <TreeView />}
        {sessionView.kind === "import" && <ImportView />}
        <button className="btn btn-ghost" onClick={_closeSessionView} style={{ marginTop: 12 }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Resume: session list ────────────────────────────────────────────────────

function ResumeView() {
  const sessionView = usePi((s) => s.sessionView);
  const resumeSession = usePi((s) => s.resumeSession);
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  if (sessionView.kind !== "resume") return null;
  const { sessions, allSessions, loading } = sessionView;

  const display = showAll ? allSessions : sessions;
  const filtered = display.filter((s) => {
    const q = filter.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.firstMessage.toLowerCase().includes(q) ||
      s.cwd.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="login-step">
        <div className="login-header">
          <h2>Resume Session</h2>
        </div>
        <div className="login-spinner" />
        <p className="login-progress">Loading sessions…</p>
      </div>
    );
  }

  return (
    <div className="login-step">
      <div className="login-header">
        <h2>Resume Session</h2>
      </div>
      <input
        className="login-filter"
        type="text"
        placeholder="Filter sessions…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        autoFocus
      />
      <div className="login-list" style={{ maxHeight: "50vh" }}>
        {filtered.map((s) => (
          <button
            key={s.path}
            className="login-list-item"
            style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}
            onClick={() => resumeSession(s.path)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              {s.isCurrent && <Icon.Check width={10} height={10} />}
              <span className="login-list-name" style={{ flex: 1 }}>
                {s.name || s.id}
              </span>
              <span className="login-list-methods" style={{ fontSize: 11 }}>
                {s.messageCount} msgs
              </span>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {s.firstMessage.slice(0, 80) || "(empty)"}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {new Date(s.modified).toLocaleString()} · {s.cwd}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="login-empty">No sessions found</div>
        )}
      </div>
      {allSessions.length > sessions.length && (
        <button
          className="btn btn-ghost"
          style={{ marginTop: 8, fontSize: 12 }}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show current project only" : `Show all projects (${allSessions.length})`}
        </button>
      )}
    </div>
  );
}

// ── Fork: user message selector ─────────────────────────────────────────────

function ForkView() {
  const sessionView = usePi((s) => s.sessionView);
  const forkFromMessage = usePi((s) => s.forkFromMessage);

  if (sessionView.kind !== "fork") return null;
  const { messages, loading } = sessionView;

  if (loading) {
    return (
      <div className="login-step">
        <div className="login-header">
          <h2>Fork Session</h2>
        </div>
        <div className="login-spinner" />
        <p className="login-progress">Loading messages…</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="login-step">
        <div className="login-header">
          <h2>Fork Session</h2>
        </div>
        <div className="login-empty">No messages to fork from</div>
      </div>
    );
  }

  return (
    <div className="login-step">
      <div className="login-header">
        <h2>Fork Session</h2>
      </div>
      <p className="login-subtitle">Select a message to fork from:</p>
      <div className="login-list" style={{ maxHeight: "50vh" }}>
        {messages.map((m, i) => (
          <button
            key={m.entryId}
            className="login-list-item"
            style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}
            onClick={() => forkFromMessage(m.entryId)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                #{i + 1}
              </span>
              <span style={{ flex: 1, fontSize: 13 }}>
                {m.text.slice(0, 120) || "(empty)"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tree: session tree visualization ────────────────────────────────────────

function TreeView() {
  const sessionView = usePi((s) => s.sessionView);
  const navigateToNode = usePi((s) => s.navigateToNode);

  if (sessionView.kind !== "tree") return null;
  const { tree, leafId, loading } = sessionView;

  if (loading) {
    return (
      <div className="login-step">
        <div className="login-header">
          <h2>Session Tree</h2>
        </div>
        <div className="login-spinner" />
        <p className="login-progress">Loading tree…</p>
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="login-step">
        <div className="login-header">
          <h2>Session Tree</h2>
        </div>
        <div className="login-empty">No entries in session</div>
      </div>
    );
  }

  return (
    <div className="login-step">
      <div className="login-header">
        <h2>Session Tree</h2>
      </div>
      <p className="login-subtitle">Select a point to navigate to:</p>
      <div className="login-list" style={{ maxHeight: "50vh", overflow: "auto" }}>
        {tree.map((node) => (
          <TreeRow
            key={node.entryId}
            node={node}
            leafId={leafId}
            depth={0}
            onSelect={navigateToNode}
          />
        ))}
      </div>
    </div>
  );
}

function TreeRow({
  node,
  leafId,
  depth,
  onSelect,
}: {
  node: SessionTreeNode;
  leafId: string | null;
  depth: number;
  onSelect: (entryId: string, summarize: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isLeaf = node.entryId === leafId;
  const hasChildren = node.children.length > 0;

  const icon = isLeaf ? "●" : hasChildren ? (expanded ? "▾" : "▸") : "○";
  const roleLabel = node.role ? `[${node.role}]` : "";
  const text = node.text || node.type;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          cursor: "pointer",
          borderRadius: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: isLeaf ? "var(--accent)" : "var(--text)",
          background: isLeaf ? "var(--bg-elevated)" : "transparent",
        }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          if (!isLeaf) {
            // Navigate without summary by default
            onSelect(node.entryId, false);
          }
        }}
      >
        <span style={{ width: 14, textAlign: "center", flexShrink: 0 }}>{icon}</span>
        <span style={{ marginLeft: depth * 16, flex: 1 }}>
          {roleLabel} {text.slice(0, 100)}
        </span>
        {node.label && (
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>🏷 {node.label}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.entryId}
              node={child}
              leafId={leafId}
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Import: file path input ─────────────────────────────────────────────────

function ImportView() {
  const importFromFile = usePi((s) => s.importFromFile);
  const _closeSessionView = usePi((s) => s._closeSessionView);
  const [filePath, setFilePath] = useState("");

  return (
    <div className="login-step">
      <div className="login-header">
        <h2>Import Session</h2>
      </div>
      <p className="login-subtitle">Enter the path to a .jsonl session file:</p>
      <div className="login-input-row">
        <input
          className="login-input"
          type="text"
          placeholder="/path/to/session.jsonl"
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filePath.trim()) {
              importFromFile(filePath.trim());
            }
            if (e.key === "Escape") _closeSessionView();
          }}
          autoFocus
        />
        <button
          className="btn btn-send"
          onClick={() => {
            if (filePath.trim()) importFromFile(filePath.trim());
          }}
          disabled={!filePath.trim()}
        >
          Import
        </button>
      </div>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
        This will replace the current session with the imported one.
      </p>
    </div>
  );
}