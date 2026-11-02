import { useState, useMemo } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, HardDrive, Layers } from "lucide-react";
import "./FolderTreeSidebar.css";

// Build a clean tree of directories from flat files list
function buildDirectoryTree(files) {
  const root = { name: "Root", path: "", children: {}, isDirectory: true };

  files.forEach((file) => {
    // Only process folders or files with folder paths
    const rel = file.relative_path || "";
    if (!rel) return;

    const parts = rel.split("/").filter(Boolean);
    // If it's a file, we only care about its parent folders
    const folderParts = file.is_directory ? parts : parts.slice(0, -1);

    let current = root;
    let accumulatedPath = "";

    folderParts.forEach((part) => {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: accumulatedPath,
          children: {},
          isDirectory: true,
        };
      }
      current = current.children[part];
    });
  });

  return root;
}

function TreeNode({
  node,
  currentFolder,
  onNavigate,
  onDropOnFolder,
  expandedPaths,
  toggleExpand,
}) {
  const [dragOver, setDragOver] = useState(false);
  const childrenArray = Object.values(node.children);
  const hasChildren = childrenArray.length > 0;
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = currentFolder === node.path;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragOver) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    onDropOnFolder?.(node.path);
  };

  return (
    <div className="tree-node-wrapper">
      <div
        className={`tree-node-row ${isSelected ? "selected" : ""} ${
          dragOver ? "drag-target" : ""
        }`}
        onClick={() => onNavigate(node.path)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span
          className="tree-expand-icon"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(node.path);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span className="tree-spacer" />
          )}
        </span>

        <span className="tree-folder-icon">
          {isSelected || isExpanded ? (
            <FolderOpen size={16} />
          ) : (
            <Folder size={16} />
          )}
        </span>

        <span className="tree-folder-name" title={node.name}>
          {node.name}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-node-children">
          {childrenArray.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              currentFolder={currentFolder}
              onNavigate={onNavigate}
              onDropOnFolder={onDropOnFolder}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FolderTreeSidebar({
  files,
  currentFolder,
  onNavigate,
  onDropOnFolder,
  isOpen = true,
  onClose,
}) {
  const [expandedPaths, setExpandedPaths] = useState(new Set([""]));

  const tree = useMemo(() => buildDirectoryTree(files), [files]);

  const toggleExpand = (path) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <aside className="folder-tree-sidebar">
      <div className="folder-tree-header">
        <div className="folder-tree-title">
          <Layers size={16} className="sidebar-title-icon" />
          <span>Directories</span>
        </div>
        {onClose && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            title="Hide directory tree"
          >
            ✕
          </button>
        )}
      </div>

      <div className="folder-tree-body">
        {/* Root Directory Node */}
        <TreeNode
          node={tree}
          currentFolder={currentFolder}
          onNavigate={onNavigate}
          onDropOnFolder={onDropOnFolder}
          expandedPaths={expandedPaths}
          toggleExpand={toggleExpand}
        />
      </div>
    </aside>
  );
}
