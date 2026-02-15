export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_hidden: boolean;
  size: number;
  modified: string;
  extension: string;
  is_symlink: boolean;
}

export interface DirContents {
  path: string;
  entries: FileEntry[];
  parent: string | null;
}

export interface QuickAccessItem {
  label: string;
  path: string;
  icon: string;
}

export type OsType = "windows" | "linux" | "macos";

export interface DriveItem {
  label: string;
  path: string;
  total_bytes?: number;
  available_bytes?: number;
  used_bytes?: number;
  percent_used?: number;
}

export type SortField = "name" | "size" | "modified" | "extension";
export type SortDirection = "asc" | "desc";
export type ViewMode = "grid" | "list" | "details";

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface ClipboardState {
  paths: string[];
  operation: "copy" | "cut";
}

export interface SystemClipboardFiles {
  paths: string[];
  is_cut: boolean;
}

export interface DragDropState {
  isDragging: boolean;
  dragPaths: string[];
  dropTarget: string | null;
  externalDragOver: boolean;
}

export interface DragDropHandlers {
  dropTarget: string | null;
  dragPaths: string[];
  onDragStart: (e: React.DragEvent, entry: FileEntry) => void;
  onDragOverFolder: (e: React.DragEvent, folderPath: string) => void;
  onDragOverBackground: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetPath: string) => void;
  onDragEnd: () => void;
}

export interface ContextMenuAction {
  label: string;
  icon?: string;
  action: () => void;
  separator?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

// File Properties
export interface FileProperties {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  size_on_disk: number;
  modified: string;
  created: string;
  accessed: string;
  is_readonly: boolean;
  is_hidden: boolean;
  is_symlink: boolean;
  extension: string;
  item_count: number | null;
}

// Bookmarks
export interface Bookmark {
  id: string;
  label: string;
  path: string;
  icon?: string;
}

// File templates
export interface FileTemplate {
  label: string;
  extension: string;
  content: string;
  icon?: string;
}

// Settings
export interface AppSettings {
  theme: "light" | "dark" | "system";
  defaultViewMode: ViewMode;
  showHiddenByDefault: boolean;
  defaultSortField: SortField;
  defaultSortDirection: SortDirection;
  fontSize: number;
  confirmDelete: boolean;
  showPreviewOnSelect: boolean;
  sidebarWidth: number;
  terminalHeight: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  defaultViewMode: "details",
  showHiddenByDefault: false,
  defaultSortField: "name",
  defaultSortDirection: "asc",
  fontSize: 13,
  confirmDelete: true,
  showPreviewOnSelect: false,
  sidebarWidth: 220,
  terminalHeight: 200,
};

// Terminal
export interface TerminalTab {
  id: string;
  label: string;
  cwd: string;
}

// Recycle Bin
export interface RecycleBinItem {
  name: string;
  original_path: string;
  deleted_time: string;
  size: number;
  is_dir: boolean;
}

// USB Drive
export interface UsbDrive {
  name: string;
  path: string;
  total_space: number;
  free_space: number;
  drive_type: string;
}

// File Explorer Tab
export interface ExplorerTab {
  id: string;
  path: string;
  label: string;
}

// Drive Space Info
export interface DriveSpaceInfo {
  path: string;
  total_bytes: number;
  free_bytes: number;
  used_bytes: number;
  percent_used: number;
}

// Grouping
export type GroupBy = "none" | "type" | "date" | "size";

// Filter
export type FileFilterType =
  | "all"
  | "folders"
  | "documents"
  | "images"
  | "videos"
  | "audio"
  | "archives"
  | "code";
