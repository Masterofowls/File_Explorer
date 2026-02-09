import React, { useState, useCallback, useEffect, useRef } from "react";
import { Command } from "@tauri-apps/plugin-shell";
import {
  VscTerminal,
  VscAdd,
  VscClose,
  VscChevronUp,
  VscChevronDown,
} from "react-icons/vsc";
import type { TerminalTab } from "../types";

interface TerminalPanelProps {
  visible: boolean;
  currentPath: string;
  height: number;
  onToggle: () => void;
  onResize: (height: number) => void;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({
  visible,
  currentPath,
  height,
  onToggle,
  onResize,
}) => {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, string[]>>({});
  const [inputValue, setInputValue] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{ startY: number; startH: number } | null>(null);

  // Auto-create first tab
  useEffect(() => {
    if (visible && tabs.length === 0) {
      createTab();
    }
  }, [visible]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputs, activeTab]);

  // Focus input when tab changes
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, activeTab]);

  const createTab = useCallback(() => {
    const id = crypto.randomUUID();
    const label = `Terminal ${tabs.length + 1}`;
    const newTab: TerminalTab = { id, label, cwd: currentPath };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(id);
    setOutputs((prev) => ({
      ...prev,
      [id]: [`$ cd ${currentPath}`, ""],
    }));
  }, [currentPath, tabs.length]);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeTab === id && next.length > 0) {
          setActiveTab(next[next.length - 1].id);
        } else if (next.length === 0) {
          setActiveTab(null);
        }
        return next;
      });
      setOutputs((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [activeTab],
  );

  const handleCommand = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || !activeTab || isRunning) return;

      const cmd = inputValue.trim();
      setInputValue("");
      setIsRunning(true);

      const tab = tabs.find((t) => t.id === activeTab);
      const cwd = tab?.cwd || currentPath;

      // Add command to output
      setOutputs((prev) => ({
        ...prev,
        [activeTab]: [...(prev[activeTab] || []), `$ ${cmd}`],
      }));

      // Handle 'cd' specially
      if (cmd.startsWith("cd ")) {
        const newDir = cmd.slice(3).trim();
        const resolvedPath = newDir.startsWith("/")
          ? newDir
          : `${cwd}/${newDir}`;
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab ? { ...t, cwd: resolvedPath } : t,
          ),
        );
        setOutputs((prev) => ({
          ...prev,
          [activeTab]: [...(prev[activeTab] || []), ""],
        }));
        setIsRunning(false);
        return;
      }

      try {
        const parts = cmd.split(/\s+/);
        const program = parts[0];
        const args = parts.slice(1);

        const command = Command.create(
          "exec-sh",
          ["-c", `cd "${cwd}" && ${cmd}`],
          {},
        );
        const output = await command.execute();

        const lines: string[] = [];
        if (output.stdout) lines.push(output.stdout);
        if (output.stderr) lines.push(output.stderr);
        if (output.code !== 0 && lines.length === 0) {
          lines.push(`Process exited with code ${output.code}`);
        }
        lines.push("");

        setOutputs((prev) => ({
          ...prev,
          [activeTab]: [...(prev[activeTab] || []), ...lines],
        }));
      } catch (err) {
        setOutputs((prev) => ({
          ...prev,
          [activeTab]: [
            ...(prev[activeTab] || []),
            `Error: ${String(err)}`,
            "",
          ],
        }));
      } finally {
        setIsRunning(false);
      }
    },
    [inputValue, activeTab, isRunning, tabs, currentPath],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startY: e.clientY, startH: height };

      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const diff = resizeRef.current.startY - ev.clientY;
        const newH = Math.max(
          100,
          Math.min(600, resizeRef.current.startH + diff),
        );
        onResize(newH);
      };
      const onUp = () => {
        resizeRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [height, onResize],
  );

  if (!visible) {
    return (
      <div className="terminal-toggle-bar" onClick={onToggle}>
        <VscTerminal />
        <span>Terminal</span>
        <VscChevronUp />
      </div>
    );
  }

  const currentOutput = activeTab ? outputs[activeTab] || [] : [];

  return (
    <div className="terminal-panel" style={{ height }}>
      <div className="terminal-resize-handle" onMouseDown={handleResizeStart} />

      <div className="terminal-header">
        <div className="terminal-tabs-bar">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`terminal-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <VscTerminal />
              <span>{tab.label}</span>
              <button
                className="terminal-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <VscClose />
              </button>
            </div>
          ))}
          <button
            className="terminal-tab-add"
            onClick={createTab}
            title="New Terminal"
          >
            <VscAdd />
          </button>
        </div>
        <button
          className="terminal-toggle-btn"
          onClick={onToggle}
          title="Hide Terminal"
        >
          <VscChevronDown />
        </button>
      </div>

      <div className="terminal-body" ref={outputRef}>
        {currentOutput.map((line, i) => (
          <div
            key={i}
            className={`terminal-line ${line.startsWith("$") ? "terminal-prompt" : line.startsWith("Error") ? "terminal-error" : ""}`}
          >
            {line}
          </div>
        ))}
      </div>

      <form className="terminal-input-row" onSubmit={handleCommand}>
        <span className="terminal-prompt-indicator">$</span>
        <input
          ref={inputRef}
          type="text"
          className="terminal-input"
          placeholder={isRunning ? "Running..." : "Enter command..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isRunning}
        />
      </form>
    </div>
  );
};

export default React.memo(TerminalPanel);
