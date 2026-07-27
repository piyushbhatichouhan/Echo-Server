import "./GitStatusCard.css";

import {
  GitCompare,
  Pencil,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { useState } from "react";

import GitChangeItem from "./GitChangeItem";

export default function GitStatusCard({ gitStatus }) {
  const [expanded, setExpanded] = useState(false);

  if (!gitStatus) return null;

  if (gitStatus.clean) {
    return (
      <div className="eh-git-status-card">
        <div className="eh-git-header">
          <GitCompare size={22} />

          <div>
            <h2>Working Tree</h2>

            <p>Repository status</p>
          </div>
        </div>

        <div className="eh-clean-state">Everything is committed.</div>
      </div>
    );
  }

  const changes = gitStatus.changes;

  const modified = changes.filter((c) => c.status === "modified").length;

  const added = changes.filter(
    (c) => c.status === "created" || c.status === "untracked",
  ).length;

  const deleted = changes.filter((c) => c.status === "deleted").length;

  const visible = expanded ? changes : changes.slice(0, 5);

  return (
    <div className="eh-git-status-card">
      <div className="eh-git-header">
        <GitCompare size={22} />

        <div>
          <h2>Working Tree</h2>

          <p>{changes.length} changed files</p>
        </div>
      </div>

      <div className="eh-summary">
        <div className="eh-summary-card modified">
          <Pencil size={18} />

          <strong>{modified}</strong>

          <small>Modified</small>
        </div>

        <div className="eh-summary-card added">
          <Plus size={18} />

          <strong>{added}</strong>

          <small>Added</small>
        </div>

        <div className="eh-summary-card deleted">
          <Trash2 size={18} />

          <strong>{deleted}</strong>

          <small>Deleted</small>
        </div>
      </div>

      <div className="eh-change-list">
        {visible.map((change) => (
          <GitChangeItem key={change.path} change={change} />
        ))}
      </div>

      {changes.length > 5 && (
        <button
          className="eh-expand-button"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              Show Less
              <ChevronUp size={16} />
            </>
          ) : (
            <>
              Show All ({changes.length})
              <ChevronDown size={16} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
