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

export default function FileBrowser({ adapter, workspaceId, onStorageChange }) {
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
  const [uploadProgress, setUploadProgress] = useState(null);
  const uploadAbortController = useRef(null);
  const uploadCancelled = useRef(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCopy = async (item) => {
    if (!adapter.pastePath && !adapter.copyPath) {
      toast.info("Copy isn't supported here yet.");
      return;
    }

    if (adapter.copyPath) {
      await adapter.copyPath(workspaceId, item.path, item.type).catch(() => {});
    }

    setClipboard({
      operation: "copy",
      type: item.type,
      relativePath: item.path,
      name: item.name,
    });

    toast.success(`Copied "${item.name}"`);
  };

  const handleCut = async (item) => {
    if (!adapter.pastePath && !adapter.copyPath) {
      toast.info("Move isn't supported here yet.");
      return;
    }

    if (adapter.cutPath) {
      await adapter.cutPath(workspaceId, item.path, item.type).catch(() => {});
    }

    setClipboard({
      operation: "cut",
      type: item.type,
      relativePath: item.path,
      name: item.name,
    });

    toast.success(`Ready to move "${item.name}"`);
  };

  const handleCopySelected = async () => {
    if (selectedItems.length === 0) return;

    if (selectedItems.length === 1) {
      await handleCopy(selectedItems[0]);
    } else {
      setClipboard({
        operation: "copy",
        items: selectedItems.map((i) => ({
          path: i.path,
          type: i.type,
          name: i.name,
        })),
        label: `${selectedItems.length} items`,
      });

      toast.success(`Copied ${selectedItems.length} items`);
    }

    setSelectedItems([]);
  };

  const handleCutSelected = async () => {
    if (selectedItems.length === 0) return;

    if (selectedItems.length === 1) {
      await handleCut(selectedItems[0]);
    } else {
      setClipboard({
        operation: "cut",
        items: selectedItems.map((i) => ({
          path: i.path,
          type: i.type,
          name: i.name,
        })),
        label: `${selectedItems.length} items`,
      });

      toast.success(`Ready to move ${selectedItems.length} items`);
    }

    setSelectedItems([]);
  };

  const handlePaste = async (destination = currentFolder) => {
    if (!adapter.pastePath) {
      toast.info("Paste isn't supported here yet.");
      return;
    }

    if (!clipboard) return;

    try {
      const itemsToPaste = clipboard.items || [
        {
          path: clipboard.relativePath,
          type: clipboard.type,
          name: clipboard.name,
        },
      ];

      for (const it of itemsToPaste) {
        await adapter.pastePath(
          workspaceId,
          {
            operation: clipboard.operation,
            type: it.type,
            relativePath: it.path,
          },
          destination,
        );
      }

      if (clipboard.operation === "cut") {
        setClipboard(null);
      }

      await refresh();
      onStorageChange?.();

      toast.success("Pasted successfully");
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
      onStorageChange?.();

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

  const uploadFiles = async (items) => {
    if (!items || items.length === 0) return;

    uploadCancelled.current = false;

    const controller = new AbortController();

    uploadAbortController.current = controller;

    const { signal } = controller;

    const uploadItems = items.map((item) => {
      const actualFile = item.file || item;

      const sourceRelative =
        item.relativePath || actualFile.webkitRelativePath || actualFile.name;

      const relativePath = currentFolder
        ? `${currentFolder}/${sourceRelative}`
        : sourceRelative;

      return {
        item,
        file: actualFile,
        relativePath,
      };
    });

    const folderNames = [
      ...new Set(
        uploadItems
          .filter(({ relativePath }) => relativePath.includes("/"))
          .map(({ relativePath }) => relativePath.split("/")[0]),
      ),
    ];

    const isFolderUpload = folderNames.length > 0;

    const totalFiles = uploadItems.length;

    const totalBytes = uploadItems.reduce(
      (sum, item) => sum + item.file.size,
      0,
    );

    let completedFiles = 0;
    let completedBytes = 0;

    setUploadProgress({
      totalFiles,
      completedFiles: 0,
      totalBytes,
      uploadedBytes: 0,
      currentFile: uploadItems[0].file.name,
      percentage: 0,
    });

    try {
      for (const uploadItem of uploadItems) {
        if (signal.aborted || uploadCancelled.current) {
          break;
        }

        const { file, relativePath } = uploadItem;

        setUploadProgress((previous) => ({
          ...previous,
          currentFile: file.name,
        }));

        try {
          await adapter.uploadFile(
            workspaceId,
            file,
            relativePath,
            ({ loaded }) => {
              if (signal.aborted || uploadCancelled.current) {
                return;
              }

              const uploadedBytes = completedBytes + loaded;

              const percentage = totalBytes
                ? Math.round((uploadedBytes / totalBytes) * 100)
                : 0;

              setUploadProgress((previous) => ({
                ...previous,
                totalFiles,
                completedFiles,
                totalBytes,
                uploadedBytes,
                currentFile: file.name,
                percentage,
              }));
            },
            signal,
          );
        } catch (error) {
          if (
            signal.aborted ||
            uploadCancelled.current ||
            error?.name === "CanceledError" ||
            error?.code === "ERR_CANCELED"
          ) {
            break;
          }

          toast.error(
            error.response?.data?.message || error.message || "Upload failed",
          );

          continue;
        }

        // Don't count a file that was cancelled.
        if (signal.aborted || uploadCancelled.current) {
          break;
        }

        completedBytes += file.size;
        completedFiles++;

        setUploadProgress({
          totalFiles,
          completedFiles,
          totalBytes,
          uploadedBytes: completedBytes,
          currentFile:
            completedFiles < totalFiles
              ? uploadItems[completedFiles].file.name
              : null,
          percentage: totalBytes
            ? Math.round((completedBytes / totalBytes) * 100)
            : 100,
        });
      }

      // -------------------------
      // CANCELLED
      // -------------------------

      if (signal.aborted || uploadCancelled.current) {
        setUploadProgress(null);

        toast.info("Upload Cancelled", "The upload was cancelled.");

        await refresh();

        return;
      }

      // -------------------------
      // SUCCESS TOAST
      // -------------------------

      if (isFolderUpload) {
        if (folderNames.length === 1) {
          toast.success(
            "Folder Uploaded",
            `${folderNames[0]} uploaded successfully`,
          );
        } else {
          toast.success(
            "Folders Uploaded",
            `${folderNames.length} folders uploaded successfully`,
          );
        }
      } else if (items.length === 1) {
        toast.success(
          "File Uploaded",
          `${uploadItems[0].file.name} uploaded successfully`,
        );
      } else {
        toast.success(
          "Upload Complete",
          `${totalFiles} files uploaded successfully`,
        );
      }

      await refresh();
      onStorageChange?.();

      setTimeout(() => {
        setUploadProgress(null);
      }, 1000);
    } finally {
      if (uploadAbortController.current === controller) {
        uploadAbortController.current = null;
      }

      uploadCancelled.current = false;
    }
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

  const handleDroppedFiles = async (files) => {
    try {
      await uploadFiles(files);
    } catch (error) {
      toast.error(
        error.response?.data?.message ?? error.message ?? "Unknown error",
      );
    }
  };
  const handleNavigate = (path) => {
    setSelectedItems([]);
    setCurrentFolder(path);
  };
  const createFolder = async () => {
    const name = prompt("Folder name");

    if (!name) return;

    await adapter.createFolder(workspaceId, currentFolder, name);

    refresh();
  };

  const handleDeleteSelected = async () => {
    if (!selectedItems.length) return;

    const names = selectedItems.map((item) => item.name).join(", ");

    if (
      !window.confirm(
        `Delete ${selectedItems.length} selected item(s)?\n\n${names}`,
      )
    ) {
      return;
    }

    try {
      await adapter.deletePaths(
        workspaceId,
        selectedItems.map((item) => ({
          type: item.type,
          relativePath: item.path,
        })),
      );

      toast.success(
        "Deleted",
        `${selectedItems.length} item(s) deleted successfully`,
      );

      setSelectedItems([]);

      await refresh();
      onStorageChange?.();
    } catch (error) {
      toast.error(
        "Delete Failed",
        error.response?.data?.message || error.message,
      );
    }
  };

  const createFile = async () => {
    const name = prompt("File name");

    if (!name) return;

    await adapter.createFile(workspaceId, currentFolder, name);

    refresh();
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];

    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    const value = bytes / Math.pow(1024, index);

    return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
  };

  const cancelUpload = () => {
    if (!uploadAbortController.current) return;

    uploadCancelled.current = true;

    uploadAbortController.current.abort();

    setUploadProgress(null);

    toast.info("Upload Cancelled", "The upload was cancelled.");
  };

  const handleDownloadSelected = async () => {
    if (!selectedItems || selectedItems.length === 0) {
      return;
    }

    try {
      await adapter.downloadPaths(workspaceId, selectedItems);

      toast.success(
        "Download Started",
        `${selectedItems.length} item${
          selectedItems.length === 1 ? "" : "s"
        } added to download.`,
      );
    } catch (error) {
      toast.error(
        "Download Failed",
        error.response?.data?.message || error.message,
      );
    }
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        document.activeElement?.isContentEditable
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === "c") {
        if (selectedItems.length > 0) {
          e.preventDefault();
          handleCopySelected();
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === "x") {
        if (selectedItems.length > 0) {
          e.preventDefault();
          handleCutSelected();
        }
      } else if (isCtrlOrCmd && e.key.toLowerCase() === "v") {
        if (clipboard) {
          e.preventDefault();
          handlePaste(currentFolder);
        }
      } else if (e.key === "Delete") {
        if (selectedItems.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItems, clipboard, currentFolder]);

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="file-browser">
      <div>
        <FileBreadcrumbs
          currentFolder={currentFolder}
          onNavigate={handleNavigate}
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
          onPaste={() => handlePaste(currentFolder)}
          onClearClipboard={() => setClipboard(null)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {uploadProgress && (
          <div className="upload-progress-card">
            <div className="upload-progress-header">
              <div>
                <div className="upload-progress-title">Uploading</div>

                <div className="upload-progress-subtitle">
                  {uploadProgress.completedFiles} of {uploadProgress.totalFiles}{" "}
                  files completed
                </div>
              </div>

              <div className="upload-progress-actions">
                <div className="upload-progress-percentage">
                  {uploadProgress.percentage}%
                </div>

                <button
                  type="button"
                  className="upload-cancel-button"
                  onClick={cancelUpload}
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="upload-progress-bar">
              <div
                className="upload-progress-fill"
                style={{
                  width: `${uploadProgress.percentage}%`,
                }}
              />
            </div>

            <div className="upload-progress-info">
              <span>
                {formatBytes(uploadProgress.uploadedBytes)} /{" "}
                {formatBytes(uploadProgress.totalBytes)}
              </span>

              {uploadProgress.currentFile && (
                <span className="upload-current-file">
                  {uploadProgress.currentFile}
                </span>
              )}
            </div>
          </div>
        )}

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

              try {
                const files = await readDroppedEntries(e.dataTransfer);

                console.log("DROPPED FILES:", files);
                console.log("DROPPED COUNT:", files.length);

                await handleDroppedFiles(files);
              } catch (error) {
                console.error("DROP ERROR:", error);

                toast.error(
                  error.response?.data?.message ??
                    error.message ??
                    "Could not read dropped files",
                );
              }
            }}
          >
            {dragActive && (
              <div className="cloud-drop-overlay">
                <Upload size={56} />

                <h2>Drop files to upload</h2>

                <p>Upload into this folder</p>
              </div>
            )}
            {selectedItems.length > 0 && (
              <div className="selection-toolbar">
                <div className="selection-info">
                  <strong>{selectedItems.length}</strong>
                  <span>
                    {selectedItems.length === 1
                      ? "item selected"
                      : "items selected"}
                  </span>
                </div>

                <div className="selection-actions">
                  <button
                    type="button"
                    onClick={handleCopySelected}
                    title="Copy selected items"
                  >
                    Copy
                  </button>

                  <button
                    type="button"
                    onClick={handleCutSelected}
                    title="Cut selected items"
                  >
                    Cut
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadSelected();
                    }}
                  >
                    Download
                  </button>

                  <button
                    type="button"
                    className="selection-delete"
                    onClick={() => {
                      handleDeleteSelected();
                    }}
                  >
                    Delete
                  </button>

                  <button
                    type="button"
                    className="selection-clear"
                    onClick={() => setSelectedItems([])}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <FileList
              files={files}
              currentFolder={currentFolder}
              onNavigate={handleNavigate}
              onOpenFile={setSelectedFile}
              onCopy={handleCopy}
              onCut={handleCut}
              onPaste={handlePaste}
              clipboard={clipboard}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
              adapter={adapter}
              refresh={refresh}
              workspaceId={workspaceId}
              onDownloadSelected={handleDownloadSelected}
              searchQuery={searchQuery}
              onStorageChange={onStorageChange}
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
    </div>
  );
}
