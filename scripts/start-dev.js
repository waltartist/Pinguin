import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const configPath = resolve("neutralino.config.json");
const neuCli = resolve("node_modules", "@neutralinojs", "neu", "bin", "neu.js");
const defaultDevUrl = "http://localhost:5173";

function findAvailablePort() {
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
      server.close(() => resolvePort(port));
    });
  });
}

function writeDevUrl(devUrl) {
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  config.cli.frontendLibrary.devUrl = devUrl;
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

const port = await findAvailablePort();
const devUrl = `http://localhost:${port}`;

writeDevUrl(devUrl);
console.log(`Starting Pinguin with Vite at ${devUrl}`);

let restored = false;
function restoreConfig() {
  if (restored) return;
  restored = true;
  writeDevUrl(defaultDevUrl);
}

if (process.argv.includes("--dry-run")) {
  restoreConfig();
  console.log(`Dry run complete. Selected ${devUrl} and restored ${defaultDevUrl}.`);
  process.exit(0);
}

const child = spawn(process.execPath, [neuCli, "run"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: { ...process.env, PINGUIN_DEV_PORT: String(port) },
});

child.on("error", (err) => {
  restoreConfig();
  console.error(`Failed to launch Pinguin: ${err.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  restoreConfig();
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    restoreConfig();
    child.kill(signal);
  });
}
