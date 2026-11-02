import { useState, useEffect } from "react";
import Modal from "../common/modal/modal";
import Button from "../common/button/button";
import ConfirmActionModal from "./ConfirmActionModal";
import { Trash2, RotateCcw, AlertTriangle, File, Folder } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import "./TrashModal.css";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let s = Number(bytes);
  let i = 0;
  while (s >= 1024 && i < units.length - 1) {
    s /= 1024;
    i++;
  }
  return `${s.toFixed(1)} ${units[i]}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrashModal({ isOpen, onClose, adapter, workspaceId, onRestored }) {
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);
  const toast = useToast();

  const loadTrash = async () => {
    if (!adapter.getTrash) return;
    try {
      setLoading(true);
      const items = await adapter.getTrash(workspaceId);
      setTrashItems(Array.isArray(items) ? items : []);
    } catch (err) {
      toast.error("Failed to load trash", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTrash();
    }
  }, [isOpen]);

  const handleRestore = async (item) => {
    try {
      setActionLoading(true);
      const targetId = item.id || item.fileId;
      await adapter.restoreTrash(workspaceId, targetId);
      toast.success("Restored", `"${item.original_name}" has been restored.`);
      await loadTrash();
      onRestored?.();
    } catch (err) {
      toast.error("Restore failed", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmptyTrash = () => {
    if (trashItems.length === 0) return;
    setShowConfirmEmpty(true);
  };

  const executeEmptyTrash = async () => {
    try {
      setActionLoading(true);
      await adapter.emptyTrash(workspaceId);
      toast.success("Trash Emptied", "All trashed items permanently purged.");
      setTrashItems([]);
      setShowConfirmEmpty(false);
      onRestored?.();
    } catch (err) {
      toast.error("Empty trash failed", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Trash / Recycle Bin">
      <div className="trash-modal-container">
        <div className="trash-modal-top">
          <p className="trash-hint">
            Items in trash can be restored back to their original folder, or permanently emptied.
          </p>
          {trashItems.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleEmptyTrash}
              disabled={actionLoading}
            >
              <Trash2 size={15} /> Empty Trash
            </Button>
          )}
        </div>

        <div className="trash-list-scroll">
          {loading ? (
            <div className="trash-empty-state">Loading trash items...</div>
          ) : trashItems.length === 0 ? (
            <div className="trash-empty-state">
              <Trash2 size={40} className="trash-empty-icon" />
              <h3>Trash is empty</h3>
              <p>Deleted files and folders will appear here.</p>
            </div>
          ) : (
            <div className="trash-items-table">
              {trashItems.map((item) => (
                <div key={item.id} className="trash-row">
                  <div className="trash-row-icon">
                    {item.is_directory ? (
                      <Folder size={18} className="folder-icon" />
                    ) : (
                      <File size={18} className="file-icon" />
                    )}
                  </div>
                  <div className="trash-row-details">
                    <span className="trash-item-name" title={item.original_name}>
                      {item.original_name}
                    </span>
                    <span className="trash-item-path" title={item.relative_path}>
                      {item.relative_path}
                    </span>
                  </div>
                  <div className="trash-row-meta">
                    <span className="trash-item-size">
                      {item.is_directory ? "--" : formatBytes(item.file_size)}
                    </span>
                    <span className="trash-item-date">
                      Deleted {formatDate(item.deleted_at)}
                    </span>
                  </div>
                  <div className="trash-row-actions">
                    <button
                      type="button"
                      className="trash-restore-btn"
                      onClick={() => handleRestore(item)}
                      disabled={actionLoading}
                      title="Restore item"
                    >
                      <RotateCcw size={15} />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="trash-modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>

    <ConfirmActionModal
      isOpen={showConfirmEmpty}
      onClose={() => setShowConfirmEmpty(false)}
      onConfirm={executeEmptyTrash}
      title="Empty Trash?"
      message="Permanently purge all trashed files and folders? This action cannot be undone."
      confirmText="Empty Trash"
      loading={actionLoading}
      zIndex={1250}
    />
    </>
  );
}
