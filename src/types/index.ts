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

export type SortField = "name" | "size" | "modified" | "extension";
export type SortDirection = "asc" | "desc";
export type ViewMode = "grid" | "list" | "details";

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface ClipboardState {
  items: FileEntry[];
  operation: "copy" | "cut";
}

export interface ContextMenuAction {
  label: string;
  icon?: string;
  action: () => void;
  separator?: boolean;
  disabled?: boolean;
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
