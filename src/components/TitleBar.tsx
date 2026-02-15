import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useCallback, useEffect, useState } from "react";

interface TitleBarProps {
  title?: string;
}

const TitleBar: React.FC<TitleBarProps> = ({
  title = "Fluent File Explorer",
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    const appWindow = getCurrentWindow();

    // Check initial maximized state
    appWindow.isMaximized().then(setIsMaximized);

    // Listen for window state changes
    const unlistenResize = appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    });

    const unlistenFocus = appWindow.onFocusChanged(({ payload: focused }) => {
      setIsFocused(focused);
    });

    return () => {
      unlistenResize.then((fn) => fn());
      unlistenFocus.then((fn) => fn());
    };
  }, []);

  const handleMinimize = useCallback(async () => {
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
  }, []);

  const handleClose = useCallback(async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  }, []);

  const handleDoubleClick = useCallback(async () => {
    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
  }, []);

  return (
    <div
      className={`titlebar ${!isFocused ? "titlebar-unfocused" : ""}`}
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
    >
      {/* App icon */}
      <div className="titlebar-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
        </svg>
      </div>

      {/* Title */}
      <div className="titlebar-title" data-tauri-drag-region>
        {title}
      </div>

      {/* Spacer */}
      <div className="titlebar-spacer" data-tauri-drag-region />

      {/* Window controls */}
      <div className="titlebar-controls">
        <button
          className="titlebar-button titlebar-minimize"
          onClick={handleMinimize}
          aria-label="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <rect width="10" height="1" fill="currentColor" />
          </svg>
        </button>

        <button
          className="titlebar-button titlebar-maximize"
          onClick={handleMaximize}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                d="M2.5,0.5 h7 v7 M0.5,2.5 h7 v7 h-7 z"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect
                x="0.5"
                y="0.5"
                width="9"
                height="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          )}
        </button>

        <button
          className="titlebar-button titlebar-close"
          onClick={handleClose}
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              d="M1,1 L9,9 M9,1 L1,9"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
