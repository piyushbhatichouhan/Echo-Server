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
                You are about to permanently and irreversibly delete project:
              </p>
              <div className="confirmationTargetEntity">
                <strong>{project.name}</strong>
              </div>
              <p className="confirmationListHeading">The following will be permanently destroyed immediately:</p>
              <ul className="confirmationList">
                <li><strong>Immediate &amp; Irreversible:</strong> This project and all its data cannot be recovered.</li>
                <li>Running containers and Docker images stopped and deleted immediately</li>
                <li>All workspace files, source code, and build assets deleted immediately from disk</li>
                <li>All configured environment variables and secrets wiped</li>
                <li>All assigned subdomains, custom domains, and proxy routes removed</li>
                <li>All deployment history and telemetry logs permanently purged</li>
              </ul>
            </div>
          ) : accountMode ? (
            <div className="confirmationScopeBox">
              <p className="confirmationScopeTitle">
                You are about to permanently and irreversibly delete your personal account.
              </p>
              <ul className="confirmationList">
                <li><strong>Immediate &amp; Irreversible:</strong> All data is permanently destroyed immediately. This cannot be undone.</li>
                <li>All projects, active containers, and Docker images will be terminated and wiped immediately.</li>
                <li>All workspace files, git repositories, and cloud storage files will be deleted immediately from disk.</li>
                <li>All environment variables, secrets, custom domains, and analytics are permanently purged.</li>
                <li>You will be signed out immediately and all access will be permanently revoked.</li>
              </ul>
            </div>
          ) : user?.username === "CLEAR" ? (
            <div className="confirmationScopeBox">
              <p className="confirmationScopeTitle">
                You are about to flush all historical server logs.
              </p>
              <ul className="confirmationList">
                <li>All system runtime logs and audit entries will be permanently cleared immediately.</li>
                <li>Historical diagnostic records cannot be restored once deleted.</li>
              </ul>
            </div>
          ) : (
            <div className="confirmationScopeBox">
              <p className="confirmationScopeTitle">
                You are about to permanently and irreversibly delete user account:
              </p>
              <div className="confirmationTargetEntity">
                <strong>{user.username}</strong>
                {user.email && <span>{user.email}</span>}
              </div>
              <p className="confirmationListHeading">Consequences of immediate deletion:</p>
              <ul className="confirmationList">
                <li><strong>Immediate &amp; Irreversible:</strong> The account and all its resources are permanently erased immediately.</li>
                <li>All user projects, containers, and Docker images will be terminated and deleted immediately.</li>
                <li>All user workspace files, git repositories, and cloud files will be permanently wiped from disk.</li>
                <li>All environment secrets, custom domains, and database records will be permanently purged.</li>
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

