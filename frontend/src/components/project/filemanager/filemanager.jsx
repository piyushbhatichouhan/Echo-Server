import "./FileManager.css";

import Card from "../../common/Card/Card";
import Button from "../../common/Button/Button";

import { Upload, FolderPlus, FilePlus } from "lucide-react";

import { useRef, useState } from "react";
import { createFolder } from "../../../services/file.api";
import { uploadFile } from "../../../services/file.api";
import buildFileTree from "../../../utils/buildFileTree";

import FileTreeNode from "./FileTreeNode";

export default function FileManager({
  projectId,
  refresh,
  files,
  loading,
  onOpen,
  selectedFile,
}) {
  const inputRef = useRef(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const handleUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);

    for (const file of selectedFiles) {
      await uploadFile(projectId, file, file.webkitRelativePath || file.name);
    }

    await refresh();

    event.target.value = "";
  };

  const handleCreateFolder = async () => {
    console.log("Creating folder:", folderName);

    const name = folderName.trim();

    if (!name) {
      setCreatingFolder(false);
      return;
    }

    try {
      await createFolder(projectId, name);

      console.log("Folder created");

      setFolderName("");
      setCreatingFolder(false);

      await refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const tree = buildFileTree(files);

  return (
    <Card>
      <div className="eh-files">
        <input
          hidden
          ref={inputRef}
          type="file"
          multiple
          webkitdirectory=""
          directory=""
          onChange={handleUpload}
        />

        <div className="eh-files-header">
          <h2>Workspace</h2>

          <div className="eh-files-toolbar">
            <Button
              variant="primary"
              icon={Upload}
              onClick={() => inputRef.current.click()}
            >
              Upload
            </Button>

            <Button
              variant="secondary"
              icon={FolderPlus}
              size="small"
              onClick={() => {
                setCreatingFolder(true);
                setFolderName("");
              }}
            />

            <Button variant="secondary" icon={FilePlus} disabled />
          </div>
        </div>

        <div className="eh-files-body">
          {creatingFolder && (
            <div className="eh-new-folder">
              <FolderPlus size={16} />

              <input
                autoFocus
                value={folderName}
                placeholder="Folder name"
                onChange={(e) => setFolderName(e.target.value)}
                onBlur={handleCreateFolder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();

                  if (e.key === "Escape") {
                    setCreatingFolder(false);
                    setFolderName("");
                  }
                }}
              />
            </div>
          )}
          {loading ? (
            <div className="eh-files-empty">Loading...</div>
          ) : tree.length === 0 ? (
            <div className="eh-files-empty">No files uploaded.</div>
          ) : (
            tree.map((node) => (
              <FileTreeNode
                key={node.name}
                node={node}
                onOpen={onOpen}
                selectedFile={selectedFile}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
