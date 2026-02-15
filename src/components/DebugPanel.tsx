import React, { useEffect, useState } from "react";
import { VscChevronDown, VscChevronUp, VscClearAll } from "react-icons/vsc";
import type { DebugLog } from "../utils/debugLogger";
import { debugLogger } from "../utils/debugLogger";

interface DebugPanelProps {
  visible: boolean;
}

const formatLogData = (data: unknown): string => {
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

const DebugPanel: React.FC<DebugPanelProps> = ({ visible }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [level, setLevel] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [expanded, setExpanded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = debugLogger.subscribe((log) => {
      setLogs((prev) => [...prev, log].slice(-500)); // Keep last 500
    });

    // Initial load
    setLogs(debugLogger.getAllLogs());

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (level !== "all" && log.level !== level) return false;
    if (category !== "all" && log.category !== category) return false;
    return true;
  });

  const categories = [...new Set(logs.map((l) => l.category))];

  const getLevelColor = (levelType: string) => {
    switch (levelType) {
      case "error":
        return "#d32f2f";
      case "warn":
        return "#f57c00";
      case "perf":
        return "#388e3c";
      case "debug":
        return "#1976d2";
      default:
        return "var(--text-secondary)";
    }
  };

  if (!visible) return null;

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <div className="debug-title">
          <button
            className="debug-expand-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <VscChevronDown /> : <VscChevronUp />}
          </button>
          <span>Debug Console ({filteredLogs.length})</span>
        </div>
        <div className="debug-controls">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="debug-filter"
            title="Filter by level"
          >
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
            <option value="perf">Performance</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="debug-filter"
            title="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <label className="debug-checkbox">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span>Auto-scroll</span>
          </label>

          <button
            className="debug-clear-btn"
            onClick={() => {
              debugLogger.clearLogs();
              setLogs([]);
            }}
            title="Clear logs"
          >
            <VscClearAll size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="debug-content" ref={containerRef}>
          {filteredLogs.length === 0 ? (
            <div className="debug-empty">No logs to display</div>
          ) : (
            <div className="debug-logs">
              {filteredLogs.map((log) => (
                <div key={log.id} className="debug-log-entry">
                  <div className="debug-log-header">
                    <span
                      className="debug-level"
                      style={{ color: getLevelColor(log.level) }}
                    >
                      {log.level.toUpperCase()}
                    </span>
                    <span className="debug-category">[{log.category}]</span>
                    <span className="debug-message">{log.message}</span>
                    {log.duration !== undefined && (
                      <span className="debug-duration">
                        {log.duration.toFixed(2)}ms
                      </span>
                    )}
                    <span className="debug-time">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {log.data ? (
                    <div className="debug-log-data">
                      <code>{formatLogData(log.data) as any}</code>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(DebugPanel);
