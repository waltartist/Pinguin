// direction-forge.jsx
// Variant C — "Forge"
// Sharp orange, editorial header, mono+sans mix, denser metadata,
// 6px corners, the technical/developer-tool option.

const forge = {
  name: 'Forge',
  desc: 'Orange · editorial · technical density',
  bg: '#0a0a0a',
  bg2: '#0d0d0d',
  surface: '#121212',
  surfaceHi: '#181818',
  surfaceSink: '#080808',
  border: 'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,255,255,0.13)',
  text: 'rgba(255,255,255,0.94)',
  textMuted: 'rgba(255,255,255,0.55)',
  textDim: 'rgba(255,255,255,0.32)',
  accent: 'oklch(0.72 0.18 50)',          // hot orange
  accentSoft: 'oklch(0.72 0.18 50 / 0.14)',
  accentBorder: 'oklch(0.72 0.18 50 / 0.40)',
  accentText: 'oklch(0.85 0.14 55)',
  success: 'oklch(0.80 0.16 145)',
  warn: 'oklch(0.85 0.15 90)',
  danger: 'oklch(0.72 0.20 25)',
  radius: 6,
  radiusLg: 8,
  radiusSm: 4,
};

// ---------------- shell pieces ----------------

const ForgeTitleBar = ({ t }) => (
  <div style={{
    height: 32, display: 'flex', alignItems: 'stretch',
    borderBottom: `1px solid ${t.border}`, background: t.surfaceSink,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRight: `1px solid ${t.border}` }}>
      <div style={{
        width: 14, height: 14,
        background: t.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#0a0a0a', fontSize: 9, fontWeight: 800, fontFamily: '"IBM Plex Mono", monospace',
      }}>π</div>
      <span style={{ fontSize: 11, color: t.text, fontFamily: '"IBM Plex Mono", monospace', letterSpacing: 0.4 }}>PI-GUI</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 16, fontSize: 11, color: t.textMuted, fontFamily: '"IBM Plex Mono", monospace' }}>
      <span style={{ color: t.text }}>session</span>
      <span>extensions</span>
      <span>logs</span>
      <span>settings</span>
    </div>
    <div style={{ flex: 1 }}/>
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12, fontSize: 10.5, color: t.textDim, fontFamily: '"IBM Plex Mono", monospace' }}>
      <span>S-2a4f</span>
      <span>·</span>
      <span>haiku-4-5</span>
      <span>·</span>
      <span style={{ color: t.accentText }}>active</span>
    </div>
  </div>
);

const ForgeHeader = ({ t }) => (
  <div style={{
    padding: '20px 24px 16px',
    borderBottom: `1px solid ${t.border}`,
    display: 'flex', alignItems: 'flex-end', gap: 20,
  }}>
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: 10, color: t.textDim, letterSpacing: 1,
        fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase',
        display: 'flex', gap: 8,
      }}>
        <span>session_2a4f93</span><span>·</span><span>started 11m ago</span>
      </div>
      <div style={{
        fontSize: 22, fontWeight: 500, marginTop: 6, letterSpacing: -0.4,
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      }}>
        Build a <span style={{ color: t.accentText, fontStyle: 'italic', fontFamily: '"IBM Plex Serif", "IBM Plex Sans", serif' }}>git status</span> extension.
      </div>
    </div>
    <div style={{ display: 'flex', gap: 6, fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace' }}>
      <span style={{ padding: '3px 8px', border: `1px solid ${t.border}`, color: t.textMuted }}>4 turns</span>
      <span style={{ padding: '3px 8px', border: `1px solid ${t.border}`, color: t.textMuted }}>3 tools</span>
      <span style={{ padding: '3px 8px', border: `1px solid ${t.accentBorder}`, color: t.accentText, background: t.accentSoft }}>2.4k tok</span>
    </div>
  </div>
);

const ForgeUserMsg = ({ t, text, n }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 16, alignItems: 'baseline' }}>
    <div style={{
      fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5,
      color: t.textDim, letterSpacing: 0.5, textAlign: 'right',
      paddingTop: 2,
    }}>
      <div>USR · {String(n).padStart(2,'0')}</div>
    </div>
    <div style={{
      fontSize: 13.5, lineHeight: 1.65, color: t.text,
      paddingLeft: 14, borderLeft: `1px solid ${t.borderHi}`,
    }}>{text}</div>
  </div>
);

