import React from "react";
import type { ContextMenuAction } from "../types";

interface ContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  actions: ContextMenuAction[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  visible,
  actions,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <div
      className="context-menu-overlay"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        className="context-menu"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map((action, i) =>
          action.separator ? (
            <div key={i} className="context-menu-separator" />
          ) : (
            <button
              key={i}
              className="context-menu-item"
              onClick={() => {
                action.action();
                onClose();
              }}
              disabled={action.disabled}
            >
              {action.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
};

export default React.memo(ContextMenu);
