import React from "react";
import { VscChevronRight } from "react-icons/vsc";
import { pathSegments } from "../utils/formatters";

interface BreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ path, onNavigate }) => {
  const segments = pathSegments(path);

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
    </div>
  );
};

export default React.memo(Breadcrumb);
