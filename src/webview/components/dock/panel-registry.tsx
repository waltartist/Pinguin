// Dock panel registry: built-in panel definitions and extension panel management.
//
// Only the chat panel is a built-in. Extensions can still register panels
// dynamically via the extension system.

import type { DockviewApi } from "dockview-react";
import { ChatArea } from "../ChatArea";
import { ExtensionMount } from "./ExtensionMount";
import { useExtensionsStore } from "../../stores/extensions-store";
import { Icon } from "../ember";
import { closedPanels, markClosed, markOpen } from "./persistence";

type IconKey = keyof typeof Icon;

const EXTENSION_ID_PREFIX = "ext-";

export function extensionPanelId(id: string) {
  return EXTENSION_ID_PREFIX + id;
}

// ── built-in panel registry ────────────────────────────────────────────────

export interface BuiltinPanelDef {
  id: string;
  component: string;
  title: string;
  iconKey: IconKey;
  defaultPosition?: () => Parameters<DockviewApi["addPanel"]>[0]["position"];
  initialSize?: number;
}

export const BUILTIN_PANELS: BuiltinPanelDef[] = [
  { id: "chat", component: "chat", title: "Chat", iconKey: "Sparkle" },
];

// ── panel component map ─────────────────────────────────────────────────────

export const panelComponents: Record<string, React.FunctionComponent<any>> = {
  chat: ChatArea,
  extension: ExtensionMount,
};

// ── dock API cache ──────────────────────────────────────────────────────────

let dockApi: DockviewApi | null = null;

export function setDockApi(api: DockviewApi | null) {
  dockApi = api;
}

// ── extension panel management ──────────────────────────────────────────────

let pendingExtensions: Array<{ id: string; title: string }> = [];

export function addExtensionPanel(
  id: string,
  title: string,
  iconKey: IconKey = "Plus",
) {
  if (!dockApi) {
    pendingExtensions.push({ id, title });
    return;
  }
  const panelId = extensionPanelId(id);
  if (dockApi.getPanel(panelId)) return;
  if (closedPanels.has(panelId)) return;
  markOpen(panelId);

  const referencePanel = dockApi.getPanel("chat") ?? null;
  dockApi.addPanel({
    id: panelId,
    component: "extension",
    title,
    params: { extensionId: id, iconKey },
    position: referencePanel
      ? { referencePanel: referencePanel.id, direction: "within" }
      : undefined,
  });
}

export function removeExtensionPanel(id: string) {
  const panel = dockApi?.getPanel(extensionPanelId(id));
  panel?.api.close();
}

export function flushPendingExtensions() {
  for (const { id, title } of pendingExtensions) {
    addExtensionPanel(id, title);
  }
  pendingExtensions = [];
}

// ── built-in panel helpers ──────────────────────────────────────────────────

export function addBuiltinPanel(
  api: DockviewApi,
  def: BuiltinPanelDef,
  options: { userInitiated?: boolean } = {}
) {
  if (api.getPanel(def.id)) return;
  if (!options.userInitiated && closedPanels.has(def.id)) return;
  markOpen(def.id);
  api.addPanel({
    id: def.id,
    component: def.component,
    title: def.title,
    params: { iconKey: def.iconKey },
    position: def.defaultPosition?.(),
    ...(def.initialSize != null
      ? { initialHeight: def.initialSize }
      : {}),
  });
}

export function buildDefaultLayout(api: DockviewApi) {
  // Fresh start: clear any stale closed-set entries and open only chat.
  if (closedPanels.size > 0) {
    closedPanels.clear();
  }
  const chat = BUILTIN_PANELS.find((d) => d.id === "chat");
  if (chat) addBuiltinPanel(api, chat, { userInitiated: true });
}