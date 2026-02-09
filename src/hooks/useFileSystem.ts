import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClipboardState,
  DirContents,
  FileEntry,
  QuickAccessItem,
  SortConfig,
} from "../types";

const iconMap: Record<string, string> = {
  Home: "home",
  Desktop: "desktop",
  Documents: "documents",
  Downloads: "downloads",
  Pictures: "pictures",
  Music: "music",
  Videos: "videos",
};

export function useFileSystem() {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FileEntry[] | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "name",
    direction: "asc",
  });

  const isNavigating = useRef(false);

  const loadQuickAccess = useCallback(async () => {
    try {
      const paths: [string, string][] = await invoke("get_quick_access_paths");
      setQuickAccess(
        paths.map(([label, path]) => ({
          label,
          path,
          icon: iconMap[label] || "folder",
        })),
      );
    } catch (err) {
      console.error("Failed to load quick access:", err);
    }
  }, []);

  const navigateTo = useCallback(
    async (path: string, addToHistory = true) => {
      if (isNavigating.current) return;
      isNavigating.current = true;
      setLoading(true);
      setError(null);
      setSearchResults(null);
      setSearchQuery("");
      setSelectedItems(new Set());

      try {
        const result: DirContents = await invoke("list_directory", {
          path,
          showHidden: showHidden,
        });
        setEntries(result.entries);
        setCurrentPath(result.path);

        if (addToHistory) {
          setHistory((prev) => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(result.path);
            return newHistory;
          });
          setHistoryIndex((prev) => prev + 1);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
        isNavigating.current = false;
      }
    },
    [showHidden, historyIndex],
  );

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      navigateTo(history[newIndex], false);
    }
  }, [history, historyIndex, navigateTo]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      navigateTo(history[newIndex], false);
    }
  }, [history, historyIndex, navigateTo]);

  const goUp = useCallback(() => {
    const parentPath = currentPath.replace(/\\/g, "/");
    const segments = parentPath.split("/").filter(Boolean);
    if (segments.length > 1) {
      segments.pop();
      const parent = "/" + segments.join("/");
      navigateTo(parent);
    } else if (segments.length === 1) {
      navigateTo("/");
    }
  }, [currentPath, navigateTo]);

  const refresh = useCallback(() => {
    if (currentPath) {
      navigateTo(currentPath, false);
    }
  }, [currentPath, navigateTo]);

  const toggleHidden = useCallback(() => {
    setShowHidden((prev) => !prev);
  }, []);

  useEffect(() => {
    if (currentPath) {
      navigateTo(currentPath, false);
    }
  }, [showHidden]);

  const openItem = useCallback(
    async (item: FileEntry) => {
      if (item.is_dir) {
        navigateTo(item.path);
      } else {
        try {
          await invoke("open_file", { path: item.path });
        } catch (err) {
          setError(`Failed to open file: ${err}`);
        }
      }
    },
    [navigateTo],
  );

  const createNewFolder = useCallback(
    async (name: string) => {
      try {
        await invoke("create_directory", { path: currentPath, name });
        refresh();
      } catch (err) {
        setError(`Failed to create folder: ${err}`);
      }
    },
    [currentPath, refresh],
  );

  const createNewFile = useCallback(
    async (name: string) => {
      try {
        await invoke("create_file", { path: currentPath, name });
        refresh();
      } catch (err) {
        setError(`Failed to create file: ${err}`);
      }
    },
    [currentPath, refresh],
  );

  const deleteSelected = useCallback(
    async (useTrash = true) => {
      const paths = Array.from(selectedItems);
      if (paths.length === 0) return;
      try {
        await invoke("delete_items", { paths, useTrash });
        setSelectedItems(new Set());
        refresh();
      } catch (err) {
        setError(`Failed to delete: ${err}`);
      }
    },
    [selectedItems, refresh],
  );

  const renameItem = useCallback(
    async (oldPath: string, newName: string) => {
      try {
        await invoke("rename_item", { oldPath, newName });
        refresh();
      } catch (err) {
        setError(`Failed to rename: ${err}`);
      }
    },
    [refresh],
  );

  const copySelected = useCallback(() => {
    const items = entries.filter((e) => selectedItems.has(e.path));
    if (items.length > 0) {
      setClipboard({ items, operation: "copy" });
    }
  }, [entries, selectedItems]);

  const cutSelected = useCallback(() => {
    const items = entries.filter((e) => selectedItems.has(e.path));
    if (items.length > 0) {
      setClipboard({ items, operation: "cut" });
    }
  }, [entries, selectedItems]);

  const paste = useCallback(async () => {
    if (!clipboard) return;
    const sources = clipboard.items.map((i) => i.path);
    try {
      if (clipboard.operation === "copy") {
        await invoke("copy_items", { sources, destination: currentPath });
      } else {
        await invoke("move_items", { sources, destination: currentPath });
        setClipboard(null);
      }
      refresh();
    } catch (err) {
      setError(`Failed to paste: ${err}`);
    }
  }, [clipboard, currentPath, refresh]);

  const search = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setSearchResults(null);
        return;
      }
      try {
        const results: FileEntry[] = await invoke("search_files", {
          dir: currentPath,
          query: query.trim(),
          showHidden: showHidden,
        });
        setSearchResults(results);
      } catch (err) {
        setError(`Search failed: ${err}`);
      }
    },
    [currentPath, showHidden],
  );

  const selectItem = useCallback((path: string, multi = false) => {
    setSelectedItems((prev) => {
      const next = new Set(multi ? prev : []);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const displayEntries = searchResults ?? entries;
    setSelectedItems(new Set(displayEntries.map((e) => e.path)));
  }, [entries, searchResults]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const sortEntries = useCallback(
    (items: FileEntry[]): FileEntry[] => {
      return [...items].sort((a, b) => {
        // Directories always first
        if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;

        const dir = sortConfig.direction === "asc" ? 1 : -1;
        switch (sortConfig.field) {
          case "name":
            return (
              a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) *
              dir
            );
          case "size":
            return (a.size - b.size) * dir;
          case "modified":
            return a.modified.localeCompare(b.modified) * dir;
          case "extension":
            return a.extension.localeCompare(b.extension) * dir;
          default:
            return 0;
        }
      });
    },
    [sortConfig],
  );

  const displayEntries = sortEntries(searchResults ?? entries);

  // Initialize
  useEffect(() => {
    (async () => {
      await loadQuickAccess();
      try {
        const home: string = await invoke("get_home_directory");
        navigateTo(home);
      } catch {
        navigateTo("/");
      }
    })();
  }, []);

  return {
    currentPath,
    entries: displayEntries,
    loading,
    error,
    showHidden,
    quickAccess,
    selectedItems,
    clipboard,
    searchQuery,
    searchResults,
    sortConfig,
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < history.length - 1,
    navigateTo,
    goBack,
    goForward,
    goUp,
    refresh,
    toggleHidden,
    openItem,
    createNewFolder,
    createNewFile,
    deleteSelected,
    renameItem,
    copySelected,
    cutSelected,
    paste,
    search,
    selectItem,
    selectAll,
    clearSelection,
    setSortConfig,
    setError,
  };
}
