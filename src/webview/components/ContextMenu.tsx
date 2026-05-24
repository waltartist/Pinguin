import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { usePi } from "../lib/use-pi";

/* ═══════════════════════════════════════════════════════════════════════
   ContextMenu — Right-click → "Suggest Edit"
   ───────────────────────────────────────────────────────────────────────
   Overrides the browser's default context menu anywhere in the app.
   Captures the clicked element's identity (tag, text, selector, panel,
   attributes) and lets the user type how they want it changed.

   The suggestion is sent to Pi as a structured prompt with rich context
   so the agent knows *exactly* what and where to modify.
   ═══════════════════════════════════════════════════════════════════════ */

// ── Element context extraction ─────────────────────────────────────────

interface ElementContext {
  tag: string;
  text: string | null;
  id: string | null;
  classes: string[];
  selector: string;
  ariaLabel: string | null;
  title: string | null;
  placeholder: string | null;
  role: string | null;
  panel: string | null; // dockview panel id, if inside one
  type: string | null;  // input type (button, text, checkbox, etc.)
  value: string | null; // value attribute for inputs/buttons
  href: string | null;  // link target
}

/** Compute a concise CSS selector for the given element. */
function computeSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body && current !== document.documentElement) {
    let segment = current.tagName.toLowerCase();

    if (current.id) {
      segment = `#${current.id}`;
      parts.unshift(segment);
      break; // id is unique — stop climbing
    }

    // Add class names (limit to 2 most specific ones)
    const cls = Array.from(current.classList)
      .filter((c) => !c.startsWith("dv-") && !c.startsWith("pi-") && c !== "composer-slash-item")
      .slice(0, 2);
    if (cls.length > 0) {
      segment += cls.map((c) => `.${c}`).join("");
    }

    // Nth-child qualifier for disambiguation among siblings
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        segment += `:nth-child(${idx})`;
      }
    }

    parts.unshift(segment);
    current = current.parentElement;
  }

  return parts.join(" > ") || el.tagName.toLowerCase();
}

/** Find the nearest dockview panel id from a click target. */
function findPanelId(el: Element | null): string | null {
  let current: Element | null = el;
  while (current) {
    const panelId =
      current.getAttribute("data-panel-id") ||
      current.getAttribute("data-dock-id") ||
      current.getAttribute("data-panel");
    if (panelId) return panelId;

    // Check for dockview tab titles
    const tabTitle = current.querySelector(".pi-dock-tab__title");
    if (tabTitle?.textContent) return tabTitle.textContent.trim();

    current = current.parentElement;
  }
  return null;
}

/** Extract meaningful context from the right-clicked element. */
function captureContext(target: EventTarget | null): ElementContext {
  const el = target instanceof Element ? target : document.body;
  const text = el.textContent?.trim().slice(0, 120) ?? null;
  const ariaLabel = el.getAttribute("aria-label");
  const title = el.getAttribute("title");
  const placeholder =
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      ? el.placeholder
      : null;
  const role = el.getAttribute("role");
  const type = el.getAttribute("type") || (el instanceof HTMLButtonElement ? "button" : null);
  const value =
    el instanceof HTMLInputElement
      ? el.value
      : el instanceof HTMLButtonElement
        ? el.textContent?.trim() ?? null
        : null;
  const href = el instanceof HTMLAnchorElement ? el.getAttribute("href") : null;

  return {
    tag: el.tagName.toLowerCase(),
    text: text || null,
    id: el.id || null,
    classes: Array.from(el.classList),
    selector: computeSelector(el),
    ariaLabel,
    title,
    placeholder,
    role,
    panel: findPanelId(el),
    type,
    value,
    href,
  };
}

/** Build a human-readable description of the element context for Pi. */
function formatContext(ctx: ElementContext): string {
  const lines: string[] = [];
  lines.push(`Element: <${ctx.tag}>`);
  if (ctx.id) lines.push(`ID: #${ctx.id}`);
  if (ctx.classes.length > 0) lines.push(`Classes: .${ctx.classes.join(".")}`);
  if (ctx.text) lines.push(`Text: "${ctx.text}"`);
  if (ctx.ariaLabel) lines.push(`Label: "${ctx.ariaLabel}"`);
  if (ctx.title) lines.push(`Tooltip: "${ctx.title}"`);
  if (ctx.placeholder) lines.push(`Placeholder: "${ctx.placeholder}"`);
  if (ctx.role) lines.push(`Role: ${ctx.role}`);
  if (ctx.type) lines.push(`Type: ${ctx.type}`);
  if (ctx.value) lines.push(`Value: "${ctx.value}"`);
  if (ctx.href) lines.push(`Href: ${ctx.href}`);
  if (ctx.panel) lines.push(`Panel: "${ctx.panel}"`);
  lines.push(`Selector: ${ctx.selector}`);
  return lines.join("\n");
}

