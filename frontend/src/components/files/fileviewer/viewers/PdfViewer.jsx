import { Document, Page } from "react-pdf";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, FileText } from "lucide-react";

import "./PdfViewer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

import { pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfViewer({ adapter, file, onBack }) {
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    let objectUrl;

    const load = async () => {
      const result = await adapter.getFileBlob(file.id);

      const blob = result instanceof Blob ? result : result?.blob;

      objectUrl = URL.createObjectURL(blob);

      setPdfUrl(objectUrl);
    };

    load();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [adapter, file]);

  return (
    <div className="pdf-viewer">
      <div className="pdf-toolbar">
        <button className="pdf-back" onClick={onBack}>
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="pdf-title">
          <FileText size={18} />
          <span>{file.original_name}</span>
        </div>

        <div className="pdf-nav">
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
          >
            <ChevronLeft size={18} />
          </button>

          <span>
            Page {pageNumber} of {pageCount}
          </span>

          <button
            disabled={pageNumber >= pageCount}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="pdf-document">
        {pdfUrl && (
          <Document
            file={pdfUrl}
            loading={<div className="pdf-loading">Loading PDF...</div>}
            onLoadSuccess={({ numPages }) => {
              setPageCount(numPages);
              setPageNumber(1);
            }}
          >
            <Page pageNumber={pageNumber} width={900} />
          </Document>
        )}
      </div>
    </div>
  );
}
