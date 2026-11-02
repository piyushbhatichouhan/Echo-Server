import "./Filetoolbar.css";

import {
  Upload,
  FolderPlus,
  FilePlus,
  Search,
  ClipboardPaste,
  PanelLeft,
  LayoutList,
  LayoutGrid,
  Trash2,
  CloudDownload,
  FileUp,
  FolderUp,
} from "lucide-react";
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
  viewMode = "list",
  onViewModeChange,
  sidebarOpen = true,
  onToggleSidebar,
  onOpenTrash,
  onImportFromCloud,
  isGlobalSearch = false,
  onToggleGlobalSearch,
}) {
  return (
    <div className="cloud-toolbar">
      <div className="cloud-toolbar-left">
        {onToggleSidebar && (
          <button
            type="button"
            className={`cloud-btn icon-only ${sidebarOpen ? "active" : ""}`}
            onClick={onToggleSidebar}
            title={sidebarOpen ? "Hide Directory Sidebar" : "Show Directory Sidebar"}
          >
            <PanelLeft size={18} />
          </button>
        )}

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

        {onImportFromCloud && (
          <button
            type="button"
            className="cloud-btn"
            onClick={onImportFromCloud}
            title="Import files from Cloud Storage"
          >
            <CloudDownload size={18} />
            <span>Import Cloud</span>
          </button>
        )}

        {onOpenTrash && (
          <button
            type="button"
            className="cloud-btn trash-btn"
            onClick={onOpenTrash}
            title="Recycle Bin / Trashed files"
          >
            <Trash2 size={17} />
            <span>Trash</span>
          </button>
        )}

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

              <span
                className="clipboard-info__text"
                title={clipboard.label || clipboard.name || clipboard.relativePath}
              >
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

      <div className="cloud-toolbar-right">
        {onViewModeChange && (
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => onViewModeChange("list")}
              title="List View"
            >
              <LayoutList size={16} />
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => onViewModeChange("grid")}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        )}

        <div className="cloud-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder={
              isGlobalSearch ? "Recursive search..." : "Search folder..."
            }
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          {onToggleGlobalSearch && (
            <button
              type="button"
              className={`global-search-badge ${isGlobalSearch ? "active" : ""}`}
              onClick={onToggleGlobalSearch}
              title={
                isGlobalSearch
                  ? "Global Search: Enabled (Click for local folder search)"
                  : "Folder Search: Enabled (Click for global recursive search)"
              }
            >
              {isGlobalSearch ? "Global" : "Folder"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
