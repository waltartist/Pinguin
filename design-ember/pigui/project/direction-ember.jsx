// direction-ember.jsx
// Variant A — "Ember"
// Coral accent, single elevation tier, Raycast/Vercel-clean.

const ember = {
  name: 'Ember',
  desc: 'Orange · soft elevation · the quiet one',
  bg: '#0a0a0a',
  bg2: '#0f0f10',
  surface: '#141416',
  surfaceHi: '#1c1c1f',
  surfaceSink: '#070708',
  border: 'rgba(255,255,255,0.06)',
  borderHi: 'rgba(255,255,255,0.10)',
  text: 'rgba(255,255,255,0.94)',
  textMuted: 'rgba(255,255,255,0.58)',
  textDim: 'rgba(255,255,255,0.34)',
  accent: 'oklch(0.75 0.17 55)', // orange
  accentSoft: 'oklch(0.75 0.17 55 / 0.14)',
  accentBorder: 'oklch(0.75 0.17 55 / 0.35)',
  accentText: 'oklch(0.86 0.14 60)',
  success: 'oklch(0.78 0.13 150)',
  warn: 'oklch(0.82 0.14 85)',
  radius: 10,
  radiusLg: 14,
  radiusSm: 6
};

// ---------------- shell pieces ----------------

const EmberTitleBar = ({ t }) =>
<div style={{
  height: 36, display: 'flex', alignItems: 'center', padding: '0 12px',
  borderBottom: `1px solid ${t.border}`, background: t.bg, gap: 12,
  WebkitAppRegion: 'drag'
}}>
    <div style={{ display: 'flex', gap: 6 }}>
      {['#ff5f57', '#febc2e', '#28c840'].map((c, i) =>
    <span key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c, opacity: 0.85 }} />
    )}
    </div>
    <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: t.textMuted, letterSpacing: 0.2 }}>
      pi-gui · <span style={{ color: t.textDim }}>~/Projects/pi-gui</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.textMuted }}>
      <PresenceDot color={t.accent} size={6} state="thinking" />
      <span>pi · thinking</span>
    </div>
  </div>;


