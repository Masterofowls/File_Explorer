import React, { useState, useRef, useEffect } from "react";
import { FILE_TEMPLATES } from "../data/fileTemplates";
import type { FileTemplate } from "../types";

interface TemplateDialogProps {
  visible: boolean;
  onConfirm: (name: string, content: string) => void;
  onCancel: () => void;
}

const TemplateDialog: React.FC<TemplateDialogProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const [selected, setSelected] = useState<FileTemplate | null>(null);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setSelected(null);
      setName("");
    }
  }, [visible]);

  useEffect(() => {
    if (selected) {
      const defaultName = `untitled.${selected.extension}`;
      setName(defaultName);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const dotIndex = defaultName.lastIndexOf(".");
          inputRef.current.setSelectionRange(
            0,
            dotIndex > 0 ? dotIndex : defaultName.length,
          );
        }
      }, 50);
    }
  }, [selected]);

  if (!visible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && selected) {
      onConfirm(name.trim(), selected.content);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog template-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="dialog-title">Create from Template</h3>

        {!selected ? (
          <div className="template-grid">
            {FILE_TEMPLATES.map((t) => (
              <button
                key={t.extension + t.label}
                className="template-item"
                onClick={() => setSelected(t)}
              >
                <span className="template-ext">.{t.extension}</span>
                <span className="template-label">{t.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="template-selected-info">
              <span className="template-ext-badge">.{selected.extension}</span>
              <span>{selected.label}</span>
              <button
                type="button"
                className="template-change"
                onClick={() => setSelected(null)}
              >
                Change
              </button>
            </div>
            <input
              ref={inputRef}
              type="text"
              className="dialog-input"
              placeholder="File name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-btn cancel"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="dialog-btn primary"
                disabled={!name.trim()}
              >
                Create
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default React.memo(TemplateDialog);
