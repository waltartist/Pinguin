# Pi GUI — Extension API

Pi GUI allows you to extend the interface by writing React components in `.tsx`
files. These are compiled on the fly and mounted in the app's dock.

## Location

- Global extensions: `~/.pi/gui-extensions/*.tsx`
- Per-Pi-extension sidecars: `~/.pi/extensions/<name>/gui/*.tsx`

## Module Shape

An extension must have a default export with the following shape:

```tsx
import { usePi, Icon } from "pi-gui";

export default {
  id: "my-extension",     // Unique identifier
  title: "My Extension",  // Display title in the dock and menu
  Component: () => {
    const pi = usePi();
    return (
      <div>
        <Icon.Sparkle />
        <span>Messages: {pi.messages.length}</span>
      </div>
    );
  }
};
```

## Provided Module: `pi-gui`

The host provides the `pi-gui` module. You do not need to install it.

### `usePi()`

A React hook that provides access to the Pi agent state and actions.

**State:**
- `isReady: boolean` — True when the Pi session is initialized.
- `messages: Message[]` — The chat transcript.
- `isStreaming: boolean` — True when the agent is generating a response.
- `model: { provider: string, id: string } | null` — Current model.
- `cwd: string | null` — Current working directory.

**Actions:**
- `sendPrompt(text: string): void` — Send a message to Pi.
- `abort(): void` — Abort the current generation.

### Components

- `Icon` — Monoline geometric icons: `Send`, `Plus`, `X`, `Chevron`, `Down`, `Check`, `Sparkle`, `Drag`, `File`, `Folder`, `Branch`, `Terminal`, `Wrench`, `Settings`, `History`.
- `PresenceDot` — `{ state: "idle" | "thinking" | "ready", size?: number }`.
- `StatusPill` — `{ state, children }`.

## Build Environment

- **React:** Provided by host (no need to import React if using JSX).
- **Styling:** Use CSS variables from the [Ember Style Guide](./ember-style-guide.md).
- **Hot Reload:** Saving the file triggers an immediate re-compile and re-mount.
- **Externals:** You can only import from `react`, `react-dom`, `zustand`, and `pi-gui`.

## Evaluation Notice

Pi GUI uses `new Function()` and `eval()` to mount extensions live. This is a
known trade-off to enable the "drop file, get capability" workflow.
