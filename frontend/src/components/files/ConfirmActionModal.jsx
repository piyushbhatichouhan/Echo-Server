import Modal from "../common/modal/modal";
import Button from "../common/button/button";
import { AlertTriangle, Trash2, HelpCircle } from "lucide-react";
import "./ConfirmActionModal.css";

export default function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Delete",
  confirmVariant = "danger",
  loading = false,
  zIndex = 1250,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      overlayClassName="confirm-modal-overlay-top"
      zIndex={zIndex}
    >
      <div className="confirm-modal-body">
        <div className="confirm-modal-icon-wrapper">
          <Trash2 size={28} className="confirm-modal-icon" />
        </div>

        <div className="confirm-modal-text">
          <p className="confirm-modal-msg">{message}</p>
        </div>

        <div className="confirm-modal-actions">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
