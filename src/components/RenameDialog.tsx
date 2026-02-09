import React, { useState, useRef, useEffect } from "react";

interface RenameDialogProps {
  visible: boolean;
  currentName: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}

const RenameDialog: React.FC<RenameDialogProps> = ({
  visible,
  currentName,
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Select filename without extension
          const dotIndex = currentName.lastIndexOf(".");
          if (dotIndex > 0) {
            inputRef.current.setSelectionRange(0, dotIndex);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [visible, currentName]);

  if (!visible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== currentName) {
      onConfirm(name.trim());
    }
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">Rename</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="dialog-input"
            placeholder="New name"
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
              disabled={!name.trim() || name.trim() === currentName}
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(RenameDialog);
