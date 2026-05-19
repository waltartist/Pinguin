// direction-amber.jsx
// Variant B — "Amber Glow"
// Honey/amber accent, soft radial glows, expressive agent presence,
// warmer-tinted surfaces, generous radii.

const amber = {
  name: 'Amber Glow',
  desc: 'Honey · radial glow · agent feels alive',
  bg: '#0a0a0a',
  bg2: '#0c0b0a',          // warmer near-black
  surface: '#161412',
  surfaceHi: '#1f1c18',
  surfaceSink: '#0a0908',
  border: 'rgba(255,235,200,0.07)',
  borderHi: 'rgba(255,225,180,0.14)',
  text: 'rgba(255,250,240,0.95)',
  textMuted: 'rgba(255,245,225,0.58)',
  textDim: 'rgba(255,235,205,0.32)',
  accent: 'oklch(0.82 0.14 78)',
  accentHi: 'oklch(0.88 0.13 75)',
  accentSoft: 'oklch(0.82 0.14 78 / 0.16)',
  accentBorder: 'oklch(0.82 0.14 78 / 0.40)',
  accentText: 'oklch(0.92 0.10 80)',
  accentGlow: 'oklch(0.82 0.14 78 / 0.35)',
  success: 'oklch(0.82 0.12 150)',
  warn: 'oklch(0.86 0.14 60)',
  radius: 12,
  radiusLg: 18,
  radiusSm: 8,
};

// inject amber-specific keyframes
if (!document.getElementById('amber-anim')) {
  const s = document.createElement('style');
  s.id = 'amber-anim';
  s.textContent = `
    @keyframes amberAurora {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.55; }
      50%      { transform: translate(20px, -10px) scale(1.15); opacity: 0.75; }
    }
    @keyframes amberShimmer {
      0%   { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    @keyframes amberDot {
      0%, 100% { transform: scale(1); opacity: 0.4; }
      50%      { transform: scale(1.3); opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}

// ---------------- shell pieces ----------------

const AmberTitleBar = ({ t }) => (
  <div style={{
    height: 40, display: 'flex', alignItems: 'center', padding: '0 14px',
    borderBottom: `1px solid ${t.border}`, gap: 12,
    background: `linear-gradient(180deg, ${t.surface} 0%, ${t.bg2} 100%)`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 18, height: 18, borderRadius: 5,
        background: `radial-gradient(circle at 30% 30%, ${t.accentHi}, ${t.accent})`,
        boxShadow: `0 0 12px ${t.accentGlow}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#1a1208', fontSize: 11, fontWeight: 700,
      }}>π</div>
      <span style={{ fontSize: 13, color: t.text, fontWeight: 500, letterSpacing: -0.1 }}>Pi</span>
      <span style={{ fontSize: 12, color: t.textDim }}>·</span>
      <span style={{ fontSize: 12, color: t.textMuted, fontFamily: '"IBM Plex Mono", monospace' }}>git-status extension</span>
    </div>
    <div style={{ flex: 1 }}/>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 10px', borderRadius: 999,
      background: t.accentSoft, border: `1px solid ${t.accentBorder}`,
      fontSize: 11, color: t.accentText,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: t.accent,
        boxShadow: `0 0 6px ${t.accent}`, animation: 'amberDot 1.4s infinite',
      }}/>
      <span>composing reply</span>
    </div>
  </div>
);

