import { invoke } from "@tauri-apps/api/core";
import React, { useCallback, useEffect, useState } from "react";
import "./App.css";
import BatchRenameDialog from "./components/BatchRenameDialog";
import Breadcrumb from "./components/Breadcrumb";
import ContextMenu from "./components/ContextMenu";
import DebugPanel from "./components/DebugPanel";
import FileList from "./components/FileList";
import MenuBar from "./components/MenuBar";
import NewItemDialog from "./components/NewItemDialog";
import PreviewPanel from "./components/PreviewPanel";
import PropertiesDialog from "./components/PropertiesDialog";

import RenameDialog from "./components/RenameDialog";
import SearchBar from "./components/SearchBar";
import SettingsDialog from "./components/SettingsDialog";
import Sidebar from "./components/Sidebar";
import StatusBar from "./components/StatusBar";
import TabBar from "./components/TabBar";
import TemplateDialog from "./components/TemplateDialog";
import TerminalPanel from "./components/TerminalPanel";
import TitleBar from "./components/TitleBar";
import Toolbar from "./components/Toolbar";
import { useBookmarks } from "./hooks/useBookmarks";
import { useContextMenu } from "./hooks/useContextMenu";
import { useDragDrop } from "./hooks/useDragDrop";
import { useFileSystem } from "./hooks/useFileSystem";
import { useSettings } from "./hooks/useSettings";
import "./styles/debug.css";
import type {
  ContextMenuAction,
  ExplorerTab,
  FileEntry,
  FileFilterType,
  GroupBy,
  ViewMode,
} from "./types";
import { debugLogger } from "./utils/debugLogger";

