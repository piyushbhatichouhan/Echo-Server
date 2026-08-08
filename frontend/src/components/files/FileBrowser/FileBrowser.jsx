import { useEffect, useState } from "react";
import Card from "../../common/card/card";

import { useToast } from "../../../context/ToastContext";

import FileList from "../FileList/FileList";
import FileBreadcrumbs from "../FileBreadcrumbs/FileBreadcrumbs";
import { useRef } from "react";

import { Upload } from "lucide-react";
import { readDroppedEntries } from "../../../utils/readDroppedEntries";
import "./FileBrowser.css";
import FileViewer from "../fileviewer/FileViewer";
import FileToolbar from "../FileToolBar/FileToolbar";

export default function FileBrowser({ adapter, workspaceId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [stats, setStats] = useState(null);
  const toast = useToast();
  const [currentFolder, setCurrentFolder] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);
  const uploadFileRef = useRef();
  const uploadFolderRef = useRef();
  const [saving, setSaving] = useState(false);
  const [clipboard, setClipboard] = useState(null);

  const handleCopy = async (item) => {
    if (!adapter.copyPath) {
      toast.info("Copy isn't supported here yet.");
      return;
    }

    await adapter.copyPath(workspaceId, item.path, item.type);

    setClipboard({
      operation: "copy",
      type: item.type,
      relativePath: item.path,
    });

    toast.success("Copied");
  };

  const handleCut = async (item) => {
    if (!adapter.copyPath) {
      toast.info("Copy isn't supported here yet.");
      return;
    }

    await adapter.cutPath(workspaceId, item.path, item.type);

    setClipboard({
      operation: "cut",
      type: item.type,
      relativePath: item.path,
    });

    toast.success("Ready to move");
  };

  const handlePaste = async (destination = currentFolder) => {
    if (!adapter.copyPath) {
      toast.info("Copy isn't supported here yet.");
      return;
    }

    if (!clipboard) return;

    try {
      await adapter.pastePath(workspaceId, clipboard, destination);

      if (clipboard.operation === "cut") {
        setClipboard(null);
      }

      await refresh();

      toast.success("Pasted");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  useEffect(() => {
    if (!selectedFile) return;

    const load = async () => {
      const text = await adapter.getFileContent(selectedFile.id);

      setFileContent(text);
      setDirty(false);
    };

    load();
  }, [selectedFile]);

  const handleEditorChange = (value) => {
    setFileContent(value);
    setDirty(true);
  };

  const saveCurrentFile = async () => {
    if (!selectedFile || saving) return;

    try {
      setSaving(true);

      await adapter.saveFileContent(selectedFile.id, fileContent);

      setDirty(false);

      toast.success(
        "Saved",
        `${selectedFile.original_name} saved successfully`,
      );
    } catch (error) {
      toast.error(
        "Save Failed",
        error.response?.data?.message || error.message,
      );
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    setLoading(true);

    try {
      const filesData = await adapter.getFiles(workspaceId, currentFolder);

      setFiles(filesData);
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (files) => {
    for (const item of files) {
      const actualFile = item.file || item;

      const sourceRelative =
        item.relativePath || actualFile.webkitRelativePath || actualFile.name;

      const relativePath = currentFolder
        ? `${currentFolder}/${sourceRelative}`
        : sourceRelative;

      try {
        await adapter.uploadFile(workspaceId, actualFile, relativePath);
        toast.success(
          "File Uploaded",
          `${item.file.name} uploaded succesfully`,
        );
      } catch (error) {
        toast.error(
          error.response?.data?.message ?? error.message ?? "Unknown error",
        );
      }
    }

    refresh();
  };

  const handleUpload = (e) => {
    try {
      uploadFiles([...e.target.files]);

      e.target.value = "";
    } catch (error) {
      toast.error(
        error.response?.data?.message ?? error.message ?? "Unknown error",
      );
    }
  };

  const handleDroppedFiles = (files) => {
    try {
      uploadFiles(files);
    } catch (error) {
      toast.error(
        error.response?.data?.message ?? error.message ?? "Unknown error",
      );
    }
  };

  const createFolder = async () => {
    const name = prompt("Folder name");

    if (!name) return;

    await adapter.createFolder(workspaceId, currentFolder, name);

    refresh();
  };

  const createFile = async () => {
    const name = prompt("File name");

    if (!name) return;

    await adapter.createFile(workspaceId, currentFolder, name);

    refresh();
  };

  useEffect(() => {
    const resetDrag = () => {
      dragCounter.current = 0;
      setDragActive(false);
    };

    window.addEventListener("dragend", resetDrag);
    window.addEventListener("drop", resetDrag);

    return () => {
      window.removeEventListener("dragend", resetDrag);
      window.removeEventListener("drop", resetDrag);
    };
  }, []);

  useEffect(() => {
    if (!selectedFile) return;

    const load = async () => {
      const text = await adapter.getFileContent(selectedFile.id);

      setFileContent(text);
      setDirty(false);
    };

    load();
  }, [selectedFile]);

  useEffect(() => {}, [selectedFile]);

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <FileBreadcrumbs
        currentFolder={currentFolder}
        onNavigate={setCurrentFolder}
      />
      <input
        ref={uploadFileRef}
        type="file"
        multiple
        hidden
        onChange={handleUpload}
      />
      <input
        ref={uploadFolderRef}
        type="file"
        webkitdirectory=""
        multiple
        hidden
        onChange={handleUpload}
      />
      <FileToolbar
        onUploadFile={() => uploadFileRef.current.click()}
        onUploadFolder={() => uploadFolderRef.current.click()}
        onNewFolder={createFolder}
        onNewFile={createFile}
        clipboard={clipboard}
      />
      {!selectedFile ? (
        <div
          className={`cloud-drop-zone ${dragActive ? "drag-active" : ""}`}
          onDragEnter={(e) => {
            e.preventDefault();

            dragCounter.current++;

            setDragActive(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDragLeave={(e) => {
            e.preventDefault();

            dragCounter.current--;

            if (dragCounter.current <= 0) {
              dragCounter.current = 0;
              setDragActive(false);
            }
          }}
          onDrop={async (e) => {
            e.preventDefault();

            dragCounter.current = 0;
            setDragActive(false);

            const files = await readDroppedEntries(e.dataTransfer.items);

            handleDroppedFiles(files);
          }}
        >
          {dragActive && (
            <div classNa="cloud-drop-overlay">
              <Upload size={56} />

              <h2>Drop files to upload</h2>

              <p>Upload into this folder</p>
            </div>
          )}
          <FileList
            files={files}
            currentFolder={currentFolder}
            onNavigate={setCurrentFolder}
            onOpenFile={setSelectedFile}
            onCopy={handleCopy}
            onCut={handleCut}
            onPaste={handlePaste}
            clipboard={clipboard}
            adapter={adapter}
            refresh={refresh}
            workspaceId={workspaceId}
          />
        </div>
      ) : (
        <FileViewer
          adapter={adapter}
          onClose={() => setSelectedFile(null)}
          file={selectedFile}
          content={fileContent}
          dirty={dirty}
          saving={saving}
          onChange={handleEditorChange}
          onSave={saveCurrentFile}
          onBack={() => setSelectedFile(null)}
          dirty={dirty}
          onDownload={() => adapter.downloadFile(selectedFile.id)}
        />
      )}
    </div>
  );
}