const AmberUserMsg = ({ t, text }) => (
  <div style={{ alignSelf: 'flex-end', maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
    <div style={{ fontSize: 10.5, color: t.textDim, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: 0.6 }}>you</div>
    <div style={{
      background: `linear-gradient(180deg, ${t.surfaceHi}, ${t.surface})`,
      border: `1px solid ${t.borderHi}`,
      borderRadius: t.radiusLg, padding: '12px 16px',
      fontSize: 14, lineHeight: 1.55, color: t.text,
    }}>{text}</div>
  </div>
);

const AmberToolCall = ({ t, block }) => {
  const isRun = block.state === 'running';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: t.radius,
      background: t.surfaceSink, border: `1px solid ${t.border}`,
      position: 'relative', overflow: 'hidden',
    }}>
      {isRun && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(90deg, transparent, ${t.accentSoft}, transparent)`,
          backgroundSize: '200% 100%',
          animation: 'amberShimmer 2.2s linear infinite',
          pointerEvents: 'none',
        }}/>
      )}
      <span style={{
        width: 22, height: 22, borderRadius: 6, position: 'relative',
        background: isRun
          ? `radial-gradient(circle, ${t.accentSoft}, transparent 80%)`
          : t.surfaceHi,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isRun ? t.accentText : t.success,
        boxShadow: isRun ? `0 0 8px ${t.accentGlow}` : 'none',
      }}>
        {isRun
          ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent, animation: 'amberDot 1.2s infinite' }}/>
          : <Icon.Check width="12" height="12"/>}
      </span>
      <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: t.textMuted }}>{block.name}</span>
      <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: t.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'relative' }}>{block.arg}</span>
      {block.output && <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5, color: t.accentText, position: 'relative' }}>{block.output}</span>}
      {block.lines && (
        <span style={{
          padding: '1px 6px', borderRadius: 4, background: t.accentSoft,
          color: t.accentText, fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace',
          position: 'relative',
        }}>+{block.lines}</span>
      )}
    </div>
  );
};

const AmberAssistantMsg = ({ t, msg }) => (
  <div style={{ alignSelf: 'flex-start', maxWidth: '92%', display: 'flex', gap: 12 }}>
    <div style={{
      width: 22, height: 22, borderRadius: 7, marginTop: 4, flexShrink: 0,
      background: `radial-gradient(circle at 30% 30%, ${t.accentHi}, ${t.accent})`,
      boxShadow: msg.streaming ? `0 0 14px ${t.accentGlow}` : `0 0 6px ${t.accentSoft}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#1a1208', fontSize: 12, fontWeight: 700,
      animation: msg.streaming ? 'amberDot 1.6s ease-in-out infinite' : 'none',
    }}>π</div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 10.5, color: t.textDim, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: 0.6 }}>
        Pi {msg.streaming && <span style={{ color: t.accentText, marginLeft: 6 }}>· streaming</span>}
      </div>
      {msg.thinking && !msg.streaming && (
        <div style={{
          padding: '8px 12px', borderRadius: t.radius,
          background: t.surfaceSink, border: `1px solid ${t.border}`,
          fontSize: 12, color: t.textMuted, fontStyle: 'italic',
          borderLeft: `2px solid ${t.accentBorder}`,
        }}>
          <span style={{ color: t.textDim, fontFamily: '"IBM Plex Mono", monospace', fontStyle: 'normal' }}>thought · 4s · </span>
          {msg.thinking}
        </div>
      )}
      {msg.blocks.map((b, i) =>
        b.kind === 'text'
          ? <div key={i} style={{ fontSize: 14, lineHeight: 1.65, color: t.text }}>
              {b.text}
              {msg.streaming && i === msg.blocks.length - 2 && (
                <span style={{
                  display: 'inline-block', width: 8, height: 14, marginLeft: 3, verticalAlign: -2,
                  background: t.accent, boxShadow: `0 0 6px ${t.accent}`,
                  animation: 'piCaret 1s infinite',
                }}/>
              )}
            </div>
          : <AmberToolCall key={i} t={t} block={b} />
      )}
    </div>
  </div>
);

