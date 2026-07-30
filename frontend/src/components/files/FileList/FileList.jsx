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
} from "lucide-react";

export default function CloudFileList({
  files,
  currentFolder,
  onNavigate,
  onOpenFile,
  adapter,
  refresh,
}) {
  const { downloadFile, renameFile, deleteFile, deleteFolder } = adapter;

  const [menu, setMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    item: null,
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

    await renameFile(renaming.file.id, newName);

    await refresh();

    setRenaming(null);
  };

  return (
    <div className="cloud-list">
      <div className="cloud-header">
        <div>Name</div>
        <div>Size</div>
        <div>Modified</div>
        <div></div>
      </div>

      {children.map((item) => (
        <div
          key={item.path}
          className="cloud-row"
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
      ))}

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
              if (menu.item.type === "folder") {
                onNavigate(menu.item.path);
              } else {
                onOpenFile(menu.item.file);
              }
            },
          },

          {
            label: "Download",
            icon: Download,
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

              if (menu.item.type === "folder") {
                await deleteFolder(menu.item.path);
              } else {
                await deleteFile(menu.item.file.id);
              }

              await refresh();
            },
          },
        ]}
      />
    </div>
  );
}
