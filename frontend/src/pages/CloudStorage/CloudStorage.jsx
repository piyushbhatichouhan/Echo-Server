import { useEffect, useState } from "react";
import Card from "../../components/common/Card/Card";
import FileManager from "../../components/project/FileManager/FileManager";
import cloudWorkspace from "../../services/cloudWorkspace";
import { getCloudFiles } from "../../services/cloud.api";
import FileEditor from "../../components/project/fileeditor/FileEditor";
import { useToast } from "../../context/ToastContext";
import StorageStats from "../../components/cloud/StorageStats/StorageStats";
import CloudFileList from "../../components/cloud/CloudFileList/CloudFileList";
import Breadcrumbs from "../../components/cloud/Breadcrumbs/Breadcrumbs";
import { useRef } from "react";
import CloudToolbar from "../../components/cloud/CloudToolbar/CloudToolbar";
import { Upload } from "lucide-react";
import { readDroppedEntries } from "../../utils/readDroppedEntries";
import "./CloudStorage.css";

export default function CloudStorage() {
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
  const uploadRef = useRef();

  useEffect(() => {
    if (!selectedFile) return;

    const load = async () => {
      const text = await cloudWorkspace.getFileContent(selectedFile.id);

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
    if (!selectedFile) return;

    await cloudWorkspace.saveFileContent(selectedFile.id, fileContent);

    await refresh();

    setDirty(false);
  };

  const refresh = async () => {
    setLoading(true);

    try {
      const [filesData, statsData] = await Promise.all([
        getCloudFiles(),
        cloudWorkspace.getStats(),
      ]);

      setFiles(filesData);
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async (files) => {
    console.log(files);
    for (const item of files) {
      const actualFile = item.file || item;

      const relativePath =
        item.relativePath || actualFile.webkitRelativePath || actualFile.name;

      try {
        await cloudWorkspace.uploadFile(
          currentFolder,
          actualFile,
          relativePath,
        );
        toast.success(
          "File Uploaded",
          `${file.original_name} uploaded succesfully`,
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

    await cloudWorkspace.createFolder(currentFolder, name);

    refresh();
  };

  const createFile = async () => {
    const name = prompt("File name");

    if (!name) return;

    await cloudWorkspace.createFile(currentFolder, name);

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
    refresh();
  }, []);

  return (
    <div>
      <StorageStats stats={stats} />
      <CloudToolbar
        onUpload={() => uploadRef.current.click()}
        onNewFolder={createFolder}
        onNewFile={createFile}
      />

      <Breadcrumbs
        currentFolder={currentFolder}
        onNavigate={setCurrentFolder}
      />
      <input
        ref={uploadRef}
        type="file"
        multiple
        webkitdirectory=""
        hidden
        onChange={handleUpload}
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
            <div className="cloud-drop-overlay">
              <Upload size={56} />

              <h2>Drop files to upload</h2>

              <p>Upload into this folder</p>
            </div>
          )}
          <CloudFileList
            files={files}
            currentFolder={currentFolder}
            onNavigate={setCurrentFolder}
            onOpenFile={setSelectedFile}
            adapter={cloudWorkspace}
            refresh={refresh}
          />
        </div>
      ) : (
        <FileEditor
          adapter={cloudWorkspace}
          onClose={() => setSelectedFile(null)}
          file={selectedFile}
          content={fileContent}
          onChange={handleEditorChange}
          onSave={saveCurrentFile}
          onBack={() => setSelectedFile(null)}
          dirty={dirty}
          onDownload={() => cloudWorkspace.downloadFile(selectedFile.id)}
        />
      )}
    </div>
  );
}
