import React, { useState, useCallback, useEffect, useRef } from "react";
import type { AppSettings, SortField, SortDirection, ViewMode } from "../types";
import { DEFAULT_SETTINGS } from "../types";
import { VscSettingsGear, VscClose, VscRefresh } from "react-icons/vsc";

interface SettingsDialogProps {
  visible: boolean;
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
  onReset: () => void;
  onClose: () => void;
}

const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "size", label: "Size" },
  { value: "modified", label: "Date Modified" },
  { value: "extension", label: "Type" },
];

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
  { value: "details", label: "Details" },
];

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  visible,
  settings,
  onUpdate,
  onReset,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    "general" | "appearance" | "advanced"
  >("general");

  if (!visible) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title-row">
            <VscSettingsGear />
            <h3>Settings</h3>
          </div>
          <button className="preview-close" onClick={onClose} title="Close">
            <VscClose />
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            General
          </button>
          <button
            className={`settings-tab ${activeTab === "appearance" ? "active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            Appearance
          </button>
          <button
            className={`settings-tab ${activeTab === "advanced" ? "active" : ""}`}
            onClick={() => setActiveTab("advanced")}
          >
            Advanced
          </button>
        </div>

        <div className="settings-body">
          {activeTab === "general" && (
            <div className="settings-section">
              <SettingsRow label="Default View Mode">
                <select
                  className="settings-select"
                  value={settings.defaultViewMode}
                  onChange={(e) =>
                    onUpdate("defaultViewMode", e.target.value as ViewMode)
                  }
                >
                  {VIEW_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </SettingsRow>

              <SettingsRow label="Default Sort Field">
                <select
                  className="settings-select"
                  value={settings.defaultSortField}
                  onChange={(e) =>
                    onUpdate("defaultSortField", e.target.value as SortField)
                  }
                >
                  {SORT_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </SettingsRow>

              <SettingsRow label="Default Sort Direction">
                <select
                  className="settings-select"
                  value={settings.defaultSortDirection}
                  onChange={(e) =>
                    onUpdate(
                      "defaultSortDirection",
                      e.target.value as SortDirection,
                    )
                  }
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </SettingsRow>

              <SettingsToggle
                label="Show Hidden Files by Default"
                checked={settings.showHiddenByDefault}
                onChange={(v) => onUpdate("showHiddenByDefault", v)}
              />

              <SettingsToggle
                label="Confirm Before Delete"
                checked={settings.confirmDelete}
                onChange={(v) => onUpdate("confirmDelete", v)}
              />

              <SettingsToggle
                label="Auto-Preview on Select"
                checked={settings.showPreviewOnSelect}
                onChange={(v) => onUpdate("showPreviewOnSelect", v)}
              />
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="settings-section">
              <SettingsRow label="Theme">
                <select
                  className="settings-select"
                  value={settings.theme}
                  onChange={(e) =>
                    onUpdate(
                      "theme",
                      e.target.value as "light" | "dark" | "system",
                    )
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </SettingsRow>

              <SettingsRow label={`Font Size: ${settings.fontSize}px`}>
                <input
                  type="range"
                  className="settings-range"
                  min={10}
                  max={20}
                  step={1}
                  value={settings.fontSize}
                  onChange={(e) => onUpdate("fontSize", Number(e.target.value))}
                />
              </SettingsRow>

              <SettingsRow label={`Sidebar Width: ${settings.sidebarWidth}px`}>
                <input
                  type="range"
                  className="settings-range"
                  min={160}
                  max={360}
                  step={10}
                  value={settings.sidebarWidth}
                  onChange={(e) =>
                    onUpdate("sidebarWidth", Number(e.target.value))
                  }
                />
              </SettingsRow>
            </div>
          )}

          {activeTab === "advanced" && (
            <div className="settings-section">
              <SettingsRow
                label={`Terminal Height: ${settings.terminalHeight}px`}
              >
                <input
                  type="range"
                  className="settings-range"
                  min={100}
                  max={500}
                  step={10}
                  value={settings.terminalHeight}
                  onChange={(e) =>
                    onUpdate("terminalHeight", Number(e.target.value))
                  }
                />
              </SettingsRow>

              <div className="settings-reset-row">
                <button className="dialog-btn cancel" onClick={onReset}>
                  <VscRefresh style={{ marginRight: 6 }} />
                  Reset to Defaults
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function SettingsRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="settings-row">
      <label className="settings-label">{label}</label>
      <div className="settings-control">{children}</div>
    </div>
  );
}

function SettingsToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="settings-row">
      <label className="settings-label">{label}</label>
      <div className="settings-control">
        <button
          className={`settings-toggle ${checked ? "on" : "off"}`}
          onClick={() => onChange(!checked)}
        >
          <span className="settings-toggle-thumb" />
        </button>
      </div>
    </div>
  );
}

export default React.memo(SettingsDialog);
