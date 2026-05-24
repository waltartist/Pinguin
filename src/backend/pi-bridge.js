// src/backend/pi-bridge.js
// Creates the Pi agent session via the SDK.
// Pi is resolved from the global installation at runtime.

import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { installExtensionDocs } from "./extension-docs-installer.js";

// Path to the globally installed Pi SDK
const PI_SDK_DIR = path.join(
  process.env.APPDATA || path.join(os.homedir(), ".npm-global"),
  "npm",
  "node_modules",
  "@earendil-works",
  "pi-coding-agent"
);

const piIndex = pathToFileURL(path.join(PI_SDK_DIR, "dist", "index.js")).href;

export async function createPiSession() {
  // Sync extension docs/types into project-local gui-extensions/
  installExtensionDocs();

  const { createAgentSession } = await import(piIndex);

  const { session } = await createAgentSession({
    cwd: process.cwd(),
    agentDir: path.join(os.homedir(), ".pi", "agent"),
  });

  return session;
}
