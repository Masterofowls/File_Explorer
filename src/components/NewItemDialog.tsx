import React, { useState, useRef, useEffect } from "react";

interface NewItemDialogProps {
  type: "file" | "folder";
  visible: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const NewItemDialog: React.FC<NewItemDialogProps> = ({
  type,
  visible,
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  if (!visible) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">
          Create New {type === "folder" ? "Folder" : "File"}
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="dialog-input"
            placeholder={type === "folder" ? "Folder name" : "File name"}
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
      </div>
    </div>
  );
};

export default React.memo(NewItemDialog);
