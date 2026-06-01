import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { arch, platform } from "node:process";

const indexPath = resolve("index.html");
const viteCli = resolve("node_modules", "vite", "bin", "vite.js");

function findAvailablePort(excludedPorts = new Set()) {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a local development port."));
        return;
      }

      const { port } = address;
      server.close(() => {
        if (excludedPorts.has(port)) {
          resolvePort(findAvailablePort(excludedPorts));
          return;
        }
        resolvePort(port);
      });
    });
  });
}

function waitForPort(port, timeoutMs = 20_000) {
  const startedAt = Date.now();

  return new Promise((resolvePort, reject) => {
    function tryConnect() {
      const socket = createConnection({ host: "127.0.0.1", port });

      socket.once("connect", () => {
        socket.destroy();
        resolvePort();
      });

      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for Vite on port ${port}.`));
          return;
        }
        setTimeout(tryConnect, 100);
      });
    }

    tryConnect();
  });
}

function patchIndexHtml(coreUrl) {
  const sourceHtml = readFileSync(indexPath, "utf-8");
  const originalHtml = sourceHtml
    .replace(
      /(<script src=")[^"]*__neutralino_globals\.js("><\/script>)/,
      "$1./__neutralino_globals.js$2"
    )
    .replace(
      /(<script src=")[^"]*neutralino\.js("><\/script>)/,
      "$1./neutralino.js$2"
    );
  const patchedHtml = originalHtml
    .replace(
      /(<script src=")[^"]*__neutralino_globals\.js("><\/script>)/,
      `$1${coreUrl}/__neutralino_globals.js$2`
    )
    .replace(
      /(<script src=")[^"]*neutralino\.js("><\/script>)/,
      `$1${coreUrl}/neutralino.js$2`
    );

  if (patchedHtml === sourceHtml) {
    throw new Error("Could not patch Neutralino scripts in index.html.");
  }

  writeFileSync(indexPath, patchedHtml);
  return () => writeFileSync(indexPath, originalHtml);
}

function getNeutralinoBinary() {
  const os = platform;
  const cpu = arch;
  let filename;

  if (os === "win32" && cpu === "x64") filename = "neutralino-win_x64.exe";
  else if (os === "linux" && cpu === "x64") filename = "neutralino-linux_x64";
  else if (os === "linux" && cpu === "arm64") filename = "neutralino-linux_arm64";
  else if (os === "linux" && cpu === "arm") filename = "neutralino-linux_armhf";
  else if (os === "darwin" && cpu === "x64") filename = "neutralino-mac_x64";
  else if (os === "darwin" && cpu === "arm64") filename = "neutralino-mac_arm64";
  else throw new Error(`Unsupported platform for Pinguin: ${os} ${cpu}`);

  const binaryPath = resolve("bin", filename);
  if (!existsSync(binaryPath)) {
    throw new Error(`Neutralino binary not found: ${binaryPath}`);
  }
  return binaryPath;
}

const vitePort = await findAvailablePort();
const corePort = await findAvailablePort(new Set([vitePort]));
const devUrl = `http://127.0.0.1:${vitePort}`;
const coreUrl = `http://127.0.0.1:${corePort}`;
const neutralinoBinary = getNeutralinoBinary();

console.log(`Starting Pinguin with Vite at ${devUrl}`);
console.log(`Using Neutralino core at ${coreUrl}`);

let restoreIndexHtml = patchIndexHtml(coreUrl);
let viteProcess;
let coreProcess;
let cleanedUp = false;

function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  if (coreProcess?.exitCode === null) coreProcess.kill();
  if (viteProcess?.exitCode === null) viteProcess.kill();
  restoreIndexHtml?.();
  restoreIndexHtml = null;
}

if (process.argv.includes("--dry-run")) {
  cleanup();
  console.log("Dry run complete. Restored index.html.");
  process.exit(0);
}

viteProcess = spawn(process.execPath, [viteCli, "dev", "--host", "127.0.0.1"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: { ...process.env, PINGUIN_DEV_PORT: String(vitePort) },
  windowsHide: true,
});

viteProcess.on("error", (err) => {
  cleanup();
  console.error(`Failed to start Vite: ${err.message}`);
  process.exit(1);
});

try {
  await waitForPort(vitePort);
} catch (err) {
  cleanup();
  console.error(`Failed to launch Pinguin: ${err.message}`);
  process.exit(1);
}

console.log("Starting Neutralino core.");
coreProcess = spawn(
  neutralinoBinary,
  [
    "--load-dir-res",
    "--path=.",
    "--export-auth-info",
    `--port=${corePort}`,
    `--url=${devUrl}`,
  ],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    windowsHide: true,
  }
);

coreProcess.on("error", (err) => {
  cleanup();
  console.error(`Failed to start Neutralino: ${err.message}`);
  process.exit(1);
});

coreProcess.on("exit", (code, signal) => {
  console.log(
    signal
      ? `Neutralino stopped from signal ${signal}.`
      : `Neutralino stopped with code ${code ?? 0}.`
  );
  cleanup();
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    cleanup();
    process.exit(0);
  });
}
