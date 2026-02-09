import React, { useCallback, useState, useEffect } from "react";
import "./App.css";
import { invoke } from "@tauri-apps/api/core";
import Breadcrumb from "./components/Breadcrumb";
import ContextMenu from "./components/ContextMenu";
import FileList from "./components/FileList";
import NewItemDialog from "./components/NewItemDialog";
import PreviewPanel from "./components/PreviewPanel";
import RenameDialog from "./components/RenameDialog";
import SearchBar from "./components/SearchBar";
import Sidebar from "./components/Sidebar";
import StatusBar from "./components/StatusBar";
import Toolbar from "./components/Toolbar";
import SettingsDialog from "./components/SettingsDialog";
import TemplateDialog from "./components/TemplateDialog";
import TerminalPanel from "./components/TerminalPanel";
import { useContextMenu } from "./hooks/useContextMenu";
import { useFileSystem } from "./hooks/useFileSystem";
import { useBookmarks } from "./hooks/useBookmarks";
import { useSettings } from "./hooks/useSettings";
import type { ContextMenuAction, FileEntry, ViewMode } from "./types";

const App: React.FC = () => {
  const fs = useFileSystem();
  const { menu, showContextMenu, hideContextMenu } = useContextMenu();
  const { bookmarks, addBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const { settings, updateSetting, resetSettings } = useSettings();

  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultViewMode);
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

  const togglePreview = useCallback((entry?: FileEntry) => {
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
  }, [previewFile, fs.selectedItems, fs.entries]);

  const getItemActions = useCallback(
    (entry: FileEntry): ContextMenuAction[] => [
      {
        label: entry.is_dir ? "Open" : "Open File",
        action: () => fs.openItem(entry),
      },
      {
        label: entry.is_dir ? "" : "Preview",
        action: () => togglePreview(entry),
        separator: entry.is_dir,
      },
      ...(entry.is_dir ? [] : [{ label: "", action: () => {}, separator: true } as ContextMenuAction]),
      {
        label: "Copy",
        action: () => {
          if (!fs.selectedItems.has(entry.path)) {
            fs.selectItem(entry.path, false);
          }
          fs.copySelected();
        },
      },
      {
        label: "Cut",
        action: () => {
          if (!fs.selectedItems.has(entry.path)) {
            fs.selectItem(entry.path, false);
          }
          fs.cutSelected();
        },
      },
      { label: "", action: () => {}, separator: true },
      {
        label: "Rename",
        action: () =>
          setRenameDialog({
            visible: true,
            path: entry.path,
            name: entry.name,
          }),
      },
      {
        label: entry.is_dir
          ? isBookmarked(entry.path)
            ? "Remove Bookmark"
            : "Add to Bookmarks"
          : "",
        action: () => {
          if (isBookmarked(entry.path)) {
            const bm = bookmarks.find((b) => b.path === entry.path);
            if (bm) removeBookmark(bm.id);
          } else {
            addBookmark(entry.name, entry.path);
          }
        },
        separator: !entry.is_dir,
      },
      ...(entry.is_dir
        ? [{ label: "", action: () => {}, separator: true } as ContextMenuAction]
        : []),
      {
        label: "Move to Trash",
        action: () => {
          if (!fs.selectedItems.has(entry.path)) {
            fs.selectItem(entry.path, false);
          }
          fs.deleteSelected(true);
        },
      },
    ],
    [fs, togglePreview, isBookmarked, bookmarks, addBookmark, removeBookmark],
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
        action: () => fs.paste(),
        disabled: !fs.clipboard,
      },
      { label: "", action: () => {}, separator: true },
      {
        label: isBookmarked(fs.currentPath)
          ? "Remove Bookmark"
          : "Bookmark This Folder",
        action: () => {
          if (isBookmarked(fs.currentPath)) {
            const bm = bookmarks.find((b) => b.path === fs.currentPath);
            if (bm) removeBookmark(bm.id);
          } else {
            const name = fs.currentPath.split("/").filter(Boolean).pop() || fs.currentPath;
            addBookmark(name, fs.currentPath);
          }
        },
      },
      { label: "", action: () => {}, separator: true },
      { label: "Refresh", action: () => fs.refresh() },
      {
        label: "Select All",
        action: () => fs.selectAll(),
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
        }
      } else {
        switch (e.key) {
          case "Delete":
            fs.deleteSelected(true);
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
    previewOpen,
    previewFile,
    togglePreview,
  ]);

  return (
    <div className="app" style={{ fontSize: `${settings.fontSize}px` }}>
      <Sidebar
        quickAccess={fs.quickAccess}
        currentPath={fs.currentPath}
        bookmarks={bookmarks}
        onNavigate={fs.navigateTo}
        onRemoveBookmark={removeBookmark}
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
          onDelete={() => fs.deleteSelected(true)}
          onCopy={fs.copySelected}
          onCut={fs.cutSelected}
          onPaste={fs.paste}
          onViewModeChange={setViewMode}
          onTogglePreview={() => togglePreview()}
          onToggleTerminal={() => setTerminalOpen((p) => !p)}
          onOpenSettings={() => setSettingsOpen(true)}
          onBookmarkCurrent={() => {
            if (isBookmarked(fs.currentPath)) {
              const bm = bookmarks.find((b) => b.path === fs.currentPath);
              if (bm) removeBookmark(bm.id);
            } else {
              const name = fs.currentPath.split("/").filter(Boolean).pop() || fs.currentPath;
              addBookmark(name, fs.currentPath);
            }
          }}
        />
        <div className="address-bar">
          <Breadcrumb path={fs.currentPath} onNavigate={fs.navigateTo} />
          <SearchBar query={fs.searchQuery} onSearch={fs.search} />
        </div>
        <div className="content-area">
          <FileList
            entries={fs.entries}
            viewMode={viewMode}
            selectedItems={fs.selectedItems}
            sortConfig={fs.sortConfig}
            loading={fs.loading}
            error={fs.error}
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
        />
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
    </div>
  );
};

export default App;
