import React from "react";
import type {
  ClipboardState,
  ContextMenuAction,
  FileEntry,
  GroupBy,
  SortConfig,
  SortField,
  ViewMode,
} from "../types";
import {
  formatDate,
  formatFileSize,
  getFileTypeLabel,
} from "../utils/formatters";
import FileIcon from "./FileIcon";

interface DragDropHandlers {
  dropTarget: string | null;
  dragPaths: string[];
  onDragStart: (e: React.DragEvent, entry: FileEntry) => void;
  onDragOverFolder: (e: React.DragEvent, folderPath: string) => void;
  onDragOverBackground: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetPath: string) => void;
  onDragEnd: () => void;
}

interface FileListProps {
  entries: FileEntry[];
  viewMode: ViewMode;
  selectedItems: Set<string>;
  sortConfig: SortConfig;
  loading: boolean;
  error: string | null;
  currentPath: string;
  clipboard: ClipboardState | null;
  dragDrop: DragDropHandlers;
  groupBy?: GroupBy;
  onOpen: (entry: FileEntry) => void;
  onSelect: (path: string, multi: boolean) => void;
  onContextMenu: (e: React.MouseEvent, actions: ContextMenuAction[]) => void;
  onSort: (config: SortConfig) => void;
  getItemActions: (entry: FileEntry) => ContextMenuAction[];
  getBackgroundActions: () => ContextMenuAction[];
}

