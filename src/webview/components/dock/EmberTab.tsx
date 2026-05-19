import type { IDockviewPanelHeaderProps } from "dockview-react";
import { Icon } from "../ember";

type IconKey = keyof typeof Icon;

interface TabParams {
  iconKey?: IconKey;
  closable?: boolean;
}

export function EmberTab(props: IDockviewPanelHeaderProps<TabParams>) {
  const title = props.api.title ?? props.api.id;
  const iconKey = props.params?.iconKey;
  const closable = props.params?.closable ?? false;
  const IconComp = iconKey ? Icon[iconKey] : null;

  return (
    <div className="pi-dock-tab">
      {IconComp && (
        <span className="pi-dock-tab__icon">
          <IconComp width={12} height={12} />
        </span>
      )}
      <span className="pi-dock-tab__title">{title}</span>
      {closable && (
        <button
          type="button"
          className="pi-dock-tab__close"
          onClick={(e) => {
            e.stopPropagation();
            props.api.close();
          }}
          aria-label="Close"
        >
          <Icon.X width={10} height={10} />
        </button>
      )}
    </div>
  );
}
