import React from "react";
import {
  VscArrowUp,
  VscBookmark,
  VscChevronLeft,
  VscChevronRight,
  VscCopy,
  VscEye,
  VscEyeClosed,
  VscFiles,
  VscListFlat,
  VscNewFile,
  VscNewFolder,
  VscOpenPreview,
  VscRefresh,
  VscSettingsGear,
  VscSymbolMisc,
  VscTable,
  VscTerminal,
  VscTrash,
} from "react-icons/vsc";
import type {
  ClipboardState,
  FileFilterType,
  GroupBy,
  ViewMode,
} from "../types";
import FilterDropdown from "./FilterDropdown";
import GroupByDropdown from "./GroupByDropdown";

interface ToolbarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  showHidden: boolean;
  viewMode: ViewMode;
  hasSelection: boolean;
  clipboard: ClipboardState | null;
  previewOpen: boolean;
  terminalOpen: boolean;
  activeFilter: FileFilterType;
  activeGroupBy: GroupBy;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onRefresh: () => void;
  onToggleHidden: () => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onFilterChange: (filter: FileFilterType) => void;
  onGroupByChange: (groupBy: GroupBy) => void;
  onTogglePreview: () => void;
  onToggleTerminal: () => void;
  onOpenSettings: () => void;
  onBookmarkCurrent: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  canGoBack,
  canGoForward,
  showHidden,
  viewMode,
  hasSelection,
  clipboard,
  previewOpen,
  terminalOpen,
  activeFilter,
  activeGroupBy,
  onGoBack,
  onGoForward,
  onGoUp,
  onRefresh,
  onToggleHidden,
  onNewFolder,
  onNewFile,
  onDelete,
  onCopy,
  onCut,
  onPaste,
  onViewModeChange,
  onFilterChange,
  onGroupByChange,
  onTogglePreview,
  onToggleTerminal,
  onOpenSettings,
  onBookmarkCurrent,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onGoBack}
          disabled={!canGoBack}
          title="Back"
        >
          <VscChevronLeft />
        </button>
        <button
          className="toolbar-btn"
          onClick={onGoForward}
          disabled={!canGoForward}
          title="Forward"
        >
          <VscChevronRight />
        </button>
        <button className="toolbar-btn" onClick={onGoUp} title="Go Up">
          <VscArrowUp />
        </button>
        <button className="toolbar-btn" onClick={onRefresh} title="Refresh">
          <VscRefresh />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onNewFolder}
          title="New Folder"
        >
          <VscNewFolder />
        </button>
        <button className="toolbar-btn" onClick={onNewFile} title="New File">
          <VscNewFile />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onCopy}
          disabled={!hasSelection}
          title="Copy"
        >
          <VscCopy />
        </button>
        <button
          className="toolbar-btn"
          onClick={onCut}
          disabled={!hasSelection}
          title="Cut"
        >
          <VscFiles />
        </button>
        <button
          className="toolbar-btn"
          onClick={onPaste}
          disabled={!clipboard}
          title="Paste"
        >
          <VscSymbolMisc />
        </button>
        <button
          className="toolbar-btn danger"
          onClick={onDelete}
          disabled={!hasSelection}
          title="Delete"
        >
          <VscTrash />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onBookmarkCurrent}
          title="Bookmark Current Folder"
        >
          <VscBookmark />
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${previewOpen ? "active" : ""}`}
          onClick={onTogglePreview}
          title={previewOpen ? "Close Preview" : "Open Preview"}
        >
          <VscOpenPreview />
        </button>
        <button
          className={`toolbar-btn ${terminalOpen ? "active" : ""}`}
          onClick={onToggleTerminal}
          title={terminalOpen ? "Hide Terminal" : "Show Terminal"}
        >
          <VscTerminal />
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${viewMode === "grid" ? "active" : ""}`}
          onClick={() => onViewModeChange("grid")}
          title="Grid View"
        >
          <VscSymbolMisc />
        </button>
        <button
          className={`toolbar-btn ${viewMode === "list" ? "active" : ""}`}
          onClick={() => onViewModeChange("list")}
          title="List View"
        >
          <VscListFlat />
        </button>
        <button
          className={`toolbar-btn ${viewMode === "details" ? "active" : ""}`}
          onClick={() => onViewModeChange("details")}
          title="Details View"
        >
          <VscTable />
        </button>
        <FilterDropdown
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
        />
        <GroupByDropdown
          activeGroupBy={activeGroupBy}
          onGroupByChange={onGroupByChange}
        />
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${showHidden ? "active" : ""}`}
          onClick={onToggleHidden}
          title={showHidden ? "Hide Hidden Files" : "Show Hidden Files"}
        >
          {showHidden ? <VscEye /> : <VscEyeClosed />}
        </button>
        <button
          className="toolbar-btn"
          onClick={onOpenSettings}
          title="Settings"
        >
          <VscSettingsGear />
        </button>
      </div>
    </div>
  );
};

export default React.memo(Toolbar);
