import { useEffect, useState, useRef } from "react";
import Card from "../../common/card/card";
import { useToast } from "../../../context/ToastContext";
import FileList from "../FileList/FileList";
import FileBreadcrumbs from "../FileBreadcrumbs/FileBreadcrumbs";
import FileViewer from "../fileviewer/FileViewer";
import FileToolbar from "../FileToolBar/FileToolbar";
import FolderTreeSidebar from "../FolderTreeSidebar";
import UploadDrawer from "../UploadDrawer";
import TrashModal from "../TrashModal";
import FilePropertiesModal from "../FilePropertiesModal";
import CrossTransferModal from "../CrossTransferModal";
import NamePromptModal from "../NamePromptModal";
import ConfirmActionModal from "../ConfirmActionModal";

import { Upload, Archive, CloudUpload, Info, X } from "lucide-react";
import { readDroppedEntries } from "../../../utils/readDroppedEntries";
import "./FileBrowser.css";

export default function FileBrowser({ adapter, workspaceId, onStorageChange }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [currentFolder, setCurrentFolder] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);
  const uploadFileRef = useRef();
  const uploadFolderRef = useRef();
  const [saving, setSaving] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const [uploadQueue, setUploadQueue] = useState([]);
  const uploadAbortController = useRef(null);
  const uploadCancelled = useRef(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Upgraded Feature States
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("echohub_files_view_mode") || "list";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [propertiesItem, setPropertiesItem] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferMode, setTransferMode] = useState("export");
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  // Modern UI Input Dialog State (Replaces native browser prompts)
  const [promptModal, setPromptModal] = useState({
    isOpen: false,
    type: "file",
    title: "",
    initialValue: "",
    currentPath: "",
    itemCount: 1,
    onSubmit: () => {},
  });

  // Modern UI Confirmation Dialog State (Replaces native browser confirms)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "Confirm Action",
    message: "",
    confirmText: "Delete",
    confirmVariant: "danger",
    loading: false,
    onConfirm: () => {},
  });

  const toast = useToast();

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem("echohub_files_view_mode", mode);
  };

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

  const handlePaste = async (destination) => {
    if (!clipboard) return;

    try {
      if (clipboard.items && clipboard.items.length > 0) {
        for (const item of clipboard.items) {
          await adapter.pastePath(
            workspaceId,
            {
              operation: clipboard.operation,
              type: item.type,
              relativePath: item.path,
            },
            destination,
          );
        }
      } else {
        await adapter.pastePath(workspaceId, clipboard, destination);
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

  const handleDropItemOnFolder = async (sourceItem, targetFolderPath) => {
    if (!sourceItem?.path || sourceItem.path === targetFolderPath) return;
    if (
      sourceItem.type === "folder" &&
      (targetFolderPath === sourceItem.path ||
        targetFolderPath.startsWith(sourceItem.path + "/"))
    ) {
      toast.info("Cannot move a folder into itself or its subfolder.");
      return;
    }

    try {
      if (adapter.cutPath) {
        await adapter.cutPath(workspaceId, sourceItem.path, sourceItem.type).catch(() => {});
      }
      await adapter.pastePath(
        workspaceId,
        {
          operation: "cut",
          relativePath: sourceItem.path,
          type: sourceItem.type,
          name: sourceItem.name,
        },
        targetFolderPath,
      );

      toast.success("Moved", `Moved "${sourceItem.name}" to /${targetFolderPath || "root"}`);
      await refresh();
      onStorageChange?.();
    } catch (err) {
      toast.error("Move Failed", err.response?.data?.message || err.message);
    }
  };

  // Modern UI Zip Compression
  const handleCompressSelected = () => {
    if (!adapter.compressPaths || selectedItems.length === 0) return;
    const defaultName =
      selectedItems.length === 1
        ? `${selectedItems[0].name.replace(/\.[^/.]+$/, "")}.zip`
        : "archive.zip";

    setPromptModal({
      isOpen: true,
      type: "archive",
      title: "Compress to Zip Archive",
      initialValue: defaultName,
      itemCount: selectedItems.length,
      currentPath: currentFolder,
      onSubmit: async (name) => {
        try {
          toast.info("Compressing files...");
          await adapter.compressPaths(
            workspaceId,
            selectedItems.map((i) => ({ relativePath: i.path, type: i.type })),
            name,
            currentFolder,
          );
          toast.success("Compressed", `Created "${name}" successfully.`);
          setSelectedItems([]);
          await refresh();
          onStorageChange?.();
        } catch (err) {
          toast.error("Compression Failed", err.response?.data?.message || err.message);
        }
      },
    });
  };

  const handleCompressItem = (item) => {
    if (!adapter.compressPaths || !item) return;
    const defaultName = `${item.name.replace(/\.[^/.]+$/, "")}.zip`;

    setPromptModal({
      isOpen: true,
      type: "archive",
      title: "Compress to Zip Archive",
      initialValue: defaultName,
      itemCount: 1,
      currentPath: currentFolder,
      onSubmit: async (name) => {
        try {
          toast.info("Compressing...");
          await adapter.compressPaths(
            workspaceId,
            [{ relativePath: item.path, type: item.type }],
            name,
            currentFolder,
          );
          toast.success("Compressed", `Created "${name}" successfully.`);
          await refresh();
          onStorageChange?.();
        } catch (err) {
          toast.error("Compression Failed", err.response?.data?.message || err.message);
        }
      },
    });
  };

  const handleShowProperties = (item) => {
    setPropertiesItem(item);
    setShowPropertiesModal(true);
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
      toast.success("Saved", `${selectedFile.original_name} saved successfully`);
    } catch (error) {
      toast.error("Save Failed", error.response?.data?.message || error.message);
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

  // Global search effect
  useEffect(() => {
    if (!isGlobalSearch || !searchQuery.trim() || !adapter.searchFiles) {
      setGlobalSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingGlobal(true);
        const results = await adapter.searchFiles(workspaceId, searchQuery.trim());
        setGlobalSearchResults(Array.isArray(results) ? results : []);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setSearchingGlobal(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isGlobalSearch, searchQuery, workspaceId]);

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

    const initialQueue = uploadItems.map((u, idx) => ({
      id: `${idx}-${Date.now()}`,
      name: u.file.name,
      size: u.file.size,
      progress: 0,
      status: "pending",
    }));
    setUploadQueue(initialQueue);

    try {
      for (let i = 0; i < uploadItems.length; i++) {
        if (signal.aborted || uploadCancelled.current) break;

        const { file, relativePath } = uploadItems[i];

        setUploadQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: "uploading", progress: 0 } : q)),
        );

        try {
          await adapter.uploadFile(
            workspaceId,
            file,
            relativePath,
            ({ percentage }) => {
              if (signal.aborted || uploadCancelled.current) return;
              setUploadQueue((prev) =>
                prev.map((q, idx) =>
                  idx === i ? { ...q, progress: percentage || 0 } : q,
                ),
              );
            },
            signal,
          );

          setUploadQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, status: "completed", progress: 100 } : q,
            ),
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

          setUploadQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? {
                    ...q,
                    status: "error",
                    error: error.response?.data?.message || error.message || "Failed",
                  }
                : q,
            ),
          );
        }
      }

      await refresh();
      onStorageChange?.();
    } finally {
      if (uploadAbortController.current === controller) {
        uploadAbortController.current = null;
      }
      uploadCancelled.current = false;
    }
  };

  const cancelUpload = () => {
    if (!uploadAbortController.current) return;
    uploadCancelled.current = true;
    uploadAbortController.current.abort();
    setUploadQueue((prev) =>
      prev.map((q) =>
        q.status === "uploading" || q.status === "pending"
          ? { ...q, status: "cancelled" }
          : q,
      ),
    );
    toast.info("Upload Cancelled", "The upload was cancelled.");
  };

  const handleUpload = (e) => {
    try {
      uploadFiles([...e.target.files]);
      e.target.value = "";
    } catch (error) {
      toast.error(error.response?.data?.message ?? error.message ?? "Unknown error");
    }
  };

  const handleDroppedFiles = async (filesList) => {
    try {
      await uploadFiles(filesList);
    } catch (error) {
      toast.error(error.response?.data?.message ?? error.message ?? "Unknown error");
    }
  };

  const handleNavigate = (path) => {
    setSelectedItems([]);
    setCurrentFolder(path);
    if (isGlobalSearch) {
      setIsGlobalSearch(false);
      setSearchQuery("");
    }
  };

  // Modern UI New Folder Dialog (Replaces prompt)
  const createFolder = () => {
    setPromptModal({
      isOpen: true,
      type: "folder",
      title: "New Folder",
      initialValue: "",
      currentPath: currentFolder,
      onSubmit: async (name) => {
        try {
          await adapter.createFolder(workspaceId, currentFolder, name);
          toast.success("Folder Created", `Created folder "${name}"`);
          await refresh();
          onStorageChange?.();
        } catch (err) {
          toast.error("Failed to create folder", err.response?.data?.message || err.message);
        }
      },
    });
  };

  // Modern UI New File Dialog (Replaces prompt)
  const createFile = () => {
    setPromptModal({
      isOpen: true,
      type: "file",
      title: "New File",
      initialValue: "",
      currentPath: currentFolder,
      onSubmit: async (name) => {
        try {
          await adapter.createFile(workspaceId, currentFolder, name);
          toast.success("File Created", `Created file "${name}"`);
          await refresh();
          onStorageChange?.();
        } catch (err) {
          toast.error("Failed to create file", err.response?.data?.message || err.message);
        }
      },
    });
  };

  // Modern UI Delete Confirmation Dialog (Replaces confirm)
  const handleDeleteSelected = () => {
    if (!selectedItems.length) return;

    const count = selectedItems.length;
    const names = selectedItems.slice(0, 3).map((item) => item.name).join(", ");
    const more = count > 3 ? ` and ${count - 3} more` : "";

    setConfirmModal({
      isOpen: true,
      title: "Move to Trash?",
      message: `Move ${count} selected item(s) (${names}${more}) to the Recycle Bin?`,
      confirmText: "Move to Trash",
      confirmVariant: "danger",
      loading: false,
      onConfirm: async () => {
        try {
          await adapter.deletePaths(
            workspaceId,
            selectedItems.map((item) => ({
              type: item.type,
              relativePath: item.path,
            })),
          );

          toast.success(
            "Moved to Trash",
            `${count} item(s) moved to recycle bin.`,
          );

          setSelectedItems([]);
          await refresh();
          onStorageChange?.();
        } catch (error) {
          toast.error("Delete Failed", error.response?.data?.message || error.message);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Modern UI Single Item Delete (Replaces confirm)
  const handleDeleteSingleItem = (item) => {
    if (!item) return;

    setConfirmModal({
      isOpen: true,
      title: "Move to Trash?",
      message: `Move "${item.name}" to the Recycle Bin?`,
      confirmText: "Move to Trash",
      confirmVariant: "danger",
      loading: false,
      onConfirm: async () => {
        try {
          await adapter.deletePath(workspaceId, item);
          toast.success("Moved to Trash", `"${item.name}" moved to recycle bin.`);
          await refresh();
          onStorageChange?.();
        } catch (error) {
          toast.error("Delete Failed", error.response?.data?.message || error.message);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDownloadSelected = async () => {
    if (!selectedItems || selectedItems.length === 0) return;

    try {
      await adapter.downloadPaths(workspaceId, selectedItems);
      toast.success(
        "Download Started",
        `${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"} added to download.`,
      );
    } catch (error) {
      toast.error("Download Failed", error.response?.data?.message || error.message);
    }
  };

  // Keyboard Shortcuts Handler
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
      } else if (e.key === "F2") {
        if (selectedItems.length === 1) {
          e.preventDefault();
          const item = selectedItems[0];
          setPromptModal({
            isOpen: true,
            type: "rename",
            title: "Rename Item",
            initialValue: item.name,
            currentPath: currentFolder,
            onSubmit: async (newName) => {
              if (newName === item.name) return;
              try {
                await adapter.renamePath(workspaceId, item, newName);
                toast.success("Renamed", `Renamed to ${newName}`);
                await refresh();
                onStorageChange?.();
              } catch (err) {
                toast.error("Rename Failed", err.response?.data?.message || err.message);
              }
            },
          });
        }
      } else if (e.key === "Escape") {
        if (selectedItems.length > 0) {
          setSelectedItems([]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItems, clipboard, currentFolder]);

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
  }, [currentFolder]);

  // Determine files to display (either global search results or standard files)
  const displayFiles = isGlobalSearch && searchQuery.trim() ? globalSearchResults : files;

  return (
    <div className="file-browser">
      <FileBreadcrumbs currentFolder={currentFolder} onNavigate={handleNavigate} />

      <input ref={uploadFileRef} type="file" multiple hidden onChange={handleUpload} />
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
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        onOpenTrash={adapter.getTrash ? () => setShowTrashModal(true) : null}
        onImportFromCloud={
          !adapter.isCloud && adapter.importToProject
            ? () => {
                setTransferMode("import");
                setShowTransferModal(true);
              }
            : null
        }
        isGlobalSearch={isGlobalSearch}
        onToggleGlobalSearch={() => setIsGlobalSearch((g) => !g)}
      />

      {isGlobalSearch && searchQuery.trim() && (
        <div className="global-search-banner">
          <span>
            Showing global search matches for <strong>"{searchQuery}"</strong>{" "}
            ({searchingGlobal ? "searching..." : `${displayFiles.length} item(s) found`})
          </span>
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => {
              setIsGlobalSearch(false);
              setSearchQuery("");
            }}
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Floating Upload Progress Drawer */}
      <UploadDrawer
        uploads={uploadQueue}
        onCancelAll={cancelUpload}
        onDismiss={() => setUploadQueue([])}
      />

      {/* Modern Name Input Dialog (Folder, File, Zip Archive, Rename) */}
      <NamePromptModal
        isOpen={promptModal.isOpen}
        onClose={() => setPromptModal((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={promptModal.onSubmit}
        type={promptModal.type}
        title={promptModal.title}
        initialValue={promptModal.initialValue}
        currentPath={promptModal.currentPath}
        itemCount={promptModal.itemCount}
      />

      {/* Modern Confirmation Dialog (Delete, Trash) */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmVariant={confirmModal.confirmVariant}
        loading={confirmModal.loading}
      />

      {/* Modal Dialogs */}
      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        adapter={adapter}
        workspaceId={workspaceId}
        onRestored={() => {
          refresh();
          onStorageChange?.();
        }}
      />

      <FilePropertiesModal
        isOpen={showPropertiesModal}
        onClose={() => setShowPropertiesModal(false)}
        item={propertiesItem}
      />

      <CrossTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        mode={transferMode}
        selectedItems={selectedItems}
        projectId={workspaceId}
        adapter={adapter}
        currentFolder={currentFolder}
        onSuccess={() => {
          refresh();
          onStorageChange?.();
        }}
      />

      {!selectedFile ? (
        <div className="file-browser-split-container">
          <FolderTreeSidebar
            files={files}
            currentFolder={currentFolder}
            onNavigate={handleNavigate}
            onDropOnFolder={handleDropItemOnFolder}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <div
            className={`file-browser-main-area cloud-drop-zone ${dragActive ? "drag-active" : ""}`}
            onDragEnter={(e) => {
              e.preventDefault();
              dragCounter.current++;
              setDragActive(true);
            }}
            onDragOver={(e) => e.preventDefault()}
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
                const dropped = await readDroppedEntries(e.dataTransfer);
                await handleDroppedFiles(dropped);
              } catch (error) {
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
                    {selectedItems.length === 1 ? "item selected" : "items selected"}
                  </span>
                </div>

                <div className="selection-actions">
                  <button type="button" onClick={handleCopySelected} title="Copy selected">
                    Copy
                  </button>

                  <button type="button" onClick={handleCutSelected} title="Cut selected">
                    Cut
                  </button>

                  <button type="button" onClick={handleDownloadSelected}>
                    Download
                  </button>

                  {adapter.compressPaths && (
                    <button
                      type="button"
                      onClick={handleCompressSelected}
                      title="Compress selected into a .zip file"
                    >
                      Compress (.zip)
                    </button>
                  )}

                  {!adapter.isCloud && adapter.exportToCloud && (
                    <button
                      type="button"
                      onClick={() => {
                        setTransferMode("export");
                        setShowTransferModal(true);
                      }}
                      title="Export selected to Cloud Storage"
                    >
                      Export to Cloud
                    </button>
                  )}

                  <button
                    type="button"
                    className="selection-delete"
                    onClick={handleDeleteSelected}
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
              files={displayFiles}
              currentFolder={isGlobalSearch ? "" : currentFolder}
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
              searchQuery={isGlobalSearch ? "" : searchQuery}
              onStorageChange={onStorageChange}
              viewMode={viewMode}
              onShowProperties={handleShowProperties}
              onCompressItem={handleCompressItem}
              onDeleteItem={handleDeleteSingleItem}
              onExportItem={
                !adapter.isCloud && adapter.exportToCloud
                  ? (item) => {
                      setSelectedItems([item]);
                      setTransferMode("export");
                      setShowTransferModal(true);
                    }
                  : null
              }
              onDropItemOnFolder={handleDropItemOnFolder}
            />
          </div>
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
          onDownload={() => adapter.downloadFile(selectedFile.id)}
        />
      )}
    </div>
  );
}
