// Dock layout persistence: storage, save/restore, closed-panel tracking.
//
// Three-tier fallback for reading: Neutralino.storage → localStorage →
// direct filesystem file. Writing: localStorage (sync, survives beforeunload)
// + Neutralino.storage (async, survives restart) + filesystem (fire-and-forget).
//
// Extracted from Shell.tsx to keep the Shell as a composition root.

import type { DockviewApi } from "dockview-react";
import { nlGet, nlSet } from "../../lib/nl-storage";

// Neutralino.storage key constraint: ^[a-zA-Z-_0-9]{1,50}$
const LAYOUT_KEY = "pi_gui_dock_layout";
const CLOSED_KEY = "pi_gui_dock_closed_panels";

// Fallback file path for layout persistence — written via filesystem API
// when Neutralino.storage fails.
const LAYOUT_FILE = ".tmp/dock_layout.json";

// ── Direct filesystem helpers (bypass Neutralino.storage) ──
async function fsWrite(path: string, data: string): Promise<void> {
  try {
    if (typeof Neutralino !== "undefined" && Neutralino.filesystem) {
      await Neutralino.filesystem.writeFile(path, data);
      return;
    }
  } catch { /* ignore */ }
}

async function fsRead(path: string): Promise<string | null> {
  try {
    if (typeof Neutralino !== "undefined" && Neutralino.filesystem) {
      return await Neutralino.filesystem.readFile(path);
    }
  } catch { /* ignore */ }
  return null;
}

// ── Closed-panel tracking ──
// closedPanels survives reload so auto-add paths (extension hot-load, default
// layout) don't resurrect panels the user dismissed.
export const closedPanels: Set<string> = new Set();

// ── Persisted state (loaded once on boot) ──
export let loadedLayout: unknown = null;
export let storageReady = false;

export function setStorageReady(v: boolean) {
  storageReady = v;
}

export async function loadDockStorage(): Promise<void> {
  if (storageReady) return;

  // Try in order:
  //   1. Neutralino.storage (async, may fail on cold start)
  //   2. localStorage (sync, but may be cleared by Neutralino webview)
  //   3. filesystem file in .tmp/ (direct file I/O via Neutralino API)
  const [layoutRaw, closedRaw] = await Promise.all([
    (async () => {
      const v = await nlGet(LAYOUT_KEY);
      if (v) return v;
      const ls = localStorage.getItem(LAYOUT_KEY);
      if (ls) return ls;
      return await fsRead(LAYOUT_FILE);
    })(),
    (async () => {
      const v = await nlGet(CLOSED_KEY);
      if (v) return v;
      const ls = localStorage.getItem(CLOSED_KEY);
      if (ls) return ls;
      return null;
    })(),
  ]);

  if (layoutRaw) {
    try {
      loadedLayout = JSON.parse(layoutRaw);
    } catch {
      loadedLayout = null;
    }
  } else {
    loadedLayout = null;
  }
  if (closedRaw) {
    try {
      const arr = JSON.parse(closedRaw);
      if (Array.isArray(arr)) for (const id of arr) closedPanels.add(id);
    } catch {
      // ignore
    }
  }
  storageReady = true;
}

function saveClosed() {
  const data = JSON.stringify([...closedPanels]);
  nlSet(CLOSED_KEY, data);
  try { localStorage.setItem(CLOSED_KEY, data); } catch { /* ignore */ }
}

export function markClosed(id: string) {
  if (closedPanels.has(id)) return;
  closedPanels.add(id);
  saveClosed();
}

export function markOpen(id: string) {
  if (!closedPanels.delete(id)) return;
  saveClosed();
}

// ── Layout save / restore ──

export function persistLayout(api: DockviewApi) {
  try {
    const json = api.toJSON();
    const data = JSON.stringify(json);
    if (!data) return;
    nlSet(LAYOUT_KEY, data);
    try { localStorage.setItem(LAYOUT_KEY, data); } catch { /* ignore */ }
    fsWrite(LAYOUT_FILE, data);
  } catch (err) {
    console.warn("dock layout save failed", err);
  }
}

export function flushLayout(api: DockviewApi) {
  try {
    const json = api.toJSON();
    const data = JSON.stringify(json);
    if (!data) return;
    try { localStorage.setItem(LAYOUT_KEY, data); } catch { /* ignore */ }
    nlSet(LAYOUT_KEY, data);
    fsWrite(LAYOUT_FILE, data);
  } catch (err) {
    console.warn("dock layout flush failed", err);
  }
}

export function tryRestoreLayout(api: DockviewApi): boolean {
  const parsed = loadedLayout;
  console.log('[dock] tryRestoreLayout: parsed=', parsed ? `type=${typeof parsed}, hasGrid=${'grid' in (parsed as any)}` : 'null');
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("grid" in (parsed as Record<string, unknown>))
  ) {
    console.log('[dock] tryRestoreLayout: invalid or missing layout data, using default');
    loadedLayout = null;
    return false;
  }
  try {
    api.fromJSON(parsed as Parameters<DockviewApi["fromJSON"]>[0]);
    if (api.panels.length === 0) {
      console.log('[dock] tryRestoreLayout: restored empty layout, using default');
      api.clear();
      return false;
    }
    console.log(`[dock] tryRestoreLayout: SUCCESS — ${api.panels.length} panels restored`);
    return true;
  } catch (err) {
    console.warn("dock layout restore failed, falling back to default", err);
    api.clear();
    loadedLayout = null;
    return false;
  }
}