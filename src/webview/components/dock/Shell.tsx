import { useCallback, useEffect, useRef, useState } from "react";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type DockviewTheme,
  type IDockviewPanelProps,
} from "dockview-react";
import { ChatArea } from "../ChatArea";
import { ToolsPanel } from "../ToolsPanel";
import { StatusBar } from "../StatusBar";
import { MarkdownViewer } from "../MarkdownViewer";
import { EmberTab } from "./EmberTab";
import { ExtensionMount } from "./ExtensionMount";
import { Icon } from "../ember";
import { useExtensionsStore } from "../../stores/extensions-store";
import { useFileViewStore } from "../../stores/file-view-store";

type IconKey = keyof typeof Icon;

const LAYOUT_KEY = "pi-gui-dock-layout";
const EXTENSION_ID_PREFIX = "ext-";

const emberTheme: DockviewTheme = {
  name: "ember",
  className: "pi-dock-ember",
  dndOverlayMounting: "absolute",
  dndPanelOverlay: "content",
};

// ── built-in panel registry ────────────────────────────────────────────────

interface BuiltinPanelDef {
  id: string;
  component: string;
  title: string;
  iconKey: IconKey;
  defaultPosition?: () => Parameters<DockviewApi["addPanel"]>[0]["position"];
}

const BUILTIN_PANELS: BuiltinPanelDef[] = [
  { id: "chat", component: "chat", title: "Chat", iconKey: "Sparkle" },
  {
    id: "tools",
    component: "tools",
    title: "Tools",
    iconKey: "Wrench",
    defaultPosition: () => ({ referencePanel: "chat", direction: "right" }),
  },
  {
    id: "status",
    component: "status",
    title: "Status",
    iconKey: "Terminal",
    defaultPosition: () => ({ referencePanel: "chat", direction: "below" }),
  },
  {
    id: "markdown",
    component: "markdown",
    title: "Markdown",
    iconKey: "File",
    defaultPosition: () => ({ referencePanel: "chat", direction: "right" }),
  },
];

// ── module-level api ref + queue for extension panels registered pre-ready ──

let dockApi: DockviewApi | null = null;
const pendingExtensions: { id: string; title: string; iconKey?: IconKey }[] =
  [];
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function extensionPanelId(id: string) {
  return EXTENSION_ID_PREFIX + id;
}

export function addExtensionPanel(
  id: string,
  title: string,
  iconKey: IconKey = "Plus"
) {
  if (!dockApi) {
    pendingExtensions.push({ id, title, iconKey });
    return;
  }
  const panelId = extensionPanelId(id);
  if (dockApi.getPanel(panelId)) return;

  const referencePanel =
    dockApi.getPanel("tools") ?? dockApi.getPanel("chat");

  dockApi.addPanel({
    id: panelId,
    component: "extension",
    title,
    params: { extensionId: id, iconKey, closable: true },
    position: referencePanel
      ? { referencePanel: referencePanel.id, direction: "within" }
      : undefined,
  });
}

export function removeExtensionPanel(id: string) {
  const panel = dockApi?.getPanel(extensionPanelId(id));
  panel?.api.close();
}

/** Open a markdown file in the markdown viewer panel. Registers it in
 *  fileViewStore and ensures the markdown panel is visible & focused. */
export function openMarkdownFile(path: string) {
  useFileViewStore.getState().open(path);
  if (!dockApi) {
    // Dock not ready yet — store will trigger open when Shell mounts
    return;
  }
  const panel = dockApi.getPanel("markdown");
  if (panel) {
    panel.focus();
  } else {
    // Add the markdown panel if not already present
    const referencePanel =
      dockApi.getPanel("tools") ?? dockApi.getPanel("chat");
    dockApi.addPanel({
      id: "markdown",
      component: "markdown",
      title: "Markdown",
      params: { iconKey: "File" as IconKey },
      position: referencePanel
        ? { referencePanel: referencePanel.id, direction: "within" }
        : undefined,
    });
  }
}

function addBuiltinPanel(api: DockviewApi, def: BuiltinPanelDef) {
  if (api.getPanel(def.id)) return;
  api.addPanel({
    id: def.id,
    component: def.component,
    title: def.title,
    params: { iconKey: def.iconKey },
    position: def.defaultPosition?.(),
  });
}

function persist(api: DockviewApi) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const json = api.toJSON();
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(json));
    } catch (err) {
      console.warn("dock layout save failed", err);
    }
  }, 300);
}

function tryRestoreLayout(api: DockviewApi): boolean {
  const raw = localStorage.getItem(LAYOUT_KEY);
  if (!raw) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.removeItem(LAYOUT_KEY);
    return false;
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("grid" in (parsed as Record<string, unknown>))
  ) {
    localStorage.removeItem(LAYOUT_KEY);
    return false;
  }
  try {
    api.fromJSON(parsed as Parameters<DockviewApi["fromJSON"]>[0]);
    return true;
  } catch (err) {
    console.warn("dock layout restore failed, falling back to default", err);
    api.clear();
    localStorage.removeItem(LAYOUT_KEY);
    return false;
  }
}

