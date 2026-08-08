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
}) {
  const { downloadFile, deletePath, renamePath } = adapter;

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

  const children = getFolderChildren(tree, currentFolder);

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

  return (
    <div
      className="cloud-list"
      onContextMenu={(e) => {
        // only if user clicked empty space
        if (e.target !== e.currentTarget) return;

        e.preventDefault();

        setBackgroundMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
        });
      }}
    >
      <div className="cloud-header">
        <div>Name</div>
        <div>Size</div>
        <div>Modified</div>
        <div></div>
      </div>

      {children.map((item) => {
        const isCut =
          clipboard?.operation === "cut" &&
          clipboard.relativePath === item.path;

        return (
          <div
            key={item.path}
            className={`cloud-row ${isCut ? "cloud-row--cut" : ""}`}
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
            onClick: () => {
              onCopy(menu.item);
            },
          },

          {
            label: "Cut",
            onClick: () => {
              onCut(menu.item);
            },
          },

          {
            label: "Paste",
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

              await deletePath(workspaceId, menu.item);

              await refresh();
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
            disabled: !clipboard,
            onClick: () => onPaste(currentFolder),
          },
        ]}
      />
    </div>
  );
}