// ── ContextMenu component ──────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  ctx: ElementContext;
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [suggestion, setSuggestion] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sendPrompt = usePi((s) => s.sendPrompt);
  const isStreaming = usePi((s) => s.isStreaming);

  // ── Global contextmenu handler ────────────────────────────────
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const ctx = captureContext(e.target);
      setMenu({ x: e.clientX, y: e.clientY, ctx });
      setSuggestion(false);
      setInput("");
      setSending(false);
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  // ── Close on click outside / Escape ───────────────────────────
  useEffect(() => {
    if (!menu) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (suggestion) {
          setSuggestion(false);
        } else {
          closeMenu();
        }
      }
    };

    // Delay listener so the contextmenu click itself doesn't close it
    requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    });

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menu, suggestion]);

  // ── Focus input when suggestion mode opens ────────────────────
  useEffect(() => {
    if (suggestion) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [suggestion]);

  const closeMenu = useCallback(() => {
    setMenu(null);
    setSuggestion(false);
    setInput("");
    setSending(false);
  }, []);

  const handleSuggestEdit = () => {
    setSuggestion(true);
  };

  const handleSubmit = useCallback(() => {
    if (!menu || !input.trim() || sending || isStreaming) return;

    setSending(true);
    const contextStr = formatContext(menu.ctx);
    const prompt = `[Suggest Edit]\n\nI right-clicked on the following UI element:\n\`\`\`\n${contextStr}\n\`\`\`\n\nMy suggestion for how to change it:\n${input.trim()}\n\nPlease analyze the context and make the requested change. If you need to modify code, tell me exactly which files to change and what to change.`;

    sendPrompt(prompt);
    closeMenu();
  }, [menu, input, sending, isStreaming, sendPrompt, closeMenu]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (suggestion) {
        setSuggestion(false);
      } else {
        closeMenu();
      }
    }
  };

  // ── Reposition menu to stay within viewport ───────────────────
  const adjustedPos = useRef({ x: 0, y: 0 });
  if (menu) {
    let x = menu.x;
    let y = menu.y;

    // Estimate menu dimensions (we don't know exact size yet)
    const menuWidth = 220;
    const menuHeight = suggestion ? 180 : 90;

    if (x + menuWidth > window.innerWidth - 8) x = window.innerWidth - menuWidth - 8;
    if (y + menuHeight > window.innerHeight - 8) y = window.innerHeight - menuHeight - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;

    adjustedPos.current = { x, y };
  }

  return (
    <>
      {children}

      {menu && (
        <>
          {/* Backdrop for suggestion mode */}
          {suggestion && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9998,
                background: "rgba(0,0,0,0.3)",
              }}
              onClick={() => {
                if (!suggestion) closeMenu();
              }}
            />
          )}

          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: adjustedPos.current.x,
              top: adjustedPos.current.y,
              zIndex: 9999,
              minWidth: 220,
              maxWidth: 320,
              background: "var(--surface)",
              border: "1px solid var(--border-hi)",
              borderRadius: "var(--radius-lg)",
              boxShadow:
                "0 16px 48px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.3)",
              padding: "4px",
              fontFamily: "var(--font)",
              fontSize: 13,
              color: "var(--text)",
              animation: "floatIn 0.12s ease-out",
            }}
          >
            {!suggestion ? (
              /* ── Menu items ───────────────────────────────── */
              <>
                {/* Element context preview */}
                <div
                  style={{
                    padding: "6px 10px 4px",
                    fontSize: 10.5,
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    borderBottom: "1px solid var(--border)",
                    marginBottom: 2,
                  }}
                  title={formatContext(menu.ctx)}
                >
                  &lt;{menu.ctx.tag}&gt;
                  {menu.ctx.text && (
                    <>
                      {" "}
                      <span style={{ opacity: 0.6 }}>
                        “{menu.ctx.text.slice(0, 50)}
                        {menu.ctx.text.length > 50 ? "…" : ""}”
                      </span>
                    </>
                  )}
                </div>

                {/* Suggest Edit */}
                <button
                  type="button"
                  className="pi-dock-menu__item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "6px 10px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text)",
                    fontFamily: "var(--font)",
                    fontSize: 12.5,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--surface-hi)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                  onClick={handleSuggestEdit}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width={14}
                    height={14}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, color: "var(--accent-text)" }}
                  >
                    <path d="M11.5 1.5l3 3L5 14H2v-3z" />
                    <path d="M9.5 3.5l3 3" />
                  </svg>
                  <span style={{ flex: 1 }}>Suggest Edit</span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--text-dim)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ⌘↵
                  </span>
                </button>
              </>
            ) : (
              /* ── Suggestion input ─────────────────────────── */
              <div style={{ padding: 4 }}>
                <div
                  style={{
                    padding: "4px 6px 6px",
                    fontSize: 10.5,
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Suggest edit for &lt;{menu.ctx.tag}&gt;
                  {menu.ctx.text && (
                    <>
                      {" "}
                      <span style={{ opacity: 0.6 }}>
                        “{menu.ctx.text.slice(0, 30)}
                        {menu.ctx.text.length > 30 ? "…" : ""}”
                      </span>
                    </>
                  )}
                </div>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe how it should change…"
                  rows={3}
                  style={{
                    width: "100%",
                    resize: "none",
                    padding: "8px 10px",
                    background: "var(--surface-sink)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text)",
                    fontFamily: "var(--font)",
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  disabled={sending}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    justifyContent: "flex-end",
                    marginTop: 6,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ height: 26, fontSize: 11.5, padding: "0 10px" }}
                    onClick={closeMenu}
                    disabled={sending}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-send"
                    style={{ height: 26, fontSize: 11.5, padding: "0 10px" }}
                    onClick={handleSubmit}
                    disabled={!input.trim() || sending || isStreaming}
                  >
                    {sending ? "Sending…" : "Send Suggestion"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
