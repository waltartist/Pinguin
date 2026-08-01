// src/backend/pi-bridge.js
// Creates the Pi agent session runtime via the SDK.
// Pi is installed with Pinguin so a clone works consistently across platforms.
// The project-root SYSTEM.md is loaded as the Pi system prompt so that the
// bundled Pi instance automatically uses Pinguin's UI conventions.
//
// We use createAgentSessionRuntime() instead of createAgentSession() so we
// get an AgentSessionRuntime with switchSession(), fork(), importFromJsonl(),
// and newSession() — needed for /resume, /fork, /clone, /import, and /tree.

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

  const {
    createAgentSessionRuntime,
    createAgentSessionServices,
    createAgentSessionFromServices,
    SessionManager,
  } = await import("@earendil-works/pi-coding-agent");

  const agentDir = path.join(os.homedir(), ".pi", "agent");
  const cwd = process.cwd();
  const systemPrompt = loadSystemPrompt();

  // Initial session manager — continue most recent or create new
  const sessionManager = SessionManager.continueRecent(cwd);

  // Runtime factory: called for initial session AND for every session switch
  // (resume, fork, clone, import). Recreates cwd-bound services + session.
  const createRuntime = async ({ cwd: rtCwd, agentDir: rtAgentDir, sessionManager: rtSm, sessionStartEvent }) => {
    const services = await createAgentSessionServices({
      cwd: rtCwd,
      agentDir: rtAgentDir,
      resourceLoaderOptions: systemPrompt
        ? { systemPrompt }
        : undefined,
    });

    const created = await createAgentSessionFromServices({
      services,
      sessionManager: rtSm,
      sessionStartEvent,
    });

    return {
      ...created,
      services,
      diagnostics: services.diagnostics ?? [],
    };
  };

  const runtime = await createAgentSessionRuntime(createRuntime, {
    cwd,
    agentDir,
    sessionManager,
  });

  // Return both — main.js needs the runtime for session management,
  // but most code still talks to session directly.
  return { session: runtime.session, runtime };
}