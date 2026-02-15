import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ClipboardState,
  DirContents,
  DriveItem,
  FileEntry,
  OsType,
  QuickAccessItem,
  SortConfig,
  SystemClipboardFiles,
} from "../types";
import { debugLogger } from "../utils/debugLogger";

export function useFileSystem() {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [quickAccess, setQuickAccess] = useState<QuickAccessItem[]>([]);
  const [drives, setDrives] = useState<DriveItem[]>([]);
  const [osType, setOsType] = useState<OsType>("windows");
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
      const paths: [string, string, string][] =
        await invoke("get_system_paths");
      setQuickAccess(
        paths.map(([label, path, icon]) => ({
          label,
          path,
          icon: icon || "folder",
        })),
      );
    } catch (err) {
      console.error("Failed to load quick access:", err);
    }
  }, []);

  const loadDrives = useCallback(async () => {
    try {
      const driveList: [string, string][] = await invoke("get_system_drives");
      const drivesWithSpace = await Promise.all(
        driveList.map(async ([label, path]) => {
          try {
            const space = await invoke<{
              total_bytes: number;
              available_bytes: number;
              used_bytes: number;
              percent_used: number;
            }>("get_drive_space", { path });
            return { label, path, ...space };
          } catch {
            return { label, path };
          }
        }),
      );
      setDrives(drivesWithSpace);
    } catch (err) {
      console.error("Failed to load drives:", err);
    }
  }, []);

  const loadOsType = useCallback(async () => {
    try {
      const os: OsType = await invoke("get_os_type");
      setOsType(os);
    } catch (err) {
      console.error("Failed to detect OS:", err);
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

      const markKey = `navigate-${Date.now()}`;
      debugLogger.startMark(markKey);
      debugLogger.info("navigation", `Navigating to: ${path}`);

      try {
        // Handle special recycle bin path
        if (path.startsWith("recycle:")) {
          debugLogger.info(
            "navigation",
            `[RECYCLE BIN] Starting navigation to: ${path}`,
          );
          try {
            type RecycleBinItem = {
              name: string;
              original_path: string;
              deleted_time: string;
              size: number;
              is_dir: boolean;
            };
            debugLogger.info(
              "navigation",
              `[RECYCLE BIN] Invoking list_recycle_bin command`,
            );
            const items: RecycleBinItem[] = await invoke("list_recycle_bin");
            debugLogger.info(
              "navigation",
              `[RECYCLE BIN] Received ${items.length} items from backend`,
              {
                sampleItems: items.slice(0, 3),
              },
            );

            // Convert RecycleBinItem to FileEntry format
            const entries: FileEntry[] = items.map((item) => {
              const entry: FileEntry = {
                name: item.name,
                path: item.original_path || item.name,
                is_dir: item.is_dir,
                is_hidden: false,
                size: item.size,
                modified: item.deleted_time,
                extension: item.name.includes(".")
                  ? item.name.split(".").pop() || ""
                  : "",
                is_symlink: false,
              };
              return entry;
            });

            debugLogger.info(
              "navigation",
              `[RECYCLE BIN] Converted to FileEntry format`,
              {
                entryCount: entries.length,
                sampleEntries: entries.slice(0, 2),
              },
            );

            setEntries(entries);
            setCurrentPath("Recycle Bin");
            debugLogger.info(
              "navigation",
              `[RECYCLE BIN] Successfully loaded recycle bin: ${entries.length} items`,
            );

            if (addToHistory) {
              setHistory((prev) => {
                const newHistory = prev.slice(0, historyIndex + 1);
                newHistory.push(path);
                return newHistory;
              });
              setHistoryIndex((prev) => prev + 1);
            }
          } catch (err) {
            const error = `[RECYCLE BIN] Failed to load: ${String(err)}`;
            setError(error);
            setEntries([]);
            debugLogger.error("navigation", error, err);
          }
        } else {
          const result: DirContents = await invoke("list_directory", {
            path,
            showHidden: showHidden,
          });
          setEntries(result.entries);
          setCurrentPath(result.path);
          debugLogger.info("navigation", `Loaded directory: ${result.path}`, {
            itemCount: result.entries.length,
          });

          if (addToHistory) {
            setHistory((prev) => {
              const newHistory = prev.slice(0, historyIndex + 1);
              newHistory.push(result.path);
              return newHistory;
            });
            setHistoryIndex((prev) => prev + 1);
          }
        }
      } catch (err) {
        const error = String(err);
        setError(error);
        debugLogger.error("navigation", "Navigation failed", err);
      } finally {
        setLoading(false);
        isNavigating.current = false;
        debugLogger.endMark(markKey, "navigation", `Navigate completed`);
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
    const normalized = currentPath.replace(/\\/g, "/");

    // Windows: check if we're at a drive root like "C:/" or "C:"
    if (/^[A-Za-z]:\/?$/.test(normalized)) {
      // Already at drive root - no parent to go to
      return;
    }

    // Linux/macOS: already at root
    if (normalized === "/") {
      return;
    }

    const segments = normalized.split("/").filter(Boolean);
    if (segments.length > 1) {
      segments.pop();
      // Windows: preserve drive letter (e.g. "C:/Users" -> "C:/")
      if (/^[A-Za-z]:$/.test(segments[0])) {
        const parent = segments[0] + "/" + segments.slice(1).join("/");
        navigateTo(
          parent.endsWith("/")
            ? parent
            : segments.length === 1
              ? segments[0] + "/"
              : parent,
        );
      } else {
        navigateTo("/" + segments.join("/"));
      }
    } else if (segments.length === 1) {
      // One segment left
      if (/^[A-Za-z]:$/.test(segments[0])) {
        // At drive root already
        navigateTo(segments[0] + "/");
      } else {
        navigateTo("/");
      }
    }
  }, [currentPath, navigateTo]);

  const refresh = useCallback(() => {
    if (currentPath) {
      navigateTo(currentPath, false);
    }
  }, [currentPath, navigateTo]);

  // Watch current directory for changes
  const watchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentPath) return;

    // Start watching
    invoke("watch_directory", { path: currentPath }).catch((err) =>
      console.warn("Failed to watch directory:", err),
    );

    // Listen for fs-changed events (debounced)
    const unlisten = listen<string>("fs-changed", () => {
      // Debounce: only refresh after 300ms of no events
      if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
      watchTimerRef.current = setTimeout(() => {
        if (currentPath && !isNavigating.current) {
          navigateTo(currentPath, false);
        }
      }, 300);
    });

    return () => {
      unlisten.then((fn) => fn());
      if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
      invoke("unwatch_directory").catch(() => {});
    };
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
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(`Failed to open file: ${errorMessage}`);
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
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to create folder: ${errorMessage}`);
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
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to create file: ${errorMessage}`);
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
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to delete: ${errorMessage}`);
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
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to rename: ${errorMessage}`);
      }
    },
    [refresh],
  );

  const copySelected = useCallback(() => {
    const paths = Array.from(selectedItems);
    if (paths.length > 0) {
      setClipboard({ paths, operation: "copy" });
      // Write to system clipboard
      invoke("clipboard_write_files", { paths, cut: false }).catch((err) =>
        console.warn("System clipboard write failed:", err),
      );
    }
  }, [selectedItems]);

  const cutSelected = useCallback(() => {
    const paths = Array.from(selectedItems);
    if (paths.length > 0) {
      setClipboard({ paths, operation: "cut" });
      // Write to system clipboard with cut flag
      invoke("clipboard_write_files", { paths, cut: true }).catch((err) =>
        console.warn("System clipboard write failed:", err),
      );
    }
  }, [selectedItems]);

  const paste = useCallback(
    async (targetPath?: string) => {
      const destination = targetPath || currentPath;

      try {
        // Try system clipboard first (for cross-app paste)
        const hasSystemFiles: boolean = await invoke("clipboard_has_files");

        if (hasSystemFiles) {
          const systemClip: SystemClipboardFiles = await invoke(
            "clipboard_read_files",
          );
          if (systemClip.paths.length > 0) {
            // Prevent pasting to same location
            const validPaths = systemClip.paths.filter(
              (p) => p !== destination,
            );
            if (validPaths.length === 0) {
              setError("Cannot paste: source and destination are the same");
              return;
            }

            if (systemClip.is_cut) {
              await invoke("move_items", {
                sources: validPaths,
                destination,
              });
              setClipboard(null);
            } else {
              await invoke("copy_items", {
                sources: validPaths,
                destination,
              });
            }
            refresh();
            return;
          }
        }
      } catch {
        // System clipboard not available or failed, fall back to internal
      }

      // Fall back to internal clipboard
      if (!clipboard) return;
      const sources = clipboard.paths;

      // Prevent pasting to same location
      const validSources = sources.filter((p) => p !== destination);
      if (validSources.length === 0) {
        setError("Cannot paste: source and destination are the same");
        return;
      }

      try {
        if (clipboard.operation === "copy") {
          await invoke("copy_items", { sources: validSources, destination });
        } else {
          await invoke("move_items", { sources: validSources, destination });
          setClipboard(null);
        }
        refresh();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to paste: ${errorMessage}`);
      }
    },
    [clipboard, currentPath, refresh],
  );

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
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Search failed: ${errorMessage}`);
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
      await loadOsType();
      await loadQuickAccess();
      await loadDrives();
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
    drives,
    osType,
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
