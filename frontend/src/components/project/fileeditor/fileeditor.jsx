import "./fileeditor.css";

import Card from "../../common/Card/Card";
import Button from "../../common/Button/Button";
import CodeEditor from "./CodeEditor";
import { ArrowLeft, Save, Download, Trash2 } from "lucide-react";
import { getLanguageExtension } from "../../../utils/fileLanguage";

export default function FileEditor({
  file,
  content,
  onChange,
  onSave,
  onDownload,
  onDelete,
  onBack,
  dirty,
}) {
  return (
    <Card>
      <div className="eh-editor">
        <div className="eh-editor-top">
          <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>
            Workspace
          </Button>

          <div className="eh-editor-path">{file.relative_path}</div>

          {dirty && <div className="eh-editor-dirty">● Unsaved</div>}
        </div>

        <div className="eh-editor-toolbar">
          <Button onClick={onSave}>Save</Button>

          <Button onClick={onDownload}>Download</Button>

          <Button variant="secondary" onClick={onBack}>
            Close
          </Button>
        </div>

        <div className="eh-editor-body">
          <CodeEditor
            value={content}
            onChange={onChange}
            onSave={onSave}
            extensions={[getLanguageExtension(file.original_name)]}
          />
        </div>
      </div>
    </Card>
  );
}
