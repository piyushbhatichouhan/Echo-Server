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
} from "lucide-react";
import { useToast } from "../../../context/ToastContext";
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
    return new Date(date).toLocaleDateString();
  };

  const finishRename = async () => {
    if (!renaming) return;

    let newName = renameValue.trim();

    if (!newName) {
      setRenaming(null);
      return;
    }

    if (renaming.type === "file" && renaming.name.includes(".")) {
      const ext = "." + renaming.name.split(".").pop();

      if (!newName.endsWith(ext)) {
        newName += ext;
      }
    }

    await renamePath(workspaceId, renaming, newName);

    await refresh();

    setRenaming(null);
  };

  const handleItemSelection = (item) => {
    const alreadySelected = selectedItems.some(
      (selected) => selected.path === item.path,
    );

    if (alreadySelected) {
      onSelectionChange(
        selectedItems.filter((selected) => selected.path !== item.path),
      );
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  };
  return (
    <div
      className="cloud-list"
      onContextMenu={(e) => {
        e.preventDefault();

        // Only show background menu if the click
        // wasn't on an actual file/folder row.
        if (e.target.closest(".cloud-row")) {
          return;
        }

        setBackgroundMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSelectionChange([]);
        }
      }}
    >
      <div className="cloud-header">
        <div
          style={{ cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}
          onClick={() => {
            if (sortField === "name") setSortAsc(!sortAsc);
            else {
              setSortField("name");
              setSortAsc(true);
            }
          }}
        >
          Name {sortField === "name" ? (sortAsc ? "▲" : "▼") : ""}
        </div>
        <div
          style={{ cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}
          onClick={() => {
            if (sortField === "size") setSortAsc(!sortAsc);
            else {
              setSortField("size");
              setSortAsc(true);
            }
          }}
        >
          Size {sortField === "size" ? (sortAsc ? "▲" : "▼") : ""}
        </div>
        <div
          style={{ cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center", gap: 4 }}
          onClick={() => {
            if (sortField === "modified") setSortAsc(!sortAsc);
            else {
              setSortField("modified");
              setSortAsc(true);
            }
          }}
        >
          Modified {sortField === "modified" ? (sortAsc ? "▲" : "▼") : ""}
        </div>
        <div></div>
      </div>

      {children.map((item) => {
        const isCut =
          clipboard?.operation === "cut" &&
          clipboard.relativePath === item.path;

        const isSelected = selectedItems.some(
          (selected) => selected.path === item.path,
        );

        return (
          <div
            key={item.path}
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
                checked={selectedItems.some(
                  (selected) => selected.path === item.path,
                )}
                onChange={() => handleItemSelection(item)}
                onClick={(e) => e.stopPropagation()}
              />

              {item.type === "folder" ? "📁" : "📄"}

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
                item.name
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
              {item.file?.updated_at ? formatDate(item.file.updated_at) : "--"}
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
                // Paste inside the folder
                destination = menu.item.path;
              } else {
                // Paste beside the file
                const lastSlash = menu.item.path.lastIndexOf("/");

                destination =
                  lastSlash === -1
                    ? ""
                    : menu.item.path.substring(0, lastSlash);
              }

              onPaste(destination);
            },
          },

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
          {
            label: "Delete",
            icon: Trash2,
            onClick: async () => {
              if (!window.confirm(`Delete "${menu.item.name}"?`)) {
                return;
              }

              try {
                await deletePath(workspaceId, menu.item);

                toast.success(
                  "Deleted",
                  `${menu.item.name} deleted successfully`,
                );
              } catch (error) {
                toast.error(
                  "Delete Failed",
                  error.response?.data?.message || error.message,
                );
              }

              await refresh();
              onStorageChange?.();
            },
          },
        ]}
      />
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
            label: "Paste",
            icon: ClipboardPaste,
            disabled: !clipboard,
            onClick: () => onPaste(currentFolder),
          },
        ]}
      />
    </div>
  );
}
