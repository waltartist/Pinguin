# Pi GUI — Ember Style Guide

The canonical style reference for Pi GUI and any extension (`.tsx` in
`gui-extensions/`) that ships UI inside the app.

**Vibe:** warm dark, orange accent, soft elevation, Raycast/Vercel-clean.
Quiet by default — accent only earns attention, never decorates.

---

## 1. Design Tokens

All tokens are CSS variables on `:root` in `src/webview/style.css`. **Always
reference the variable**, never hardcode hex. Extensions inherit the same
variables — they Just Work.

### Surfaces

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0a0a` | App background, title bar, status bar |
| `--bg-2` | `#0f0f10` | Main content area, panel body |
| `--surface` | `#141416` | Cards, user message bubble, floating panel |
| `--surface-hi` | `#1c1c1f` | Active rail item, secondary button, panel header |
| `--surface-sink` | `#070708` | Tool-call blocks, terminal output, recessed wells |

### Borders

| Token | Value | Use |
|---|---|---|
| `--border` | `rgba(255,255,255,0.06)` | Default hairlines |
| `--border-hi` | `rgba(255,255,255,0.10)` | Floating panel edges, hover state |

### Text

| Token | Value | Use |
|---|---|---|
| `--text` | `rgba(255,255,255,0.94)` | Primary body text |
| `--text-muted` | `rgba(255,255,255,0.58)` | Labels, secondary info, status bar |
| `--text-dim` | `rgba(255,255,255,0.34)` | Tertiary, timestamps, section headers |

### Accent — Ember Orange

| Token | Value | Use |
|---|---|---|
| `--accent` | `oklch(0.75 0.17 55)` | Primary button bg, presence dot, slider fill |
| `--accent-soft` | `oklch(0.75 0.17 55 / 0.14)` | Soft chip bg, active tab background |
| `--accent-border` | `oklch(0.75 0.17 55 / 0.35)` | Focus ring, accent badge border |
| `--accent-text` | `oklch(0.86 0.14 60)` | Accent-colored text (e.g. tool names) |
| `--accent-ink` | `#1a0c08` | Text **on** accent backgrounds (dark on orange) |

### Status

| Token | Use |
|---|---|
| `--success` / `--success-soft` / `--success-border` | Done states, "M" git status, ready dot |
| `--warn` / `--warn-soft` / `--warn-border` | Stale, untracked files, warning badges |
| `--danger` / `--danger-bg` / `--danger-soft` / `--danger-border` | Errors, abort, destructive |

### Radii

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `6px` | Chips, tiny pills, checkboxes |
| `--radius` | `10px` | Buttons, inputs, blocks, panels |
| `--radius-lg` | `14px` | Floating panels, composer, message bubbles |

### Type

| Token | Value | Use |
|---|---|---|
| `--font` | `"IBM Plex Sans", system-ui, sans-serif` | Everything human |
| `--font-mono` | `"IBM Plex Mono", monospace` | Tool names, file paths, status bar, badges, labels, code, args |

**Type scale** (no abstract `lg/xl` here — match these values):

| Use | Size | Weight |
|---|---|---|
| Page title | 19–28px | 600, letter-spacing −0.3 to −0.6 |
| Body | 13.5px | 400 |
| Compact body / tool block | 12px | 400 |
| Section label (UPPERCASE) | 10.5px | 500, mono, tracking 0.08em |
| Status bar | 10.5px | 400, mono |
| Timestamps | 10–11px | 400, mono, color `--text-dim` |

---

## 2. Layout Primitives

### Spacing scale

Use **4px base**: `4 · 8 · 12 · 16 · 20 · 24 · 28 · 40`. Don't invent values
between these. Panel padding is `12px`. Transcript padding is `20px 28px 16px`.

### Elevation

Only **two tiers** — flat (everything inline) and **floating** (one shadow,
used for extension panels and popovers):

```css
box-shadow:
  0 16px 48px rgba(0, 0, 0, 0.55),
  0 0 0 1px rgba(0, 0, 0, 0.3);
```

Never use intermediate shadows. Floating panels also bump the border to
`--border-hi` and the corner to `--radius-lg`.

### Animations (already in `style.css`)

| Keyframe | Use |
|---|---|
| `piPulse` | Presence dot halo |
| `piCaret` | Streaming caret |
| `piRise` | Floating panel / extension mount-in |
| `fadeIn` | Message fade-in |

Durations: pulse `1.6s`, caret `1s`, rise `0.35–0.4s`, hover `0.12–0.15s`.
Easing is `ease-out` everywhere; never use `ease-in`.

---

## 3. Components — canonical classes

Use these class names. Don't fork them, don't inline styles for anything
covered here.

### Buttons

```html
<button class="btn btn-send">Send <svg/></button>     <!-- primary -->
<button class="btn">Secondary</button>                 <!-- default -->
<button class="btn btn-ghost">Ghost</button>           <!-- borderless feel -->
<button class="btn btn-abort">Stop</button>            <!-- destructive -->
<button class="btn-chip">attach</button>               <!-- mono chip -->
```

**Rules:**
- Primary (`btn-send`) ONLY for the main commit action of a panel — one per
  screen region. Never two orange buttons next to each other.
- Text on `--accent` background is `--accent-ink` (`#1a0c08`), never white.
- Height: `30px` default, `28px` for primary in composer, `22px` for chips.

### Inputs

```html
<input class="input" placeholder="Ask Pi…" />
<select class="input select"><option>…</option></select>
```

Focus state is automatic (orange ring via `--accent-soft`). Don't restyle.

### Badges

