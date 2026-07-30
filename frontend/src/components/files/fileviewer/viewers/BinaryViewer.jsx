import Button from "../../../common/Button/Button";

export default function BinaryViewer({ file, onBack, onDownload }) {
  return (
    <div className="eh-file-viewer">
      <div className="eh-file-viewer-header">
        <Button onClick={onBack}>← Back</Button>

        <h2>{file.original_name}</h2>
      </div>

      <div className="eh-binary-viewer">
        <h1>📦 Binary File</h1>

        <p>This file cannot be displayed as text.</p>

        <Button onClick={onDownload}>Download File</Button>
      </div>
    </div>
  );
}
