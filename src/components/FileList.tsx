import React from "react";
import FileIcon from "./FileIcon";
import {
  formatFileSize,
  formatDate,
  getFileTypeLabel,
} from "../utils/formatters";
import type {
  FileEntry,
  ViewMode,
  SortConfig,
  SortField,
  ContextMenuAction,
} from "../types";

interface FileListProps {
  entries: FileEntry[];
  viewMode: ViewMode;
  selectedItems: Set<string>;
  sortConfig: SortConfig;
  loading: boolean;
  error: string | null;
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
        className="file-list details-view"
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest(".file-row")) return;
          onContextMenu(e, getBackgroundActions());
        }}
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
          {entries.map((entry) => (
            <div
              key={entry.path}
              className={`file-row ${selectedItems.has(entry.path) ? "selected" : ""} ${entry.is_hidden ? "hidden-file" : ""}`}
              onClick={(e) => onSelect(entry.path, e.ctrlKey || e.metaKey)}
              onDoubleClick={() => onOpen(entry)}
              onContextMenu={(e) => {
                if (!selectedItems.has(entry.path)) {
                  onSelect(entry.path, false);
                }
                onContextMenu(e, getItemActions(entry));
              }}
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
        </div>
      </div>
    );
  }

  // Grid or list view
  return (
    <div
      className={`file-list ${viewMode}-view`}
      onContextMenu={(e) => {
        if ((e.target as HTMLElement).closest(".file-card")) return;
        onContextMenu(e, getBackgroundActions());
      }}
    >
      {entries.map((entry) => (
        <div
          key={entry.path}
          className={`file-card ${selectedItems.has(entry.path) ? "selected" : ""} ${entry.is_hidden ? "hidden-file" : ""}`}
          onClick={(e) => onSelect(entry.path, e.ctrlKey || e.metaKey)}
          onDoubleClick={() => onOpen(entry)}
          onContextMenu={(e) => {
            if (!selectedItems.has(entry.path)) {
              onSelect(entry.path, false);
            }
            onContextMenu(e, getItemActions(entry));
          }}
          title={`${entry.name}\n${entry.is_dir ? "Folder" : formatFileSize(entry.size)}\n${entry.modified}`}
        >
          <div className="file-card-icon">
            <FileIcon entry={entry} size={viewMode === "grid" ? 48 : 24} />
          </div>
          <div className="file-card-info">
            <span className="file-name">{entry.name}</span>
            {viewMode === "list" && !entry.is_dir && (
              <span className="file-size">{formatFileSize(entry.size)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(FileList);
