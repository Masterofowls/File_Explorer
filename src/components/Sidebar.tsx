import React from "react";
import {
  VscBookmark,
  VscClose,
  VscCloudDownload,
  VscDatabase,
  VscDeviceCamera,
  VscFile,
  VscFileMedia,
  VscHome,
  VscLibrary,
  VscTrash,
} from "react-icons/vsc";
import type { Bookmark, DriveItem, QuickAccessItem } from "../types";
import { formatFileSize } from "../utils/formatters";

const ICON_MAP: Record<string, React.ReactNode> = {
  home: <VscHome />,
  desktop: <VscFileMedia />,
  documents: <VscFile />,
  downloads: <VscCloudDownload />,
  pictures: <VscDeviceCamera />,
  music: <VscLibrary />,
  videos: <VscFileMedia />,
};

interface SidebarDragDrop {
  dropTarget: string | null;
  onDragOver: (e: React.DragEvent, targetPath: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetPath: string) => void;
}

interface SidebarProps {
  quickAccess: QuickAccessItem[];
  currentPath: string;
  bookmarks: Bookmark[];
  drives: DriveItem[];
  onNavigate: (path: string) => void;
  onRemoveBookmark: (id: string) => void;
  onOpenRecycleBin?: () => void;
  dragDrop?: SidebarDragDrop;
}

const Sidebar: React.FC<SidebarProps> = ({
  quickAccess,
  currentPath,
  bookmarks,
  drives,
  onNavigate,
  onRemoveBookmark,
  onOpenRecycleBin,
  dragDrop,
}) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3 className="sidebar-heading">Quick Access</h3>
        <ul className="sidebar-list">
          {quickAccess.map((item) => (
            <li
              key={item.path}
              className={`sidebar-item ${currentPath === item.path ? "active" : ""} ${dragDrop?.dropTarget === item.path ? "drag-over" : ""}`}
              onClick={() => onNavigate(item.path)}
              title={item.path}
              data-drop-path={item.path}
              onDragOver={(e) => dragDrop?.onDragOver(e, item.path)}
              onDragLeave={(e) => dragDrop?.onDragLeave(e)}
              onDrop={(e) => dragDrop?.onDrop(e, item.path)}
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
                className={`sidebar-item ${currentPath === bm.path ? "active" : ""} ${dragDrop?.dropTarget === bm.path ? "drag-over" : ""}`}
                onClick={() => onNavigate(bm.path)}
                title={bm.path}
                data-drop-path={bm.path}
                onDragOver={(e) => dragDrop?.onDragOver(e, bm.path)}
                onDragLeave={(e) => dragDrop?.onDragLeave(e)}
                onDrop={(e) => dragDrop?.onDrop(e, bm.path)}
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

      {drives.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-heading">Drives</h3>
          <ul className="sidebar-list">
            {drives.map((drive) => (
              <li
                key={drive.path}
                className={`sidebar-item drive-item ${currentPath === drive.path ? "active" : ""} ${dragDrop?.dropTarget === drive.path ? "drag-over" : ""}`}
                onClick={() => onNavigate(drive.path)}
                title={drive.path}
                data-drop-path={drive.path}
                onDragOver={(e) => dragDrop?.onDragOver(e, drive.path)}
                onDragLeave={(e) => dragDrop?.onDragLeave(e)}
                onDrop={(e) => dragDrop?.onDrop(e, drive.path)}
              >
                <span className="sidebar-icon">
                  <VscDatabase />
                </span>
                <div className="drive-info">
                  <span className="sidebar-label">{drive.label}</span>
                  {drive.total_bytes !== undefined &&
                    drive.available_bytes !== undefined && (
                      <div className="drive-space">
                        <div className="drive-space-bar">
                          <div
                            className="drive-space-used"
                            style={{ width: `${drive.percent_used ?? 0}%` }}
                          />
                        </div>
                        <span className="drive-space-text">
                          {formatFileSize(drive.available_bytes)} free of{" "}
                          {formatFileSize(drive.total_bytes)}
                        </span>
                      </div>
                    )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onOpenRecycleBin && (
        <div className="sidebar-section">
          <h3 className="sidebar-heading">System</h3>
          <ul className="sidebar-list">
            <li
              className={`sidebar-item ${currentPath === "Recycle Bin" ? "active" : ""}`}
              onClick={onOpenRecycleBin}
              title="Open Recycle Bin - Opens as native directory"
            >
              <span className="sidebar-icon">
                <VscTrash />
              </span>
              <span className="sidebar-label">Recycle Bin</span>
            </li>
          </ul>
        </div>
      )}
    </aside>
  );
};

export default React.memo(Sidebar);
