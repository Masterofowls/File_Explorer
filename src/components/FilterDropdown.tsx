import React, { useEffect, useRef, useState } from "react";
import {
  VscFile,
  VscFileBinary,
  VscFileCode,
  VscFileMedia,
  VscFileZip,
  VscFilter,
  VscFolder,
} from "react-icons/vsc";
import type { FileFilterType } from "../types";

interface FilterDropdownProps {
  activeFilter: FileFilterType;
  onFilterChange: (filter: FileFilterType) => void;
}

const filters: {
  value: FileFilterType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "all", label: "All Files", icon: <VscFile /> },
  { value: "documents", label: "Documents", icon: <VscFile /> },
  { value: "images", label: "Images", icon: <VscFileMedia /> },
  { value: "videos", label: "Videos", icon: <VscFileMedia /> },
  { value: "audio", label: "Audio", icon: <VscFileBinary /> },
  { value: "archives", label: "Archives", icon: <VscFileZip /> },
  { value: "code", label: "Code", icon: <VscFileCode /> },
  { value: "folders", label: "Folders Only", icon: <VscFolder /> },
];

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentFilter =
    filters.find((f) => f.value === activeFilter) || filters[0];

  return (
    <div className="filter-dropdown" ref={dropdownRef}>
      <button
        className={`toolbar-btn ${activeFilter !== "all" ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Filter by type"
      >
        <VscFilter />
        {activeFilter !== "all" && (
          <span className="filter-badge">{currentFilter.label}</span>
        )}
      </button>
      {isOpen && (
        <div className="filter-menu">
          {filters.map((filter) => (
            <button
              key={filter.value}
              className={`filter-item ${activeFilter === filter.value ? "active" : ""}`}
              onClick={() => {
                onFilterChange(filter.value);
                setIsOpen(false);
              }}
            >
              <span className="filter-icon">{filter.icon}</span>
              <span className="filter-label">{filter.label}</span>
              {activeFilter === filter.value && (
                <span className="filter-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
