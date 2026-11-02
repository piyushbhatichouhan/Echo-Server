import "./Filetoolbar.css";

import { Upload, FolderPlus, FilePlus, Search, ClipboardPaste } from "lucide-react";
import { FileUp, FolderUp } from "lucide-react";
import Dropdown from "../../common/Dropdown/Dropdown";

export default function FileToolbar({
  onUploadFile,
  onUploadFolder,
  onNewFolder,
  onNewFile,
  clipboard,
  onPaste,
  onClearClipboard,
  searchQuery = "",
  onSearchChange,
}) {
  return (
    <div className="cloud-toolbar">
      <div className="cloud-toolbar-left">
        <Dropdown
          trigger={
            <button className="cloud-btn primary">
              <Upload size={18} />
              <span>Upload</span>
            </button>
          }
        >
          <Dropdown.Item icon={<FileUp size={16} />} onClick={onUploadFile}>
            Upload File
          </Dropdown.Item>

          <Dropdown.Item icon={<FolderUp size={16} />} onClick={onUploadFolder}>
            Upload Folder
          </Dropdown.Item>
        </Dropdown>

        <button className="cloud-btn" onClick={onNewFolder}>
          <FolderPlus size={18} />
          <span>New Folder</span>
        </button>

        <button className="cloud-btn" onClick={onNewFile}>
          <FilePlus size={18} />
          <span>New File</span>
        </button>
        <button className="cloud-btn1" disabled>
          <span>You can drag and drop file and folder too</span>
        </button>
        {clipboard && (
          <>
            {onPaste && (
              <button
                type="button"
                className="cloud-btn paste-btn"
                onClick={onPaste}
                title="Paste into current folder"
              >
                <ClipboardPaste size={18} />
                <span>Paste Here</span>
              </button>
            )}
            <div className="clipboard-info">
              <span className="clipboard-info__icon">
                {clipboard.operation === "cut" ? "✂" : "📋"}
              </span>

              <span className="clipboard-info__text" title={clipboard.label || clipboard.name || clipboard.relativePath}>
                {clipboard.operation === "cut" ? "Cut: " : "Copy: "}
                {clipboard.label || clipboard.name || clipboard.relativePath}
              </span>

              {onClearClipboard && (
                <button
                  type="button"
                  className="clipboard-info__clear"
                  onClick={onClearClipboard}
                  title="Cancel / Clear Clipboard"
                >
                  ✕
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="cloud-search-box">
        <Search size={16} />
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