```html
<span class="badge">running</span>
<span class="badge badge--success">done</span>
<span class="badge badge--warn">stale</span>
<span class="badge badge--danger">error</span>
<span class="badge badge--muted">draft</span>
```

Mono, 20px tall, used for statuses — not for navigation.

### Toggle / Checkbox

```html
<div class="toggle toggle--on"></div>
<label class="checkbox checkbox--on">
  <span class="checkbox-box">✓</span> auto-scroll
</label>
```

### Presence Dot — required for any "agent is doing something" surface

```tsx
import { PresenceDot } from "./components/ember";

<PresenceDot state="thinking" />   {/* halo pulses */}
<PresenceDot state="ready" />      {/* solid success-color dot */}
<PresenceDot state="idle" />       {/* 35% opacity, no halo */}
```

Sizes: `6px` in status bar, `8px` next to assistant messages.

### Icons

Use `Icon.*` from `components/ember.tsx`. They're monoline, geometric,
`currentColor`. Don't import Lucide / Heroicons / etc. for primary chrome —
visual consistency comes from the shared set:

```
Send · Plus · X · Chevron · Down · Check · Sparkle · Drag · File ·
Folder · Branch · Terminal · Wrench · Settings · History
```

Default size is `11–14px` matched to text size.

### Floating Extension Panel — the canonical extension shell

Every extension that renders its own dockable panel should follow this
structure (matches `EmberGitPanel` from the design):

```tsx
<div className="extension-panel">
  {/* Header */}
  <div className="ext-header">
    <Icon.Drag width={12} height={12} />
    <Icon.Branch width={11} height={11} />
    <span className="ext-title">git status</span>
    <span className="ext-tag">ext</span>
    <Icon.X width={10} height={10} />
  </div>
  {/* Body — vertical stack, gap: 10px */}
  <div className="ext-body">
    <Section label="BRANCH">…</Section>
    <Section label="CHANGES · 3">…</Section>
  </div>
</div>
```

Section labels are **uppercase mono, 10.5px, `--text-dim`**. Body content
under them is `--font-mono` at 12–13px in the panel context (paths look
correct in mono).

---

## 4. Patterns

### Message bubbles

- **User:** right-aligned, max 78%, `--surface` bg, `--radius-lg`, role
  label below in mono.
- **Assistant:** left-aligned, max 92%, no bubble — just a presence dot +
  text. Tool calls render as inline `.block-toolcall` rows.
- **Tool call inline row:** `--surface-sink` bg, mono, 12px, with a
  `--accent-soft` square indicator when running (containing a `piPulse`
  dot) or `--success` check when done.

### Streaming caret

`<span class="streaming-cursor" />` — 6×14, `--accent`, blinks via `piCaret`.
Placed inline at the end of the streaming text block.

### Empty state

Dashed border (`--border-hi`), `--radius-lg`, centered Sparkle icon in an
`--accent-soft` square, one-line title, two-line muted hint. Don't add
illustrations.

### Tool-call colors

Match the design's git-status panel:

| Status | Color |
|---|---|
| Modified (`M`) | `--success` |
| Untracked (`?`) | `--warn` |
| Added (`A`) | `--accent-text` |
| Deleted (`D`) | `--danger` |

---

## 5. Rules of Thumb

1. **Accent is a spice, not a paint.** If two things on screen are orange,
   the wrong one is. Streaming presence, focus ring, primary button, active
   tab indicator — that's it.
2. **Mono for paths, names, IDs, status bars, badges, section labels.**
   Sans for everything a human reads.
3. **No new colors.** If the token isn't defined, the design doesn't want it.
   For ad-hoc statuses, layer accent / success / warn / danger.
4. **One elevation tier.** Flat or floating. Never half-floating with a
   subtle shadow.
5. **Borders carry the visual hierarchy**, not background contrast steps.
   `--border` for default, `--border-hi` for emphasis or hover.
6. **Animation is a signal, not decoration.** Only animate to communicate
   state change (streaming, mount, focus). Never animate hover for hover's
   sake.
7. **Density: balanced.** Comfortable but efficient — 4px base spacing, never
   below 4px, prefer 8/12 for related groups, 16/20 between groups.
8. **No emojis in chrome.** Use `Icon.*`. Emojis OK only inside message
   content authored by Pi.

---

## 6. For extension authors (and the Pi agent)

When asked to build an extension panel:

1. Import primitives — they're available as the `pi-gui` module the
   ExtensionHost shim provides:
   ```ts
   import { usePi, Icon, PresenceDot } from "pi-gui";
   ```
2. Use the CSS variables — they're on `:root` and inherited. Never hardcode
   colors. Inline styles are OK for layout (`display`, `gap`, `padding`),
   but pull every color/border/font from the tokens above.
3. Follow the Floating Extension Panel template in §3.
4. The extension root will be mounted inside `.extension-panel`. Don't
   re-wrap it.
5. If you need a status color, pick from accent / success / warn / danger —
   don't introduce blue/cyan/teal/purple. This is a warm palette.

**Minimal compliant extension example:**

```tsx
import { usePi, Icon, PresenceDot } from "pi-gui";

export default {
  id: "session-stats",
  title: "Session",
  Component: () => {
    const pi = usePi();
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{
            fontSize: 10.5,
            fontFamily: "var(--font-mono)",
            color: "var(--text-dim)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}>MESSAGES</div>
          <div style={{
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            color: "var(--text)",
          }}>{pi.messages.length}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <PresenceDot state={pi.isStreaming ? "thinking" : "ready"} size={6} />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {pi.isStreaming ? "thinking…" : "idle"}
          </span>
        </div>
      </div>
    );
  },
};
```

That's the whole bar. Quiet, mono for data, accent only for the live
presence dot, no hardcoded colors.