const AmberComposer = ({ t }) => (
  <div style={{ padding: '14px 24px 18px' }}>
    <div style={{
      background: t.surface,
      border: `1px solid ${t.borderHi}`,
      borderRadius: t.radiusLg, padding: '12px 14px 10px',
      boxShadow: `0 0 0 4px ${t.accentSoft}, 0 8px 32px rgba(0,0,0,0.4)`,
      position: 'relative',
    }}>
      <div style={{ fontSize: 14, color: t.text, minHeight: 22, lineHeight: 1.5 }}>
        Make the panel collapsible
        <span style={{ display: 'inline-block', width: 2, height: 16, background: t.accent, marginLeft: 2, verticalAlign: -2, animation: 'piCaret 1s infinite', boxShadow: `0 0 4px ${t.accent}` }}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={amberChip(t)}><Icon.Plus width="11" height="11"/> attach</button>
          <button style={amberChip(t, true)}>claude-haiku-4-5 <Icon.Down width="10" height="10"/></button>
          <button style={amberChip(t)}>thinking · medium</button>
        </div>
        <button style={{
          height: 30, padding: '0 14px', borderRadius: 999, border: 'none',
          background: `linear-gradient(180deg, ${t.accentHi}, ${t.accent})`,
          color: '#1a1208', fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontSize: 12.5, fontFamily: 'inherit',
          boxShadow: `0 0 12px ${t.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
        }}>send <Icon.Send width="11" height="11"/></button>
      </div>
    </div>
  </div>
);

const amberChip = (t, hot) => ({
  height: 24, padding: '0 10px', borderRadius: 999,
  background: hot ? t.accentSoft : 'transparent',
  border: hot ? `1px solid ${t.accentBorder}` : `1px solid ${t.border}`,
  color: hot ? t.accentText : t.textMuted, fontSize: 11, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontFamily: '"IBM Plex Mono", monospace',
});

const AmberStatusBar = ({ t }) => (
  <div style={{
    height: 30, borderTop: `1px solid ${t.border}`, background: t.bg2,
    display: 'flex', alignItems: 'center', padding: '0 14px', gap: 14,
    fontSize: 11, color: t.textMuted, fontFamily: '"IBM Plex Mono", monospace',
  }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.accentText }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent, boxShadow: `0 0 6px ${t.accent}` }}/>
      pi.ready
    </span>
    <span style={{ color: t.textDim }}>·</span>
    <span><Icon.Branch width="10" height="10" style={{ verticalAlign: -1 }}/> feat/extension-host</span>
    <span style={{ color: t.textDim }}>·</span>
    <span>2 ext loaded</span>
    <span style={{ flex: 1 }}/>
    <span style={{ color: t.textDim }}>2.4k / 200k tok</span>
  </div>
);

// ---------------- floating panels (two of them — dockable) ----------------

const AmberGitPanel = ({ t }) => (
  <div style={{
    position: 'absolute', right: 28, top: 90, width: 280,
    background: `linear-gradient(180deg, ${t.surfaceHi}, ${t.surface})`,
    border: `1px solid ${t.borderHi}`,
    borderRadius: t.radiusLg,
    boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,180,80,0.04), 0 0 40px ${t.accentSoft}`,
    overflow: 'hidden',
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 12px', borderBottom: `1px solid ${t.border}`,
      fontSize: 12, color: t.textMuted,
    }}>
      <Icon.Drag width="12" height="12" style={{ opacity: 0.5, cursor: 'grab' }}/>
      <Icon.Branch width="12" height="12" style={{ color: t.accentText }}/>
      <span style={{ flex: 1, color: t.text, fontWeight: 500 }}>git status</span>
      <span style={{
        padding: '1px 6px', borderRadius: 4, background: t.accentSoft,
        color: t.accentText, fontSize: 9.5, fontFamily: '"IBM Plex Mono", monospace',
        letterSpacing: 0.4, textTransform: 'uppercase',
      }}>ext</span>
      <Icon.Pin width="11" height="11" style={{ opacity: 0.5 }}/>
    </div>
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 10, color: t.textDim, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>branch</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, color: t.text, fontFamily: '"IBM Plex Mono", monospace' }}>feat/extension-host</span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <span style={{ padding: '2px 7px', borderRadius: 5, background: t.accentSoft, color: t.accentText, fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}>↑ 2 ahead</span>
          <span style={{ padding: '2px 7px', borderRadius: 5, background: t.surfaceSink, color: t.textDim, fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}>↓ 0 behind</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: t.textDim, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>changes · 3</div>
        <div style={{ fontSize: 12, fontFamily: '"IBM Plex Mono", monospace', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: t.success, width: 12 }}>M</span>
            <span style={{ color: t.text, flex: 1 }}>App.tsx</span>
            <span style={{ color: t.textDim }}>+12 −4</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: t.warn, width: 12 }}>?</span>
            <span style={{ color: t.text, flex: 1 }}>Panel.tsx</span>
            <span style={{ color: t.textDim }}>new</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: t.accentText, width: 12 }}>A</span>
            <span style={{ color: t.text, flex: 1 }}>git-status.tsx</span>
            <span style={{ color: t.textDim }}>+47</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AmberTodoPanel = ({ t }) => (
  <div style={{
    position: 'absolute', right: 28, bottom: 130, width: 280,
    background: `linear-gradient(180deg, ${t.surfaceHi}, ${t.surface})`,
    border: `1px solid ${t.borderHi}`,
    borderRadius: t.radiusLg,
    boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 30px ${t.accentSoft}`,
    overflow: 'hidden',
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 12px', borderBottom: `1px solid ${t.border}`,
      fontSize: 12, color: t.textMuted,
    }}>
      <Icon.Drag width="12" height="12" style={{ opacity: 0.5 }}/>
      <Icon.Check width="12" height="12" style={{ color: t.accentText }}/>
      <span style={{ flex: 1, color: t.text, fontWeight: 500 }}>session todos</span>
      <span style={{ fontSize: 10.5, color: t.textDim, fontFamily: '"IBM Plex Mono", monospace' }}>2 / 4</span>
    </div>
    <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {[
        { t: 'write git-status.tsx', done: true },
        { t: 'wire esbuild watcher', done: true },
        { t: 'make panel collapsible', done: false, active: true },
        { t: 'add last-commit row', done: false },
      ].map((row, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '6px 4px',
          borderRadius: 6,
          background: row.active ? t.accentSoft : 'transparent',
        }}>
          <span style={{
            width: 14, height: 14, borderRadius: 4,
            background: row.done ? t.accent : 'transparent',
            border: `1px solid ${row.done ? t.accent : t.borderHi}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#1a1208',
          }}>{row.done && <Icon.Check width="10" height="10"/>}</span>
          <span style={{
            fontSize: 12.5,
            color: row.done ? t.textDim : t.text,
            textDecoration: row.done ? 'line-through' : 'none',
            flex: 1,
          }}>{row.t}</span>
          {row.active && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent, animation: 'amberDot 1.2s infinite' }}/>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ---------------- the shell ----------------

