import { useCallback, useEffect, useState } from "react";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type DockviewTheme,
} from "dockview-react";
import { EmberTab } from "./EmberTab";
import { Icon } from "../ember";
import { usePi } from "../../lib/use-pi";
import { usePiStore } from "../../stores/pi-store";
import { useExtensionsStore } from "../../stores/extensions-store";
import {
  loadDockStorage,
  markClosed,
  persistLayout,
  flushLayout,
  tryRestoreLayout,
} from "./persistence";
import {
  BUILTIN_PANELS,
  panelComponents,
  addBuiltinPanel,
  addExtensionPanel,
  buildDefaultLayout,
  extensionPanelId,
  setDockApi,
  flushPendingExtensions,
} from "./panel-registry";

type IconKey = keyof typeof Icon;

// ── Ember dock theme ──

const emberTheme: DockviewTheme = {
  name: "ember",
  className: "pi-dock-ember",
  dndOverlayMounting: "absolute",
  dndPanelOverlay: "content",
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
  const needsRestart = usePi((s) => s.needsRestart);
  const _setNeedsRestart = usePi((s) => s._setNeedsRestart);

  const handleReload = useCallback(() => {
    _setNeedsRestart(false);
    Neutralino?.events.broadcast("pi:input", {
      type: "reload_backend",
      payload: {},
    }).catch((err: any) =>
      console.error("reload broadcast failed:", err)
    );
    setTimeout(() => window.location.reload(), 300);
  }, [_setNeedsRestart]);
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
        else addBuiltinPanel(api, def, { userInitiated: true });
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
        else addExtensionPanel(ext.id, ext.title, "Plus");
      },
    });
  }

  return (
    <div className="pi-dock-menu">
      {needsRestart && (
        <button
          type="button"
          className="pi-dock-menu__button pi-dock-menu__restart"
          onClick={handleReload}
          title="Backend source changed — click to reload"
        >
          <span className="pi-dock-restart-dot" />
          Reload ↻
        </button>
      )}
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
  const [api, setApi] = useState<DockviewApi | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [layoutDebug, setLayoutDebug] = useState("");

  useEffect(() => {
    loadDockStorage().then(() => setStorageLoaded(true));
  }, []);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    setDockApi(event.api);
    setApi(event.api);

    // ── Register persist handler BEFORE any layout mutations ──
    // buildDefaultLayout → addPanel fires onDidLayoutChange synchonously
    // during the same call stack. If we register after, the first save is
    // missed and the .neustorage file stays 0 bytes on disk.
    event.api.onDidLayoutChange(() => persistLayout(event.api));

    // NOTE: No `initialized` guard. React Strict Mode double-mounts in
    // development — the first mount's Dockview instance is destroyed on
    // unmount, but `useRef` is preserved across remount. If we skipped
    // setup on the second onReady, the new Dockview instance would have
    // zero panels → empty window.
    //
    // Both tryRestoreLayout and buildDefaultLayout are idempotent:
    // fromJSON replaces the grid; addBuiltinPanel checks getPanel() first.

    const restored = tryRestoreLayout(event.api);
    if (!restored) {
      if (event.api.panels.length === 0) {
        setLayoutDebug('No saved layout — using default');
        buildDefaultLayout(event.api);
      } else {
        setLayoutDebug(`Layout already active (${event.api.panels.length} panels)`);
      }
    } else {
      setLayoutDebug(`Layout restored: ${event.api.panels.length} panels`);
    }

    // Belt-and-suspenders: persist the initial state immediately after
    // layout setup, so even if onDidLayoutChange wasn't dispatched we
    // have a saved snapshot.
    persistLayout(event.api);

    // Register extension panels that were queued before onReady
    flushPendingExtensions();

    event.api.onDidRemovePanel((panel) => {
      markClosed(panel.id);
    });

    // ── UI Command Dispatcher ──
    Neutralino?.events.on("pi:ui_command", (raw: any) => {
      const { verb, target } = raw.detail || {};
      const [subVerb, id] = (target || "").trim().split(/\s+/);

      if (verb === "login") {
        // Trigger login UI — target is the optional provider ID
        usePiStore.getState()._loginStart(target || undefined);
        return;
      }
      if (verb === "logout") {
        if (target) {
          Neutralino?.extensions.dispatch("pi-backend", "pi:input", { type: "logout", payload: { providerId: target } });
          usePiStore.getState()._addNotice(`Logged out: ${target}`);
        }
        return;
      }

      if (verb === "panel") {
        if (subVerb === "open" && id) {
          const builtin = BUILTIN_PANELS.find((p) => p.id === id);
          if (builtin) {
            addBuiltinPanel(event.api, builtin, { userInitiated: true });
          } else {
            const ext = useExtensionsStore.getState().extensions.get(id);
            if (ext) {
              addExtensionPanel(ext.id, ext.title, "Plus");
            } else {
              usePiStore.getState()._addNotice(`Unknown panel ID: ${id}`, true);
              return;
            }
          }
          usePiStore.getState()._addNotice(`Opened panel: ${id}`);
        } else if (subVerb === "close" && id) {
          const panel = event.api.getPanel(id) ?? event.api.getPanel(extensionPanelId(id));
          if (panel) {
            panel.api.close();
            usePiStore.getState()._addNotice(`Closed panel: ${id}`);
          } else {
            usePiStore.getState()._addNotice(`Panel not open: ${id}`, true);
          }
        } else if (subVerb === "focus" && id) {
          const panel = event.api.getPanel(id) ?? event.api.getPanel(extensionPanelId(id));
          if (panel) {
            panel.focus();
            usePiStore.getState()._addNotice(`Focused panel: ${id}`);
          } else {
            usePiStore.getState()._addNotice(`Panel not open: ${id}`, true);
          }
        } else if (subVerb === "list") {
          const builtins = BUILTIN_PANELS.map((p) => {
            const open = !!event.api.getPanel(p.id);
            return `${open ? "●" : "○"} ${p.id} (builtin)`;
          });
          const extensions = Array.from(useExtensionsStore.getState().extensions.values()).map((e) => {
            const open = !!event.api.getPanel(extensionPanelId(e.id));
            return `${open ? "●" : "○"} ${e.id} (extension)`;
          });
          const text = ["Panels:", ...builtins, ...extensions].join("\n");
          usePiStore.getState()._addNotice(text);
        }
      }
    });

    const flush = () => flushLayout(event.api);
    window.addEventListener("beforeunload", flush);
    if (typeof Neutralino !== "undefined") {
      Neutralino.events.on("windowClose", flush);
    }

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

    // Cleanup on unmount
    return () => {
      window.removeEventListener("beforeunload", flush);
    };
  }, []);

  if (!storageLoaded) {
    return (
      <div className="pi-dock-shell pi-dock-shell--loading">
        <div className="pi-dock-debug">{layoutDebug || 'Loading layout...'}</div>
      </div>
    );
  }

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
      {layoutDebug && (
        <div className="pi-dock-debug">{layoutDebug}</div>
      )}
    </div>
  );
}