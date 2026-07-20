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

import { renameFile } from "../../../services/file.api";

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
  projectId,
}) {
  const [open, setOpen] = useState(true);
  const finishRename = async () => {
    if (!renaming) return;

    let newName = renameValue.trim();

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

    await renameFile(
      renaming.projectId,
      renaming.oldPath,
      newPath,
      renaming.type,
    );

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
              onRename(node.path, node.type);
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            className="eh-tree-action"
            onClick={(e) => {
              e.stopPropagation();

              if (window.confirm(`Delete "${node.name}"?`)) {
                onDelete(node.file);
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
              console.log(node);
              onRename(node.path, node.type);
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            className="eh-tree-action"
            onClick={(e) => {
              e.stopPropagation();

              if (window.confirm(`Delete "${node.name}"?`)) {
                onDelete(node.path, node.type);
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
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
