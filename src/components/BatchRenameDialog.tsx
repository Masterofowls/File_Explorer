import { invoke } from "@tauri-apps/api/core";
import React, { useEffect, useState } from "react";
import { VscClose, VscReplace } from "react-icons/vsc";

interface BatchRenameDialogProps {
  visible: boolean;
  files: string[];
  onClose: () => void;
  onComplete: () => void;
}

const BatchRenameDialog: React.FC<BatchRenameDialogProps> = ({
  visible,
  files,
  onClose,
  onComplete,
}) => {
  const [pattern, setPattern] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [preview, setPreview] = useState<{ old: string; new: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate preview
  useEffect(() => {
    if (!pattern || files.length === 0) {
      setPreview([]);
      return;
    }

    const generatePreview = () => {
      return files.map((filePath) => {
        const name = filePath.split(/[\\/]/).pop() || "";
        let newName = name;

        try {
          if (useRegex) {
            const re = new RegExp(pattern, "g");
            newName = name.replace(re, replaceWith);
          } else {
            newName = name.split(pattern).join(replaceWith);
          }
        } catch {
          // Invalid regex, show original
        }

        return { old: name, new: newName };
      });
    };

    setPreview(generatePreview());
  }, [files, pattern, replaceWith, useRegex]);

  const handleRename = async () => {
    if (!pattern || files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const results = await invoke<[string, string][]>("batch_rename", {
        paths: files,
        pattern,
        replaceWith,
        useRegex,
      });

      await invoke("send_notification", {
        title: "Batch Rename Complete",
        body: `Renamed ${results.length} file(s)`,
      });

      onComplete();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const hasChanges = preview.some((p) => p.old !== p.new);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog batch-rename-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 600 }}
      >
        <div className="dialog-header">
          <h2>
            <VscReplace style={{ marginRight: 8 }} />
            Batch Rename ({files.length} files)
          </h2>
          <button className="dialog-close-btn" onClick={onClose}>
            <VscClose />
          </button>
        </div>

        <div className="dialog-body">
          <div className="form-group">
            <label>Find:</label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Text or pattern to find..."
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Replace with:</label>
            <input
              type="text"
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
              placeholder="Replacement text..."
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
              />
              Use Regular Expression
            </label>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="batch-preview">
            <h3>Preview</h3>
            <div className="preview-list">
              {preview.length === 0 ? (
                <div className="preview-empty">
                  Enter a pattern to see preview
                </div>
              ) : (
                preview.map((item, i) => (
                  <div
                    key={i}
                    className={`preview-item ${item.old !== item.new ? "changed" : ""}`}
                  >
                    <span className="preview-old">{item.old}</span>
                    {item.old !== item.new && (
                      <>
                        <span className="preview-arrow">→</span>
                        <span className="preview-new">{item.new}</span>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleRename}
            disabled={!hasChanges || loading}
          >
            {loading ? "Renaming..." : "Rename All"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchRenameDialog;
