import { invoke } from "@tauri-apps/api/core";
import React, { useCallback, useState } from "react";
import { VscFolderOpened } from "react-icons/vsc";
import { formatFileSize } from "../utils/formatters";

interface StatusBarProps {
  totalItems: number;
  selectedCount: number;
  currentPath: string;
  searchActive: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({
  totalItems,
  selectedCount,
  currentPath,
  searchActive,
}) => {
  const [dirSize, setDirSize] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const calculateSize = useCallback(async () => {
    if (calculating || !currentPath) return;
    setCalculating(true);
    setDirSize(null);
    try {
      const size: number = await invoke("calculate_dir_size", {
        path: currentPath,
      });
      setDirSize(formatFileSize(size));
    } catch {
      setDirSize("Error");
    } finally {
      setCalculating(false);
    }
  }, [currentPath, calculating]);

  return (
    <div className="status-bar">
      <span className="status-item">
        {totalItems} item{totalItems !== 1 ? "s" : ""}
        {searchActive ? " found" : ""}
      </span>
      {selectedCount > 0 && (
        <span className="status-item">{selectedCount} selected</span>
      )}
      <span className="status-item status-dir-size">
        {dirSize ? (
          <span title="Directory size">{dirSize}</span>
        ) : (
          <button
            className="status-calc-btn"
            onClick={calculateSize}
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
