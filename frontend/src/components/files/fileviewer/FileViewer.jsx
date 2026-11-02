import { getFileType } from "../../../utils/fileType";

import ImageViewer from "./viewers/ImageViewer";
import BinaryViewer from "./viewers/BinaryViewer";
import CodeViewer from "./viewers/CodeViewer";
import PdfViewer from "./viewers/PdfViewer";
import MediaViewer from "./viewers/MediaViewer";
import MarkdownViewer from "./viewers/MarkdownViewer";

export default function FileViewer(props) {
  const type = getFileType(props.file.original_name);

  switch (type) {
    case "text":
      return <CodeViewer {...props} />;
    case "markdown":
      return <MarkdownViewer {...props} />;
    case "video":
      return <MediaViewer {...props} isVideo={true} />;
    case "audio":
      return <MediaViewer {...props} isVideo={false} />;
    case "image":
      return <ImageViewer {...props} />;
    case "pdf":
      return <PdfViewer {...props} />;
    default:
      return <BinaryViewer {...props} />;
  }
}
