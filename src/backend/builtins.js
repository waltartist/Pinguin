// src/backend/builtins.js
// Factored built-in slash-command registry.
// Pi's CLI handles these directly; the SDK does not dispatch them. We
// reimplement them here so the GUI exposes the same vocabulary.
//
// Shape: { name, description, args?, run: async (ctx, args) => Result }
// Result = { text?, isError?, event?, eventData? } | null (unknown)

import { createPiSession } from "./pi-bridge.js";

export function createBuiltinRegistry({ broadcast, callMethod, broadcastCommands }) {
  const builtins = [
    {
      name: "new",
      description: "Start a new session",
      run: async () => {
        const session = await createPiSession();
        // The caller (main.js) is responsible for swapping the session
        // reference and resubscribing. We signal that via a special flag.
        return {
          text: "New session started.",
          _recreateSession: session,
        };
      },
    },

    {
      name: "compact",
      description: "Manually compact the session context",
      args: "[hint]",
      run: async (ctx, args) => {
        await ctx.session.compact(args || undefined);
        return { text: "Context compacted." };
      },
    },

    {
      name: "reload",
      description: "Reload extensions, skills, prompts, themes",
      run: async (ctx) => {
        await ctx.session.reload();
        return { text: "Reloaded extensions, skills, prompts, themes.", _broadcastCommands: true };
      },
    },

    {
      name: "export",
      description: "Export session (HTML default, or specify path: .html/.jsonl)",
      args: "[path]",
      run: async (ctx, args) => {
        const trimmed = args?.trim();
        const session = ctx.session;
        const path = trimmed && trimmed.endsWith(".jsonl")
          ? session.exportToJsonl(trimmed)
          : await session.exportToHtml(trimmed || undefined);
        return { text: `Exported session → ${path}` };
      },
    },

    {
      name: "copy",
      description: "Copy last agent message to clipboard",
      run: async (ctx) => {
        const text = ctx.session.getLastAssistantText();
        if (!text) return { text: "No assistant message to copy.", isError: true };
        await callMethod("clipboard.writeText", { data: text });
        return { text: "Copied last assistant message." };
      },
    },

    {
      name: "name",
      description: "Set session display name",
      args: "<name>",
      run: async (ctx, args) => {
        if (!args) return { text: "Usage: /name <session name>", isError: true };
        ctx.session.setSessionName(args);
        return { text: `Session named: ${args}` };
      },
    },

    {
      name: "session",
      description: "Show session info and stats",
      run: async (ctx) => {
        const stats = ctx.session.getSessionStats();
        const lines = [];
        for (const [k, v] of Object.entries(stats)) {
          const val = v && typeof v === "object" ? JSON.stringify(v) : v;
          lines.push(`${k}: ${val}`);
        }
        return { text: lines.join("\n") };
      },
    },

    {
      name: "quit",
      description: "Quit Pi GUI",
      run: async () => {
        setTimeout(() => callMethod("app.exit", {}).catch(() => {}), 100);
        return { text: "Exiting…" };
      },
    },

    {
      name: "model",
      description: "Show or switch model",
      args: "[provider:id]",
      run: async (ctx, args) => {
        const trimmed = args?.trim();
        const session = ctx.session;
        const available = session.modelRegistry.getAvailable();
        if (!trimmed) {
          const current = session.model;
          const lines = ["Available models:"];
          for (const m of available) {
            const mark = current && m.provider === current.provider && m.id === current.id ? "* " : "  ";
            lines.push(`${mark}${m.provider}:${m.id}${m.name ? ` — ${m.name}` : ""}`);
          }
          lines.push("");
          lines.push("Switch: /model <provider>:<id>  or  /model <id>");
          return { text: lines.join("\n") };
        }
        let provider;
        let id;
        if (trimmed.includes(":")) {
          const idx = trimmed.indexOf(":");
          provider = trimmed.slice(0, idx);
          id = trimmed.slice(idx + 1);
        } else {
          id = trimmed;
        }
        const found = provider
          ? available.find((m) => m.provider === provider && m.id === id)
          : available.find((m) => m.id === id);
        if (!found) return { text: `Model not found: ${trimmed}`, isError: true };
        await session.setModel(found);
        return {
          text: `Model → ${found.provider}:${found.id}`,
          event: "pi:model",
          eventData: { model: { provider: found.provider, id: found.id } },
        };
      },
    },

    {
      name: "scoped-models",
      description: "Show scoped models",
      run: async (ctx) => {
        const scoped = ctx.session.scopedModels;
        if (!scoped || scoped.length === 0) {
          return { text: "No scoped models configured." };
        }
        const lines = ["Scoped models:"];
        for (const s of scoped) {
          const lvl = s.thinkingLevel ? ` (${s.thinkingLevel})` : "";
          lines.push(`  ${s.model.provider}:${s.model.id}${lvl}`);
        }
        return { text: lines.join("\n") };
      },
    },

    {
      name: "settings",
      description: "Show settings",
      run: async (ctx) => {
        const session = ctx.session;
        const model = session.model;
        const lines = [
          `model: ${model ? `${model.provider}:${model.id}` : "(none)"}`,
          `thinkingLevel: ${session.thinkingLevel}`,
          `steeringMode: ${session.steeringMode}`,
          `followUpMode: ${session.followUpMode}`,
          `autoCompactionEnabled: ${session.autoCompactionEnabled}`,
          `sessionId: ${session.sessionId}`,
          `sessionName: ${session.sessionName || "(none)"}`,
        ];
        return { text: lines.join("\n") };
      },
    },

    {
      name: "hotkeys",
      description: "Show all keyboard shortcuts",
      run: async () => {
        const cmdLines = builtins
          .filter((b) => !b._stub)
          .map((b) => {
            const usage = `/${b.name}${b.args ? ` ${b.args}` : ""}`;
            const pad = " ".repeat(Math.max(1, 22 - usage.length));
            return `  ${usage}${pad}${b.description}`;
          });
        return {
          text: [
            "Composer:",
            "  Enter           Send",
            "  Shift+Enter     Newline",
            "",
            "Slash commands:",
            ...cmdLines,
          ].join("\n"),
        };
      },
    },

    {
      name: "changelog",
      description: "Show Pi SDK changelog",
      run: async () => {
        try {
          const { readFile } = await import("node:fs/promises");
          const pathMod = await import("node:path");
          const osMod = await import("node:os");
          const sdkDir = pathMod.join(
            process.env.APPDATA || pathMod.join(osMod.homedir(), ".npm-global"),
            "npm",
            "node_modules",
            "@earendil-works",
            "pi-coding-agent"
          );
          const content = await readFile(pathMod.join(sdkDir, "CHANGELOG.md"), "utf-8");
          const lines = content.split("\n").slice(0, 80);
          return { text: lines.join("\n") };
        } catch (err) {
          return { text: `Changelog unavailable: ${err.message || err}`, isError: true };
        }
      },
    },

    // ── Stubs for Pi CLI commands not yet available in GUI ──
    { name: "import", description: "Import a session or file", args: "<path>", _stub: true, run: async () => ({ text: "Not yet available in GUI.", isError: true }) },
    { name: "share", description: "Share the current session", _stub: true, run: async () => ({ text: "Not yet available in GUI.", isError: true }) },
    { name: "fork", description: "Fork the current session", _stub: true, run: async () => ({ text: "Not yet available in GUI.", isError: true }) },
    { name: "clone", description: "Clone a shared session", args: "<id>", _stub: true, run: async () => ({ text: "Not yet available in GUI.", isError: true }) },
    { name: "tree", description: "Show file tree", _stub: true, run: async () => ({ text: "Not yet available in GUI.", isError: true }) },
    { name: "login", description: "Log in to cloud services", _stub: true, run: async () => ({ text: "Not yet available in GUI.", isError: true }) },
    { name: "logout", description: "Log out of cloud services", _stub: true, run: async () => ({ text: "Not yet available in GUI.", isError: true }) },
    { name: "resume", description: "Resume a previous session", args: "<id>", _stub: true, run: async () => ({ text: "Not yet available in GUI.", isError: true }) },

    // ── UI control surface (Fix 7) ──
    {
      name: "panel",
      description: "Panel control: open, close, focus, list",
      args: "<verb> [id]",
      run: async (_ctx, args) => {
        const trimmed = args?.trim();
        if (!trimmed) return { text: "Usage: /panel <open|close|focus|list> <id>", isError: true };
        const [verb, ...rest] = trimmed.split(/\s+/);
        const id = rest.join(" ");
        const valid = ["open", "close", "focus", "list"];
        if (!valid.includes(verb)) {
          return { text: `Unknown panel verb: ${verb}. Use open, close, focus, or list.`, isError: true };
        }
        if (verb !== "list" && !id) {
          return { text: `Usage: /panel ${verb} <id>`, isError: true };
        }
        return {
          event: "pi:ui_command",
          eventData: { verb: "panel", target: trimmed },
        };
      },
    },

    {
      name: "open",
      description: "Open a file in the markdown viewer",
      args: "<file>",
      run: async (_ctx, args) => {
        const trimmed = args?.trim();
        if (!trimmed) return { text: "Usage: /open <file>", isError: true };
        if (!trimmed.endsWith(".md")) {
          return { text: `Only .md files are supported currently: ${trimmed}`, isError: true };
        }
        return {
          event: "pi:ui_command",
          eventData: { verb: "open", target: trimmed },
        };
      },
    },
  ];

  return {
    list() {
      return builtins.map((b) => ({
        name: b.name,
        description: b.description,
        source: "builtin",
      }));
    },
    async run(name, args, getSession) {
      const b = builtins.find((x) => x.name === name);
      if (!b) return null;
      const session = getSession();
      if (!session && name !== "new" && name !== "quit" && name !== "hotkeys") {
        return { text: "Session not ready.", isError: true };
      }
      try {
        const ctx = { session };
        const result = await b.run(ctx, args);
        if (result?._recreateSession) {
          return { ...result, _recreateSession: result._recreateSession };
        }
        if (result?._broadcastCommands) {
          await broadcastCommands();
        }
        return result;
      } catch (err) {
        return { text: `/${name}: ${err.message || err}`, isError: true };
      }
    },
  };
}
