// src/backend/pi-bridge.js
// Creates the Pi agent session via the SDK.
// Pi is installed with Pinguin so a clone works consistently across platforms.

import path from "node:path";
import os from "node:os";
import { installExtensionDocs } from "./extension-docs-installer.js";

export async function createPiSession() {
  // Sync extension docs/types into project-local gui-extensions/
  installExtensionDocs();

  const { createAgentSession } = await import("@earendil-works/pi-coding-agent");

  const { session } = await createAgentSession({
    cwd: process.cwd(),
    agentDir: path.join(os.homedir(), ".pi", "agent"),
  });

  return session;
}
