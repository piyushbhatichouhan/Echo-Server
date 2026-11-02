import { useState, useEffect } from "react";
import Modal from "../common/modal/modal";
import Button from "../common/button/button";
import { Cloud, Folder, File, ArrowRight, Check } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { getCloudFiles } from "../../services/cloud.api";
import "./CrossTransferModal.css";

export default function CrossTransferModal({
  isOpen,
  onClose,
  mode = "export", // "export" (Project -> Cloud) or "import" (Cloud -> Project)
  selectedItems = [],
  projectId,
  adapter,
  currentFolder = "",
  onSuccess,
}) {
  const [cloudFolders, setCloudFolders] = useState([]);
  const [cloudItems, setCloudItems] = useState([]);
  const [targetCloudFolder, setTargetCloudFolder] = useState("");
  const [selectedCloudItems, setSelectedCloudItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const loadCloudData = async () => {
      try {
        setLoading(true);
        const data = await getCloudFiles();
        const filesList = Array.isArray(data) ? data : [];

        // Extract cloud folders for destination picker
        const folders = filesList
          .filter((f) => f.is_directory)
          .map((f) => f.relative_path);
        setCloudFolders(folders);

        // Store cloud files for import picker
        setCloudItems(filesList);
      } catch (err) {
        toast.error("Failed to load cloud files", err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCloudData();
  }, [isOpen]);

  const handleExport = async () => {
    if (selectedItems.length === 0) return;
    try {
      setTransferring(true);
      await adapter.exportToCloud(
        projectId,
        selectedItems.map((item) => ({
          relativePath: item.path,
          type: item.type,
        })),
        targetCloudFolder,
      );
      toast.success(
        "Exported Successfully",
        `Exported ${selectedItems.length} item(s) to Cloud Storage.`,
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error("Export Failed", err.response?.data?.message || err.message);
    } finally {
      setTransferring(false);
    }
  };

  const handleImport = async () => {
    if (selectedCloudItems.length === 0) return;
    try {
      setTransferring(true);
      await adapter.importToProject(
        projectId,
        selectedCloudItems.map((item) => ({
          relativePath: item.relative_path,
          isDirectory: item.is_directory,
          type: item.is_directory ? "folder" : "file",
        })),
        currentFolder,
      );
      toast.success(
        "Imported Successfully",
        `Imported ${selectedCloudItems.length} item(s) from Cloud Storage.`,
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error("Import Failed", err.response?.data?.message || err.message);
    } finally {
      setTransferring(false);
    }
  };

  const toggleSelectCloudItem = (item) => {
    setSelectedCloudItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) return prev.filter((i) => i.id !== item.id);
      return [...prev, item];
    });
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === "export"
          ? "Export to Personal Cloud Storage"
          : "Import from Personal Cloud Storage"
      }
    >
      <div className="cross-transfer-container">
        {mode === "export" ? (
          <>
            <div className="transfer-summary-box">
              <span className="summary-label">Exporting:</span>
              <span className="summary-value">
                {selectedItems.length} item(s) (
                {selectedItems.map((i) => i.name).slice(0, 3).join(", ")}
                {selectedItems.length > 3 ? "..." : ""})
              </span>
            </div>

            <div className="transfer-dest-section">
              <label className="transfer-dest-label">
                Select Destination Folder in Cloud Storage:
              </label>
              <select
                className="transfer-folder-select"
                value={targetCloudFolder}
                onChange={(e) => setTargetCloudFolder(e.target.value)}
              >
                <option value="">/ (Cloud Root)</option>
                {cloudFolders.map((f) => (
                  <option key={f} value={f}>
                    /{f}
                  </option>
                ))}
              </select>
            </div>

            <div className="transfer-modal-actions">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleExport} loading={transferring}>
                Export to Cloud <ArrowRight size={15} />
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="transfer-intro">
              Select files or folders from your personal Cloud Storage to import into{" "}
              <strong>{currentFolder ? `/${currentFolder}` : "project root"}</strong>:
            </p>

            <div className="cloud-import-list">
              {loading ? (
                <div className="transfer-loading">Loading cloud files...</div>
              ) : cloudItems.length === 0 ? (
                <div className="transfer-loading">No files in your Cloud Storage yet.</div>
              ) : (
                cloudItems.map((item) => {
                  const isChecked = selectedCloudItems.some((i) => i.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className={`cloud-import-row ${isChecked ? "selected" : ""}`}
                      onClick={() => toggleSelectCloudItem(item)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="import-item-icon">
                        {item.is_directory ? (
                          <Folder size={16} className="folder" />
                        ) : (
                          <File size={16} className="file" />
                        )}
                      </span>
                      <span className="import-item-name" title={item.relative_path}>
                        {item.relative_path}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="transfer-modal-actions">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                loading={transferring}
                disabled={selectedCloudItems.length === 0}
              >
                Import Selected ({selectedCloudItems.length})
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
