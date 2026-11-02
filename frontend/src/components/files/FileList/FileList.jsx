import buildFileTree from "../../../utils/buildFileTree";
import "./CloudFileList.css";
import ContextMenu from "../../common/ContextMenu/ContextMenu";
import { useState } from "react";
import {
  Pencil,
  Trash2,
  Download,
  MoreVertical,
  FolderOpen,
  Copy,
  ClipboardPaste,
  Scissors,
  Archive,
  Info,
  CloudUpload,
  Folder,
  File,
  Film,
  Music,
  Image as ImageIcon,
  FileCode,
  FileText,
} from "lucide-react";
import { useToast } from "../../../context/ToastContext";

function getItemGridIcon(item) {
  if (item.type === "folder") {
    return <Folder size={44} className="grid-icon-folder" />;
  }
  const name = (item.name || "").toLowerCase();
  if (name.endsWith(".zip") || name.endsWith(".tar") || name.endsWith(".gz") || name.endsWith(".rar")) {
    return <Archive size={40} className="grid-icon-archive" />;
  }
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp") || name.endsWith(".svg") || name.endsWith(".gif")) {
    return <ImageIcon size={40} className="grid-icon-image" />;
  }
  if (name.endsWith(".mp4") || name.endsWith(".webm") || name.endsWith(".mov") || name.endsWith(".mkv")) {
    return <Film size={40} className="grid-icon-video" />;
  }
  if (name.endsWith(".mp3") || name.endsWith(".wav") || name.endsWith(".ogg") || name.endsWith(".m4a") || name.endsWith(".flac")) {
    return <Music size={40} className="grid-icon-audio" />;
  }
  if (name.endsWith(".js") || name.endsWith(".jsx") || name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".json") || name.endsWith(".py") || name.endsWith(".html") || name.endsWith(".css")) {
    return <FileCode size={40} className="grid-icon-code" />;
  }
  return <FileText size={40} className="grid-icon-file" />;
}

