import "./ConfirmationModal.css";
import { useEffect, useState } from "react";

export default function ConfirmationModal({
  open,
  user,
  loading = false,
  onClose,
  onDelete,
}) {
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (open) {
      setConfirmation("");
    }
  }, [open, user]);

  if (!open || !user) return null;

  return (
    <div className="confirmationOverlay">
      <div className="confirmationModal">
        <h2>Delete User</h2>

        <p>
          You are about to permanently delete
          <br />
          <br />
          <strong>{user.username}</strong>
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

        <div className="confirmationField">
          <label>
            Type <strong>{user.username}</strong> to continue
          </label>

          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={user.username}
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
            disabled={loading || confirmation.trim() !== user.username}
            onClick={async () => {
              try {
                await onDelete(user.id);
                onClose();
              } catch {
                // keep the modal open if deletion failed
              }
            }}
          >
            {loading ? "Deleting..." : "Delete User"}
          </button>
        </div>
      </div>
    </div>
  );
}
