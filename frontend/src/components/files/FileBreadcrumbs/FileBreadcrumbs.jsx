import "./FileBreadcrumbs.css";
import { ChevronRight, HardDrive } from "lucide-react";

export default function Breadcrumbs({ currentFolder, onNavigate }) {
  const parts = currentFolder ? currentFolder.split("/") : [];

  return (
    <div className="eh-breadcrumbs">
      <button className="eh-breadcrumb-root" onClick={() => onNavigate("")}>
        <HardDrive size={15} />
        <span>Root</span>
      </button>

      {parts.map((part, index) => {
        const path = parts.slice(0, index + 1).join("/");

        return (
          <div className="eh-breadcrumb-item" key={path}>
            <ChevronRight size={15} />

            <button
              className="eh-breadcrumb-button"
              onClick={() => onNavigate(path)}
            >
              {part}
            </button>
          </div>
        );
      })}
    </div>
  );
}
