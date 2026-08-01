// Ember design primitives — Icons + PresenceDot.
// Mirrors shared.jsx from the design handoff.
// Import these from anywhere in the webview; extensions can re-use them
// via the `pi-gui` module exposed by ExtensionHost.

import { SVGProps } from "react";

type SvgProps = SVGProps<SVGSVGElement>;

const svgBase = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Icon = {
  Send: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <path d="M8 13V3M8 3l-4 4M8 3l4 4" />
    </svg>
  ),
  Plus: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  ),
  X: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  ),
  Chevron: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  ),
  Down: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  ),
  Check: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} strokeWidth={2} {...p}>
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  ),
  Sparkle: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" fill="currentColor" {...p}>
      <path d="M8 1.5l1.4 4.2 4.1 1.3-4.1 1.3L8 12.5 6.6 8.3 2.5 7l4.1-1.3z" />
    </svg>
  ),
  Drag: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" fill="currentColor" {...p}>
      <circle cx="6" cy="4" r="1" />
      <circle cx="10" cy="4" r="1" />
      <circle cx="6" cy="8" r="1" />
      <circle cx="10" cy="8" r="1" />
      <circle cx="6" cy="12" r="1" />
      <circle cx="10" cy="12" r="1" />
    </svg>
  ),
  File: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <path d="M3 2h6l4 4v8H3z" />
      <path d="M9 2v4h4" />
    </svg>
  ),
  Folder: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <path d="M2 4h4l1.5 1.5H14V13H2z" />
    </svg>
  ),
  Branch: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <circle cx="4" cy="3.5" r="1.5" />
      <circle cx="4" cy="12.5" r="1.5" />
      <circle cx="12" cy="6" r="1.5" />
      <path d="M4 5v6M4 8c0-2 2-2.5 4-2.5h2" />
    </svg>
  ),
  Terminal: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M5 7l2 1.5L5 10M9 10.5h2.5" />
    </svg>
  ),
  Wrench: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <path d="M11.5 2a3 3 0 00-2.6 4.5L2.5 12.9a1 1 0 001.4 1.4l6.4-6.4A3 3 0 1011.5 2z" />
    </svg>
  ),
  Settings: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v1.7M8 12.8v1.7M14.5 8h-1.7M3.2 8H1.5M12.6 3.4l-1.2 1.2M4.6 11.4l-1.2 1.2M12.6 12.6l-1.2-1.2M4.6 4.6L3.4 3.4" />
    </svg>
  ),
  History: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <path d="M2 8a6 6 0 106-6c-1.8 0-3.4.8-4.5 2" />
      <path d="M1.5 1.5V4H4M8 5v3l2 1.5" />
    </svg>
  ),
  Agent: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <rect x="3.5" y="6" width="9" height="7" rx="2" />
      <circle cx="6" cy="9.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="10" cy="9.5" r="0.6" fill="currentColor" stroke="none" />
      <path d="M6 11.5h4" />
      <path d="M8 6V3.5" />
      <circle cx="8" cy="2.5" r="1" />
      <path d="M3.5 8.5H2M12.5 8.5H14" />
    </svg>
  ),
  Key: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <circle cx="5" cy="11" r="3" />
      <path d="M7 9l5.5-5.5" />
      <path d="M11 4l1.5 1.5" />
      <path d="M9.5 5.5l1.5 1.5" />
    </svg>
  ),
  Globe: (p: SvgProps) => (
    <svg viewBox="0 0 16 16" {...svgBase} {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12" />
      <path d="M8 2c2 2.5 2 9.5 0 12" />
      <path d="M8 2c-2 2.5-2 9.5 0 12" />
    </svg>
  ),
};

export type PresenceState = "idle" | "thinking" | "ready";

export function PresenceDot({
  state = "thinking",
  size = 8,
}: {
  state?: PresenceState;
  size?: number;
}) {
  return (
    <span
      className={`presence-dot presence-dot--${state}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

// Status pill — small badge with a presence dot.
export function StatusPill({
  state = "ready",
  children,
}: {
  state?: PresenceState;
  children: React.ReactNode;
}) {
  return (
    <span className="status-item">
      <PresenceDot state={state} size={6} />
      <span>{children}</span>
    </span>
  );
}