const AmberShell = ({ t }) => (
  <div style={{
    width: 920, height: 640, background: t.bg,
    borderRadius: t.radiusLg, overflow: 'hidden',
    border: `1px solid ${t.borderHi}`,
    boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px ${t.border}`,
    display: 'flex', flexDirection: 'column',
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    color: t.text, position: 'relative',
  }}>
    {/* aurora backdrop — subtle radial gradient behind chat */}
    <div style={{
      position: 'absolute', top: 80, left: -100, width: 400, height: 400,
      background: `radial-gradient(circle, ${t.accentSoft}, transparent 70%)`,
      animation: 'amberAurora 12s ease-in-out infinite',
      pointerEvents: 'none', filter: 'blur(20px)',
    }}/>
    <AmberTitleBar t={t}/>
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{
        flex: 1, overflow: 'hidden',
        padding: '20px 24px 12px', display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {MOCK_MESSAGES.map((m, i) =>
          m.role === 'user'
            ? <AmberUserMsg key={i} t={t} text={m.text}/>
            : <AmberAssistantMsg key={i} t={t} msg={m}/>
        )}
      </div>
      <AmberComposer t={t}/>
    </div>
    <AmberStatusBar t={t}/>
    <AmberGitPanel t={t}/>
    <AmberTodoPanel t={t}/>
  </div>
);

// ---------------- component library ----------------

const ALibSection = ({ title, children, t }) => (
  <div>
    <div style={{
      fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
      color: t.textDim, marginBottom: 10, fontFamily: '"IBM Plex Mono", monospace',
    }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
  </div>
);

const aBtnPrimary = (t) => ({
  height: 32, padding: '0 14px', borderRadius: 999, border: 'none',
  background: `linear-gradient(180deg, ${t.accentHi}, ${t.accent})`,
  color: '#1a1208', fontWeight: 600, fontSize: 12.5, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
  boxShadow: `0 0 12px ${t.accentGlow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
});
const aBtnSecondary = (t) => ({
  height: 32, padding: '0 14px', borderRadius: 999,
  background: t.surfaceHi, color: t.text, fontWeight: 500,
  fontSize: 12.5, cursor: 'pointer',
  border: `1px solid ${t.borderHi}`,
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
});
const aBtnGhost = (t) => ({
  height: 32, padding: '0 14px', borderRadius: 999,
  background: 'transparent', color: t.textMuted, fontWeight: 500,
  fontSize: 12.5, cursor: 'pointer',
  border: `1px solid ${t.border}`,
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
});

const AToggle = ({ t, on }) => (
  <div style={{
    width: 36, height: 20, borderRadius: 999,
    background: on
      ? `linear-gradient(90deg, ${t.accent}, ${t.accentHi})`
      : t.surfaceHi,
    border: `1px solid ${on ? t.accentBorder : t.borderHi}`,
    position: 'relative', cursor: 'pointer', transition: 'all .2s',
    boxShadow: on ? `0 0 10px ${t.accentGlow}` : 'none',
  }}>
    <span style={{
      position: 'absolute', top: 1, left: on ? 17 : 1,
      width: 16, height: 16, borderRadius: '50%',
      background: on ? '#1a1208' : '#fff',
      transition: 'left .2s',
    }}/>
  </div>
);

const ACheckbox = ({ t, on, label }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: t.text, cursor: 'pointer' }}>
    <span style={{
      width: 16, height: 16, borderRadius: 5,
      background: on ? t.accent : 'transparent',
      border: `1px solid ${on ? t.accent : t.borderHi}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: '#1a1208',
      boxShadow: on ? `0 0 8px ${t.accentSoft}` : 'none',
    }}>{on && <Icon.Check width="11" height="11"/>}</span>
    {label}
  </label>
);

const ASlider = ({ t, value }) => (
  <div style={{ height: 6, background: t.surfaceHi, borderRadius: 999, position: 'relative' }}>
    <div style={{
      position: 'absolute', left: 0, top: 0, height: '100%', width: `${value*100}%`,
      background: `linear-gradient(90deg, ${t.accent}, ${t.accentHi})`,
      borderRadius: 999, boxShadow: `0 0 10px ${t.accentGlow}`,
    }}/>
    <div style={{
      position: 'absolute', left: `calc(${value*100}% - 8px)`, top: -5,
      width: 16, height: 16, borderRadius: '50%', background: '#fff',
      boxShadow: `0 2px 8px rgba(0,0,0,0.6), 0 0 0 3px ${t.accentSoft}`,
    }}/>
  </div>
);

const ABadge = ({ t, tone = 'accent', children }) => {
  const map = {
    accent:  [t.accentSoft, t.accentText, t.accentBorder, `0 0 8px ${t.accentSoft}`],
    success: ['oklch(0.82 0.12 150 / 0.16)', 'oklch(0.90 0.10 150)', 'oklch(0.82 0.12 150 / 0.35)', 'none'],
    warn:    ['oklch(0.86 0.14 60 / 0.16)', 'oklch(0.92 0.10 60)', 'oklch(0.86 0.14 60 / 0.35)', 'none'],
    danger:  ['rgba(255,110,110,0.14)', '#ffb0b0', 'rgba(255,110,110,0.35)', 'none'],
    muted:   [t.surfaceHi, t.textMuted, t.borderHi, 'none'],
  };
  const [bg, fg, br, sh] = map[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 22,
      padding: '0 10px', borderRadius: 999, fontSize: 10.5,
      background: bg, color: fg, border: `1px solid ${br}`, boxShadow: sh,
      fontFamily: '"IBM Plex Mono", monospace', letterSpacing: 0.3,
      textTransform: 'lowercase',
    }}>{children}</span>
  );
};

const AmberLibrary = ({ t }) => (
  <div style={{
    width: 460, background: 'transparent',
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    color: t.text, display: 'flex', flexDirection: 'column', gap: 22,
  }}>
    <ALibSection title="Buttons" t={t}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={aBtnPrimary(t)}>Send <Icon.Send width="11" height="11"/></button>
        <button style={aBtnSecondary(t)}>Secondary</button>
        <button style={aBtnGhost(t)}>Ghost</button>
        <button style={{...aBtnGhost(t), color: '#ffb0b0', border: '1px solid rgba(255,110,110,0.25)' }}>Stop</button>
      </div>
    </ALibSection>

    <ALibSection title="Inputs" t={t}>
      <div style={{
        background: t.surface, border: `1px solid ${t.borderHi}`,
        borderRadius: 12, padding: '0 12px', height: 36,
        display: 'flex', alignItems: 'center',
      }}>
        <input placeholder="Ask Pi anything…" style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: t.text, fontSize: 13, fontFamily: 'inherit',
        }}/>
      </div>
      <div style={{
        background: t.surface,
        border: `1px solid ${t.accentBorder}`,
        borderRadius: 12, padding: '0 12px', height: 36,
        display: 'flex', alignItems: 'center',
        boxShadow: `0 0 0 4px ${t.accentSoft}`,
      }}>
        <input defaultValue="feat/extension-host" style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: t.text, fontSize: 13, fontFamily: '"IBM Plex Mono", monospace',
        }}/>
      </div>
    </ALibSection>

    <ALibSection title="Toggles &amp; selection" t={t}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <AToggle t={t} on={true}/>
        <AToggle t={t} on={false}/>
        <ACheckbox t={t} on={true} label="auto-scroll"/>
        <ACheckbox t={t} on={false} label="show thinking"/>
      </div>
      <div style={{
        display: 'inline-flex', padding: 3, borderRadius: 999,
        background: t.surfaceSink, border: `1px solid ${t.border}`,
        gap: 2, width: 'fit-content',
      }}>
        {['Chat','Tools','Files','Logs'].map((s,i)=>(
          <button key={i} style={{
            height: 26, padding: '0 12px', borderRadius: 999,
            background: i===0 ? `linear-gradient(180deg, ${t.accentHi}, ${t.accent})` : 'transparent',
            color: i===0 ? '#1a1208' : t.textMuted, fontWeight: i===0 ? 600 : 500,
            border: 'none', fontSize: 11.5, cursor: 'pointer',
            boxShadow: i===0 ? `0 0 8px ${t.accentGlow}` : 'none',
            fontFamily: 'inherit',
          }}>{s}</button>
        ))}
      </div>
      <ASlider t={t} value={0.55}/>
    </ALibSection>

    <ALibSection title="Badges" t={t}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <ABadge t={t}>running</ABadge>
        <ABadge t={t} tone="success">done</ABadge>
        <ABadge t={t} tone="warn">stale</ABadge>
        <ABadge t={t} tone="danger">error</ABadge>
        <ABadge t={t} tone="muted">draft</ABadge>
      </div>
    </ALibSection>

    <ALibSection title="Terminal output · extension" t={t}>
      <div style={{
        background: t.surfaceSink, border: `1px solid ${t.border}`,
        borderRadius: t.radius, padding: '10px 12px',
        fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5,
        lineHeight: 1.65,
      }}>
        <div style={{ color: t.textDim }}><span style={{ color: t.accentText }}>$</span> npm run dev</div>
        <div style={{ color: t.text }}>vite v5.4.21 ready in <span style={{ color: t.accentText }}>284ms</span></div>
        <div style={{ color: t.success }}>→ Local: http://localhost:5173</div>
        <div style={{ color: t.textMuted }}>watching ~/.pi/gui-extensions/</div>
        <div style={{ color: t.text }}>
          <span style={{ color: t.accent, animation: 'piCaret 1s infinite' }}>▍</span>
        </div>
      </div>
    </ALibSection>
  </div>
);

// ---------------- artboard root ----------------

window.AmberArtboard = function AmberArtboard() {
  const t = amber;
  return (
    <div style={{
      width: 1480, height: 760, padding: '40px',
      background: t.bg2, color: t.text,
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      display: 'flex', gap: 40, position: 'relative', overflow: 'hidden',
    }}>
      {/* big background aurora */}
      <div style={{
        position: 'absolute', top: -100, right: -100, width: 600, height: 600,
        background: `radial-gradient(circle, ${t.accentSoft}, transparent 60%)`,
        animation: 'amberAurora 14s ease-in-out infinite',
        pointerEvents: 'none', filter: 'blur(40px)',
      }}/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: t.accentText, fontFamily: '"IBM Plex Mono", monospace' }}>Direction B</div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6 }}>Amber Glow</div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>{t.desc}</div>
        </div>
        <AmberShell t={t}/>
      </div>
      <div style={{ position: 'relative' }}><AmberLibrary t={t}/></div>
    </div>
  );
};
