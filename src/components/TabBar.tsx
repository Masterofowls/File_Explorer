import React from "react";
import { VscAdd, VscClose } from "react-icons/vsc";
import type { ExplorerTab } from "../types";

interface TabBarProps {
  tabs: ExplorerTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
}) => {
  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-item ${tab.id === activeTabId ? "active" : ""}`}
            onClick={() => onTabSelect(tab.id)}
            title={tab.path}
            role="tab"
            aria-selected={tab.id === activeTabId}
          >
            <span className="tab-label">{tab.label || "New Tab"}</span>
            <button
              className="tab-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              title="Close Tab (Ctrl+W)"
              aria-label={`Close ${tab.label || "tab"}`}
            >
              <VscClose size={12} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="tab-new-btn"
        onClick={onNewTab}
        title="New Tab (Ctrl+T)"
        aria-label="New Tab"
      >
        <VscAdd size={14} />
      </button>
    </div>
  );
};

export default React.memo(TabBar);
