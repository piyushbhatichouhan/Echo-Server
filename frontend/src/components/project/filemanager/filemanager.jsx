import "./FileManager.css";

import Card from "../../common/Card/Card";
import Button from "../../common/Button/Button";

import { Upload, FolderPlus, FilePlus } from "lucide-react";

import { useRef, useState } from "react";

import buildFileTree from "../../../utils/buildFileTree";

import FileTreeNode from "./FileTreeNode";

import { useToast } from "../../../context/ToastContext";

export default function FileManager({
  title,
  workspaceId,
  refresh,
  files,
  loading,
  onOpen,
  selectedFile,
  onDelete,

  adapter,
}) {
  const inputRef = useRef(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileParent, setNewFileParent] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const toast = useToast();

  const {
    getFiles,
    uploadFile,
    deleteFile,
    renameFile,
    createFolder,
    createFile,
    downloadFile,
    getFileContent,
    saveFileContent,
  } = adapter;

  const handleUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);

    for (const file of selectedFiles) {
      try {
        const formData = new FormData();

        formData.append("file", file);
        formData.append("relativePath", file.webkitRelativePath || file.name);

        if (workspaceId) await uploadFile(workspaceId, formData);
        else await uploadFile(formData);
        toast.success("File Uploaded", "File uploaded succesfully");
      } catch (error) {
        toast.error(
          "Upload failed",
          error.response?.data?.message || error.message,
        );

        break;
      }
    }

    await refresh();

    event.target.value = "";
  };

  const handleCreateFolder = async () => {
    const name = folderName.trim();

    if (!name) {
      setCreatingFolder(false);
      return;
    }

    try {
      if (workspaceId) await createFolder(workspaceId, name);
      else await createFolder(name);

      setFolderName("");
      setCreatingFolder(false);

      await refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFile = async () => {
    const name = newFileName.trim();

    if (!name) {
      setCreatingFile(false);
      return;
    }

    const relativePath =
      newFileParent === "" ? name : `${newFileParent}/${name}`;

    if (workspaceId) {
      await createFile(workspaceId, relativePath);
    } else {
      await createFile(relativePath);
    }

    setCreatingFile(false);
    setNewFileName("");
    setNewFileParent("");

    await refresh();
  };
  console.log(files);
  const tree = buildFileTree(files);

  return (
    <Card>
      <div className="eh-files">
        <input
          hidden
          ref={inputRef}
          type="file"
          multiple
          onChange={handleUpload}
        />

        <div className="eh-files-header">
          <h2>{title}</h2>

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

            <Button
              variant="secondary"
              icon={FilePlus}
              onClick={() => {
                setCreatingFile(true);
                setNewFileName("");
                setNewFileParent("");
              }}
            />
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

          {creatingFile && (
            <div className="eh-new-folder">
              <FilePlus size={16} />

              <input
                autoFocus
                value={newFileName}
                placeholder="File name"
                onChange={(e) => setNewFileName(e.target.value)}
                onBlur={handleCreateFile}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFile();

                  if (e.key === "Escape") {
                    setCreatingFile(false);
                    setNewFileName("");
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
                onCreateFile={(folderPath) => {
                  setCreatingFile(true);
                  setNewFileParent(folderPath);
                  setNewFileName("");
                }}
                onDelete={(path, type) => {
                  if (workspaceId) {
                    onDelete(node.path, node.type);
                  } else {
                    onDelete(node.file);
                  }
                }}
                onRename={(oldPath, type) => {
                  setRenaming({
                    workspaceId,
                    oldPath,
                    type,
                  });

                  const parts = oldPath.split("/");

                  setRenameValue(parts[parts.length - 1]);
                }}
                renaming={renaming}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                refresh={refresh}
                setRenaming={setRenaming}
                adapter={adapter}
                workspaceId={workspaceId}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
