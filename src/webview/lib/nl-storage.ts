// Shared Neutralino storage helpers with fallbacks.
//
// Write order: localStorage (sync, survives beforeunload) → Neutralino.storage
// (async, persists across app restarts).
// Read order: Neutralino.storage → localStorage.
//
// Extracted from dock/Shell.tsx and stores/agents-store.ts to ensure
// consistent fallback behavior across all stores.

export async function nlGet(key: string): Promise<string | null> {
  // 1. Neutralino.storage (async, may fail on cold start — NE_ST_NOSTKEX)
  try {
    if (typeof Neutralino !== "undefined" && Neutralino.storage) {
      return await Neutralino.storage.getData(key);
    }
  } catch {
    // Key not yet written — fall through
  }
  // 2. localStorage (sync fallback)
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function nlSet(key: string, value: string): Promise<void> {
  // Always write to localStorage first — synchronous, guaranteed to complete
  // even on beforeunload.
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore — no persistence available
  }
  // Neutralino.storage is async; fire-and-forget so the caller isn't blocked.
  try {
    if (typeof Neutralino !== "undefined" && Neutralino.storage) {
      await Neutralino.storage.setData(key, value);
    }
  } catch (err) {
    console.warn(`storage write failed for ${key}`, err);
  }
}