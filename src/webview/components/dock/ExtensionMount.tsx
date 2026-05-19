import type { IDockviewPanelProps } from "dockview-react";
import { usePiStore } from "../../stores/pi-store";
import { useExtensionsStore } from "../../stores/extensions-store";

interface MountParams {
  extensionId: string;
}

export function ExtensionMount(props: IDockviewPanelProps<MountParams>) {
  const extensionId = props.params?.extensionId;
  const entry = useExtensionsStore((s) =>
    extensionId ? s.extensions.get(extensionId) : undefined
  );
  const pi = usePiStore();

  if (!extensionId) {
    return <div className="extension-mount-error">Missing extensionId</div>;
  }

  if (!entry) {
    return <div className="extension-mount-placeholder">Reloading…</div>;
  }

  const Component = entry.Component;
  return (
    <div className="extension-panel">
      <Component pi={pi} />
    </div>
  );
}
