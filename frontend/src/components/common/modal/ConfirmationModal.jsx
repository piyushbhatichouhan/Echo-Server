import "./ConfirmationModal.css";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X, CheckCircle2, ShieldAlert } from "lucide-react";

export default function ConfirmationModal({
  open,
  title,
  user,
  accountMode = false,
  projectMode = false,
  project = null,
  loading = false,
  onClose,
  onCancel,
  onDelete,
}) {
  const [confirmation, setConfirmation] = useState("");

  const handleClose = useCallback(() => {
    if (loading) return;
    if (onClose) onClose();
    else if (onCancel) onCancel();
  }, [loading, onClose, onCancel]);

  useEffect(() => {
    if (open) {
      setConfirmation("");
    }
  }, [open]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  if (!open) return null;
  if (!accountMode && !projectMode && !user) return null;
  if (projectMode && !project) return null;

  const confirmationTarget = projectMode
    ? project?.name
    : accountMode
      ? "DELETE"
      : user?.username;

  const isMatched = confirmation.trim() === confirmationTarget;

  const modalTitle =
    title ||
    (projectMode
      ? "Delete Project"
      : accountMode
        ? "Delete Account"
        : user?.username === "CLEAR"
          ? "Clear Server Logs"
          : "Delete User");

  const handleDelete = async () => {
    if (!isMatched || loading) return;
    try {
      await onDelete(user?.id || user || project?.id);
      handleClose();
    } catch {
      // keep the modal open if deletion failed
    }
  };

  return createPortal(
    <div
      className="confirmationOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="confirmationModal">
        <div className="confirmationHeader">
          <div className="confirmationTitleWrap">
            <div className="confirmationIconBadge">
              <AlertTriangle size={20} />
            </div>
            <h2>{modalTitle}</h2>
          </div>
          <button
            type="button"
            className="confirmationCloseBtn"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="confirmationWarningBanner">
          <ShieldAlert size={18} className="confirmationWarningIcon" />
          <div className="confirmationWarningText">
            <strong>Critical Action:</strong> This operation cannot be reversed. Please read the consequences carefully.
          </div>
        </div>

        <div className="confirmationContent">
          {projectMode ? (
            <div className="confirmationScopeBox">
              <p className="confirmationScopeTitle">
                You are about to permanently delete project:
              </p>
              <div className="confirmationTargetEntity">
                <strong>{project.name}</strong>
              </div>
              <p className="confirmationListHeading">The following will be permanently removed:</p>
              <ul className="confirmationList">
                <li>Git repository & commit history</li>
                <li>Source files & build assets</li>
                <li>Active container deployments</li>
                <li>Configured environment variables</li>
                <li>Associated deployment runtime logs</li>
                <li>Docker images & network routing</li>
              </ul>
            </div>
          ) : accountMode ? (
            <div className="confirmationScopeBox">
              <p className="confirmationScopeTitle">
                You are about to permanently delete your personal account.
              </p>
              <ul className="confirmationList">
                <li>You will immediately lose access to this console.</li>
                <li>All projects, deployments, repositories, and logs will be permanently deleted after <strong>24 hours</strong>.</li>
                <li>To reverse this, contact a system administrator within the 24-hour window.</li>
              </ul>
            </div>
          ) : user?.username === "CLEAR" ? (
            <div className="confirmationScopeBox">
              <p className="confirmationScopeTitle">
                You are about to flush all historical server logs.
              </p>
              <ul className="confirmationList">
                <li>All system runtime logs and audit entries will be permanently cleared.</li>
                <li>Historical diagnostic records cannot be restored once deleted.</li>
              </ul>
            </div>
          ) : (
            <div className="confirmationScopeBox">
              <p className="confirmationScopeTitle">
                You are about to permanently delete user account:
              </p>
              <div className="confirmationTargetEntity">
                <strong>{user.username}</strong>
                {user.email && <span>{user.email}</span>}
              </div>
              <p className="confirmationListHeading">Consequences of deletion:</p>
              <ul className="confirmationList">
                <li>User will immediately lose server access.</li>
                <li>Projects, repositories, environment variables, and build artifacts will be queued for removal.</li>
                <li>Deletion will be finalized after a 24-hour grace period.</li>
              </ul>
            </div>
          )}
        </div>

        <div className="confirmationField">
          <label htmlFor="confirmation-input">
            To confirm, type <span className="confirmationTargetBadge">{confirmationTarget}</span> below:
          </label>

          <div className="confirmationInputWrapper">
            <input
              id="confirmation-input"
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isMatched) {
                  e.preventDefault();
                  handleDelete();
                }
              }}
              placeholder={`Type "${confirmationTarget}" to confirm`}
              autoComplete="off"
              autoFocus
              disabled={loading}
              className={isMatched ? "inputValid" : ""}
            />
            {isMatched && (
              <span className="confirmationMatchIndicator">
                <CheckCircle2 size={16} />
              </span>
            )}
          </div>
        </div>

        <div className="confirmationButtons">
          <button
            type="button"
            className="confirmationCancel"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="confirmationConfirm confirmationConfirm--danger"
            disabled={loading || !isMatched}
            onClick={handleDelete}
          >
            {loading ? (
              <span className="confirmationLoadingContent">
                <span className="confirmationSpinner" />
                Deleting...
              </span>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Confirm Deletion</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

