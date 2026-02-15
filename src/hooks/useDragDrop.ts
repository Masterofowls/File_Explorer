import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { FileEntry } from "../types";

const DRAG_MIME = "application/x-fluent-file-paths";

interface UseDragDropOptions {
  currentPath: string;
  selectedItems: Set<string>;
  entries: FileEntry[];
  onRefresh: () => void;
  onError: (msg: string) => void;
}

export function useDragDrop(options: UseDragDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPaths, setDragPaths] = useState<string[]>([]);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [externalDragOver, setExternalDragOver] = useState(false);
  const dropTargetRef = useRef<string | null>(null);

  // Keep ref in sync for use inside Tauri event callback
  const currentPathRef = useRef(options.currentPath);
  useEffect(() => {
    currentPathRef.current = options.currentPath;
  }, [options.currentPath]);

  useEffect(() => {
    dropTargetRef.current = dropTarget;
  }, [dropTarget]);

  // ─── Tauri external drag-drop event (files from OS) ───
  useEffect(() => {
    let unlisten: (() => void) | null = null;

    (async () => {
      try {
        const win = getCurrentWindow();
        unlisten = await win.onDragDropEvent((event: any) => {
          const payload = event.payload;

          if (payload.type === "over") {
            setExternalDragOver(true);

            // Hit-test to find the folder element under cursor
            const { x, y } = payload.position;
            const scale = window.devicePixelRatio || 1;
            const el = document.elementFromPoint(x / scale, y / scale);
            const dropEl = el?.closest("[data-drop-path]");

            if (dropEl) {
              const targetPath = dropEl.getAttribute("data-drop-path");
              if (targetPath) {
                setDropTarget(targetPath);
              }
            } else {
              setDropTarget(currentPathRef.current);
            }
          } else if (payload.type === "drop") {
            setExternalDragOver(false);
            const destination = dropTargetRef.current || currentPathRef.current;
            handleExternalDrop(payload.paths, destination);
          } else if (payload.type === "leave") {
            setExternalDragOver(false);
            setDropTarget(null);
          }
        });
      } catch (err) {
        console.error("Failed to register drag-drop listener:", err);
      }
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleExternalDrop = async (paths: string[], destination: string) => {
    if (paths.length === 0) return;
    try {
      await invoke("copy_items", { sources: paths, destination });
      options.onRefresh();
    } catch (err) {
      options.onError(`Failed to copy dropped files: ${err}`);
    }
    setDropTarget(null);
  };

  // ─── Internal HTML5 DnD handlers ───

  const handleDragStart = useCallback(
    (e: React.DragEvent, entry: FileEntry) => {
      // Determine which items to drag: selected items or just this one
      const paths = options.selectedItems.has(entry.path)
        ? Array.from(options.selectedItems)
        : [entry.path];

      setIsDragging(true);
      setDragPaths(paths);

      e.dataTransfer.effectAllowed = "copyMove";
      e.dataTransfer.setData(DRAG_MIME, JSON.stringify(paths));

      // Custom drag image for multi-select
      if (paths.length > 1) {
        const badge = document.createElement("div");
        badge.className = "drag-badge";
        badge.textContent = `${paths.length} items`;
        badge.style.position = "fixed";
        badge.style.top = "-100px";
        badge.style.left = "-100px";
        document.body.appendChild(badge);
        e.dataTransfer.setDragImage(badge, 0, 0);
        requestAnimationFrame(() => {
          document.body.removeChild(badge);
        });
      }
    },
    [options.selectedItems],
  );

  const handleDragOverFolder = useCallback(
    (e: React.DragEvent, folderPath: string) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't allow drop onto a dragged item
      if (dragPaths.includes(folderPath)) {
        e.dataTransfer.dropEffect = "none";
        return;
      }

      e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
      setDropTarget(folderPath);
    },
    [dragPaths],
  );

  const handleDragOverBackground = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
      setDropTarget(options.currentPath);
    },
    [options.currentPath],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setDropTarget(null);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, targetPath: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDropTarget(null);

      const data = e.dataTransfer.getData(DRAG_MIME);
      if (!data) return;

      let sources: string[];
      try {
        sources = JSON.parse(data);
      } catch {
        return;
      }

      if (sources.length === 0) return;

      // Normalize paths for comparison
      const norm = (p: string) => p.replace(/\\/g, "/").replace(/\/$/, "");
      const targetNorm = norm(targetPath);

      // Don't drop onto same parent (would be a no-op)
      const allSameParent = sources.every((s) => {
        const lastSep = Math.max(norm(s).lastIndexOf("/"), 0);
        const parent = norm(s).substring(0, lastSep);
        return parent === targetNorm;
      });
      if (allSameParent) return;

      // Don't drop a parent folder into its own subfolder
      const wouldNest = sources.some((s) =>
        targetNorm.startsWith(norm(s) + "/"),
      );
      if (wouldNest) {
        options.onError("Cannot move a folder into itself");
        return;
      }

      try {
        if (e.ctrlKey) {
          await invoke("copy_items", {
            sources,
            destination: targetPath,
          });
        } else {
          await invoke("move_items", {
            sources,
            destination: targetPath,
          });
        }
        options.onRefresh();
      } catch (err) {
        options.onError(
          `Failed to ${e.ctrlKey ? "copy" : "move"} items: ${err}`,
        );
      }
    },
    [options],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragPaths([]);
    setDropTarget(null);
  }, []);

  return {
    // State
    isDragging,
    dragPaths,
    dropTarget,
    externalDragOver,

    // Handlers
    handleDragStart,
    handleDragOverFolder,
    handleDragOverBackground,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}
