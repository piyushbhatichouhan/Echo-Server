import { useState, useEffect } from "react";
import Button from "../../../common/button/button";
import CodeEditor from "../../../common/CodeEditor/CodeEditor";
import { ArrowLeft, Save, Download, Eye, Edit3, Columns } from "lucide-react";
import "./MarkdownViewer.css";

// Lightweight markdown renderer function that doesn't need external heavy markdown library
function renderMarkdown(md) {
  if (!md) return "";

  let html = md
    // Escape raw HTML tags for safety
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks: ```lang ... ```
  html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gim, (match, lang, code) => {
    return `<pre class="md-pre"><code class="md-code-block">${code.trim()}</code></pre>`;
  });

  // Inline code: `...`
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Headings: # to ######
  html = html.replace(/^###### (.*$)/gim, '<h6 class="md-h6">$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5 class="md-h5">$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>');

  // Blockquotes: > text
  html = html.replace(/^\> (.*$)/gim, '<blockquote class="md-blockquote">$1</blockquote>');

  // Horizontal rules: --- or ***
  html = html.replace(/^(?:---|\*\*\*|___)\s*$/gim, '<hr class="md-hr" />');

  // Bold & Italic: ***text***
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold: **text** or __text__
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

  // Unordered list items: - item or * item
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li class="md-li">$1</li>');

  // Paragraphs & Line breaks
  const lines = html.split("\n");
  const parsedLines = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith('<li class="md-li">')) {
      if (!inList) {
        parsedLines.push('<ul class="md-ul">');
        inList = true;
      }
      parsedLines.push(line);
    } else {
      if (inList) {
        parsedLines.push('</ul>');
        inList = false;
      }
      if (
        line.trim() &&
        !line.startsWith('<h') &&
        !line.startsWith('<pre') &&
        !line.startsWith('</pre') &&
        !line.startsWith('<blockquote') &&
        !line.startsWith('<hr')
      ) {
        parsedLines.push(`<p class="md-p">${line}</p>`);
      } else {
        parsedLines.push(line);
      }
    }
  }

  if (inList) {
    parsedLines.push('</ul>');
  }

  return parsedLines.join("\n");
}

export default function MarkdownViewer({
  file,
  content,
  dirty,
  saving,
  onChange,
  onSave,
  onBack,
  onDownload,
}) {
  const [viewMode, setViewMode] = useState("split"); // 'edit', 'split', 'preview'

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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dirty, onSave]);

  const renderedHtml = renderMarkdown(content);

  return (
    <div className="eh-file-viewer md-viewer-root">
      <div className="eh-file-viewer-header">
        <div className="eh-file-viewer-left">
          <Button onClick={onBack}>
            <ArrowLeft size={16} /> Back
          </Button>

          <div className="eh-file-viewer-info">
            <h2>
              {file.original_name}
              {dirty && <div className="eh-editor-dirty">● Unsaved</div>}
            </h2>
            <span className="md-badge">Markdown Document</span>
          </div>
        </div>

        <div className="eh-file-viewer-actions">
          {/* Mode Switcher */}
          <div className="md-mode-switch">
            <button
              type="button"
              className={`md-switch-btn ${viewMode === "edit" ? "active" : ""}`}
              onClick={() => setViewMode("edit")}
              title="Editor only"
            >
              <Edit3 size={15} /> Edit
            </button>
            <button
              type="button"
              className={`md-switch-btn ${viewMode === "split" ? "active" : ""}`}
              onClick={() => setViewMode("split")}
              title="Split view (Side-by-side)"
            >
              <Columns size={15} /> Split
            </button>
            <button
              type="button"
              className={`md-switch-btn ${viewMode === "preview" ? "active" : ""}`}
              onClick={() => setViewMode("preview")}
              title="Preview only"
            >
              <Eye size={15} /> Preview
            </button>
          </div>

          {dirty && (
            <Button onClick={onSave} loading={saving}>
              <Save size={16} /> Save
            </Button>
          )}

          <Button variant="secondary" onClick={onDownload}>
            <Download size={16} /> Download
          </Button>
        </div>
      </div>

      <div className={`md-body-container mode-${viewMode}`}>
        {(viewMode === "edit" || viewMode === "split") && (
          <div className="md-pane md-editor-pane">
            <CodeEditor
              value={content}
              language="markdown"
              onChange={onChange}
            />
          </div>
        )}

        {(viewMode === "preview" || viewMode === "split") && (
          <div className="md-pane md-preview-pane">
            <div
              className="md-rendered-content"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
