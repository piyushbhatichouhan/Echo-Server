import { useState } from "react";
import { UploadCloud, CheckCircle2, XCircle, ChevronUp, ChevronDown, X, AlertCircle } from "lucide-react";
import "./UploadDrawer.css";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function UploadDrawer({
  uploads = [],
  onCancelAll,
  onDismiss,
}) {
  const [minimized, setMinimized] = useState(false);

  if (!uploads || uploads.length === 0) return null;

  const totalCount = uploads.length;
  const completedCount = uploads.filter((u) => u.status === "completed").length;
  const inProgressCount = uploads.filter((u) => u.status === "uploading" || u.status === "pending").length;
  const errorCount = uploads.filter((u) => u.status === "error" || u.status === "cancelled").length;

  const allFinished = inProgressCount === 0;

  return (
    <div className={`upload-drawer-container ${minimized ? "minimized" : ""}`}>
      <div className="upload-drawer-header" onClick={() => setMinimized((m) => !m)}>
        <div className="upload-drawer-title">
          <UploadCloud size={18} className="upload-drawer-icon" />
          <span>
            {allFinished
              ? `Completed (${completedCount}/${totalCount})`
              : `Uploading ${inProgressCount} file${inProgressCount === 1 ? "" : "s"}...`}
          </span>
        </div>

        <div className="upload-drawer-controls" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="drawer-icon-btn"
            onClick={() => setMinimized((m) => !m)}
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {allFinished ? (
            <button
              type="button"
              className="drawer-icon-btn"
              onClick={onDismiss}
              title="Close drawer"
            >
              <X size={16} />
            </button>
          ) : (
            onCancelAll && (
              <button
                type="button"
                className="drawer-cancel-text-btn"
                onClick={onCancelAll}
                title="Cancel ongoing uploads"
              >
                Cancel
              </button>
            )
          )}
        </div>
      </div>

      {!minimized && (
        <div className="upload-drawer-list">
          {uploads.map((item, idx) => (
            <div key={item.id || idx} className={`upload-drawer-item ${item.status}`}>
              <div className="upload-item-header">
                <span className="upload-item-name" title={item.name}>
                  {item.name}
                </span>
                <span className="upload-item-status-icon">
                  {item.status === "completed" && <CheckCircle2 size={15} className="status-success" />}
                  {item.status === "uploading" && <span className="upload-percent">{item.progress || 0}%</span>}
                  {item.status === "pending" && <span className="upload-percent">Queued</span>}
                  {(item.status === "error" || item.status === "cancelled") && (
                    <XCircle size={15} className="status-error" />
                  )}
                </span>
              </div>

              <div className="upload-item-meta">
                <span>{formatBytes(item.size)}</span>
                {item.error && <span className="upload-item-error-msg">{item.error}</span>}
              </div>

              {item.status === "uploading" && (
                <div className="upload-progress-bar-bg">
                  <div
                    className="upload-progress-bar-fill"
                    style={{ width: `${Math.min(100, Math.max(0, item.progress || 0))}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
