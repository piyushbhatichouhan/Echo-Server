import { useEffect, useState } from "react";
import Button from "../../../common/Button/Button";

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
  }, [file]);

  return (
    <div className="eh-file-viewer">
      <div className="eh-file-viewer-header">
        <Button onClick={onBack}>← Back</Button>

        <h2>{file.original_name}</h2>

        <Button onClick={onDownload}>Download</Button>
      </div>

      <div className="eh-image-viewer">
        {imageUrl && <img src={imageUrl} alt={file.original_name} />}
      </div>
    </div>
  );
}
