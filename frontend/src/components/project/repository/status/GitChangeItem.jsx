import { FileText, Pencil, Plus, Trash2, ArrowRightLeft } from "lucide-react";

const STATUS = {
  modified: {
    label: "Modified",
    icon: Pencil,
    className: "modified",
  },

  created: {
    label: "Added",
    icon: Plus,
    className: "added",
  },

  untracked: {
    label: "Added",
    icon: Plus,
    className: "added",
  },

  deleted: {
    label: "Deleted",
    icon: Trash2,
    className: "deleted",
  },

  renamed: {
    label: "Renamed",
    icon: ArrowRightLeft,
    className: "renamed",
  },
};

function fileName(path) {
  return path.split("/").pop();
}

function directory(path) {
  const parts = path.split("/");

  parts.pop();

  return parts.join("/") || "/";
}

export default function GitChangeItem({ change }) {
  const status = STATUS[change.status];

  const Icon = status.icon;

  return (
    <div className="eh-change-item">
      <div className="eh-change-left">
        <FileText size={18} />

        <div>
          <strong>{fileName(change.path)}</strong>

          <small>{directory(change.path)}</small>
        </div>
      </div>

      <div className={`eh-change-status ${status.className}`}>
        <Icon size={14} />

        {status.label}
      </div>
    </div>
  );
}
