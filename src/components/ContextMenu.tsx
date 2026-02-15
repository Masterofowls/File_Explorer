import React, { useEffect, useRef } from "react";
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to keep menu on screen
  useEffect(() => {
    if (!visible || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let adjustedX = x;
    let adjustedY = y;
    if (x + rect.width > vw - 8) adjustedX = vw - rect.width - 8;
    if (y + rect.height > vh - 8) adjustedY = vh - rect.height - 8;
    if (adjustedX < 8) adjustedX = 8;
    if (adjustedY < 8) adjustedY = 8;
    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;
  }, [x, y, visible]);

  if (!visible) return null;

  // Filter out actions with empty labels that aren't separators
  const filteredActions = actions.filter(
    (a) => a.separator || a.label.length > 0,
  );

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
        ref={menuRef}
        className="context-menu"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        {filteredActions.map((action, i) =>
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
              {action.icon && (
                <span className="context-menu-icon">{action.icon}</span>
              )}
              <span className="context-menu-label">{action.label}</span>
              {action.shortcut && (
                <span className="context-menu-shortcut">{action.shortcut}</span>
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
};

export default React.memo(ContextMenu);
