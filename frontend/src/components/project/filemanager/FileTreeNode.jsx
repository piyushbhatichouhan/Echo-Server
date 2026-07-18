import "./FileTreeNode.css";

import { useState } from "react";

import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
} from "lucide-react";

export default function FileTreeNode({ node, onOpen, selectedFile }) {
  const [open, setOpen] = useState(true);

  if (node.type === "file") {
    return (
      <div
        className={`eh-tree-file ${
          selectedFile?.id === node.file.id ? "active" : ""
        }`}
        onClick={() => onOpen(node.file)}
      >
        <File size={16} />

        <span className="eh-tree-label">{node.name}</span>
      </div>
    );
  }

  return (
    <div className="eh-tree-folder">
      <div className="eh-tree-folder-header" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}

        {open ? <FolderOpen size={16} /> : <Folder size={16} />}

        <span className="eh-tree-label">{node.name}</span>
      </div>

      {open && (
        <div className="eh-tree-children">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.name}
              node={child}
              onOpen={onOpen}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
