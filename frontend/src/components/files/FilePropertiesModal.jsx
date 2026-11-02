import Modal from "../common/modal/modal";
import Button from "../common/button/button";
import { Info, Folder, File, HardDrive, Calendar, FileType, MapPin } from "lucide-react";
import "./FilePropertiesModal.css";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]} (${Number(bytes).toLocaleString()} bytes)`;
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FilePropertiesModal({ isOpen, onClose, item }) {
  if (!isOpen || !item) return null;

  const isFolder = item.type === "folder";
  const file = item.file || {};

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Item Properties">
      <div className="file-props-dialog">
        <div className="file-props-header">
          <div className={`file-props-avatar ${isFolder ? "folder" : "file"}`}>
            {isFolder ? <Folder size={32} /> : <File size={32} />}
          </div>
          <div className="file-props-title">
            <h3>{item.name}</h3>
            <span>{isFolder ? "Directory" : file.mime_type || "File"}</span>
          </div>
        </div>

        <div className="file-props-grid">
          <div className="file-props-row">
            <span className="file-props-label">
              <MapPin size={15} /> Relative Path
            </span>
            <span className="file-props-val" title={item.path}>
              {item.path || "/"}
            </span>
          </div>

          <div className="file-props-row">
            <span className="file-props-label">
              <FileType size={15} /> Type
            </span>
            <span className="file-props-val">
              {isFolder ? "Folder" : file.mime_type || "Generic File"}
            </span>
          </div>

          {!isFolder && (
            <div className="file-props-row">
              <span className="file-props-label">
                <HardDrive size={15} /> File Size
              </span>
              <span className="file-props-val">
                {formatBytes(file.file_size)}
              </span>
            </div>
          )}

          <div className="file-props-row">
            <span className="file-props-label">
              <Calendar size={15} /> Last Modified
            </span>
            <span className="file-props-val">
              {formatDate(file.updated_at || file.created_at)}
            </span>
          </div>

          {file.created_at && (
            <div className="file-props-row">
              <span className="file-props-label">
                <Calendar size={15} /> Created At
              </span>
              <span className="file-props-val">{formatDate(file.created_at)}</span>
            </div>
          )}
        </div>

        <div className="file-props-actions">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
