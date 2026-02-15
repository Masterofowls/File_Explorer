import { invoke } from "@tauri-apps/api/core";
import React, { useCallback, useEffect, useState } from "react";
import { VscClose, VscFile, VscFolder } from "react-icons/vsc";
import type { FileProperties } from "../types";
import { formatFileSize } from "../utils/formatters";

interface PropertiesDialogProps {
  visible: boolean;
  path: string;
  onClose: () => void;
}

const PropertiesDialog: React.FC<PropertiesDialogProps> = ({
  visible,
  path,
  onClose,
}) => {
  const [props, setProps] = useState<FileProperties | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProperties = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const result: FileProperties = await invoke("get_file_properties", {
        path,
      });
      setProps(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    if (visible && path) {
      loadProperties();
    } else {
      setProps(null);
      setError(null);
    }
  }, [visible, path, loadProperties]);

  if (!visible) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="properties-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="properties-header">
          <div className="properties-title-row">
            {props?.is_dir ? <VscFolder /> : <VscFile />}
            <h3>{props?.name || "Properties"}</h3>
          </div>
          <button className="preview-close" onClick={onClose} title="Close">
            <VscClose />
          </button>
        </div>

        <div className="properties-body">
          {loading && <div className="properties-loading">Loading...</div>}
          {error && <div className="properties-error">Error: {error}</div>}
          {props && !loading && (
            <>
              <div className="properties-section">
                <h4>General</h4>
                <PropertyRow label="Name" value={props.name} />
                <PropertyRow
                  label="Type"
                  value={
                    props.is_dir
                      ? `Folder${props.item_count != null ? ` (${props.item_count} items)` : ""}`
                      : props.extension
                        ? `${props.extension.toUpperCase()} File`
                        : "File"
                  }
                />
                <PropertyRow
                  label="Location"
                  value={props.path.replace(/[/\\][^/\\]*$/, "") || props.path}
                />
                <PropertyRow
                  label="Size"
                  value={
                    props.size > 0
                      ? `${formatFileSize(props.size)} (${props.size.toLocaleString()} bytes)`
                      : "0 bytes"
                  }
                />
              </div>

              <div className="properties-section">
                <h4>Dates</h4>
                <PropertyRow label="Created" value={props.created || "—"} />
                <PropertyRow label="Modified" value={props.modified || "—"} />
                <PropertyRow label="Accessed" value={props.accessed || "—"} />
              </div>

              <div className="properties-section">
                <h4>Attributes</h4>
                <div className="properties-attributes">
                  <span
                    className={`properties-attr ${props.is_readonly ? "active" : ""}`}
                  >
                    Read-only
                  </span>
                  <span
                    className={`properties-attr ${props.is_hidden ? "active" : ""}`}
                  >
                    Hidden
                  </span>
                  <span
                    className={`properties-attr ${props.is_symlink ? "active" : ""}`}
                  >
                    Symlink
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="property-row">
      <span className="property-label">{label}</span>
      <span className="property-value" title={value}>
        {value}
      </span>
    </div>
  );
}

export default React.memo(PropertiesDialog);
