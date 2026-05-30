// Type declarations for the Pinguin extension API.
// Sync this file to gui-extensions/pi-gui.d.ts

declare module "pi-gui" {
  import { SVGProps, ComponentType, ReactNode } from "react";

  export interface ModelInfo {
    provider: string;
    id: string;
  }

  export type Block =
    | { type: "text"; text: string }
    | { type: "thinking"; text: string }
    | { type: "toolCall"; id: string; name: string; args: any }
    | { type: "toolResult"; toolCallId: string; toolName?: string; text: string; isError: boolean };

  export interface Message {
    id: string;
    role: "user" | "assistant" | "toolResult" | "system";
    blocks: Block[];
    timestamp?: number;
    isError?: boolean;
  }

  export interface PiState {
    isReady: boolean;
    messages: Message[];
    isStreaming: boolean;
    model: ModelInfo | null;
    error: string | null;
    connectionError: string | null;
    cwd: string | null;
  }

  export interface PiActions {
    sendPrompt: (text: string) => void;
    abort: () => void;
  }

  export function usePi(): PiState & PiActions;

  export type IconKey =
    | "Send" | "Plus" | "X" | "Chevron" | "Down" | "Check" | "Sparkle"
    | "Drag" | "File" | "Folder" | "Branch" | "Terminal" | "Wrench"
    | "Settings" | "History";

  export const Icon: Record<IconKey, ComponentType<SVGProps<SVGSVGElement>>>;

  export type PresenceState = "idle" | "thinking" | "ready";

  export function PresenceDot(props: {
    state?: PresenceState;
    size?: number;
  }): JSX.Element;

  export function StatusPill(props: {
    state?: PresenceState;
    children: ReactNode;
  }): JSX.Element;
}
