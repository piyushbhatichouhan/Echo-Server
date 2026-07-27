import "./FileTreeNode.css";

import { useState } from "react";

import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";

export default function FileTreeNode({
  node,
  onOpen,
  selectedFile,
  onCreateFile,
  onDelete,
  onRename,

  renaming,
  renameValue,
  setRenameValue,
  refresh,
  setRenaming,
  workspaceId,
  adapter,
}) {
  const { renameFile } = adapter;

  const [open, setOpen] = useState(true);
  const finishRename = async () => {
    if (!renaming) return;

    let newName = renameValue.trim();

    console.log("=== RENAME START ===");
    console.log("Renaming:", renaming);
    console.log("New name:", newName);

    if (!newName) {
      setRenaming(null);
      return;
    }

    if (renaming.type === "file" && renaming.oldPath.includes(".")) {
      const ext = "." + renaming.oldPath.split(".").pop();

      if (!newName.endsWith(ext)) {
        newName += ext;
      }
    }

    const parts = renaming.oldPath.split("/");

    parts[parts.length - 1] = newName;

    const newPath = parts.join("/");
    console.log("before if workspace ");

    if (workspaceId) {
      console.log("after if workspace");
      await renameFile(
        renaming.workspaceId,
        renaming.oldPath,
        newPath,
        renaming.type,
      );
    } else {
      await renameFile(renaming.file.id, newName);
    }

    await refresh();

    setRenaming(null);
  };

  if (node.type === "file") {
    return (
      <div
        className={`eh-tree-file ${
          selectedFile?.id === node.file.id ? "active" : ""
        }`}
        onClick={() => onOpen(node.file)}
      >
        <File size={16} />

        {renaming?.oldPath === node.path ? (
          <input
            className="eh-tree-rename"
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
          <span className="eh-tree-label">{node.name}</span>
        )}

        <div className="eh-tree-actions">
          <button
            className="eh-tree-action"
            onClick={(e) => {
              e.stopPropagation();
              console.log(renaming);
              if (workspaceId) {
                onRename(node.path, node.type);
              } else {
                setRenaming({
                  workspaceId,
                  file: node.file,
                  oldPath: node.path,
                  type: node.type,
                });
                console.log("Clicked rename");
                console.log(node.file);
                setRenameValue(node.name);
              }
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            className="eh-tree-action"
            onClick={(e) => {
              e.stopPropagation();

              if (window.confirm(`Delete "${node.name}"?`)) {
                if (workspaceId) {
                  onDelete(node.path, node.type);
                } else {
                  onDelete(node.file);
                }
              }
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="eh-tree-folder">
      <div className="eh-tree-folder-header" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}

        {open ? <FolderOpen size={16} /> : <Folder size={16} />}

        {renaming?.oldPath === node.path ? (
          <input
            className="eh-tree-rename"
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
          <span className="eh-tree-label">{node.name}</span>
        )}

        <div className="eh-tree-actions">
          <button
            className="eh-tree-action"
            onClick={(e) => {
              e.stopPropagation();
              onCreateFile(node.path);
            }}
          >
            <Plus size={14} />
          </button>
          <button
            className="eh-tree-action"
            onClick={(e) => {
              e.stopPropagation();
              console.log(renaming);
              if (workspaceId) {
                onRename(node.path, node.type);
              } else {
                setRenaming({
                  workspaceId,
                  file: node.file,
                  oldPath: node.path,
                  type: node.type,
                });
                console.log("Clicked rename");
                console.log(node.file);
                setRenameValue(node.name);
              }
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            className="eh-tree-action"
            onClick={(e) => {
              e.stopPropagation();

              if (window.confirm(`Delete "${node.name}"?`)) {
                if (workspaceId) {
                  onDelete(node.path, node.type);
                } else {
                  onDelete(node.file);
                }
              }
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div className="eh-tree-children">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.name}
              node={child}
              onOpen={onOpen}
              selectedFile={selectedFile}
              onCreateFile={onCreateFile}
              onDelete={onDelete}
              onRename={onRename}
              renaming={renaming}
              renameValue={renameValue}
              setRenameValue={setRenameValue}
              refresh={refresh}
              setRenaming={setRenaming}
              workspaceId={workspaceId}
              adapter={adapter}
            />
          ))}
        </div>
      )}
    </div>
  );
}
