// src/backend/pi-bridge.js
// Creates the Pi agent session via the SDK.
// Pi is installed with Pinguin so a clone works consistently across platforms.
// The project-root SYSTEM.md is loaded as the Pi system prompt so that the
// bundled Pi instance automatically uses Pinguin's UI conventions.

import path from "node:path";
import os from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installExtensionDocs } from "./extension-docs-installer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Read SYSTEM.md from the Pinguin project root (two levels up from src/backend/). */
function loadSystemPrompt() {
  const candidates = [
    join(__dirname, "..", "..", "SYSTEM.md"), // Pinguin project root
    join(process.cwd(), "SYSTEM.md"),           // cwd override
  ];
  for (const p of candidates) {
    if (existsSync(p)) return readFileSync(p, "utf-8").trim();
  }
  return undefined;
}

export async function createPiSession() {
  // Sync extension docs/types into project-local gui-extensions/
  installExtensionDocs();

  const { createAgentSession } = await import("@earendil-works/pi-coding-agent");

  const systemPrompt = loadSystemPrompt();

  const { session } = await createAgentSession({
    cwd: process.cwd(),
    agentDir: path.join(os.homedir(), ".pi", "agent"),
    ...(systemPrompt ? { systemPrompt } : {}),
  });

  return session;
}
