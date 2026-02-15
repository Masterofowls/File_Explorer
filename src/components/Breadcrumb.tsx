import React, { useEffect, useRef, useState } from "react";
import { VscChevronRight, VscEdit } from "react-icons/vsc";
import { pathSegments } from "../utils/formatters";

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, onNavigate }) => {
  const segments = pathSegments(path);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(path);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(path);
  }, [path]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== path) {
      onNavigate(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setEditValue(path);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="breadcrumb editing">
        <input
          ref={inputRef}
          type="text"
          className="breadcrumb-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
        />
      </div>
    );
  }

  return (
    <div className="breadcrumb">
      {segments.map((seg, i) => (
        <React.Fragment key={seg.path}>
          {i > 0 && (
            <span className="breadcrumb-separator">
              <VscChevronRight />
            </span>
          )}
          <button
            className={`breadcrumb-item ${i === segments.length - 1 ? "active" : ""}`}
            onClick={() => onNavigate(seg.path)}
          >
            {seg.name}
          </button>
        </React.Fragment>
      ))}
      <button
        className="breadcrumb-edit-btn"
        onClick={() => setIsEditing(true)}
        title="Edit path (click to type)"
      >
        <VscEdit />
      </button>
    </div>
  );
};

export default React.memo(Breadcrumb);