export default function CloudFileList({
  files,
  currentFolder,
  onNavigate,
  onOpenFile,
  adapter,
  refresh,
  workspaceId,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  selectedItems,
  onSelectionChange,
  onDownSelected,
  searchQuery = "",
  onStorageChange,
  viewMode = "list",
  onShowProperties,
  onCompressItem,
  onExportItem,
  onDropItemOnFolder,
  onDeleteItem,
}) {
  const { downloadFile, deletePath, renamePath } = adapter;
  const toast = useToast();

  const [menu, setMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    item: null,
  });

  const [backgroundMenu, setBackgroundMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });

  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);

  const tree = buildFileTree(files);

  function getFolderChildren(tree, folderPath) {
    if (!folderPath) return tree;

    const parts = folderPath.split("/");

    let current = { children: tree };

    for (const part of parts) {
      current = current.children.find(
        (n) => n.type === "folder" && n.name === part,
      );

      if (!current) return [];
    }

    return current.children;
  }

  const rawChildren = getFolderChildren(tree, currentFolder);

  let children = rawChildren;

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    children = children.filter((item) =>
      item.name.toLowerCase().includes(q),
    );
  }

  children = [...children].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }

    let comp = 0;
    if (sortField === "name") {
      comp = a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    } else if (sortField === "size") {
      const aSize = a.file?.file_size ? Number(a.file.file_size) : 0;
      const bSize = b.file?.file_size ? Number(b.file.file_size) : 0;
      comp = aSize - bSize;
    } else if (sortField === "modified") {
      const aDate = new Date(
        a.file?.created_at || a.file?.updated_at || 0,
      ).getTime();
      const bDate = new Date(
        b.file?.created_at || b.file?.updated_at || 0,
      ).getTime();
      comp = aDate - bDate;
    }

    return sortAsc ? comp : -comp;
  });

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";

    const units = ["B", "KB", "MB", "GB"];

    let size = Number(bytes);
    let i = 0;

    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }

    return `${size.toFixed(1)} ${units[i]}`;
  };

  const formatDate = (date) => {
    if (!date) return "--";
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const finishRename = async () => {
    if (!renaming) return;

    let newName = renameValue.trim();

    if (!newName) {
      setRenaming(null);
      return;
    }

    if (renaming.type === "file" && renaming.name.includes(".")) {
      const parts = renaming.name.split(".");
      const originalExt = parts.pop();
      if (!newName.includes(".")) {
        newName = `${newName}.${originalExt}`;
      }
    }

    if (newName === renaming.name) {
      setRenaming(null);
      return;
    }

    try {
      await renamePath(workspaceId, renaming, newName);

      toast.success("Renamed", `Renamed to ${newName}`);

      await refresh();
      onStorageChange?.();
    } catch (error) {
      toast.error(
        "Rename Failed",
        error.response?.data?.message || error.message,
      );
    }

    setRenaming(null);
  };

  const handleItemSelection = (item) => {
    const isSelected = selectedItems.some(
      (selected) => selected.path === item.path,
    );

    if (isSelected) {
      onSelectionChange(
        selectedItems.filter((selected) => selected.path !== item.path),
      );
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectionChange(children);
    } else {
      onSelectionChange([]);
    }
  };

  const allSelected =
    children.length > 0 && selectedItems.length === children.length;

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ path: item.path, type: item.type, name: item.name }),
    );
  };

  const handleDragOverFolder = (e, item) => {
    if (item.type === "folder") {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleDropOnFolder = (e, item) => {
    if (item.type === "folder") {
      e.preventDefault();
      e.stopPropagation();
      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        if (data && data.path !== item.path) {
          onDropItemOnFolder?.(data, item.path);
        }
      } catch {}
    }
  };

  return (
    <div
      className="cloud-list"
      onContextMenu={(e) => {
        if (e.target.closest(".cloud-row") || e.target.closest(".cloud-grid-item")) return;
        e.preventDefault();
        setBackgroundMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
        });
      }}
    >
      {viewMode === "list" ? (
        <>
          <div className="cloud-header">
            <div className="cloud-name">
              <input
                type="checkbox"
                className="cloud-selection-checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                title="Select all"
              />
              <span
                onClick={() => {
                  if (sortField === "name") setSortAsc(!sortAsc);
                  else {
                    setSortField("name");
                    setSortAsc(true);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                Name {sortField === "name" && (sortAsc ? "▲" : "▼")}
              </span>
            </div>

            <div
              onClick={() => {
                if (sortField === "size") setSortAsc(!sortAsc);
                else {
                  setSortField("size");
                  setSortAsc(true);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              Size {sortField === "size" && (sortAsc ? "▲" : "▼")}
            </div>

            <div
              onClick={() => {
                if (sortField === "modified") setSortAsc(!sortAsc);
                else {
                  setSortField("modified");
                  setSortAsc(false);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              Modified {sortField === "modified" && (sortAsc ? "▲" : "▼")}
            </div>

            <div className="cloud-actions" />
          </div>

          {children.length === 0 && (
            <div className="cloud-empty-state">
              <FolderOpen size={48} className="cloud-empty-icon" />
              <h3>This folder is empty</h3>
              <p>Drag & drop files here, or use the Upload button above.</p>
            </div>
          )}

          {children.map((item) => {
            const isCut =
              clipboard?.operation === "cut" &&
              (clipboard.relativePath === item.path ||
                (clipboard.items &&
                  clipboard.items.some((i) => i.path === item.path)));

            const isSelected = selectedItems.some(
              (selected) => selected.path === item.path,
            );

            return (
              <div
                key={item.path}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={(e) => handleDragOverFolder(e, item)}
                onDrop={(e) => handleDropOnFolder(e, item)}
                className={`cloud-row ${isCut ? "cloud-row--cut" : ""} ${
                  isSelected ? "cloud-row--selected" : ""
                }`}
                onDoubleClick={() => {
                  if (item.type === "folder") {
                    onNavigate(item.path);
                  } else {
                    onOpenFile(item.file);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    item,
                  });
                }}
              >
                <div className="cloud-name">
                  <input
                    type="checkbox"
                    className="cloud-selection-checkbox"
                    checked={isSelected}
                    onChange={() => handleItemSelection(item)}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {item.type === "folder"
                    ? "📁"
                    : item.name.toLowerCase().endsWith(".zip")
                      ? "🗜️"
                      : "📄"}

                  {renaming?.path === item.path ? (
                    <input
                      className="cloud-rename"
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={finishRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") finishRename();
                        if (e.key === "Escape") setRenaming(null);
                      }}
                    />
                  ) : (
                    <span className="cloud-name-text" title={item.name}>
                      {item.name}
                    </span>
                  )}
                </div>

                <div>
                  {item.type === "folder"
                    ? "--"
                    : item.file
                      ? formatSize(item.file.file_size)
                      : "--"}
                </div>

                <div>
                  {item.file?.updated_at
                    ? formatDate(item.file.updated_at)
                    : item.file?.created_at
                      ? formatDate(item.file.created_at)
                      : "--"}
                </div>

                <div className="cloud-actions">
                  <button
                    className="cloud-more"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenu({
                        visible: true,
                        x: rect.left,
                        y: rect.bottom + 4,
                        item,
                      });
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        /* Grid View Mode */
        <div className="cloud-grid">
          {children.length === 0 && (
            <div className="cloud-empty-state grid-empty">
              <FolderOpen size={48} className="cloud-empty-icon" />
              <h3>This folder is empty</h3>
              <p>Drag & drop files here, or use the Upload button above.</p>
            </div>
          )}

          {children.map((item) => {
            const isCut =
              clipboard?.operation === "cut" &&
              (clipboard.relativePath === item.path ||
                (clipboard.items &&
                  clipboard.items.some((i) => i.path === item.path)));

            const isSelected = selectedItems.some(
              (selected) => selected.path === item.path,
            );

            return (
              <div
                key={item.path}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragOver={(e) => handleDragOverFolder(e, item)}
                onDrop={(e) => handleDropOnFolder(e, item)}
                className={`cloud-grid-item ${isCut ? "cloud-row--cut" : ""} ${
                  isSelected ? "selected" : ""
                } ${item.type === "folder" ? "is-folder" : "is-file"}`}
                onDoubleClick={() => {
                  if (item.type === "folder") {
                    onNavigate(item.path);
                  } else {
                    onOpenFile(item.file);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    item,
                  });
                }}
              >
                <div className="grid-item-top">
                  <input
                    type="checkbox"
                    className="cloud-selection-checkbox"
                    checked={isSelected}
                    onChange={() => handleItemSelection(item)}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <button
                    className="grid-more-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenu({
                        visible: true,
                        x: rect.left,
                        y: rect.bottom + 4,
                        item,
                      });
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div className="grid-item-icon-area">
                  {getItemGridIcon(item)}
                </div>

                <div className="grid-item-info">
                  {renaming?.path === item.path ? (
                    <input
                      className="cloud-rename"
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={finishRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") finishRename();
                        if (e.key === "Escape") setRenaming(null);
                      }}
                    />
                  ) : (
                    <span className="grid-item-name" title={item.name}>
                      {item.name}
                    </span>
                  )}
                  <span className="grid-item-sub">
                    {item.type === "folder"
                      ? "Folder"
                      : item.file
                        ? formatSize(item.file.file_size)
                        : "File"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Item Context Menu */}
      <ContextMenu
        visible={menu.visible}
        x={menu.x}
        y={menu.y}
        onClose={() =>
          setMenu({
            visible: false,
            x: 0,
            y: 0,
            item: null,
          })
        }
        items={[
          {
            label: "Open",
            icon: FolderOpen,
            onClick: () => {
              if (menu.item?.type === "folder") {
                onNavigate(menu.item.path);
              } else {
                onOpenFile(menu.item.file);
              }
            },
          },

          {
            label: "Copy",
            icon: Copy,
            onClick: () => {
              onCopy(menu.item);
            },
          },

          {
            label: "Cut",
            icon: Scissors,
            onClick: () => {
              onCut(menu.item);
            },
          },

          {
            label: "Paste",
            icon: ClipboardPaste,
            disabled: !clipboard,
            onClick: () => {
              let destination;
              if (menu.item.type === "folder") {
                destination = menu.item.path;
              } else {
                const lastSlash = menu.item.path.lastIndexOf("/");
                destination =
                  lastSlash === -1
                    ? ""
                    : menu.item.path.substring(0, lastSlash);
              }
              onPaste(destination);
            },
          },

          ...(onCompressItem
            ? [
                {
                  label: "Compress to Zip",
                  icon: Archive,
                  onClick: () => {
                    onCompressItem(menu.item);
                  },
                },
              ]
            : []),

          ...(menu.item?.name?.toLowerCase().endsWith(".zip") && adapter.extractArchive
            ? [
                {
                  label: "Extract Here",
                  icon: FolderOpen,
                  onClick: async () => {
                    try {
                      toast.info("Extracting archive...");
                      await adapter.extractArchive(
                        workspaceId,
                        menu.item.path,
                        currentFolder,
                      );
                      toast.success(
                        "Extracted",
                        "Archive extracted successfully.",
                      );
                      await refresh();
                      onStorageChange?.();
                    } catch (err) {
                      toast.error(
                        "Extraction Failed",
                        err.response?.data?.message || err.message,
                      );
                    }
                  },
                },
              ]
            : []),

          ...(onExportItem
            ? [
                {
                  label: "Export to Cloud",
                  icon: CloudUpload,
                  onClick: () => {
                    onExportItem(menu.item);
                  },
                },
              ]
            : []),

          {
            label: "Download",
            icon: Download,
            disabled: menu.item?.type === "folder",
            onClick: async () => {
              await downloadFile(menu.item.file.id);
            },
          },
          {
            label: "Rename",
            icon: Pencil,
            onClick: () => {
              setRenaming(menu.item);
              setRenameValue(menu.item.name);
            },
          },
          ...(onShowProperties
            ? [
                {
                  label: "Properties",
                  icon: Info,
                  onClick: () => {
                    onShowProperties(menu.item);
                  },
                },
              ]
            : []),
          {
            label: "Delete",
            icon: Trash2,
            onClick: () => {
              if (onDeleteItem) {
                onDeleteItem(menu.item);
              }
            },
          },
        ]}
      />

      {/* Background Context Menu */}
      <ContextMenu
        visible={backgroundMenu.visible}
        x={backgroundMenu.x}
        y={backgroundMenu.y}
        onClose={() =>
          setBackgroundMenu({
            visible: false,
            x: 0,
            y: 0,
          })
        }
        items={[
          {
            label: "Paste Here",
            icon: ClipboardPaste,
            disabled: !clipboard,
            onClick: () => onPaste(currentFolder),
          },
        ]}
      />
    </div>
  );
}