const ForgeToolCall = ({ t, block }) => {
  const isRun = block.state === 'running';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center',
      padding: '6px 10px',
      border: `1px solid ${t.border}`,
      borderLeft: `2px solid ${isRun ? t.accent : t.success}`,
      background: t.surfaceSink,
      fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5,
    }}>
      <span style={{
        padding: '1px 6px', fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase',
        background: isRun ? t.accentSoft : 'transparent',
        color: isRun ? t.accentText : t.success,
        border: `1px solid ${isRun ? t.accentBorder : 'rgba(120,200,140,0.3)'}`,
      }}>{isRun ? 'run' : 'ok'}</span>
      <span style={{ display: 'flex', gap: 6, overflow: 'hidden' }}>
        <span style={{ color: t.textMuted }}>{block.name}</span>
        <span style={{ color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>({block.arg})</span>
      </span>
      <span style={{ fontSize: 10.5, color: t.textDim }}>
        {block.output ? `→ ${block.output}` : block.lines ? `+${block.lines}L` : '…'}
      </span>
    </div>
  );
};

const ForgeAssistantMsg = ({ t, msg, n }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 16, alignItems: 'baseline' }}>
    <div style={{
      fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5,
      letterSpacing: 0.5, textAlign: 'right', paddingTop: 2,
      color: msg.streaming ? t.accentText : t.textDim,
    }}>
      <div>PI · {String(n).padStart(2,'0')}</div>
      {msg.streaming && <div style={{ marginTop: 2, color: t.accent }}>● live</div>}
    </div>
    <div style={{ paddingLeft: 14, borderLeft: `1px solid ${msg.streaming ? t.accentBorder : t.borderHi}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {msg.thinking && !msg.streaming && (
        <div style={{
          fontSize: 11.5, color: t.textMuted, fontStyle: 'italic',
          padding: '6px 10px', background: t.surfaceSink, border: `1px solid ${t.border}`,
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        }}>
          <span style={{ color: t.textDim, fontFamily: '"IBM Plex Mono", monospace', fontStyle: 'normal', marginRight: 6 }}>think 4s →</span>
          {msg.thinking}
        </div>
      )}
      {msg.blocks.map((b, i) =>
        b.kind === 'text'
          ? <div key={i} style={{ fontSize: 13.5, lineHeight: 1.65, color: t.text }}>
              {b.text}
              {msg.streaming && i === msg.blocks.length - 2 && (
                <span style={{ display: 'inline-block', width: 6, height: 14, background: t.accent, marginLeft: 2, verticalAlign: -2, animation: 'piCaret 1s infinite' }}/>
              )}
            </div>
          : <ForgeToolCall key={i} t={t} block={b} />
      )}
    </div>
  </div>
);

const ForgeComposer = ({ t }) => (
  <div style={{ borderTop: `1px solid ${t.border}`, padding: '12px 24px 14px' }}>
    <div style={{
      background: t.surface, border: `1px solid ${t.borderHi}`,
      borderLeft: `2px solid ${t.accent}`,
      padding: '10px 12px 8px',
    }}>
      <div style={{
        fontSize: 10, color: t.textDim, fontFamily: '"IBM Plex Mono", monospace',
        letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 6,
      }}>USR · 03 — DRAFTING</div>
      <div style={{ fontSize: 13.5, color: t.text, minHeight: 20, lineHeight: 1.55 }}>
        Make the panel collapsible
        <span style={{ display: 'inline-block', width: 6, height: 14, background: t.accent, marginLeft: 2, verticalAlign: -2, animation: 'piCaret 1s infinite' }}/>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', gap: 12, fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', color: t.textDim, letterSpacing: 0.4 }}>
          <span>↵ send</span>
          <span>⇧↵ newline</span>
          <span>⌘K commands</span>
          <span style={{ color: t.textMuted }}>· 27 chars</span>
        </div>
        <button style={{
          height: 26, padding: '0 14px', border: `1px solid ${t.accent}`,
          background: t.accent, color: '#0a0a0a', fontWeight: 600,
          fontSize: 11.5, cursor: 'pointer',
          fontFamily: '"IBM Plex Mono", monospace', letterSpacing: 0.5, textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>send <Icon.Send width="10" height="10"/></button>
      </div>
    </div>
  </div>
);

const ForgeStatusBar = ({ t }) => (
  <div style={{
    height: 24, borderTop: `1px solid ${t.border}`, background: t.surfaceSink,
    display: 'flex', alignItems: 'stretch',
    fontSize: 10.5, color: t.textMuted, fontFamily: '"IBM Plex Mono", monospace',
  }}>
    {[
      <span style={{ color: t.accentText }}>● ready</span>,
      <span>git: feat/extension-host ↑2</span>,
      <span>ext: 2 loaded</span>,
      <span>msgs: 4</span>,
    ].map((c, i) => (
      <div key={i} style={{
        padding: '0 12px', display: 'flex', alignItems: 'center',
        borderRight: `1px solid ${t.border}`,
      }}>{c}</div>
    ))}
    <div style={{ flex: 1 }}/>
    <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', color: t.textDim, borderLeft: `1px solid ${t.border}` }}>
      tok 2,431 / 200,000 · $0.018
    </div>
  </div>
);

// ---------------- floating panel ----------------

const ForgeGitPanel = ({ t }) => (
  <div style={{
    position: 'absolute', right: 24, bottom: 140, width: 280,
    background: t.surface, border: `1px solid ${t.borderHi}`,
    boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
    fontFamily: '"IBM Plex Mono", monospace',
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px',
      background: t.surfaceSink, borderBottom: `1px solid ${t.border}`,
      fontSize: 10.5, color: t.textMuted, letterSpacing: 0.4,
    }}>
      <Icon.Drag width="11" height="11" style={{ opacity: 0.4 }}/>
      <span style={{ flex: 1, textTransform: 'uppercase' }}>git_status</span>
      <span style={{ color: t.textDim }}>v0.1</span>
      <span style={{ color: t.accentText }}>●</span>
    </div>
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 9.5, color: t.textDim, letterSpacing: 0.6, textTransform: 'uppercase' }}>HEAD</span>
        <span style={{ fontSize: 9.5, color: t.textDim }}>refreshed 2s ago</span>
      </div>
      <div>
        <div style={{ fontSize: 13, color: t.text }}>feat/extension-host</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11 }}>
          <span><span style={{ color: t.textDim }}>↑</span> <span style={{ color: t.accentText }}>2</span></span>
          <span><span style={{ color: t.textDim }}>↓</span> <span style={{ color: t.text }}>0</span></span>
          <span><span style={{ color: t.textDim }}>±</span> <span style={{ color: t.warn }}>3</span></span>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 8 }}>
        <div style={{ fontSize: 9.5, color: t.textDim, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 5 }}>CHANGES</div>
        <div style={{ fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div><span style={{ color: t.success }}>M</span> <span style={{ color: t.text }}>App.tsx</span></div>
          <div><span style={{ color: t.warn }}>?</span> <span style={{ color: t.text }}>Panel.tsx</span></div>
          <div><span style={{ color: t.accentText }}>A</span> <span style={{ color: t.text }}>git-status.tsx</span></div>
        </div>
      </div>
    </div>
  </div>
);

// ---------------- the shell ----------------

const ForgeShell = ({ t }) => (
  <div style={{
    width: 920, height: 640, background: t.bg,
    border: `1px solid ${t.borderHi}`,
    overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    color: t.text, position: 'relative',
  }}>
    <ForgeTitleBar t={t}/>
    <ForgeHeader t={t}/>
    <div style={{
      flex: 1, overflow: 'hidden',
      padding: '18px 24px 8px', display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <ForgeUserMsg t={t} text={MOCK_MESSAGES[0].text} n={1}/>
      <ForgeAssistantMsg t={t} msg={MOCK_MESSAGES[1]} n={1}/>
      <ForgeUserMsg t={t} text={MOCK_MESSAGES[2].text} n={2}/>
      <ForgeAssistantMsg t={t} msg={MOCK_MESSAGES[3]} n={2}/>
    </div>
    <ForgeComposer t={t}/>
    <ForgeStatusBar t={t}/>
    <ForgeGitPanel t={t}/>
  </div>
);

// ---------------- component library ----------------

const FLibSection = ({ title, num, children, t }) => (
  <div>
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      borderBottom: `1px solid ${t.border}`, paddingBottom: 6, marginBottom: 12,
      fontFamily: '"IBM Plex Mono", monospace',
    }}>
      <span style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.6 }}>{num}</span>
      <span style={{ fontSize: 11, color: t.text, textTransform: 'uppercase', letterSpacing: 1.2 }}>{title}</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
  </div>
);

const fBtnPrimary = (t) => ({
  height: 28, padding: '0 12px', border: `1px solid ${t.accent}`,
  background: t.accent, color: '#0a0a0a', fontWeight: 600,
  fontSize: 11.5, cursor: 'pointer',
  fontFamily: '"IBM Plex Mono", monospace', letterSpacing: 0.4, textTransform: 'uppercase',
  display: 'inline-flex', alignItems: 'center', gap: 6,
});
const fBtnSecondary = (t) => ({
  height: 28, padding: '0 12px', border: `1px solid ${t.borderHi}`,
  background: t.surface, color: t.text, fontWeight: 500,
  fontSize: 11.5, cursor: 'pointer',
  fontFamily: '"IBM Plex Mono", monospace', letterSpacing: 0.4, textTransform: 'uppercase',
  display: 'inline-flex', alignItems: 'center', gap: 6,
});
const fBtnGhost = (t) => ({
  height: 28, padding: '0 12px', border: `1px solid ${t.border}`,
  background: 'transparent', color: t.textMuted, fontWeight: 500,
  fontSize: 11.5, cursor: 'pointer',
  fontFamily: '"IBM Plex Mono", monospace', letterSpacing: 0.4, textTransform: 'uppercase',
  display: 'inline-flex', alignItems: 'center', gap: 6,
});

const FToggle = ({ t, on }) => (
  <div style={{
    width: 30, height: 16, borderRadius: 2,
    background: on ? t.accent : t.surfaceHi,
    border: `1px solid ${on ? t.accent : t.borderHi}`,
    position: 'relative', cursor: 'pointer',
  }}>
    <span style={{
      position: 'absolute', top: 1, left: on ? 15 : 1,
      width: 12, height: 12, background: '#0a0a0a',
    }}/>
  </div>
);

const FCheckbox = ({ t, on, label }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: t.text, cursor: 'pointer', fontFamily: '"IBM Plex Mono", monospace' }}>
    <span style={{
      width: 14, height: 14,
      background: on ? t.accent : 'transparent',
      border: `1px solid ${on ? t.accent : t.borderHi}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: '#0a0a0a',
    }}>{on && <Icon.Check width="10" height="10"/>}</span>
    {label}
  </label>
);