const FileList: React.FC<FileListProps> = ({
  entries,
  viewMode,
  selectedItems,
  sortConfig,
  loading,
  error,
  currentPath,
  clipboard,
  dragDrop,
  groupBy = "none",
  onOpen,
  onSelect,
  onContextMenu,
  onSort,
  getItemActions,
  getBackgroundActions,
}) => {
  const handleSort = (field: SortField) => {
    onSort({
      field,
      direction:
        sortConfig.field === field && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  const sortIndicator = (field: SortField) => {
    if (sortConfig.field !== field) return null;
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  const isCutItem = (path: string) =>
    clipboard?.operation === "cut" && clipboard.paths.includes(path);

  // Helper function to get group key for an entry
  const getGroupKey = (entry: FileEntry): string => {
    if (groupBy === "none") return "";

    if (groupBy === "type") {
      if (entry.is_dir) return "Folders";
      const ext = entry.name.toLowerCase().match(/\.([^.]+)$/)?.[1] || "";
      const typeGroups: Record<string, string[]> = {
        Documents: [
          "pdf",
          "doc",
          "docx",
          "xls",
          "xlsx",
          "ppt",
          "pptx",
          "txt",
          "rtf",
          "odt",
        ],
        Images: ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico"],
        Videos: ["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm"],
        Audio: ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a"],
        Archives: ["zip", "rar", "7z", "tar", "gz"],
        Code: [
          "js",
          "ts",
          "tsx",
          "jsx",
          "py",
          "java",
          "c",
          "cpp",
          "cs",
          "go",
          "rs",
          "html",
          "css",
          "json",
        ],
      };
      for (const [group, exts] of Object.entries(typeGroups)) {
        if (exts.includes(ext)) return group;
      }
      return "Other Files";
    }

    if (groupBy === "date") {
      const dateStr = entry.modified;
      if (!dateStr) return "Unknown Date";
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) return "Today";
      if (daysDiff === 1) return "Yesterday";
      if (daysDiff <= 7) return "This Week";
      if (daysDiff <= 30) return "This Month";
      if (daysDiff <= 365) return "This Year";
      return "Older";
    }

    if (groupBy === "size") {
      if (entry.is_dir) return "Folders";
      const size = entry.size ?? 0;
      if (size === 0) return "Empty";
      if (size < 1024) return "Tiny (< 1 KB)";
      if (size < 1024 * 100) return "Small (< 100 KB)";
      if (size < 1024 * 1024) return "Medium (< 1 MB)";
      if (size < 1024 * 1024 * 100) return "Large (< 100 MB)";
      return "Very Large (> 100 MB)";
    }

    return "";
  };

  // Group entries if groupBy is set
  const groupedEntries = React.useMemo(() => {
    if (groupBy === "none") return [{ key: "", entries }];

    const groups: Map<string, FileEntry[]> = new Map();
    for (const entry of entries) {
      const key = getGroupKey(entry);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    }

    return Array.from(groups.entries()).map(([key, entries]) => ({
      key,
      entries,
    }));
  }, [entries, groupBy]);

  if (loading) {
    return (
      <div className="file-list-empty">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-list-empty error">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="file-list-empty">
        <p>This folder is empty</p>
      </div>
    );
  }

  if (viewMode === "details") {
    return (
      <div
        className={`file-list details-view ${dragDrop.dropTarget === currentPath ? "drop-target-bg" : ""}`}
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest(".file-row")) return;
          onContextMenu(e, getBackgroundActions());
        }}
        onDragOver={(e) => {
          if ((e.target as HTMLElement).closest(".file-row[data-drop-path]"))
            return;
          dragDrop.onDragOverBackground(e);
        }}
        onDragLeave={dragDrop.onDragLeave}
        onDrop={(e) => dragDrop.onDrop(e, currentPath)}
        data-drop-path={currentPath}
      >
        <div className="details-header">
          <div
            className="details-col name-col clickable"
            onClick={() => handleSort("name")}
          >
            Name{sortIndicator("name")}
          </div>
          <div
            className="details-col date-col clickable"
            onClick={() => handleSort("modified")}
          >
            Date Modified{sortIndicator("modified")}
          </div>
          <div
            className="details-col type-col clickable"
            onClick={() => handleSort("extension")}
          >
            Type{sortIndicator("extension")}
          </div>
          <div
            className="details-col size-col clickable"
            onClick={() => handleSort("size")}
          >
            Size{sortIndicator("size")}
          </div>
        </div>
        <div className="details-body">
          {groupedEntries.map((group) => (
            <React.Fragment key={group.key || "default"}>
              {group.key && (
                <div className="group-header">
                  <span className="group-title">{group.key}</span>
                  <span className="group-count">({group.entries.length})</span>
                </div>
              )}
              {group.entries.map((entry) => (
                <div
                  key={entry.path}
                  className={`file-row ${selectedItems.has(entry.path) ? "selected" : ""} ${entry.is_hidden ? "hidden-file" : ""} ${dragDrop.dropTarget === entry.path && entry.is_dir ? "drag-over" : ""} ${dragDrop.dragPaths.includes(entry.path) ? "dragging" : ""} ${isCutItem(entry.path) ? "cut-item" : ""}`}
                  draggable
                  onClick={(e) => onSelect(entry.path, e.ctrlKey || e.metaKey)}
                  onDoubleClick={() => onOpen(entry)}
                  onContextMenu={(e) => {
                    if (!selectedItems.has(entry.path)) {
                      onSelect(entry.path, false);
                    }
                    onContextMenu(e, getItemActions(entry));
                  }}
                  onDragStart={(e) => dragDrop.onDragStart(e, entry)}
                  onDragEnd={dragDrop.onDragEnd}
                  {...(entry.is_dir
                    ? {
                        "data-drop-path": entry.path,
                        onDragOver: (e: React.DragEvent) =>
                          dragDrop.onDragOverFolder(e, entry.path),
                        onDragLeave: dragDrop.onDragLeave,
                        onDrop: (e: React.DragEvent) =>
                          dragDrop.onDrop(e, entry.path),
                      }
                    : {})}
                >
                  <div className="details-col name-col">
                    <FileIcon entry={entry} size={20} />
                    <span className="file-name" title={entry.name}>
                      {entry.name}
                    </span>
                  </div>
                  <div className="details-col date-col">
                    {formatDate(entry.modified)}
                  </div>
                  <div className="details-col type-col">
                    {getFileTypeLabel(entry.extension, entry.is_dir)}
                  </div>
                  <div className="details-col size-col">
                    {entry.is_dir ? "—" : formatFileSize(entry.size)}
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // Grid or list view
  return (
    <div
      className={`file-list ${viewMode}-view ${dragDrop.dropTarget === currentPath ? "drop-target-bg" : ""}`}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest(".file-card")) return;
        onContextMenu(e, getBackgroundActions());
      }}
      onDragOver={(e) => {
        if ((e.target as HTMLElement).closest(".file-card[data-drop-path]"))
          return;
        dragDrop.onDragOverBackground(e);
      }}
      onDragLeave={dragDrop.onDragLeave}
      onDrop={(e) => dragDrop.onDrop(e, currentPath)}
      data-drop-path={currentPath}
    >
      {groupedEntries.map((group) => (
        <React.Fragment key={group.key || "default"}>
          {group.key && (
            <div className="group-header grid-group-header">
              <span className="group-title">{group.key}</span>
              <span className="group-count">({group.entries.length})</span>
            </div>
          )}
          {group.entries.map((entry) => (
            <div
              key={entry.path}
              className={`file-card ${selectedItems.has(entry.path) ? "selected" : ""} ${entry.is_hidden ? "hidden-file" : ""} ${dragDrop.dropTarget === entry.path && entry.is_dir ? "drag-over" : ""} ${dragDrop.dragPaths.includes(entry.path) ? "dragging" : ""} ${isCutItem(entry.path) ? "cut-item" : ""}`}
              draggable
              onClick={(e) => onSelect(entry.path, e.ctrlKey || e.metaKey)}
              onDoubleClick={() => onOpen(entry)}
              onContextMenu={(e) => {
                if (!selectedItems.has(entry.path)) {
                  onSelect(entry.path, false);
                }
                onContextMenu(e, getItemActions(entry));
              }}
              onDragStart={(e) => dragDrop.onDragStart(e, entry)}
              onDragEnd={dragDrop.onDragEnd}
              {...(entry.is_dir
                ? {
                    "data-drop-path": entry.path,
                    onDragOver: (e: React.DragEvent) =>
                      dragDrop.onDragOverFolder(e, entry.path),
                    onDragLeave: dragDrop.onDragLeave,
                    onDrop: (e: React.DragEvent) =>
                      dragDrop.onDrop(e, entry.path),
                  }
                : {})}
              title={`${entry.name}\n${entry.is_dir ? "Folder" : formatFileSize(entry.size)}\n${entry.modified}`}
            >
              <div className="file-card-icon">
                <FileIcon entry={entry} size={viewMode === "grid" ? 48 : 24} />
              </div>
              <div className="file-card-info">
                <span className="file-name">{entry.name}</span>
                {viewMode === "list" && !entry.is_dir && (
                  <span className="file-size">
                    {formatFileSize(entry.size)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export default React.memo(FileList);
