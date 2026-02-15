import { invoke } from "@tauri-apps/api/core";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { VscFolderOpened } from "react-icons/vsc";
import type { FileEntry } from "../types";
import { formatFileSize } from "../utils/formatters";

interface StatusBarProps {
  totalItems: number;
  selectedCount: number;
  currentPath: string;
  searchActive: boolean;
  entries: FileEntry[];
  selectedItems: Set<string>;
}

const StatusBar: React.FC<StatusBarProps> = ({
  totalItems,
  selectedCount,
  currentPath,
  searchActive,
  entries,
  selectedItems,
}) => {
  const [dirSize, setDirSize] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [autoSize, setAutoSize] = useState(true);
  const calcRef = useRef(0);

  // Calculate selected items size
  const selectedSize = React.useMemo(() => {
    if (selectedCount === 0) return null;
    let total = 0;
    for (const entry of entries) {
      if (selectedItems.has(entry.path) && !entry.is_dir) {
        total += entry.size;
      }
    }
    return total > 0 ? formatFileSize(total) : null;
  }, [entries, selectedItems, selectedCount]);

  // Quick total of visible file sizes (non-dir items from entries)
  const visibleFilesSize = React.useMemo(() => {
    let total = 0;
    for (const entry of entries) {
      if (!entry.is_dir) {
        total += entry.size;
      }
    }
    return total;
  }, [entries]);

  // Auto-recalculate when path or entries change
  useEffect(() => {
    if (!autoSize || !currentPath) {
      setDirSize(null);
      return;
    }
    // For quick display, show sum of visible file sizes
    setDirSize(visibleFilesSize > 0 ? formatFileSize(visibleFilesSize) : null);
  }, [currentPath, visibleFilesSize, autoSize]);

  const calculateFullSize = useCallback(async () => {
    if (calculating || !currentPath) return;
    setCalculating(true);
    const id = ++calcRef.current;
    try {
      const size: number = await invoke("calculate_dir_size", {
        path: currentPath,
      });
      // Only update if this is still the current calculation
      if (calcRef.current === id) {
        setDirSize(formatFileSize(size));
      }
    } catch (err) {
      if (calcRef.current === id) {
        console.error("Size calculation failed:", err);
        setDirSize("Error");
      }
    } finally {
      if (calcRef.current === id) setCalculating(false);
    }
  }, [currentPath, calculating]);

  // Cancel ongoing calculation when path changes
  useEffect(() => {
    return () => {
      calcRef.current++;
    };
  }, [currentPath]);

  return (
    <div className="status-bar">
      <span className="status-item">
        {totalItems} item{totalItems !== 1 ? "s" : ""}
        {searchActive ? " found" : ""}
      </span>
      {selectedCount > 0 && (
        <span className="status-item">
          {selectedCount} selected
          {selectedSize && ` (${selectedSize})`}
        </span>
      )}
      <span className="status-item status-dir-size">
        {dirSize ? (
          <span title="Visible files size (click for full calculation)">
            {dirSize}
            {!calculating && (
              <button
                className="status-calc-btn-inline"
                onClick={calculateFullSize}
                title="Calculate full directory size (including subdirectories)"
              >
                <VscFolderOpened />
              </button>
            )}
          </span>
        ) : (
          <button
            className="status-calc-btn"
            onClick={calculateFullSize}
            disabled={calculating}
            title="Calculate directory size"
          >
            <VscFolderOpened />
            {calculating ? "Calculating..." : "Calc Size"}
          </button>
        )}
      </span>
      <span className="status-spacer" />
      <span className="status-path" title={currentPath}>
        {currentPath}
      </span>
    </div>
  );
};

export default React.memo(StatusBar);