const FSlider = ({ t, value }) => (
  <div style={{
    height: 8, background: t.surfaceSink, border: `1px solid ${t.border}`,
    position: 'relative',
  }}>
    <div style={{ position: 'absolute', inset: 0, width: `${value*100}%`, background: t.accent }}/>
    <div style={{
      position: 'absolute', left: `calc(${value*100}% - 4px)`, top: -3,
      width: 8, height: 14, background: '#fff',
    }}/>
  </div>
);

const FBadge = ({ t, tone = 'accent', children }) => {
  const map = {
    accent:  [t.accentSoft, t.accentText, t.accentBorder],
    success: ['oklch(0.80 0.16 145 / 0.14)', 'oklch(0.88 0.12 145)', 'oklch(0.80 0.16 145 / 0.35)'],
    warn:    ['oklch(0.85 0.15 90 / 0.14)', 'oklch(0.92 0.10 90)', 'oklch(0.85 0.15 90 / 0.35)'],
    danger:  ['oklch(0.72 0.20 25 / 0.14)', 'oklch(0.85 0.16 25)', 'oklch(0.72 0.20 25 / 0.35)'],
    muted:   [t.surfaceHi, t.textMuted, t.borderHi],
  };
  const [bg, fg, br] = map[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 18,
      padding: '0 6px', fontSize: 10,
      background: bg, color: fg, border: `1px solid ${br}`,
      fontFamily: '"IBM Plex Mono", monospace', letterSpacing: 0.5, textTransform: 'uppercase',
    }}>{children}</span>
  );
};

