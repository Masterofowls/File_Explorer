export interface DebugLog {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "error" | "debug" | "perf";
  category: string;
  message: string;
  data?: unknown;
  duration?: number;
}

class DebugLogger {
  private logs: DebugLog[] = [];
  private maxLogs = 1000;
  private listeners: Set<(log: DebugLog) => void> = new Set();
  private performanceMarkers: Map<string, number> = new Map();
  private enableConsole = true;
  private enableStorage = true;

  constructor() {
    // Load from localStorage if available
    try {
      if (this.enableStorage) {
        const saved = localStorage.getItem("debug_logs");
        if (saved) {
          this.logs = JSON.parse(saved).slice(-100); // Load last 100
        }
      }
    } catch (e) {
      console.error("Failed to load debug logs", e);
    }
  }

  private createLog(
    level: DebugLog["level"],
    category: string,
    message: string,
    data?: unknown,
    duration?: number,
  ): DebugLog {
    const log: DebugLog = {
      id: `${category}-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      duration,
    };

    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Persist to localStorage
    if (this.enableStorage) {
      try {
        localStorage.setItem(
          "debug_logs",
          JSON.stringify(this.logs.slice(-100)),
        );
      } catch (e) {
        // Ignore storage errors
      }
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(log));

    // Console output
    if (this.enableConsole) {
      const msg = `[${category}] ${message}`;
      switch (level) {
        case "error":
          if (data !== undefined) console.error(msg, data);
          else console.error(msg);
          break;
        case "warn":
          if (data !== undefined) console.warn(msg, data);
          else console.warn(msg);
          break;
        case "debug":
          if (data !== undefined) console.debug(msg, data);
          else console.debug(msg);
          break;
        default:
          if (data !== undefined) console.log(msg, data);
          else console.log(msg);
      }
    }

    return log;
  }

  info(category: string, message: string, data?: unknown): DebugLog {
    return this.createLog("info", category, message, data);
  }

  warn(category: string, message: string, data?: unknown): DebugLog {
    return this.createLog("warn", category, message, data);
  }

  error(category: string, message: string, data?: unknown): DebugLog {
    return this.createLog("error", category, message, data);
  }

  debug(category: string, message: string, data?: unknown): DebugLog {
    return this.createLog("debug", category, message, data);
  }

  perf(
    category: string,
    message: string,
    duration: number,
    data?: unknown,
  ): DebugLog {
    return this.createLog("perf", category, message, data, duration);
  }

  startMark(key: string): void {
    this.performanceMarkers.set(key, performance.now());
  }

  endMark(
    key: string,
    category: string = "perf",
    message?: string,
  ): number | null {
    const start = this.performanceMarkers.get(key);
    if (start === undefined) {
      this.warn("perf", `Mark "${key}" not found`);
      return null;
    }

    const duration = performance.now() - start;
    this.performanceMarkers.delete(key);
    this.perf(category, message || key, duration);
    return duration;
  }

  getLogs(filter?: {
    level?: string;
    category?: string;
    limit?: number;
  }): DebugLog[] {
    let filtered = this.logs;

    if (filter?.level) {
      filtered = filtered.filter((log) => log.level === filter.level);
    }

    if (filter?.category) {
      filtered = filtered.filter((log) => log.category === filter.category);
    }

    const limit = filter?.limit || 100;
    return filtered.slice(-limit);
  }

  getAllLogs(): DebugLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
    try {
      localStorage.removeItem("debug_logs");
    } catch (e) {
      // Ignore
    }
  }

  subscribe(listener: (log: DebugLog) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setEnabled(enableConsole: boolean, enableStorage: boolean): void {
    this.enableConsole = enableConsole;
    this.enableStorage = enableStorage;
  }
}

export const debugLogger = new DebugLogger();
