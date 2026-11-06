import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import "./GitStatusCard.css";
import {
  GitCompare,
  Pencil,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  FileCode,
  Copy,
  Check,
} from "lucide-react";

import GitChangeItem from "./GitChangeItem";
import { getFileDiff } from "../../../../services/git.api";

export default function GitStatusCard({ gitStatus, projectId }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [diffContent, setDiffContent] = useState("");
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!gitStatus) return null;

  const handleViewDiff = async (filePath) => {
    if (!projectId) return;
    try {
      setSelectedFile(filePath);
      setLoadingDiff(true);
      const diff = await getFileDiff(projectId, filePath);
      setDiffContent(diff || "No changes detected or binary file.");
    } catch (err) {
      setDiffContent("Failed to load diff: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingDiff(false);
    }
  };

  // Lock body scroll and handle Escape key for diff modal
  useEffect(() => {
    if (!selectedFile) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedFile(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedFile]);

  const handleCopyDiff = () => {
    if (diffContent) {
      navigator.clipboard.writeText(diffContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

        <div className="eh-clean-state">Everything is committed. Working tree clean.</div>
      </div>
    );
  }

  const changes = gitStatus.changes || [];

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
          <p>{changes.length} changed file(s) — click any file to preview diff</p>
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
          <GitChangeItem
            key={change.path}
            change={change}
            onViewDiff={handleViewDiff}
          />
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

      {/* Diff Viewer Modal */}
      {selectedFile &&
        createPortal(
          <div className="eh-diff-modal-backdrop" onClick={() => setSelectedFile(null)}>
            <div className="eh-diff-modal" onClick={(e) => e.stopPropagation()}>
              <div className="eh-diff-modal-header">
                <div className="eh-diff-modal-title">
                  <FileCode size={18} />
                  <span>{selectedFile}</span>
                </div>
                <div className="eh-diff-modal-actions">
                  <button
                    type="button"
                    className="eh-diff-copy-btn"
                    onClick={handleCopyDiff}
                    title="Copy diff"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                  <button
                    type="button"
                    className="eh-diff-close-btn"
                    onClick={() => setSelectedFile(null)}
                    title="Close diff"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="eh-diff-modal-body">
                {loadingDiff ? (
                  <div className="eh-diff-loading">Loading diff...</div>
                ) : (
                  <pre className="eh-diff-pre">
                    {diffContent.split("\n").map((line, idx) => {
                      let lineClass = "";
                      if (line.startsWith("+") && !line.startsWith("+++")) {
                        lineClass = "diff-add";
                      } else if (line.startsWith("-") && !line.startsWith("---")) {
                        lineClass = "diff-del";
                      } else if (line.startsWith("@@")) {
                        lineClass = "diff-hunk";
                      }
                      return (
                        <div key={idx} className={`eh-diff-line ${lineClass}`}>
                          <span className="eh-diff-num">{idx + 1}</span>
                          <span className="eh-diff-text">{line || " "}</span>
                        </div>
                      );
                    })}
                  </pre>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

