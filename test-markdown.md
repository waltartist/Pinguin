# Pi GUI — Markdown Viewer Test

This file exercises the markdown rendering capabilities of the Pi GUI markdown viewer. Use it to verify all elements render correctly in the Ember theme.

---

## Headings

### H3: A Subheading

#### H4: A Minor Heading (should be uppercase, muted)

---

## Text Styling

This paragraph contains **bold text**, *italic text*, and `inline code` mixed together. The inline code uses **mono** with an accent-text color and a subtle sink background.

Here's [a link to the Pi website](https://pi.dev) — it should render with accent text and an underline.

---

## Lists

### Unordered

- First item with enough text to wrap to a second line so we can verify line spacing
- Second item
  - Nested item one
  - Nested item two
- Third item with `code` inside

### Ordered

1. Step one: install dependencies
2. Step two: configure the app
   1. Sub-step A
   2. Sub-step B
3. Step three: run it

---

## Code Blocks

```typescript
// TypeScript: Zustand store for file viewing
import { create } from "zustand";

interface FileViewState {
  openFile: { path: string; filename: string } | null;
  open: (path: string) => void;
  close: () => void;
}

export const useFileViewStore = create<FileViewState>((set) => ({
  openFile: null,
  open: (path) => set({ openFile: { path, filename: path.split("/").pop()! } }),
  close: () => set({ openFile: null }),
}));
```

```css
/* CSS: Ember design tokens */
:root {
  --bg: #0a0a0a;
  --accent: oklch(0.75 0.17 55);
  --text: rgba(255, 255, 255, 0.94);
  --font-mono: "IBM Plex Mono", monospace;
}
```

A plain code block (no language tag):

```
No language specified — just monospaced text in a sink background.
```

---

## Blockquote

> Pi GUI is a desktop GUI wrapper around the Pi coding agent. It provides a chat-based interface for interacting with Pi as an agentic coding assistant, with the key feature that you can ask Pi to extend the GUI itself.
>
> — From the implementation plan

---

## Tables

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0a0a` | App background, title bar, status bar |
| `--surface` | `#141416` | Cards, user message bubble |
| `--accent` | `oklch(0.75 0.17 55)` | Primary button bg, presence dot |
| `--font` | `IBM Plex Sans` | Everything human-readable |
| `--font-mono` | `IBM Plex Mono` | Tool names, file paths, status bar |

---

## Horizontal Rule

Above the rule — there should be a subtle border separating this from below.

---

Below the rule.

---

## Mixed Content

Here's a paragraph with **bold**, *italic*, `code`, and a [link](https://example.com). Below it, a nested list inside a blockquote:

> ### Important Note
>
> - Always use CSS variables — **never hardcode colors**
> - Accent is a **spice**, not a paint
> - One elevation tier: **flat** or **floating** — never in between
>
> ```css
> /* Canonical floating panel shadow */
> box-shadow:
>   0 16px 48px rgba(0, 0, 0, 0.55),
>   0 0 0 1px rgba(0, 0, 0, 0.3);
> ```
>
> The build produces a standalone binary: `dist/pi-gui.exe`

---

## Long Content (scroll test)

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

- Item A with a long description that wraps
- Item B
- Item C
- Item D
- Item E
- Item F
- Item G
- Item H
- Item I
- Item J — tenth item to test scrolling

---

## End of Test

All markdown elements should have rendered correctly using the Ember design tokens and the warm-dark theme.
