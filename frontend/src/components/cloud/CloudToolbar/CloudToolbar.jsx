import "./CloudToolbar.css";

import { Upload, FolderPlus, FilePlus } from "lucide-react";

export default function CloudToolbar({ onUpload, onNewFolder, onNewFile }) {
  return (
    <div className="cloud-toolbar">
      <div className="cloud-toolbar-left">
        <button className="cloud-btn primary" onClick={onUpload}>
          <Upload size={18} />
          <span>Upload</span>
        </button>

        <button className="cloud-btn" onClick={onNewFolder}>
          <FolderPlus size={18} />
          <span>New Folder</span>
        </button>

        <button className="cloud-btn" onClick={onNewFile}>
          <FilePlus size={18} />
          <span>New File</span>
        </button>
        <button className="cloud-btn1">
          <span>You can drag and drop file and folder too</span>
        </button>
      </div>
    </div>
  );
}
