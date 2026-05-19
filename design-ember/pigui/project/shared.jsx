// Shared primitives, mock data, and tiny icon set for all three directions.
// Each direction component receives `t` (tokens object) and renders its own
// chrome around these shared pieces.

// ---------- Tiny inline icons (geometric, monoline, currentColor) ----------
const Icon = {
  Send: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 13V3M8 3l-4 4M8 3l4 4" />
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  ),
  X: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  ),
  Chevron: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  ),
  Down: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  ),
  Sparkle: (p) => (
    <svg viewBox="0 0 16 16" fill="currentColor" {...p}>
      <path d="M8 1.5l1.4 4.2 4.1 1.3-4.1 1.3L8 12.5 6.6 8.3 2.5 7l4.1-1.3z"/>
    </svg>
  ),
  Drag: (p) => (
    <svg viewBox="0 0 16 16" fill="currentColor" {...p}>
      <circle cx="6" cy="4" r="1"/><circle cx="10" cy="4" r="1"/>
      <circle cx="6" cy="8" r="1"/><circle cx="10" cy="8" r="1"/>
      <circle cx="6" cy="12" r="1"/><circle cx="10" cy="12" r="1"/>
    </svg>
  ),
  File: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" {...p}>
      <path d="M3 2h6l4 4v8H3z"/><path d="M9 2v4h4"/>
    </svg>
  ),
  Folder: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" {...p}>
      <path d="M2 4h4l1.5 1.5H14V13H2z"/>
    </svg>
  ),
  Branch: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" {...p}>
      <circle cx="4" cy="3.5" r="1.5"/><circle cx="4" cy="12.5" r="1.5"/><circle cx="12" cy="6" r="1.5"/>
      <path d="M4 5v6M4 8c0-2 2-2.5 4-2.5h2"/>
    </svg>
  ),
  Terminal: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="3" width="12" height="10" rx="1.5"/>
      <path d="M5 7l2 1.5L5 10M9 10.5h2.5"/>
    </svg>
  ),
  Wrench: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M11.5 2a3 3 0 00-2.6 4.5L2.5 12.9a1 1 0 001.4 1.4l6.4-6.4A3 3 0 1011.5 2z"/>
    </svg>
  ),
  Pin: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M10 2l4 4-2 1-3 3-1 4-1.5-1.5L2 8l4-1 3-3z"/>
    </svg>
  ),
  Settings: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="8" cy="8" r="2"/>
      <path d="M8 1.5v1.7M8 12.8v1.7M14.5 8h-1.7M3.2 8H1.5M12.6 3.4l-1.2 1.2M4.6 11.4l-1.2 1.2M12.6 12.6l-1.2-1.2M4.6 4.6L3.4 3.4"/>
    </svg>
  ),
  History: (p) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2 8a6 6 0 106-6c-1.8 0-3.4.8-4.5 2"/>
      <path d="M1.5 1.5V4H4M8 5v3l2 1.5"/>
    </svg>
  ),
};
window.Icon = Icon;

// ---------- Mock conversation: building a git-status extension ----------
window.MOCK_MESSAGES = [
  {
    role: 'user',
    text: 'Build me a panel that shows the current git branch, ahead/behind counts, and any uncommitted files. Pin it to the bottom-right.',
  },
  {
    role: 'assistant',
    thinking: "I'll write a small extension that shells out to git and polls every few seconds. The user wants it pinned bottom-right, so I'll set anchor on the panel manifest.",
    blocks: [
      { kind: 'text', text: 'On it. I\'ll create a `git-status.tsx` extension that polls `git status --porcelain` and renders the branch state.' },
      { kind: 'tool', name: 'write_file', arg: '~/.pi/gui-extensions/git-status.tsx', state: 'done', lines: 47, summary: 'Created git-status.tsx' },
      { kind: 'tool', name: 'bash', arg: 'git rev-parse --abbrev-ref HEAD', state: 'done', output: 'feat/extension-host' },
      { kind: 'tool', name: 'bash', arg: 'git status --porcelain | wc -l', state: 'done', output: '3' },
      { kind: 'text', text: 'Pinned bottom-right. It refreshes every 4s — drag the title bar to move it, or close from the kebab menu.' },
    ],
  },
  {
    role: 'user',
    text: 'Nice. Can you also show the last commit message?',
  },
  {
    role: 'assistant',
    streaming: true,
    blocks: [
      { kind: 'text', text: 'Adding it now — one more line under the branch row.' },
      { kind: 'tool', name: 'edit_file', arg: 'git-status.tsx', state: 'running', summary: 'Patching render()…' },
    ],
  },
];

// ---------- Striped placeholder for "drop an image here" surfaces ----------
window.Placeholder = ({ label, width = '100%', height = 120, style }) => (
  <div style={{
    width, height,
    background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 8px, transparent 8px 16px)',
    border: '1px dashed rgba(255,255,255,0.12)',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: '"IBM Plex Mono", monospace', fontSize: 11,
    color: 'rgba(255,255,255,0.4)', letterSpacing: 0.3,
    ...style,
  }}>{label}</div>
);

// ---------- Pulsing presence dot ----------
window.PresenceDot = ({ color, size = 8, state = 'thinking' }) => {
  // 'idle' | 'thinking' | 'ready'
  const opacity = state === 'idle' ? 0.35 : 1;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', position: 'relative', width: size, height: size }}>
      {state === 'thinking' && (
        <span style={{
          position: 'absolute', inset: -3,
          borderRadius: '50%',
          background: color,
          opacity: 0.3,
          animation: 'piPulse 1.6s ease-in-out infinite',
        }} />
      )}
      <span style={{
        width: size, height: size, borderRadius: '50%',
        background: color, opacity,
        boxShadow: state === 'thinking' ? `0 0 8px ${color}` : 'none',
      }} />
    </span>
  );
};

// ---------- Inject shared keyframes once ----------
if (!document.getElementById('pi-shared-anim')) {
  const s = document.createElement('style');
  s.id = 'pi-shared-anim';
  s.textContent = `
    @keyframes piPulse {
      0%, 100% { transform: scale(0.9); opacity: 0.35; }
      50%      { transform: scale(1.4); opacity: 0; }
    }
    @keyframes piCaret {
      0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; }
    }
    @keyframes piShimmer {
      0% { background-position: -200px 0; }
      100% { background-position: 200px 0; }
    }
    @keyframes piRise {
      from { transform: translateY(4px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}