const ForgeLibrary = ({ t }) => (
  <div style={{
    width: 460, background: 'transparent',
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    color: t.text, display: 'flex', flexDirection: 'column', gap: 22,
  }}>
    <FLibSection title="Buttons" num="§01" t={t}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button style={fBtnPrimary(t)}>send</button>
        <button style={fBtnSecondary(t)}>cancel</button>
        <button style={fBtnGhost(t)}>ghost</button>
        <button style={{...fBtnGhost(t), color: 'oklch(0.85 0.16 25)', border: '1px solid oklch(0.72 0.20 25 / 0.35)' }}>stop</button>
      </div>
    </FLibSection>

    <FLibSection title="Inputs" num="§02" t={t}>
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`,
        padding: '0 10px', height: 30, display: 'flex', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: t.textDim, fontFamily: '"IBM Plex Mono", monospace', marginRight: 8 }}>&gt;</span>
        <input placeholder="ask pi…" style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: t.text, fontSize: 12.5, fontFamily: 'inherit',
        }}/>
      </div>
      <div style={{
        background: t.surface, borderLeft: `2px solid ${t.accent}`,
        border: `1px solid ${t.borderHi}`,
        padding: '0 10px', height: 30, display: 'flex', alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: t.accentText, fontFamily: '"IBM Plex Mono", monospace', marginRight: 8 }}>$</span>
        <input defaultValue="feat/extension-host" style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: t.text, fontSize: 12.5, fontFamily: '"IBM Plex Mono", monospace',
        }}/>
      </div>
    </FLibSection>

    <FLibSection title="Selection &amp; toggle" num="§03" t={t}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <FToggle t={t} on={true}/>
        <FToggle t={t} on={false}/>
        <FCheckbox t={t} on={true} label="auto-scroll"/>
        <FCheckbox t={t} on={false} label="show-thinking"/>
      </div>
      <div style={{ display: 'flex', border: `1px solid ${t.borderHi}`, width: 'fit-content' }}>
        {['chat','tools','files','logs'].map((s,i)=>(
          <button key={i} style={{
            height: 24, padding: '0 12px',
            background: i===0 ? t.accentSoft : 'transparent',
            color: i===0 ? t.accentText : t.textMuted,
            border: 'none', borderRight: i<3 ? `1px solid ${t.borderHi}` : 'none',
            fontSize: 11, cursor: 'pointer',
            fontFamily: '"IBM Plex Mono", monospace', letterSpacing: 0.4, textTransform: 'uppercase',
          }}>{s}</button>
        ))}
      </div>
      <FSlider t={t} value={0.62}/>
    </FLibSection>

    <FLibSection title="Status tags" num="§04" t={t}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <FBadge t={t}>running</FBadge>
        <FBadge t={t} tone="success">ok</FBadge>
        <FBadge t={t} tone="warn">stale</FBadge>
        <FBadge t={t} tone="danger">error</FBadge>
        <FBadge t={t} tone="muted">draft</FBadge>
      </div>
    </FLibSection>

    <FLibSection title="Code block" num="§05" t={t}>
      <div style={{
        background: t.surfaceSink, border: `1px solid ${t.border}`,
        borderLeft: `2px solid ${t.accent}`,
        padding: '8px 12px',
        fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5,
        lineHeight: 1.6, position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 9, color: t.textDim, letterSpacing: 0.5 }}>TSX · 12L</div>
        <div><span style={{ color: t.textDim }}>1</span>  <span style={{ color: t.accentText }}>import</span> {'{'} usePi {'}'} <span style={{ color: t.accentText }}>from</span> <span style={{ color: t.success }}>"pi-gui"</span></div>
        <div><span style={{ color: t.textDim }}>2</span></div>
        <div><span style={{ color: t.textDim }}>3</span>  <span style={{ color: t.accentText }}>export default</span> {'{'}</div>
        <div><span style={{ color: t.textDim }}>4</span>    id: <span style={{ color: t.success }}>"git-status"</span>,</div>
        <div><span style={{ color: t.textDim }}>5</span>    title: <span style={{ color: t.success }}>"git"</span>,</div>
        <div><span style={{ color: t.textDim }}>6</span>    Component: () =&gt; …</div>
      </div>
    </FLibSection>

    <FLibSection title="Key-value list" num="§06" t={t}>
      <div style={{
        background: t.surface, border: `1px solid ${t.border}`,
        fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5,
      }}>
        {[
          ['model', 'claude-haiku-4-5'],
          ['thinking', 'medium'],
          ['extensions', '2 loaded'],
          ['cwd', '~/Projects/pi-gui'],
        ].map(([k,v], i, arr) => (
          <div key={k} style={{
            display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8,
            padding: '5px 10px',
            borderBottom: i < arr.length - 1 ? `1px solid ${t.border}` : 'none',
          }}>
            <span style={{ color: t.textDim, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}>{k}</span>
            <span style={{ color: t.text }}>{v}</span>
          </div>
        ))}
      </div>
    </FLibSection>
  </div>
);

// ---------------- artboard root ----------------

window.ForgeArtboard = function ForgeArtboard() {
  const t = forge;
  return (
    <div style={{
      width: 1480, height: 760, padding: '40px',
      background: t.bg, color: t.text,
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      display: 'flex', gap: 40,
      backgroundImage: `linear-gradient(135deg, ${t.bg} 0%, ${t.bg2} 100%)`,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: t.accentText, fontFamily: '"IBM Plex Mono", monospace' }}>Direction C — §03</div>
            <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6 }}>Forge<span style={{ color: t.accent }}>.</span></div>
            <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2 }}>{t.desc}</div>
          </div>
          <div style={{ flex: 1, height: 1, background: t.borderHi, marginBottom: 8 }}/>
          <div style={{ fontSize: 10, color: t.textDim, fontFamily: '"IBM Plex Mono", monospace', marginBottom: 4 }}>v0.1.0 — 2026.05</div>
        </div>
        <ForgeShell t={t}/>
      </div>
      <ForgeLibrary t={t}/>
    </div>
  );
};