const EmberRail = ({ t }) => {
  const items = [
  { i: <Icon.Plus width="14" height="14" />, active: false, label: 'new' },
  { i: <Icon.History width="14" height="14" />, active: true, label: 'sessions' },
  { i: <Icon.Wrench width="14" height="14" />, active: false, label: 'extensions' },
  { i: <Icon.Settings width="14" height="14" />, active: false, label: 'settings' }];

  return (
    <div style={{
      width: 48, borderRight: `1px solid ${t.border}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 10, gap: 4, background: t.bg
    }}>
      {items.map((it, i) =>
      <button key={i} style={{
        width: 32, height: 32, borderRadius: 8,
        background: it.active ? t.surfaceHi : 'transparent',
        color: it.active ? t.text : t.textMuted,
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>{it.i}</button>
      )}
    </div>);

};

const EmberUserMsg = ({ t, text }) =>
<div style={{ alignSelf: 'flex-end', maxWidth: '78%' }}>
    <div style={{
    background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: t.radiusLg, padding: '10px 14px',
    fontSize: 13.5, lineHeight: 1.55, color: t.text
  }}>{text}</div>
    <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 4, textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace' }}>you · 2m ago</div>
  </div>;


const EmberToolCall = ({ t, block }) => {
  const isRun = block.state === 'running';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: t.radius,
      background: t.surfaceSink, border: `1px solid ${t.border}`,
      fontFamily: '"IBM Plex Mono", monospace', fontSize: 12
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 5, background: isRun ? t.accentSoft : t.surfaceHi,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isRun ? t.accentText : t.success
      }}>
        {isRun ?
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent, animation: 'piPulse 1.2s infinite' }} /> :
        <Icon.Check width="11" height="11" />}
      </span>
      <span style={{ color: t.textMuted }}>{block.name}</span>
      <span style={{ color: t.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block.arg}</span>
      {block.output && <span style={{ color: t.accentText }}>→ {block.output}</span>}
      {block.lines && <span style={{ color: t.textDim, fontSize: 11 }}>+{block.lines} lines</span>}
    </div>);

};

const EmberAssistantMsg = ({ t, msg }) =>
<div style={{ alignSelf: 'flex-start', maxWidth: '92%', display: 'flex', gap: 10 }}>
    <div style={{ marginTop: 2 }}>
      <PresenceDot color={t.accent} size={8} state={msg.streaming ? 'thinking' : 'idle'} />
    </div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {msg.thinking && !msg.streaming &&
    <details style={{ fontSize: 12, color: t.textDim }}>
          <summary style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, color: t.textMuted }}>
            <Icon.Chevron width="10" height="10" /> thinking · 4s
          </summary>
        </details>
    }
      {msg.blocks.map((b, i) =>
    b.kind === 'text' ?
    <div key={i} style={{ fontSize: 13.5, lineHeight: 1.6, color: t.text }}>
              {b.text}
              {msg.streaming && i === msg.blocks.length - 2 &&
      <span style={{ display: 'inline-block', width: 6, height: 14, background: t.accent, marginLeft: 2, verticalAlign: -2, animation: 'piCaret 1s infinite' }} />
      }
            </div> :
    <EmberToolCall key={i} t={t} block={b} />
    )}
    </div>
  </div>;


const EmberComposer = ({ t }) =>
<div style={{ padding: '12px 20px 14px', borderTop: `1px solid ${t.border}` }}>
    <div style={{
    background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: t.radiusLg, padding: '10px 12px 8px',
    transition: 'border-color .15s'
  }}>
      <div style={{ fontSize: 13.5, color: t.text, minHeight: 20, lineHeight: 1.5 }}>
        Make the panel collapsible
        <span style={{ display: 'inline-block', width: 1.5, height: 14, background: t.text, marginLeft: 1, verticalAlign: -2, animation: 'piCaret 1s infinite' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={emberChip(t)}><Icon.Plus width="11" height="11" /> attach</button>
          <button style={emberChip(t)}>claude-haiku-4-5</button>
          <button style={emberChip(t)}>thinking · medium</button>
        </div>
        <button style={{
        height: 28, padding: '0 12px', borderRadius: 8, border: 'none',
        background: t.accent, color: '#1a0c08', fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        fontSize: 12.5
      }}>send <Icon.Send width="11" height="11" /></button>
      </div>
    </div>
  </div>;


const emberChip = (t) => ({
  height: 22, padding: '0 8px', borderRadius: 6,
  background: 'transparent', border: `1px solid ${t.border}`,
  color: t.textMuted, fontSize: 11, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontFamily: '"IBM Plex Mono", monospace'
});

const EmberStatusBar = ({ t }) =>
<div style={{
  height: 26, borderTop: `1px solid ${t.border}`, background: t.bg,
  display: 'flex', alignItems: 'center', padding: '0 12px', gap: 16,
  fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5, color: t.textMuted
}}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <PresenceDot color={t.success} size={6} state="ready" /> connected
    </span>
    <span>·</span>
    <span><Icon.Branch width="10" height="10" style={{ verticalAlign: -1 }} /> feat/extension-host</span>
    <span>·</span>
    <span>4 messages</span>
    <span style={{ flex: 1 }} />
    <span style={{ color: t.textDim }}>tokens 2.4k / 200k</span>
    <span style={{ color: t.textDim }}>·</span>
    <span style={{ color: t.textDim }}>$0.018</span>
  </div>;


// ---------------- floating extension panel ----------------

const EmberGitPanel = ({ t }) =>
<div style={{
  position: 'absolute', right: 24, bottom: 168, width: 280,
  background: t.surface, border: `1px solid ${t.borderHi}`,
  borderRadius: t.radiusLg,
  boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.3)',
  overflow: 'hidden', animation: 'piRise .4s ease-out'
}}>
    <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 10px', borderBottom: `1px solid ${t.border}`,
    background: t.surfaceHi, fontSize: 11.5, color: t.textMuted
  }}>
      <Icon.Drag width="12" height="12" style={{ opacity: 0.5, cursor: 'grab' }} />
      <Icon.Branch width="11" height="11" />
      <span style={{ flex: 1, color: t.text, fontWeight: 500 }}>git status</span>
      <span style={{ color: t.textDim, fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}>ext</span>
      <Icon.X width="10" height="10" style={{ opacity: 0.5 }} />
    </div>
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 10.5, color: t.textDim, fontFamily: '"IBM Plex Mono", monospace', marginBottom: 4 }}>BRANCH</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: t.text, fontFamily: '"IBM Plex Mono", monospace' }}>feat/extension-host</span>
          <span style={{
          padding: '1px 6px', borderRadius: 4, background: t.accentSoft, color: t.accentText,
          fontSize: 10, fontFamily: '"IBM Plex Mono", monospace'
        }}>↑2 ↓0</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10.5, color: t.textDim, fontFamily: '"IBM Plex Mono", monospace', marginBottom: 4 }}>CHANGES · 3</div>
        <div style={{ fontSize: 12, fontFamily: '"IBM Plex Mono", monospace', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ color: t.success }}><span style={{ width: 14, display: 'inline-block' }}>M</span>src/webview/App.tsx</div>
          <div style={{ color: t.warn }}><span style={{ width: 14, display: 'inline-block' }}>?</span>src/webview/Panel.tsx</div>
          <div style={{ color: t.accentText }}><span style={{ width: 14, display: 'inline-block' }}>A</span>extensions/git-status.tsx</div>
        </div>
      </div>
      <div style={{
      padding: '6px 8px', borderRadius: 6, background: t.surfaceSink,
      fontSize: 11, color: t.textMuted, fontFamily: '"IBM Plex Mono", monospace',
      borderLeft: `2px solid ${t.accentBorder}`
    }}>last: <span style={{ color: t.text }}>add esbuild extension watcher</span></div>
    </div>
  </div>;


// ---------------- the shell ----------------

const EmberShell = ({ t }) =>
<div style={{
  width: 920, height: 640, background: t.bg2,
  borderRadius: t.radiusLg, overflow: 'hidden',
  border: `1px solid ${t.border}`,
  display: 'flex', flexDirection: 'column',
  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  color: t.text, position: 'relative'
}}>
    <EmberTitleBar t={t} />
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <EmberRail t={t} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '24px 28px 14px' }}>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: -0.3 }}>git-status extension</div>
          <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 2 }}>session · started 11 min ago</div>
        </div>
        <div style={{
        flex: 1, overflow: 'hidden',
        padding: '4px 28px 16px', display: 'flex', flexDirection: 'column', gap: 16
      }}>
          {MOCK_MESSAGES.map((m, i) =>
        m.role === 'user' ?
        <EmberUserMsg key={i} t={t} text={m.text} /> :
        <EmberAssistantMsg key={i} t={t} msg={m} />
        )}
        </div>
        <EmberComposer t={t} />
      </div>
    </div>
    <EmberStatusBar t={t} />
    <EmberGitPanel t={t} />
  </div>;


// ---------------- component library ----------------

const EmberLibrary = ({ t }) =>
<div style={{
  width: 460, background: 'transparent',
  fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
  color: t.text, display: 'flex', flexDirection: 'column', gap: 18
}}>
    <LibSection title="Buttons" t={t}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={{ ...btnPrimary(t), background: "rgb(166, 115, 115)" }}>Send <Icon.Send width="11" height="11" /></button>
        <button style={btnSecondary(t)}>Secondary</button>
        <button style={btnGhost(t)}>Ghost</button>
        <button style={btnDanger(t)}>Stop</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button style={{ ...btnSecondary(t), height: 24, fontSize: 11.5, padding: '0 8px' }}>sm</button>
        <button style={{ ...btnSecondary(t) }}>md</button>
        <button style={{ ...btnSecondary(t), height: 36, fontSize: 13.5, padding: '0 14px' }}>lg</button>
      </div>
    </LibSection>

    <LibSection title="Inputs" t={t}>
      <div style={inputBox(t)}><input placeholder="Ask Pi…" style={inputInner(t)} /></div>
      <div style={{ ...inputBox(t), borderColor: t.accentBorder, boxShadow: `0 0 0 3px ${t.accentSoft}` }}>
        <input defaultValue="feat/extension-host" style={inputInner(t)} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select style={selectBox(t)}><option>claude-haiku-4-5</option></select>
        <select style={selectBox(t)}><option>thinking · medium</option></select>
      </div>
    </LibSection>

    <LibSection title="Toggles &amp; Selection" t={t}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Toggle t={t} on={true} />
        <Toggle t={t} on={false} />
        <Checkbox t={t} on={true} label="auto-scroll" />
        <Checkbox t={t} on={false} label="show thinking" />
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        {['Chat', 'Tools', 'Files', 'Logs'].map((s, i) =>
      <button key={i} style={{
        ...btnGhost(t), height: 26,
        background: i === 0 ? t.accentSoft : 'transparent',
        color: i === 0 ? t.accentText : t.textMuted,
        border: i === 0 ? `1px solid ${t.accentBorder}` : `1px solid ${t.border}`
      }}>{s}</button>
      )}
      </div>
      <div style={{ marginTop: 12 }}>
        <Slider t={t} value={0.4} />
      </div>
    </LibSection>

    <LibSection title="Badges &amp; Status" t={t}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Badge t={t}>running</Badge>
        <Badge t={t} tone="success">done</Badge>
        <Badge t={t} tone="warn">stale</Badge>
        <Badge t={t} tone="danger">error</Badge>
        <Badge t={t} tone="muted">draft</Badge>
      </div>
    </LibSection>

    <LibSection title="Extension panel · empty state" t={t}>
      <div style={{
      background: t.surface, border: `1px dashed ${t.borderHi}`,
      borderRadius: t.radiusLg, padding: 18,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
    }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: t.accentSoft, color: t.accentText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon.Sparkle width="14" height="14" />
        </div>
        <div style={{ fontSize: 12.5, color: t.text }}>No panels yet</div>
        <div style={{ fontSize: 11.5, color: t.textMuted, textAlign: 'center', maxWidth: 240 }}>
          Ask Pi to build one — e.g. "show me my open todos in a panel".
        </div>
      </div>
    </LibSection>
  </div>;


const LibSection = ({ title, children, t }) =>
<div>
    <div style={{
    fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase',
    color: t.textDim, marginBottom: 8, fontFamily: '"IBM Plex Mono", monospace'
  }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
  </div>;


const btnPrimary = (t) => ({
  height: 30, padding: '0 12px', borderRadius: 8, border: 'none',
  background: t.accent, color: '#1a0c08', fontWeight: 600,
  fontSize: 12.5, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontFamily: 'inherit'
});
const btnSecondary = (t) => ({
  height: 30, padding: '0 12px', borderRadius: 8,
  background: t.surfaceHi, color: t.text, fontWeight: 500,
  fontSize: 12.5, cursor: 'pointer',
  border: `1px solid ${t.border}`,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontFamily: 'inherit'
});
const btnGhost = (t) => ({
  height: 30, padding: '0 12px', borderRadius: 8,
  background: 'transparent', color: t.textMuted, fontWeight: 500,
  fontSize: 12.5, cursor: 'pointer',
  border: `1px solid ${t.border}`,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontFamily: 'inherit'
});
const btnDanger = (t) => ({
  height: 30, padding: '0 12px', borderRadius: 8,
  background: 'rgba(255,100,100,0.10)', color: '#ff9a9a', fontWeight: 500,
  fontSize: 12.5, cursor: 'pointer',
  border: `1px solid rgba(255,100,100,0.25)`,
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontFamily: 'inherit'
});
const inputBox = (t) => ({
  background: t.surface, border: `1px solid ${t.border}`,
  borderRadius: 8, padding: '0 10px', height: 32,
  display: 'flex', alignItems: 'center'
});
const inputInner = (t) => ({
  flex: 1, background: 'transparent', border: 'none', outline: 'none',
  color: t.text, fontSize: 12.5, fontFamily: 'inherit'
});
const selectBox = (t) => ({
  ...inputBox(t),
  appearance: 'none', WebkitAppearance: 'none',
  paddingRight: 24, color: t.text, fontSize: 12.5, cursor: 'pointer',
  background: `${t.surface} url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='1.5'><path d='M4 6l4 4 4-4'/></svg>") no-repeat right 8px center`
});

const Toggle = ({ t, on }) =>
<div style={{
  width: 32, height: 18, borderRadius: 10,
  background: on ? t.accent : t.surfaceHi,
  border: `1px solid ${on ? t.accentBorder : t.border}`,
  position: 'relative', cursor: 'pointer', transition: 'all .15s'
}}>
    <span style={{
    position: 'absolute', top: 1, left: on ? 15 : 1,
    width: 14, height: 14, borderRadius: '50%',
    background: '#0a0a0a', transition: 'left .15s'
  }} />
  </div>;


const Checkbox = ({ t, on, label }) =>
<label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.text, cursor: 'pointer' }}>
    <span style={{
    width: 14, height: 14, borderRadius: 4,
    background: on ? t.accent : 'transparent',
    border: `1px solid ${on ? t.accent : t.borderHi}`,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: '#0a0a0a'
  }}>{on && <Icon.Check width="10" height="10" />}</span>
    {label}
  </label>;


