import { useEffect, useRef } from "react";
import { usePi } from "../lib/use-pi";
import type { SessionStats } from "../stores/pi-store";
import { Icon } from "./ember";

// ── Formatting helpers ──────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.0001) return `$${cost.toFixed(6)}`;
  if (cost < 0.01) return `$${cost.toFixed(5)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatSessionId(id: string): string {
  if (id.length > 12) return id.slice(0, 12) + "…";
  return id;
}

// ── Stat row ────────────────────────────────────────────────────────────────

function StatRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="stats-row">
      <span className="stats-label">{label}</span>
      <span className={`stats-value${dim ? " stats-value-dim" : ""}`}>{value}</span>
    </div>
  );
}

function StatSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="stats-section">
      <div className="stats-section-title">{title}</div>
      {children}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function StatisticsPanel() {
  const stats = usePi((s) => s.sessionStats);
  const cwd = usePi((s) => s.cwd);
  const model = usePi((s) => s.model);
  const requestSessionStats = usePi((s) => s.requestSessionStats);
  const retryRef = useRef(0);

  // Request fresh stats on mount. Retry up to 5 times with 1s gap to
  // handle any race between the panel mounting and the backend connecting.
  useEffect(() => {
    retryRef.current = 0;
    const tryFetch = () => {
      requestSessionStats();
      retryRef.current++;
    };
    // Immediate attempt
    tryFetch();
    // Fallback retries — if stats arrive from the pi:ready payload or
    // the per-turn broadcast, these become no-ops.
    const interval = setInterval(() => {
      if (usePi.getState().sessionStats || retryRef.current >= 5) {
        clearInterval(interval);
        return;
      }
      tryFetch();
    }, 1000);
    return () => clearInterval(interval);
  }, [requestSessionStats]);

  // Empty state — stats haven't arrived yet
  if (!stats) {
    return (
      <div className="stats-view stats-view--empty">
        <div className="stats-empty">
          <Icon.Terminal width={24} height={24} />
          <p>Waiting for session statistics…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-view">
      {/* ── Session Info ── */}
      <StatSection title="Session">
        <StatRow label="ID" value={formatSessionId(stats.sessionId)} />
        {stats.sessionName && <StatRow label="Name" value={stats.sessionName} />}
        {cwd && (
          <StatRow
            label="Directory"
            value={cwd.length > 40 ? "…" + cwd.slice(-40) : cwd}
            dim
          />
        )}
        {model && (
          <StatRow
            label="Model"
            value={`${model.provider}:${model.id}`}
            dim
          />
        )}
      </StatSection>

      {/* ── Messages ── */}
      <StatSection title="Messages">
        <StatRow label="User" value={String(stats.userMessages)} />
        <StatRow label="Assistant" value={String(stats.assistantMessages)} />
        <StatRow label="Tool calls" value={String(stats.toolCalls)} />
        <StatRow label="Tool results" value={String(stats.toolResults)} />
        <div className="stats-sep" />
        <StatRow label="Total" value={String(stats.totalMessages)} />
      </StatSection>

      {/* ── Token Usage ── */}
      <StatSection title="Token Usage">
        <StatRow label="Input" value={formatTokens(stats.tokens.input)} />
        <StatRow label="Output" value={formatTokens(stats.tokens.output)} />
        <StatRow label="Cache read" value={formatTokens(stats.tokens.cacheRead)} dim />
        <StatRow label="Cache write" value={formatTokens(stats.tokens.cacheWrite)} dim />
        <div className="stats-sep" />
        <StatRow label="Total" value={formatTokens(stats.tokens.total)} />
      </StatSection>

      {/* ── Cost ── */}
      <StatSection title="Cost">
        <StatRow label="Total" value={formatCost(stats.cost)} />
      </StatSection>

      {/* ── Context Usage (if available) ── */}
      {stats.contextUsage && (
        <StatSection title="Context Usage">
          {stats.contextUsage.inputTokens != null && (
            <StatRow
              label="Input tokens"
              value={formatTokens(stats.contextUsage.inputTokens)}
            />
          )}
          {stats.contextUsage.outputTokens != null && (
            <StatRow
              label="Output tokens"
              value={formatTokens(stats.contextUsage.outputTokens)}
            />
          )}
          {stats.contextUsage.cacheReadInputTokens != null && (
            <StatRow
              label="Cache read"
              value={formatTokens(stats.contextUsage.cacheReadInputTokens)}
              dim
            />
          )}
          {stats.contextUsage.cacheCreationInputTokens != null && (
            <StatRow
              label="Cache create"
              value={formatTokens(stats.contextUsage.cacheCreationInputTokens)}
              dim
            />
          )}
        </StatSection>
      )}

      {/* ── Refresh button ── */}
      <div className="stats-refresh">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={requestSessionStats}
          title="Refresh statistics"
        >
          <Icon.History width={11} height={11} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
