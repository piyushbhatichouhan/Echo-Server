import { useEffect, useState } from "react";
import Button from "../../../common/button/button";

import "./ImageViewer.css";

export default function ImageViewer({ file, adapter, onBack, onDownload }) {
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    let url;

    const load = async () => {
      const { blob } = await adapter.getFileBlob(file.id);

      url = URL.createObjectURL(blob);

      setImageUrl(url);
    };

    load();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file, adapter]);

  return (
    <div className="eh-file-viewer">
      <div className="eh-file-viewer-header">
        <Button onClick={onBack}>← Back</Button>

        <h2>{file.original_name}</h2>

        <Button onClick={onDownload}>Download</Button>
      </div>

      <div className="eh-image-viewer">
        <div className="eh-image-container">
          {imageUrl && (
            <img src={imageUrl} alt={file.original_name} draggable={false} />
          )}
        </div>
      </div>
    </div>
  );
}
