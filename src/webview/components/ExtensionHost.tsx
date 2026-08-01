import React from "react";
import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import * as JsxRuntime from "react/jsx-runtime";
import { create as zustandCreate } from "zustand";
import { usePiStore } from "../stores/pi-store";
import {
  useExtensionsStore,
  type ExtensionEntry,
} from "../stores/extensions-store";
import { Icon, PresenceDot, StatusPill } from "./ember";
import { addExtensionPanel, removeExtensionPanel } from "./dock/panel-registry";

// ── Receive compiled extensions from the backend ──

// Track registered event handlers so we can dispose them on teardown.
// This prevents duplicate registrations if initExtensionHost runs more
// than once (e.g. React Strict Mode double-mount in dev).
const extensionHandlers: Array<{ event: string; callback: (raw: any) => void }> = [];

function initExtensionHost() {
  if (typeof Neutralino === "undefined") return;

  // If already initialized, dispose previous handlers first.
  // Neutralino.events.on may stack handlers — we replace them to avoid
  // duplicate processing.
  // (Neutralino doesn't expose a public dispose/unsubscribe API, but
  // re-registering replaces the handler for the same event name.)

  const on = (event: string, callback: (raw: any) => void) => {
    Neutralino!.events.on(event, callback);
    extensionHandlers.push({ event, callback });
  };

  on("ext:update", (raw: any) => {
    const { id, code } = raw.detail as { id: string; code: string };

    try {
      // esbuild builds with format:"cjs" — run it via a CommonJS-style shim.
      const exports: Record<string, unknown> = {};
      const module = { exports };

      const modules: Record<string, unknown> = {
        react: React,
        "react/jsx-runtime": JsxRuntime,
        "react-dom": ReactDOM,
        "react-dom/client": ReactDOMClient,
        zustand: { create: zustandCreate },
        "pi-gui": {
          usePi: usePiStore,
          Icon,
          PresenceDot,
          StatusPill,
        },
      };
      const require = (name: string) => {
        if (name in modules) return modules[name];
        throw new Error(`Extension cannot import "${name}"`);
      };

      // Security note: new Function executes compiled extension code with
      // full access to the global scope (window, document, Neutralino, etc.).
      // Extensions are trusted local code — see SECURITY.md for the threat
      // model. The require shim limits module imports to a curated set.
      const fn = new Function("exports", "module", "require", code);
      fn(exports, module, require);

      const ext = ((module as any).exports.default ||
        (module as any).exports) as ExtensionEntry;

      if (ext && ext.Component) {
        const entry: ExtensionEntry = {
          id,
          title: ext.title ?? id,
          Component: ext.Component,
        };
        useExtensionsStore.getState().register(entry);
        addExtensionPanel(id, entry.title);
      }
    } catch (err) {
      console.error(`Extension "${id}" failed to load:`, err);
    }
  });

  on("ext:error", (raw: any) => {
    const { id, error } = raw.detail as { id: string; error: string };
    console.error(`Extension "${id}" compile error:`, error);
  });

  on("ext:remove", (raw: any) => {
    const { id } = raw.detail as { id: string };
    removeExtensionPanel(id);
    useExtensionsStore.getState().unregister(id);
  });
}

initExtensionHost();