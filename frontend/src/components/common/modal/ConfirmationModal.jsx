import "./ConfirmationModal.css";
import { useEffect, useState } from "react";

export default function ConfirmationModal({
  open,
  user,
  accountMode = false,
  projectMode = false,
  project = null,
  loading = false,
  onClose,
  onDelete,
}) {
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (open) {
      setConfirmation("");
    }
  }, [open]);

  const confirmationTarget = projectMode
    ? project?.name
    : accountMode
      ? "DELETE"
      : user?.username;

  if (!open) return null;

  if (!accountMode && !projectMode && !user) return null;

  if (projectMode && !project) return null;

  return (
    <div className="confirmationOverlay">
      <div className="confirmationModal">
        <h2>
          {projectMode
            ? "Delete Project"
            : accountMode
              ? "Delete Account"
              : "Delete User"}
        </h2>

        {projectMode ? (
          <p>
            You are about to permanently delete
            <br />
            <br />
            <strong>Project {project.name}</strong>
            <br />
            <br />
            The following will be permanently removed:
            <br />
            • Repository
            <br />
            • Source files
            <br />
            • Deployments
            <br />
            • Environment Variables
            <br />
            • Logs
            <br />
            • Docker images & containers
            <br />
            <br />
            <strong>This action cannot be undone.</strong>
          </p>
        ) : accountMode ? (
          <p>
            You are about to permanently delete your account.
            <br />
            <br />
            You will immediately lose access.
            <br />
            <br />
            All projects, deployments, repositories, logs and files will be
            permanently deleted after <strong>24 hours</strong>.
            <br />
            <br />
            If this was a mistake, contact an administrator within 24 hours.
          </p>
        ) : (
          <p>
            You are about to permanently delete
            <br />
            <br />
            <strong> Account {user.username}</strong>
            <br />
            {user.email}
            <br />
            <br />
            This user will immediately lose access.
            <br />
            <br />
            <strong>After 24 hours</strong>, all of the following will be
            permanently deleted:
            <br />
            • Projects
            <br />
            • Source files
            <br />
            • Git repositories
            <br />
            • Environment variables
            <br />
            • Build artifacts
            <br />
            • Logs
            <br />
            <br />
            This action can be restored before the 24-hour period expires.
          </p>
        )}

        <div className="confirmationField">
          <label>
            Type <strong>{confirmationTarget}</strong> to continue
          </label>

          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={confirmationTarget}
            autoComplete="off"
          />
        </div>

        <div className="confirmationButtons">
          <button
            className="confirmationCancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="confirmationConfirm confirmationConfirm--danger"
            disabled={loading || confirmation.trim() !== confirmationTarget}
            onClick={async () => {
              try {
                await onDelete(user.id);
                onClose();
              } catch {
                // keep the modal open if deletion failed
              }
            }}
          >
            {loading ? "Deleting..." : `Delete `}
          </button>
        </div>
      </div>
    </div>
  );
}