function buildDefaultLayout(api: DockviewApi) {
  for (const def of BUILTIN_PANELS) addBuiltinPanel(api, def);
}

// ── panel content wrappers (dockview passes IDockviewPanelProps; ignore) ──

const ChatPanel = (_props: IDockviewPanelProps) => <ChatArea />;
const ToolsPanelView = (_props: IDockviewPanelProps) => <ToolsPanel />;
const StatusPanelView = (_props: IDockviewPanelProps) => <StatusBar />;
const MarkdownPanel = (_props: IDockviewPanelProps) => <MarkdownViewer />;

const panelComponents = {
  chat: ChatPanel,
  tools: ToolsPanelView,
  status: StatusPanelView,
  markdown: MarkdownPanel,
  extension: ExtensionMount,
};

// ── Panel visibility menu ──────────────────────────────────────────────────

interface MenuItem {
  panelId: string;
  title: string;
  iconKey: IconKey;
  isOpen: boolean;
  onToggle: () => void;
}

function PanelMenu({ api }: { api: DockviewApi | null }) {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const extensions = useExtensionsStore((s) => s.extensions);

  useEffect(() => {
    if (!api) return;
    const sub = api.onDidLayoutChange(() => setTick((t) => t + 1));
    return () => sub.dispose();
  }, [api]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".pi-dock-menu")) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  if (!api) return null;
  void tick;

  const items: MenuItem[] = [];

  for (const def of BUILTIN_PANELS) {
    const panel = api.getPanel(def.id);
    items.push({
      panelId: def.id,
      title: def.title,
      iconKey: def.iconKey,
      isOpen: !!panel,
      onToggle: () => {
        if (panel) panel.api.close();
        else addBuiltinPanel(api, def);
      },
    });
  }

  for (const ext of extensions.values()) {
    const panelId = extensionPanelId(ext.id);
    const panel = api.getPanel(panelId);
    items.push({
      panelId,
      title: ext.title,
      iconKey: "Plus",
      isOpen: !!panel,
      onToggle: () => {
        if (panel) panel.api.close();
        else addExtensionPanel(ext.id, ext.title);
      },
    });
  }

  return (
    <div className="pi-dock-menu">
      <button
        type="button"
        className="pi-dock-menu__button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Panel menu"
        aria-expanded={open}
      >
        <Icon.Drag width={14} height={14} />
      </button>
      {open && (
        <div className="pi-dock-menu__list" role="menu">
          <div className="pi-dock-menu__heading">Panels</div>
          {items.map((item) => {
            const IconComp = Icon[item.iconKey];
            return (
              <button
                key={item.panelId}
                type="button"
                role="menuitemcheckbox"
                aria-checked={item.isOpen}
                className="pi-dock-menu__item"
                onClick={() => {
                  item.onToggle();
                  setOpen(false);
                }}
              >
                <span className="pi-dock-menu__check">
                  {item.isOpen && <Icon.Check width={10} height={10} />}
                </span>
                <span className="pi-dock-menu__icon">
                  <IconComp width={12} height={12} />
                </span>
                <span className="pi-dock-menu__label">{item.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Shell() {
  const initialized = useRef(false);
  const [api, setApi] = useState<DockviewApi | null>(null);
  const openFile = useFileViewStore((s) => s.openFile);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    dockApi = event.api;
    setApi(event.api);

    if (!initialized.current) {
      initialized.current = true;
      const restored = tryRestoreLayout(event.api);
      if (!restored) buildDefaultLayout(event.api);

      while (pendingExtensions.length) {
        const ext = pendingExtensions.shift()!;
        addExtensionPanel(ext.id, ext.title, ext.iconKey);
      }
    }

    event.api.onDidLayoutChange(() => persist(event.api));

    // Suppress drop overlay on source group's content/edge zones — dropping
    // a tab onto its own group is a no-op, and the overlay obscures the
    // source while dragging. Allow `tab` kind so same-group tab reorder
    // still works.
    event.api.onWillShowOverlay((e) => {
      if (e.kind === "tab") return;
      const data = e.getData();
      if (data && e.group && data.groupId === e.group.id) {
        e.preventDefault();
      }
    });
  }, []);

  // When a markdown file is opened from the transcript, ensure the markdown
  // panel is visible and focused.
  useEffect(() => {
    if (!openFile || !dockApi) return;
    const panel = dockApi.getPanel("markdown");
    if (panel) {
      panel.focus();
    } else {
      const referencePanel =
        dockApi.getPanel("tools") ?? dockApi.getPanel("chat");
      dockApi.addPanel({
        id: "markdown",
        component: "markdown",
        title: "Markdown",
        params: { iconKey: "File" as IconKey },
        position: referencePanel
          ? { referencePanel: referencePanel.id, direction: "within" }
          : undefined,
      });
    }
  }, [openFile]);

  return (
    <div className="pi-dock-shell">
      <DockviewReact
        theme={emberTheme}
        components={panelComponents}
        defaultTabComponent={EmberTab}
        onReady={onReady}
        className="pi-dock-root"
      />
      <PanelMenu api={api} />
    </div>
  );
}
