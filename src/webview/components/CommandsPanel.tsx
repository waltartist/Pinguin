import { useState, useCallback, useRef, useEffect } from "react";
import { usePi } from "../lib/use-pi";
import type { SlashCommand } from "../stores/pi-store";

// ── Palette for command square icons ──────────────────────────────────────

const ICON_PALETTE = [
  { bg: "oklch(0.65 0.22 30)", fg: "#fff" },
  { bg: "oklch(0.60 0.18 260)", fg: "#fff" },
  { bg: "oklch(0.65 0.20 160)", fg: "#fff" },
  { bg: "oklch(0.62 0.16 310)", fg: "#fff" },
  { bg: "oklch(0.70 0.20 85)", fg: "#1a0c08" },
  { bg: "oklch(0.60 0.14 200)", fg: "#fff" },
  { bg: "oklch(0.65 0.18 20)", fg: "#fff" },
  { bg: "oklch(0.60 0.12 140)", fg: "#fff" },
  { bg: "oklch(0.55 0.15 290)", fg: "#fff" },
  { bg: "oklch(0.68 0.18 50)", fg: "#1a0c08" },
  { bg: "oklch(0.58 0.14 220)", fg: "#fff" },
  { bg: "oklch(0.64 0.20 350)", fg: "#fff" },
  { bg: "oklch(0.60 0.10 120)", fg: "#fff" },
  { bg: "oklch(0.62 0.18 270)", fg: "#fff" },
  { bg: "oklch(0.70 0.22 45)", fg: "#1a0c08" },
  { bg: "oklch(0.58 0.18 0)", fg: "#fff" },
  { bg: "oklch(0.63 0.12 180)", fg: "#fff" },
  { bg: "oklch(0.60 0.16 320)", fg: "#fff" },
];

function getPaletteIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % ICON_PALETTE.length;
}

function getGlyph(name: string): string {
  return name[0]?.toUpperCase() ?? "?";
}

const NO_ARG_COMMANDS = new Set([
  "new", "quit", "reload", "hotkeys", "changelog",
  "session", "scoped-models", "settings", "compact", "export",
]);

// ── Add-command dropdown ──────────────────────────────────────────────────

function AddDropdown({
  available,
  onAdd,
  onClose,
}: {
  available: SlashCommand[];
  onAdd: (cmd: SlashCommand) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = query
    ? available.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase())
      )
    : available;

  return (
    <div className="cmd-add-dropdown">
      <input
        className="cmd-add-search"
        type="text"
        placeholder="Search commands…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter" && filtered.length > 0) {
            onAdd(filtered[0]);
            onClose();
          }
        }}
        onBlur={() => setTimeout(onClose, 150)}
      />
      <div className="cmd-add-list">
        {filtered.length === 0 && (
          <div className="cmd-add-empty">No matching commands</div>
        )}
        {filtered.map((cmd) => {
          const idx = getPaletteIndex(cmd.name);
          const { bg, fg } = ICON_PALETTE[idx];
          return (
            <button
              key={`${cmd.source}:${cmd.name}`}
              className="cmd-add-item"
              onClick={() => {
                onAdd(cmd);
                onClose();
              }}
            >
              <span className="cmd-add-item-icon" style={{ background: bg, color: fg }}>
                {getGlyph(cmd.name)}
              </span>
              <span className="cmd-add-item-name">/{cmd.name}</span>
              <span className="cmd-add-item-desc">{cmd.description}</span>
              {cmd.source !== "builtin" && (
                <span className="cmd-add-item-source">{cmd.source}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export function CommandsPanel({ panelApi }: { panelApi?: any }) {
  const commands = usePi((s) => s.commands);
  const pinnedCommands = usePi((s) => s.pinnedCommands);
  const sendPrompt = usePi((s) => s.sendPrompt);
  const isStreaming = usePi((s) => s.isStreaming);
  const _setPendingComposerInput = usePi((s) => s._setPendingComposerInput);
  const _addPinnedCommand = usePi((s) => s._addPinnedCommand);
  const _removePinnedCommand = usePi((s) => s._removePinnedCommand);

  const [addOpen, setAddOpen] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  const pinnedCmds: SlashCommand[] = pinnedCommands
    .map((name) => commands.find((c) => c.name === name))
    .filter(Boolean) as SlashCommand[];

  const pinnedNames = new Set(pinnedCommands);
  const availableCmds = commands.filter((c) => !pinnedNames.has(c.name));

  const handleCommandClick = useCallback(
    (cmd: SlashCommand) => {
      if (isStreaming) return;
      if (NO_ARG_COMMANDS.has(cmd.name)) {
        sendPrompt(`/${cmd.name}`);
      } else {
        _setPendingComposerInput(`/${cmd.name} `);
      }
    },
    [isStreaming, sendPrompt, _setPendingComposerInput]
  );

  // ── Lock panel height to content height via dockview panel API ──
  // This prevents the user from resizing the commands panel, while
  // still allowing it to grow/shrink as buttons are added/removed.
  useEffect(() => {
    const el = innerRef.current;
    if (!el || !panelApi) return;

    const updateSize = () => {
      const h = el.scrollHeight;
      if (h > 0) {
        panelApi.setSize?.({ height: h });
        panelApi.setConstraints?.({ minimumHeight: h, maximumHeight: h });
      }
    };

    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [panelApi, pinnedCmds.length]);

  return (
    <div className="commands-panel">
      <div ref={innerRef} className="cmdtoolbar-inner">
        {/* Pinned command buttons */}
        {pinnedCmds.map((cmd) => {
          const idx = getPaletteIndex(cmd.name);
          const { bg, fg } = ICON_PALETTE[idx];
          return (
            <button
              key={`pinned:${cmd.name}`}
              className="cmdtoolbar-btn"
              onClick={() => handleCommandClick(cmd)}
              title={`/${cmd.name} — ${cmd.description}`}
              disabled={isStreaming}
            >
              <span className="cmdtoolbar-btn-icon" style={{ background: bg, color: fg }}>
                {getGlyph(cmd.name)}
              </span>
              <span className="cmdtoolbar-btn-label">{cmd.name}</span>
              <span
                className="cmdtoolbar-btn-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  _removePinnedCommand(cmd.name);
                }}
                title={`Remove /${cmd.name}`}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
            </button>
          );
        })}

        {/* Add button */}
        <div className="cmdtoolbar-add-wrap">
          <button
            className={`cmdtoolbar-add${addOpen ? " cmdtoolbar-add--open" : ""}`}
            onClick={() => setAddOpen((v) => !v)}
            title="Add command to toolbar"
            disabled={isStreaming}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {addOpen && (
            <AddDropdown
              available={availableCmds}
              onAdd={_addPinnedCommand}
              onClose={() => setAddOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
