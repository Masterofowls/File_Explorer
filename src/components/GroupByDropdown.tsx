import React, { useEffect, useRef, useState } from "react";
import {
  VscCalendar,
  VscClose,
  VscListTree,
  VscSymbolClass,
  VscSymbolRuler,
} from "react-icons/vsc";
import type { GroupBy } from "../types";

interface GroupByDropdownProps {
  activeGroupBy: GroupBy;
  onGroupByChange: (groupBy: GroupBy) => void;
}

const groupOptions: { value: GroupBy; label: string; icon: React.ReactNode }[] =
  [
    { value: "none", label: "None", icon: <VscClose /> },
    { value: "type", label: "Type", icon: <VscSymbolClass /> },
    { value: "date", label: "Date Modified", icon: <VscCalendar /> },
    { value: "size", label: "Size", icon: <VscSymbolRuler /> },
  ];

const GroupByDropdown: React.FC<GroupByDropdownProps> = ({
  activeGroupBy,
  onGroupByChange,
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

  const currentOption =
    groupOptions.find((o) => o.value === activeGroupBy) || groupOptions[0];

  return (
    <div className="filter-dropdown" ref={dropdownRef}>
      <button
        className={`toolbar-btn ${activeGroupBy !== "none" ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Group by"
      >
        <VscListTree />
        {activeGroupBy !== "none" && (
          <span className="filter-badge">{currentOption.label}</span>
        )}
      </button>
      {isOpen && (
        <div className="filter-menu">
          {groupOptions.map((option) => (
            <button
              key={option.value}
              className={`filter-item ${activeGroupBy === option.value ? "active" : ""}`}
              onClick={() => {
                onGroupByChange(option.value);
                setIsOpen(false);
              }}
            >
              <span className="filter-icon">{option.icon}</span>
              <span className="filter-label">{option.label}</span>
              {activeGroupBy === option.value && (
                <span className="filter-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupByDropdown;
