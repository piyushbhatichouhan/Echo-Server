import { createContext, useContext, useState, useRef, useCallback } from "react";
import { useToast } from "./ToastContext";
import UploadDrawer from "../components/files/UploadDrawer";

const UploadContext = createContext(null);

export function UploadProvider({ children }) {
  const [uploads, setUploads] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const abortControllerRef = useRef(null);
  const isCancelledRef = useRef(false);
  const listenersRef = useRef(new Set());

  // Subscribe to finished upload events (e.g., for FileBrowser to auto-refresh)
  const subscribeToUploads = useCallback((callback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const notifyListeners = useCallback((event) => {
    listenersRef.current.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error("[UploadContext] Listener error:", err);
      }
    });
  }, []);

  const cancelAll = useCallback(() => {
    if (abortControllerRef.current) {
      isCancelledRef.current = true;
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploads((prev) =>
      prev.map((item) =>
        item.status === "uploading" || item.status === "pending"
          ? { ...item, status: "cancelled" }
          : item
      )
    );
    setIsUploading(false);
    toast?.info("Upload Cancelled", "Ongoing uploads were stopped.");
  }, [toast]);

  const dismissUploads = useCallback(() => {
    setUploads([]);
  }, []);

  const startUpload = useCallback(
    async ({
      adapter,
      workspaceId,
      items,
      currentFolder = "",
      onComplete = null,
      onStorageChange = null,
    }) => {
      if (!items || items.length === 0) return;
      if (!adapter?.uploadFile) {
        toast?.error("Upload Error", "Upload is not supported for this workspace.");
        return;
      }

      isCancelledRef.current = false;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const { signal } = controller;

      // Normalize items
      const formattedTasks = items.map((item, idx) => {
        const actualFile = item.file || item;
        const sourceRelative =
          item.relativePath || actualFile.webkitRelativePath || actualFile.name;
        const cleanFolder = currentFolder ? currentFolder.replace(/\/+$/, "") : "";
        const cleanRelative = sourceRelative ? sourceRelative.replace(/^\/+/, "") : actualFile.name;
        const relativePath = cleanFolder
          ? `${cleanFolder}/${cleanRelative}`
          : cleanRelative;

        return {
          id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          file: actualFile,
          name: actualFile.name,
          size: actualFile.size || 0,
          relativePath,
          workspaceId,
          progress: 0,
          status: "pending",
        };
      });

      // Append tasks to global upload state
      setUploads((prev) => [...prev, ...formattedTasks]);
      setIsUploading(true);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < formattedTasks.length; i++) {
        if (signal.aborted || isCancelledRef.current) break;

        const task = formattedTasks[i];

        // Mark current file as uploading
        setUploads((prev) =>
          prev.map((q) =>
            q.id === task.id ? { ...q, status: "uploading", progress: 0 } : q
          )
        );

        try {
          await adapter.uploadFile(
            workspaceId,
            task.file,
            task.relativePath,
            ({ percentage }) => {
              if (signal.aborted || isCancelledRef.current) return;
              const normalized = Math.min(100, Math.max(0, Math.round(percentage || 0)));
              setUploads((prev) =>
                prev.map((q) =>
                  q.id === task.id ? { ...q, progress: normalized } : q
                )
              );
            },
            signal
          );

          setUploads((prev) =>
            prev.map((q) =>
              q.id === task.id ? { ...q, status: "completed", progress: 100 } : q
            )
          );
          successCount++;
        } catch (error) {
          if (
            signal.aborted ||
            isCancelledRef.current ||
            error?.name === "CanceledError" ||
            error?.code === "ERR_CANCELED"
          ) {
            setUploads((prev) =>
              prev.map((q) =>
                q.id === task.id ? { ...q, status: "cancelled" } : q
              )
            );
            break;
          }

          const errorMsg =
            error.response?.data?.message || error.message || "Upload failed";
          setUploads((prev) =>
            prev.map((q) =>
              q.id === task.id ? { ...q, status: "error", error: errorMsg } : q
            )
          );
          errorCount++;
        }
      }

      setIsUploading(false);

      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      // Notify any active views (e.g. FileBrowser)
      notifyListeners({
        workspaceId,
        successCount,
        errorCount,
        cancelled: isCancelledRef.current || signal.aborted,
      });

      try {
        onComplete?.();
        onStorageChange?.();
      } catch (_) {}

      // Show toast notification visible across the application
      if (!isCancelledRef.current && !signal.aborted) {
        if (errorCount === 0 && successCount > 0) {
          toast?.success(
            "Upload Complete",
            `Successfully uploaded ${successCount} file${successCount === 1 ? "" : "s"}.`
          );
        } else if (errorCount > 0) {
          toast?.error(
            "Upload Incomplete",
            `${errorCount} file${errorCount === 1 ? "" : "s"} failed to upload (${successCount} succeeded).`
          );
        }
      }
    },
    [toast, notifyListeners]
  );

  const value = {
    uploads,
    isUploading,
    startUpload,
    cancelAll,
    dismissUploads,
    subscribeToUploads,
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
      <UploadDrawer
        uploads={uploads}
        onCancelAll={cancelAll}
        onDismiss={dismissUploads}
      />
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
}

