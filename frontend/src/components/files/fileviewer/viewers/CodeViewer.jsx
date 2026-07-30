import "./CodeViewer.css";

import Button from "../../../common/Button/Button";
import CodeEditor from "../../../common/CodeEditor/CodeEditor";
import getLanguageFromFile from "../../../../utils/getLanguageFromFile";
import { useEffect } from "react";

export default function CodeViewer({
  file,
  content,
  dirty,
  saving,
  onChange,
  onSave,
  onBack,
  onDownload,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();

        if (dirty) {
          onSave();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dirty, onSave]);

  return (
    <div className="eh-file-viewer">
      <div className="eh-file-viewer-header">
        <div className="eh-file-viewer-left">
          <Button onClick={onBack}>← Back</Button>

          <div className="eh-file-viewer-info">
            <h2>
              {file.original_name}
              {dirty && <div className="eh-editor-dirty">● Unsaved</div>}
            </h2>
            {/* <span>{file.mime_type || "Text File"}</span> */}
          </div>
        </div>

        <div className="eh-file-viewer-actions">
          {dirty && (
            <Button onClick={onSave} loading={saving}>
              Save
            </Button>
          )}

          <Button variant="secondary" onClick={onDownload}>
            Download
          </Button>
        </div>
      </div>

      <div className="eh-code-viewer">
        <CodeEditor
          language={getLanguageFromFile(file.original_name)}
          value={content.content}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