const App: React.FC = () => {
  const fs = useFileSystem();
  const { menu, showContextMenu, hideContextMenu } = useContextMenu();
  const { bookmarks, addBookmark, removeBookmark, isBookmarked } =
    useBookmarks();
  const { settings, updateSetting, resetSettings } = useSettings();

  const dragDrop = useDragDrop({
    currentPath: fs.currentPath,
    selectedItems: fs.selectedItems,
    entries: fs.entries,
    onRefresh: fs.refresh,
    onError: (msg) => fs.setError(msg),
  });

  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultViewMode);
  const [activeFilter, setActiveFilter] = useState<FileFilterType>("all");
  const [activeGroupBy, setActiveGroupBy] = useState<GroupBy>("none");
  const [newItemDialog, setNewItemDialog] = useState<{
    visible: boolean;
    type: "file" | "folder";
  }>({ visible: false, type: "folder" });
  const [renameDialog, setRenameDialog] = useState<{
    visible: boolean;
    path: string;
    name: string;
  }>({ visible: false, path: "", name: "" });
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(settings.terminalHeight);
  const [propertiesDialog, setPropertiesDialog] = useState<{
    visible: boolean;
    path: string;
  }>({ visible: false, path: "" });
  const [batchRenameDialog, setBatchRenameDialog] = useState<{
    visible: boolean;
    files: string[];
  }>({ visible: false, files: [] });
  const [debugOpen, setDebugOpen] = useState(false);

  // Tab state management with persistence
  const [tabs, setTabs] = useState<ExplorerTab[]>(() => {
    try {
      const saved = localStorage.getItem("explorer_tabs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load saved tabs:", e);
    }
    return [
      {
        id: "1",
        path: fs.currentPath,
        label: fs.currentPath.split(/[\\/]/).pop() || fs.currentPath,
      },
    ];
  });
  const [activeTabId, setActiveTabId] = useState(() => {
    try {
      const saved = localStorage.getItem("explorer_active_tab");
      if (saved && tabs.find((t) => t.id === saved)) {
        return saved;
      }
    } catch (e) {
      console.error("Failed to load active tab:", e);
    }
    return tabs[0]?.id || "1";
  });

  // Update active tab when path changes
  useEffect(() => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              path: fs.currentPath,
              label: fs.currentPath.split(/[\\/]/).pop() || fs.currentPath,
            }
          : tab,
      ),
    );
  }, [fs.currentPath, activeTabId]);

  // Persist tabs and active tab to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("explorer_tabs", JSON.stringify(tabs));
      localStorage.setItem("explorer_active_tab", activeTabId);
    } catch (e) {
      console.error("Failed to persist tabs:", e);
    }
  }, [tabs, activeTabId]);

  const handleNewTab = useCallback(() => {
    const newId = String(Date.now());
    setTabs((prev) => [
      ...prev,
      {
        id: newId,
        path: fs.currentPath,
        label: fs.currentPath.split(/[\\/]/).pop() || fs.currentPath,
      },
    ]);
    setActiveTabId(newId);
  }, [fs.currentPath]);

  const handleTabSelect = useCallback(
    (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (tab && tab.path !== fs.currentPath) {
        fs.navigateTo(tab.path);
      }
      setActiveTabId(tabId);
    },
    [tabs, fs],
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return;
      const idx = tabs.findIndex((t) => t.id === tabId);
      const newTabs = tabs.filter((t) => t.id !== tabId);
      setTabs(newTabs);
      if (activeTabId === tabId) {
        const newActiveIdx = Math.min(idx, newTabs.length - 1);
        const newActiveTab = newTabs[newActiveIdx];
        setActiveTabId(newActiveTab.id);
        fs.navigateTo(newActiveTab.path);
      }
    },
    [tabs, activeTabId, fs],
  );

  // Filter entries based on activeFilter
  const filteredEntries = React.useMemo(() => {
    if (activeFilter === "all") return fs.entries;

    const extensionGroups: Record<FileFilterType, string[]> = {
      all: [],
      folders: [],
      documents: [
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".txt",
        ".rtf",
        ".odt",
        ".ods",
        ".odp",
      ],
      images: [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".svg",
        ".webp",
        ".ico",
        ".tiff",
      ],
      videos: [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"],
      audio: [".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a"],
      archives: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"],
      code: [
        ".js",
        ".ts",
        ".tsx",
        ".jsx",
        ".py",
        ".java",
        ".c",
        ".cpp",
        ".h",
        ".cs",
        ".go",
        ".rs",
        ".rb",
        ".php",
        ".html",
        ".css",
        ".scss",
        ".json",
        ".xml",
        ".yaml",
        ".yml",
        ".md",
        ".sql",
      ],
    };

    return fs.entries.filter((entry) => {
      if (activeFilter === "folders") {
        return entry.is_dir;
      }
      if (entry.is_dir) return false;

      const ext = entry.name.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
      return extensionGroups[activeFilter].includes(ext);
    });
  }, [fs.entries, activeFilter]);

  // Apply settings: sidebarWidth CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${settings.sidebarWidth}px`,
    );
  }, [settings.sidebarWidth]);

  // Apply settings: showHiddenByDefault on mount
  useEffect(() => {
    if (settings.showHiddenByDefault && !fs.showHidden) {
      fs.toggleHidden();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply settings: default sort on mount
  useEffect(() => {
    fs.setSortConfig({
      field: settings.defaultSortField,
      direction: settings.defaultSortDirection,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply settings: terminal height syncs
  useEffect(() => {
    setTerminalHeight(settings.terminalHeight);
  }, [settings.terminalHeight]);

  // Recycle bin tab handler
  const handleOpenRecycleBin = useCallback(() => {
    debugLogger.info(
      "ui",
      "[RECYCLE BIN] Sidebar clicked - opening recycle bin",
    );
    const recycleBinPath = "recycle:///";
    debugLogger.info(
      "ui",
      `[RECYCLE BIN] Looking for existing tab with path: ${recycleBinPath}`,
    );

    const existingTab = tabs.find((t) => t.path === recycleBinPath);
    debugLogger.info(
      "ui",
      `[RECYCLE BIN] Existing tab found: ${existingTab ? "yes" : "no"}`,
      {
        existingTabId: existingTab?.id,
        totalTabs: tabs.length,
      },
    );

    if (existingTab) {
      debugLogger.info(
        "ui",
        `[RECYCLE BIN] Switching to existing tab: ${existingTab.id}`,
      );
      setActiveTabId(existingTab.id);
      fs.navigateTo(recycleBinPath);
    } else {
      debugLogger.info("ui", "[RECYCLE BIN] Creating new tab for recycle bin");
      const newId = String(Date.now());
      setTabs((prev) => {
        const newTabs = [
          ...prev,
          {
            id: newId,
            path: recycleBinPath,
            label: "Recycle Bin",
          },
        ];
        debugLogger.info("ui", "[RECYCLE BIN] Tab created", {
          newId,
          totalTabs: newTabs.length,
        });
        return newTabs;
      });
      setActiveTabId(newId);
      debugLogger.info("ui", `[RECYCLE BIN] Navigating to: ${recycleBinPath}`);
      fs.navigateTo(recycleBinPath);
    }
  }, [tabs, fs]);
  const handleDelete = useCallback(
    (useTrash = true) => {
      if (fs.selectedItems.size === 0) return;
      if (settings.confirmDelete) {
        const count = fs.selectedItems.size;
        const msg =
          count === 1
            ? "Are you sure you want to delete this item?"
            : `Are you sure you want to delete ${count} items?`;
        if (!window.confirm(msg)) return;
      }
      fs.deleteSelected(useTrash);
    },
    [fs, settings.confirmDelete],
  );

  // Auto-switch preview when selection changes
  useEffect(() => {
    if (!previewOpen && !settings.showPreviewOnSelect) return;
    const selected = Array.from(fs.selectedItems);
    if (selected.length === 1) {
      const entry = fs.entries.find((e) => e.path === selected[0]);
      if (entry && !entry.is_dir) {
        setPreviewFile(entry);
        if (settings.showPreviewOnSelect) {
          setPreviewOpen(true);
        }
      }
    }
  }, [fs.selectedItems, fs.entries, previewOpen, settings.showPreviewOnSelect]);

  const togglePreview = useCallback(
    (entry?: FileEntry) => {
      if (entry) {
        if (entry.is_dir) return;
        setPreviewFile((prev) => (prev?.path === entry.path ? null : entry));
        setPreviewOpen(true);
      } else {
        setPreviewOpen((prev) => !prev);
        if (!previewFile) {
          const selected = Array.from(fs.selectedItems);
          if (selected.length === 1) {
            const e = fs.entries.find((e) => e.path === selected[0]);
            if (e && !e.is_dir) setPreviewFile(e);
          }
        }
      }
    },
    [previewFile, fs.selectedItems, fs.entries],
  );

  const getItemActions = useCallback(
    (entry: FileEntry): ContextMenuAction[] => {
      const isArchive = [".zip", ".7z", ".rar", ".tar", ".gz"].some((ext) =>
        entry.name.toLowerCase().endsWith(ext),
      );
      const isInRecycleBin = fs.currentPath === "Recycle Bin";

      return [
        {
          label: entry.is_dir ? "Open" : "Open File",
          action: () => fs.openItem(entry),
        },
        ...(entry.is_dir
          ? [
              {
                label: "Open in New Tab",
                action: () => {
                  const newTabId = String(Date.now());
                  setTabs((prev) => [
                    ...prev,
                    {
                      id: newTabId,
                      path: entry.path,
                      label: entry.name,
                    },
                  ]);
                  setActiveTabId(newTabId);
                  fs.navigateTo(entry.path);
                  hideContextMenu();
                  debugLogger.info(
                    "ui",
                    `[TAB] Opened new tab: ${entry.name}`,
                    {
                      path: entry.path,
                      tabId: newTabId,
                    },
                  );
                },
                shortcut: "Ctrl+T",
              } as ContextMenuAction,
            ]
          : [
              {
                label: "Preview",
                action: () => togglePreview(entry),
                shortcut: "Space",
              } as ContextMenuAction,
              {
                label: "Open With...",
                action: async () => {
                  try {
                    const apps = await invoke<Array<[string, string]>>(
                      "get_open_with_apps",
                      { path: entry.path },
                    );

                    if (apps.length === 0) {
                      fs.setError("No applications found");
                      return;
                    }

                    // Create a simple app selector via confirm dialogs
                    const appList = apps.map(([name]) => name).join(", ");
                    const appNames = prompt(
                      `Select an app to open ${entry.name}:\n\nAvailable apps:\n${appList}`,
                      apps[0]?.[0] || "",
                    );

                    if (appNames) {
                      const selectedApp = apps.find(
                        ([name]) => name === appNames,
                      );
                      if (selectedApp) {
                        await invoke("open_with_app", {
                          filePath: entry.path,
                          appPath: selectedApp[1],
                        });
                      }
                    }
                  } catch (err) {
                    fs.setError(`Failed to open with app: ${err}`);
                  }
                },
              } as ContextMenuAction,
            ]),
        ...(isArchive
          ? [
              {
                label: "Extract Here",
                action: async () => {
                  const outputDir = entry.path.replace(/\.[^.]+$/, "");
                  try {
                    await invoke("extract_archive", {
                      archivePath: entry.path,
                      outputDir,
                    });
                    await invoke("send_notification", {
                      title: "Extraction Complete",
                      body: `Extracted to ${outputDir}`,
                    });
                    fs.refresh();
                  } catch (err) {
                    fs.setError(`Failed to extract: ${err}`);
                  }
                },
              } as ContextMenuAction,
            ]
          : []),
        { label: "", action: () => {}, separator: true },
        {
          label: "Compress to ZIP",
          action: async () => {
            const selectedPaths =
              fs.selectedItems.size > 0
                ? Array.from(fs.selectedItems)
                : [entry.path];
            const outputPath =
              selectedPaths.length === 1
                ? `${selectedPaths[0]}.zip`
                : `${fs.currentPath}\\Archive.zip`;
            try {
              await invoke("compress_items", {
                paths: selectedPaths,
                outputPath,
              });
              await invoke("send_notification", {
                title: "Compression Complete",
                body: `Created ${outputPath.split("\\").pop()}`,
              });
              fs.refresh();
            } catch (err) {
              fs.setError(`Failed to compress: ${err}`);
            }
          },
        },
        { label: "", action: () => {}, separator: true },
        {
          label: "Cut",
          shortcut: "Ctrl+X",
          action: () => {
            if (!fs.selectedItems.has(entry.path)) {
              fs.selectItem(entry.path, false);
            }
            fs.cutSelected();
          },
        },
        {
          label: "Copy",
          shortcut: "Ctrl+C",
          action: () => {
            if (!fs.selectedItems.has(entry.path)) {
              fs.selectItem(entry.path, false);
            }
            fs.copySelected();
          },
        },
        {
          label: "Copy Path",
          action: () => {
            invoke("copy_path_to_clipboard", { path: entry.path }).catch(
              (err) => fs.setError(`Failed to copy path: ${err}`),
            );
          },
        },
        { label: "", action: () => {}, separator: true },
        {
          label: "Rename",
          shortcut: "F2",
          action: () =>
            setRenameDialog({
              visible: true,
              path: entry.path,
              name: entry.name,
            }),
        },
        ...(fs.selectedItems.size > 1
          ? [
              {
                label: "Batch Rename...",
                action: () => {
                  const selectedPaths = Array.from(fs.selectedItems).filter(
                    (p) => fs.entries.find((e) => e.path === p && !e.is_dir),
                  );
                  if (selectedPaths.length > 0) {
                    setBatchRenameDialog({
                      visible: true,
                      files: selectedPaths,
                    });
                  }
                },
              } as ContextMenuAction,
            ]
          : []),
        {
          label: "Duplicate",
          shortcut: "Ctrl+D",
          action: async () => {
            try {
              const newPath = await invoke<string>("duplicate_item", {
                path: entry.path,
              });
              fs.refresh();
              await invoke("send_notification", {
                title: "Item Duplicated",
                body: `Created ${newPath.split("\\").pop()}`,
              });
            } catch (err) {
              fs.setError(`Failed to duplicate: ${err}`);
            }
          },
        },
        {
          label: "Create Shortcut",
          action: async () => {
            const linkPath = `${entry.path} - Shortcut`;
            try {
              await invoke("create_shortcut", { source: entry.path, linkPath });
              fs.refresh();
            } catch (err) {
              fs.setError(`Failed to create shortcut: ${err}`);
            }
          },
        },
        ...(isInRecycleBin
          ? [
              {
                label: "Restore",
                action: async () => {
                  try {
                    // Use the name as the item identifier for restore
                    await invoke("restore_from_recycle_bin", {
                      itemName: entry.name,
                    });
                    await invoke("send_notification", {
                      title: "Item Restored",
                      body: `${entry.name} has been restored`,
                    });
                    fs.refresh();
                  } catch (err) {
                    fs.setError(`Failed to restore: ${err}`);
                  }
                },
              } as ContextMenuAction,
              {
                label: "Permanently Delete",
                shortcut: "Del",
                action: async () => {
                  if (
                    !confirm(
                      `Permanently delete "${entry.name}"? This cannot be undone.`,
                    )
                  ) {
                    return;
                  }
                  try {
                    // Permanently delete from recycle bin
                    await invoke("delete_item", {
                      path: entry.path,
                      useTrash: false,
                    });
                    await invoke("send_notification", {
                      title: "Item Deleted",
                      body: `${entry.name} has been permanently deleted`,
                    });
                    fs.refresh();
                  } catch (err) {
                    fs.setError(`Failed to delete: ${err}`);
                  }
                },
              } as ContextMenuAction,
            ]
          : [
              {
                label: "Move to Trash",
                shortcut: "Del",
                action: () => {
                  if (!fs.selectedItems.has(entry.path)) {
                    fs.selectItem(entry.path, false);
                  }
                  handleDelete(true);
                },
              } as ContextMenuAction,
            ]),
        { label: "", action: () => {}, separator: true },
        ...(entry.is_dir
          ? [
              {
                label: isBookmarked(entry.path)
                  ? "Remove Bookmark"
                  : "Add to Bookmarks",
                action: () => {
                  if (isBookmarked(entry.path)) {
                    const bm = bookmarks.find((b) => b.path === entry.path);
                    if (bm) removeBookmark(bm.id);
                  } else {
                    addBookmark(entry.name, entry.path);
                  }
                },
              } as ContextMenuAction,
              {
                label: "Open in Terminal",
                action: () => {
                  invoke("open_in_terminal", { path: entry.path }).catch(
                    (err) => fs.setError(`Failed to open terminal: ${err}`),
                  );
                },
              } as ContextMenuAction,
              {
                label: "",
                action: () => {},
                separator: true,
              } as ContextMenuAction,
            ]
          : []),
        {
          label: "Show in Explorer",
          action: () => {
            invoke("show_in_explorer", { path: entry.path }).catch((err) =>
              fs.setError(`Failed to show in explorer: ${err}`),
            );
          },
        },
        {
          label: "Properties",
          action: () =>
            setPropertiesDialog({ visible: true, path: entry.path }),
        },
      ];
    },
    [
      fs,
      togglePreview,
      isBookmarked,
      bookmarks,
      addBookmark,
      removeBookmark,
      handleDelete,
    ],
  );

  const getBackgroundActions = useCallback(
    (): ContextMenuAction[] => [
      {
        label: "New Folder",
        action: () => setNewItemDialog({ visible: true, type: "folder" }),
      },
      {
        label: "New File",
        action: () => setNewItemDialog({ visible: true, type: "file" }),
      },
      {
        label: "New from Template",
        action: () => setTemplateOpen(true),
      },
      { label: "", action: () => {}, separator: true },
      {
        label: "Paste",
        shortcut: "Ctrl+V",
        action: () => fs.paste(),
        disabled: !fs.clipboard,
      },
      { label: "", action: () => {}, separator: true },
      {
        label: "Select All",
        shortcut: "Ctrl+A",
        action: () => fs.selectAll(),
      },
      {
        label: "Refresh",
        shortcut: "F5",
        action: () => fs.refresh(),
      },
      { label: "", action: () => {}, separator: true },
      {
        label: "Copy Path",
        action: () => {
          invoke("copy_path_to_clipboard", { path: fs.currentPath }).catch(
            (err) => fs.setError(`Failed to copy path: ${err}`),
          );
        },
      },
      {
        label: "Open in Terminal",
        action: () => {
          invoke("open_in_terminal", { path: fs.currentPath }).catch((err) =>
            fs.setError(`Failed to open terminal: ${err}`),
          );
        },
      },
      {
        label: isBookmarked(fs.currentPath)
          ? "Remove Bookmark"
          : "Bookmark This Folder",
        action: () => {
          if (isBookmarked(fs.currentPath)) {
            const bm = bookmarks.find((b) => b.path === fs.currentPath);
            if (bm) removeBookmark(bm.id);
          } else {
            const name =
              fs.currentPath.split("/").filter(Boolean).pop() || fs.currentPath;
            addBookmark(name, fs.currentPath);
          }
        },
      },
      { label: "", action: () => {}, separator: true },
      {
        label: "Properties",
        action: () =>
          setPropertiesDialog({ visible: true, path: fs.currentPath }),
      },
    ],
    [fs, isBookmarked, bookmarks, addBookmark, removeBookmark],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        newItemDialog.visible ||
        renameDialog.visible ||
        settingsOpen ||
        templateOpen ||
        propertiesDialog.visible ||
        (e.target as HTMLElement).tagName === "INPUT"
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "c":
            e.preventDefault();
            fs.copySelected();
            break;
          case "x":
            e.preventDefault();
            fs.cutSelected();
            break;
          case "v":
            e.preventDefault();
            fs.paste();
            break;
          case "a":
            e.preventDefault();
            fs.selectAll();
            break;
          case ",":
            e.preventDefault();
            setSettingsOpen(true);
            break;
          case "`":
            e.preventDefault();
            setTerminalOpen((p) => !p);
            break;
          case "t":
            e.preventDefault();
            handleNewTab();
            break;
          case "w":
            e.preventDefault();
            handleTabClose(activeTabId);
            break;
        }
      } else if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
          case "D":
          case "d":
            e.preventDefault();
            setDebugOpen((p) => !p);
            debugLogger.info("Debug", "Debug console toggled");
            break;
        }
      } else if (e.altKey) {
        switch (e.key) {
          case "Enter": {
            e.preventDefault();
            const selected = Array.from(fs.selectedItems);
            if (selected.length === 1) {
              setPropertiesDialog({ visible: true, path: selected[0] });
            } else {
              setPropertiesDialog({ visible: true, path: fs.currentPath });
            }
            break;
          }
        }
      } else {
        switch (e.key) {
          case "Delete":
            handleDelete(true);
            break;
          case "F2": {
            const selected = Array.from(fs.selectedItems);
            if (selected.length === 1) {
              const entry = fs.entries.find((e) => e.path === selected[0]);
              if (entry) {
                setRenameDialog({
                  visible: true,
                  path: entry.path,
                  name: entry.name,
                });
              }
            }
            break;
          }
          case "F5":
            e.preventDefault();
            fs.refresh();
            break;
          case "Backspace":
            fs.goUp();
            break;
          case "Escape":
            if (previewOpen) {
              setPreviewOpen(false);
              setPreviewFile(null);
            }
            break;
          case " ": {
            e.preventDefault();
            const selected = Array.from(fs.selectedItems);
            if (selected.length === 1) {
              const entry = fs.entries.find((e) => e.path === selected[0]);
              if (entry && !entry.is_dir) {
                togglePreview(entry);
              }
            }
            break;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    fs,
    newItemDialog.visible,
    renameDialog.visible,
    settingsOpen,
    templateOpen,
    propertiesDialog.visible,
    previewOpen,
    previewFile,
    togglePreview,
    handleNewTab,
    handleTabClose,
    activeTabId,
    handleDelete,
  ]);

  return (
    <div className="app" style={{ fontSize: `${settings.fontSize}px` }}>
      <TitleBar
        title={`${fs.currentPath.split(/[\\/]/).pop() || fs.currentPath} - Fluent File Explorer`}
      />
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />
      <MenuBar
        onNewFolder={() => setNewItemDialog({ visible: true, type: "folder" })}
        onNewFile={() => setNewItemDialog({ visible: true, type: "file" })}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenTerminal={() => setTerminalOpen((p) => !p)}
        onOpenRecycleBin={handleOpenRecycleBin}
        onToggleHidden={fs.toggleHidden}
        onTogglePreview={() => togglePreview()}
        onRefresh={fs.refresh}
        onGoBack={fs.goBack}
        onGoForward={fs.goForward}
        onGoUp={fs.goUp}
        onCopy={fs.copySelected}
        onCut={fs.cutSelected}
        onPaste={fs.paste}
        onSelectAll={fs.selectAll}
        onDelete={() => handleDelete(true)}
        showHidden={fs.showHidden}
        previewOpen={previewOpen}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        canGoBack={fs.canGoBack}
        canGoForward={fs.canGoForward}
        clipboard={fs.clipboard}
        hasSelection={fs.selectedItems.size > 0}
      />
      <div className="app-body">
        <Sidebar
          quickAccess={fs.quickAccess}
          currentPath={fs.currentPath}
          bookmarks={bookmarks}
          drives={fs.drives}
          onNavigate={fs.navigateTo}
          onRemoveBookmark={removeBookmark}
          onOpenRecycleBin={handleOpenRecycleBin}
          dragDrop={{
            dropTarget: dragDrop.dropTarget,
            onDragOver: dragDrop.handleDragOverFolder,
            onDragLeave: dragDrop.handleDragLeave,
            onDrop: dragDrop.handleDrop,
          }}
        />
        <div className="main-content">
          <Toolbar
            canGoBack={fs.canGoBack}
            canGoForward={fs.canGoForward}
            showHidden={fs.showHidden}
            viewMode={viewMode}
            hasSelection={fs.selectedItems.size > 0}
            clipboard={fs.clipboard}
            previewOpen={previewOpen}
            terminalOpen={terminalOpen}
            onGoBack={fs.goBack}
            onGoForward={fs.goForward}
            onGoUp={fs.goUp}
            onRefresh={fs.refresh}
            onToggleHidden={fs.toggleHidden}
            onNewFolder={() =>
              setNewItemDialog({ visible: true, type: "folder" })
            }
            onNewFile={() => setNewItemDialog({ visible: true, type: "file" })}
            onDelete={() => handleDelete(true)}
            onCopy={fs.copySelected}
            onCut={fs.cutSelected}
            onPaste={fs.paste}
            onViewModeChange={setViewMode}
            onFilterChange={setActiveFilter}
            activeFilter={activeFilter}
            onGroupByChange={setActiveGroupBy}
            activeGroupBy={activeGroupBy}
            onTogglePreview={() => togglePreview()}
            onToggleTerminal={() => setTerminalOpen((p) => !p)}
            onOpenSettings={() => setSettingsOpen(true)}
            onBookmarkCurrent={() => {
              if (isBookmarked(fs.currentPath)) {
                const bm = bookmarks.find((b) => b.path === fs.currentPath);
                if (bm) removeBookmark(bm.id);
              } else {
                const name =
                  fs.currentPath.split("/").filter(Boolean).pop() ||
                  fs.currentPath;
                addBookmark(name, fs.currentPath);
              }
            }}
          />
          <div className="address-bar">
            <Breadcrumb path={fs.currentPath} onNavigate={fs.navigateTo} />
            <SearchBar query={fs.searchQuery} onSearch={fs.search} />
          </div>
          <div className="content-area">
            {dragDrop.externalDragOver && (
              <div className="external-drop-overlay">
                <span>Drop files here to copy</span>
              </div>
            )}
            <FileList
              entries={filteredEntries}
              viewMode={viewMode}
              groupBy={activeGroupBy}
              selectedItems={fs.selectedItems}
              sortConfig={fs.sortConfig}
              loading={fs.loading}
              error={fs.error}
              currentPath={fs.currentPath}
              clipboard={fs.clipboard}
              dragDrop={{
                dropTarget: dragDrop.dropTarget,
                dragPaths: dragDrop.dragPaths,
                onDragStart: dragDrop.handleDragStart,
                onDragOverFolder: dragDrop.handleDragOverFolder,
                onDragOverBackground: dragDrop.handleDragOverBackground,
                onDragLeave: dragDrop.handleDragLeave,
                onDrop: dragDrop.handleDrop,
                onDragEnd: dragDrop.handleDragEnd,
              }}
              onOpen={(entry) => {
                if (entry.is_dir) {
                  fs.openItem(entry);
                  setPreviewFile(null);
                } else {
                  togglePreview(entry);
                }
              }}
              onSelect={fs.selectItem}
              onContextMenu={showContextMenu}
              onSort={fs.setSortConfig}
              getItemActions={getItemActions}
              getBackgroundActions={getBackgroundActions}
            />
            {previewOpen && previewFile && (
              <PreviewPanel
                file={previewFile}
                onClose={() => {
                  setPreviewOpen(false);
                  setPreviewFile(null);
                }}
              />
            )}
          </div>
          <TerminalPanel
            visible={terminalOpen}
            currentPath={fs.currentPath}
            height={terminalHeight}
            onToggle={() => setTerminalOpen((p) => !p)}
            onResize={setTerminalHeight}
          />
          <StatusBar
            totalItems={fs.entries.length}
            selectedCount={fs.selectedItems.size}
            currentPath={fs.currentPath}
            searchActive={fs.searchResults !== null}
            entries={fs.entries}
            selectedItems={fs.selectedItems}
          />
        </div>
      </div>

      <ContextMenu
        x={menu.x}
        y={menu.y}
        visible={menu.visible}
        actions={menu.actions}
        onClose={hideContextMenu}
      />

      <NewItemDialog
        type={newItemDialog.type}
        visible={newItemDialog.visible}
        onConfirm={(name) => {
          if (newItemDialog.type === "folder") {
            fs.createNewFolder(name);
          } else {
            fs.createNewFile(name);
          }
          setNewItemDialog({ visible: false, type: "folder" });
        }}
        onCancel={() => setNewItemDialog({ visible: false, type: "folder" })}
      />

      <RenameDialog
        visible={renameDialog.visible}
        currentName={renameDialog.name}
        onConfirm={(newName) => {
          fs.renameItem(renameDialog.path, newName);
          setRenameDialog({ visible: false, path: "", name: "" });
        }}
        onCancel={() => setRenameDialog({ visible: false, path: "", name: "" })}
      />

      <TemplateDialog
        visible={templateOpen}
        onConfirm={async (name, content) => {
          try {
            await invoke("create_file_with_content", {
              path: fs.currentPath,
              name,
              content,
            });
            fs.refresh();
          } catch (err) {
            fs.setError(`Failed to create from template: ${err}`);
          }
          setTemplateOpen(false);
        }}
        onCancel={() => setTemplateOpen(false)}
      />

      <SettingsDialog
        visible={settingsOpen}
        settings={settings}
        onUpdate={updateSetting}
        onReset={resetSettings}
        onClose={() => setSettingsOpen(false)}
      />

      <PropertiesDialog
        visible={propertiesDialog.visible}
        path={propertiesDialog.path}
        onClose={() => setPropertiesDialog({ visible: false, path: "" })}
      />

      <BatchRenameDialog
        visible={batchRenameDialog.visible}
        files={batchRenameDialog.files}
        onClose={() => setBatchRenameDialog({ visible: false, files: [] })}
        onComplete={() => fs.refresh()}
      />

      <DebugPanel visible={debugOpen} />
    </div>
  );
};

export default App;
