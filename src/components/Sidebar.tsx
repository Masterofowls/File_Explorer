import React from "react";
import {
  VscBookmark,
  VscClose,
  VscCloudDownload,
  VscDeviceCamera,
  VscFile,
  VscFileMedia,
  VscHome,
  VscLibrary,
} from "react-icons/vsc";
import type { Bookmark, QuickAccessItem } from "../types";

const ICON_MAP: Record<string, React.ReactNode> = {
  home: <VscHome />,
  desktop: <VscFileMedia />,
  documents: <VscFile />,
  downloads: <VscCloudDownload />,
  pictures: <VscDeviceCamera />,
  music: <VscLibrary />,
  videos: <VscFileMedia />,
};

interface SidebarProps {
  quickAccess: QuickAccessItem[];
  currentPath: string;
  bookmarks: Bookmark[];
  onNavigate: (path: string) => void;
  onRemoveBookmark: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  quickAccess,
  currentPath,
  bookmarks,
  onNavigate,
  onRemoveBookmark,
}) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Quick Access</h3>
        <ul className="sidebar-list">
          {quickAccess.map((item) => (
            <li
              key={item.path}
              className={`sidebar-item ${currentPath === item.path ? "active" : ""}`}
              onClick={() => onNavigate(item.path)}
              title={item.path}
            >
              <span className="sidebar-icon">
                {ICON_MAP[item.icon] || <VscFile />}
              </span>
              <span className="sidebar-label">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {bookmarks.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-heading">Bookmarks</h3>
          <ul className="sidebar-list">
            {bookmarks.map((bm) => (
              <li
                key={bm.id}
                className={`sidebar-item ${currentPath === bm.path ? "active" : ""}`}
                onClick={() => onNavigate(bm.path)}
                title={bm.path}
              >
                <span className="sidebar-icon">
                  <VscBookmark />
                </span>
                <span className="sidebar-label">{bm.label}</span>
                <button
                  className="sidebar-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBookmark(bm.id);
                  }}
                  title="Remove bookmark"
                >
                  <VscClose />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sidebar-section">
        <h3 className="sidebar-heading">System</h3>
        <ul className="sidebar-list">
          <li
            className={`sidebar-item ${currentPath === "/" ? "active" : ""}`}
            onClick={() => onNavigate("/")}
            title="Root"
          >
            <span className="sidebar-icon">
              <VscHome />
            </span>
            <span className="sidebar-label">Root (/)</span>
          </li>
          <li
            className="sidebar-item"
            onClick={() => onNavigate("/tmp")}
            title="/tmp"
          >
            <span className="sidebar-icon">
              <VscFile />
            </span>
            <span className="sidebar-label">Temp</span>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default React.memo(Sidebar);
