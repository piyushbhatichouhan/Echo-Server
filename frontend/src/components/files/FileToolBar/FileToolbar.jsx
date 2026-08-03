import "./Filetoolbar.css";

import { Upload, FolderPlus, FilePlus, Folder, File } from "lucide-react";
import { FileUp, FolderUp } from "lucide-react";
import Dropdown from "../../common/Dropdown/Dropdown";
export default function FileToolbar({
  onUploadFile,
  onUploadFolder,
  onNewFolder,
  onNewFile,
  clipboard,
}) {
  console.log("clipboard", clipboard);

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
          <div className="clipboard-info">
            <span className="clipboard-info__icon">
              {clipboard.operation === "cut" ? "✂" : "📄"}
            </span>

            <span className="clipboard-info__text">
              {clipboard.operation === "cut"
                ? "Clipboard - Cut:"
                : "Clipboard - Copy:"}{" "}
              {clipboard.relativePath}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
