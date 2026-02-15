import { invoke } from "@tauri-apps/api/core";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
  checked?: boolean;
}

interface MenuBarProps {
  onNewFolder: () => void;
  onNewFile: () => void;
  onOpenSettings: () => void;
  onOpenTerminal: () => void;
  onOpenRecycleBin: () => void;
  onToggleHidden: () => void;
  onTogglePreview: () => void;
  onRefresh: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onDelete: () => void;
  showHidden: boolean;
  previewOpen: boolean;
  viewMode: string;
  onViewModeChange: (mode: "grid" | "list" | "details") => void;
  canGoBack: boolean;
  canGoForward: boolean;
  clipboard: {
    items?: unknown[];
    paths?: string[];
    operation: "copy" | "cut";
  } | null;
  hasSelection: boolean;
}

const MenuBar: React.FC<MenuBarProps> = ({
  onNewFolder,
  onNewFile,
  onOpenSettings,
  onOpenTerminal,
  onOpenRecycleBin,
  onToggleHidden,
  onTogglePreview,
  onRefresh,
  onGoBack,
  onGoForward,
  onGoUp,
  onCopy,
  onCut,
  onPaste,
  onSelectAll,
  onDelete,
  showHidden,
  previewOpen,
  viewMode,
  onViewModeChange,
  canGoBack,
  canGoForward,
  clipboard,
  hasSelection,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [autostart, setAutostart] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check autostart state on mount
  useEffect(() => {
    invoke<boolean>("get_autostart_state")
      .then(setAutostart)
      .catch(() => setAutostart(false));
  }, []);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    },
    [menuRef],
  );

  useEffect(() => {
    if (openMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenu, handleClickOutside]);

  const handleQuit = useCallback(async () => {
    await invoke("quit_app");
  }, []);

  const toggleAutostart = useCallback(async () => {
    const newState = !autostart;
    try {
      await invoke("toggle_autostart", { enable: newState });
      setAutostart(newState);
    } catch (err) {
      console.error("Failed to toggle autostart:", err);
    }
  }, [autostart]);

  const fileMenu: MenuItem[] = [
    { label: "New Folder", shortcut: "Ctrl+Shift+N", action: onNewFolder },
    { label: "New File", shortcut: "Ctrl+N", action: onNewFile },
    { separator: true, label: "" },
    { label: "Open Terminal", shortcut: "Ctrl+`", action: onOpenTerminal },
    { separator: true, label: "" },
    { label: "Settings", shortcut: "Ctrl+,", action: onOpenSettings },
    { separator: true, label: "" },
    { label: "Exit", shortcut: "Alt+F4", action: handleQuit },
  ];

  const editMenu: MenuItem[] = [
    {
      label: "Cut",
      shortcut: "Ctrl+X",
      action: onCut,
      disabled: !hasSelection,
    },
    {
      label: "Copy",
      shortcut: "Ctrl+C",
      action: onCopy,
      disabled: !hasSelection,
    },
    {
      label: "Paste",
      shortcut: "Ctrl+V",
      action: onPaste,
      disabled: !clipboard,
    },
    { separator: true, label: "" },
    { label: "Select All", shortcut: "Ctrl+A", action: onSelectAll },
    { separator: true, label: "" },
    {
      label: "Delete",
      shortcut: "Delete",
      action: onDelete,
      disabled: !hasSelection,
    },
  ];

  const viewMenu: MenuItem[] = [
    {
      label: "Grid View",
      action: () => onViewModeChange("grid"),
      checked: viewMode === "grid",
    },
    {
      label: "List View",
      action: () => onViewModeChange("list"),
      checked: viewMode === "list",
    },
    {
      label: "Details View",
      action: () => onViewModeChange("details"),
      checked: viewMode === "details",
    },
    { separator: true, label: "" },
    {
      label: "Show Hidden Files",
      shortcut: "Ctrl+H",
      action: onToggleHidden,
      checked: showHidden,
    },
    {
      label: "Preview Panel",
      shortcut: "Ctrl+P",
      action: onTogglePreview,
      checked: previewOpen,
    },
    { separator: true, label: "" },
    { label: "Refresh", shortcut: "F5", action: onRefresh },
  ];

  const goMenu: MenuItem[] = [
    {
      label: "Back",
      shortcut: "Alt+←",
      action: onGoBack,
      disabled: !canGoBack,
    },
    {
      label: "Forward",
      shortcut: "Alt+→",
      action: onGoForward,
      disabled: !canGoForward,
    },
    { label: "Up", shortcut: "Alt+↑", action: onGoUp },
  ];

  const toolsMenu: MenuItem[] = [
    {
      label: "Recycle Bin",
      action: onOpenRecycleBin,
    },
    { separator: true, label: "" },
    {
      label: "Start with Windows",
      action: toggleAutostart,
      checked: autostart,
    },
    { separator: true, label: "" },
    {
      label: "Check for Updates",
      action: async () => {
        try {
          const version = await invoke<string | null>("check_for_updates");
          if (version) {
            alert(`Update available: v${version}`);
          } else {
            alert("You're up to date!");
          }
        } catch (err) {
          alert(`Update check failed: ${err}`);
        }
      },
    },
  ];

  const helpMenu: MenuItem[] = [
    {
      label: "Keyboard Shortcuts",
      shortcut: "Ctrl+?",
      action: () => {
        alert(
          "Keyboard Shortcuts:\n\nCtrl+N - New File\nCtrl+Shift+N - New Folder\nCtrl+C/X/V - Copy/Cut/Paste\nDelete - Delete\nF2 - Rename\nF5 - Refresh\nCtrl+H - Toggle Hidden\nAlt+Enter - Properties",
        );
      },
    },
    { separator: true, label: "" },
    {
      label: "About Fluent File Explorer",
      action: () => {
        alert(
          "Fluent File Explorer v1.0.0\n\nA modern, native file manager built with Tauri and React.\n\n© 2024 Fluent Apps",
        );
      },
    },
  ];

  const menus = [
    { id: "file", label: "File", items: fileMenu },
    { id: "edit", label: "Edit", items: editMenu },
    { id: "view", label: "View", items: viewMenu },
    { id: "go", label: "Go", items: goMenu },
    { id: "tools", label: "Tools", items: toolsMenu },
    { id: "help", label: "Help", items: helpMenu },
  ];

  const handleMenuClick = (menuId: string) => {
    setOpenMenu(openMenu === menuId ? null : menuId);
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled || item.separator) return;
    item.action?.();
    setOpenMenu(null);
  };

  const handleMenuHover = (menuId: string) => {
    if (openMenu) {
      setOpenMenu(menuId);
    }
  };

  return (
    <div className="menubar" ref={menuRef}>
      {menus.map((menu) => (
        <div
          key={menu.id}
          className={`menubar-item ${openMenu === menu.id ? "active" : ""}`}
          onClick={() => handleMenuClick(menu.id)}
          onMouseEnter={() => handleMenuHover(menu.id)}
        >
          <span className="menubar-label">{menu.label}</span>
          {openMenu === menu.id && (
            <div className="menubar-dropdown">
              {menu.items.map((item, idx) =>
                item.separator ? (
                  <div key={idx} className="menubar-separator" />
                ) : (
                  <div
                    key={idx}
                    className={`menubar-dropdown-item ${item.disabled ? "disabled" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(item);
                    }}
                  >
                    <span className="menubar-check">
                      {item.checked ? "✓" : ""}
                    </span>
                    <span className="menubar-item-label">{item.label}</span>
                    {item.shortcut && (
                      <span className="menubar-shortcut">{item.shortcut}</span>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MenuBar;
