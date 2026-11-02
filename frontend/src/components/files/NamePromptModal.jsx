import { useState, useEffect, useRef } from "react";
import Modal from "../common/modal/modal";
import Button from "../common/button/button";
import { FolderPlus, FilePlus, Archive, Pencil, Folder, File, Sparkles } from "lucide-react";
import "./NamePromptModal.css";

const EXTENSION_BADGES = {
  js: { label: "JavaScript", color: "#f7df1e", bg: "rgba(247, 223, 30, 0.15)" },
  jsx: { label: "React JSX", color: "#61dafb", bg: "rgba(97, 218, 251, 0.15)" },
  ts: { label: "TypeScript", color: "#3178c6", bg: "rgba(49, 120, 198, 0.15)" },
  tsx: { label: "React TSX", color: "#3178c6", bg: "rgba(49, 120, 198, 0.15)" },
  json: { label: "JSON Data", color: "#e2b340", bg: "rgba(226, 179, 64, 0.15)" },
  css: { label: "Stylesheet", color: "#264de4", bg: "rgba(38, 77, 228, 0.15)" },
  scss: { label: "SCSS Styles", color: "#c69", bg: "rgba(204, 102, 153, 0.15)" },
  html: { label: "HTML Document", color: "#e34f26", bg: "rgba(227, 79, 38, 0.15)" },
  md: { label: "Markdown", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
  py: { label: "Python", color: "#3572a5", bg: "rgba(53, 114, 165, 0.15)" },
  zip: { label: "Zip Archive", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
  env: { label: "Environment", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
  sql: { label: "SQL Query", color: "#e38c00", bg: "rgba(227, 140, 0, 0.15)" },
};

export default function NamePromptModal({
  isOpen,
  onClose,
  onSubmit,
  type = "file", // "folder" | "file" | "archive" | "rename"
  initialValue = "",
  currentPath = "",
  itemCount = 1,
  title,
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const defaultVal = initialValue || (type === "archive" ? "archive.zip" : "");
      setValue(defaultVal);
      setError("");

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // If editing a filename with extension, select just the name part
          if (defaultVal.includes(".")) {
            const dotIdx = defaultVal.lastIndexOf(".");
            inputRef.current.setSelectionRange(0, dotIdx);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isOpen, initialValue, type]);

  if (!isOpen) return null;

  const getDialogConfig = () => {
    switch (type) {
      case "folder":
        return {
          title: title || "New Folder",
          icon: <FolderPlus size={24} />,
          badgeClass: "badge-folder",
          actionText: "Create Folder",
          placeholder: "e.g. components, assets, api",
          hint: currentPath ? `Creating in /${currentPath}` : "Creating in root directory",
        };
      case "archive":
        return {
          title: title || "Compress to Zip Archive",
          icon: <Archive size={24} />,
          badgeClass: "badge-archive",
          actionText: "Create Archive",
          placeholder: "archive.zip",
          hint: `Compressing ${itemCount} selected item(s) in /${currentPath || "root"}`,
        };
      case "rename":
        return {
          title: title || "Rename Item",
          icon: <Pencil size={24} />,
          badgeClass: "badge-rename",
          actionText: "Rename",
          placeholder: "Enter new name",
          hint: currentPath ? `Located in /${currentPath}` : "Located in root directory",
        };
      case "file":
      default:
        return {
          title: title || "New File",
          icon: <FilePlus size={24} />,
          badgeClass: "badge-file",
          actionText: "Create File",
          placeholder: "e.g. index.js, styles.css, README.md",
          hint: currentPath ? `Creating in /${currentPath}` : "Creating in root directory",
        };
    }
  };

  const config = getDialogConfig();

  // Detect file extension for badges
  const extMatch = value.trim().match(/\.([a-z0-9]+)$/i);
  const detectedExt = extMatch ? extMatch[1].toLowerCase() : "";
  const extBadge = EXTENSION_BADGES[detectedExt];

  const validate = (val) => {
    const trimmed = val.trim();
    if (!trimmed) {
      return "Name cannot be empty.";
    }
    // Disallow path traversal and invalid characters
    if (/[\\:*?"<>|]/.test(trimmed)) {
      return 'Name cannot contain characters like \\ : * ? " < > |';
    }
    if (trimmed.includes("/")) {
      return "Name cannot contain slashes. Use folders to organize.";
    }
    if (trimmed === "." || trimmed === "..") {
      return "Invalid file or folder name.";
    }
    return "";
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    let finalName = value.trim();
    if (type === "archive" && !finalName.toLowerCase().endsWith(".zip")) {
      finalName += ".zip";
    }

    const validationError = validate(finalName);
    if (validationError) {
      setError(validationError);
      return;
    }

    onSubmit(finalName);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.title}>
      <form onSubmit={handleSubmit} className="name-prompt-form">
        <div className="name-prompt-top">
          <div className={`name-prompt-icon-avatar ${config.badgeClass}`}>
            {config.icon}
          </div>
          <div className="name-prompt-meta">
            <span className="name-prompt-hint">{config.hint}</span>
            {extBadge && (
              <span
                className="name-prompt-ext-badge"
                style={{ color: extBadge.color, backgroundColor: extBadge.bg }}
              >
                {extBadge.label}
              </span>
            )}
          </div>
        </div>

        <div className="name-prompt-input-group">
          <label className="name-prompt-label">
            {type === "folder"
              ? "Folder Name"
              : type === "archive"
                ? "Archive Name"
                : "File Name"}
          </label>
          <div className={`name-prompt-input-wrapper ${error ? "has-error" : ""}`}>
            <input
              ref={inputRef}
              type="text"
              className="name-prompt-input"
              placeholder={config.placeholder}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onClose();
                }
              }}
            />
          </div>
          {error ? (
            <span className="name-prompt-error">{error}</span>
          ) : (
            type === "file" && (
              <span className="name-prompt-sub-hint">
                Tip: Include the extension (e.g. <code>.js</code>, <code>.html</code>, <code>.md</code>)
              </span>
            )
          )}
        </div>

        <div className="name-prompt-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {config.actionText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
