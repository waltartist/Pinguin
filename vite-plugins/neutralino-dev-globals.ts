import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";

const AUTH_INFO_PATH = ".tmp/auth_info.json";
const GLOBALS_PATH = "/__neutralino_globals.js";

function delay(ms: number) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function escapeJsString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function loadGlobals(corePort: number) {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    try {
      const authInfo = JSON.parse(await readFile(AUTH_INFO_PATH, "utf-8"));
      if (authInfo.nlPort !== corePort || typeof authInfo.nlToken !== "string") {
        await delay(100);
        continue;
      }

      const response = await fetch(`http://127.0.0.1:${corePort}${GLOBALS_PATH}`);
      if (!response.ok) {
        await delay(100);
        continue;
      }

      return (await response.text()).replace(
        "var NL_TOKEN='';",
        `var NL_TOKEN='${escapeJsString(authInfo.nlToken)}';`
      );
    } catch {
      await delay(100);
    }
  }

  throw new Error("Timed out waiting for Neutralino development globals.");
}

export function neutralinoDevGlobalsPlugin(): Plugin {
  return {
    name: "neutralino-dev-globals",

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== GLOBALS_PATH) {
          next();
          return;
        }

        const corePort = Number.parseInt(process.env.PINGUIN_CORE_PORT || "", 10);
        if (!Number.isInteger(corePort)) {
          res.statusCode = 503;
          res.end("PINGUIN_CORE_PORT is not configured.");
          return;
        }

        try {
          const globals = await loadGlobals(corePort);
          res.setHeader("Content-Type", "application/javascript");
          res.setHeader("Cache-Control", "no-store");
          res.end(globals);
        } catch (err) {
          res.statusCode = 503;
          res.end(err instanceof Error ? err.message : "Neutralino globals unavailable.");
        }
      });
    },
  };
}