const Slider = ({ t, value }) =>
<div style={{ height: 4, background: t.surfaceHi, borderRadius: 4, position: 'relative' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${value * 100}%`, background: t.accent, borderRadius: 4 }} />
    <div style={{
    position: 'absolute', left: `calc(${value * 100}% - 7px)`, top: -5,
    width: 14, height: 14, borderRadius: '50%', background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
  }} />
  </div>;


const Badge = ({ t, tone = 'accent', children }) => {
  const map = {
    accent: [t.accentSoft, t.accentText, t.accentBorder],
    success: ['oklch(0.78 0.13 150 / 0.14)', 'oklch(0.86 0.10 150)', 'oklch(0.78 0.13 150 / 0.30)'],
    warn: ['oklch(0.82 0.14 85 / 0.14)', 'oklch(0.90 0.10 85)', 'oklch(0.82 0.14 85 / 0.30)'],
    danger: ['rgba(255,100,100,0.12)', '#ff9a9a', 'rgba(255,100,100,0.30)'],
    muted: [t.surfaceHi, t.textMuted, t.border]
  };
  const [bg, fg, br] = map[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20,
      padding: '0 8px', borderRadius: 5, fontSize: 10.5,
      background: bg, color: fg, border: `1px solid ${br}`,
      fontFamily: '"IBM Plex Mono", monospace', letterSpacing: 0.2
    }}>{children}</span>);

};

// ---------------- artboard root ----------------

window.EmberArtboard = function EmberArtboard() {
  const t = ember;
  return (
    <div style={{
      width: 1480, height: 760, padding: '40px 40px 40px 40px',
      background: t.bg, color: t.text,
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      display: 'flex', gap: 40
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: t.textDim, fontFamily: '"IBM Plex Mono", monospace' }}>Direction A</div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6 }}>Ember</div>
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>{t.desc}</div>
        </div>
        <EmberShell t={t} />
      </div>
      <EmberLibrary t={t} />
    </div>);

};