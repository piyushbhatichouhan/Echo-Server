import React, { useState } from "react";
import Modal from "../../common/modal/modal";
import Button from "../../common/button/button";
import { FileText, CheckCircle2, AlertCircle } from "lucide-react";

export default function BulkEnvModal({ open, onClose, onImport }) {
  const [content, setContent] = useState("");
  const [parsingError, setParsingError] = useState("");
  const [importing, setImporting] = useState(false);

  if (!open) return null;

  const parseEnv = (text) => {
    const lines = text.split("\n");
    const result = [];
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;

      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) {
        continue;
      }

      let key = line.slice(0, eqIndex).trim();
      let value = line.slice(eqIndex + 1).trim();

      // Remove surrounding quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key) {
        result.push({ key, value });
      }
    }
    return result;
  };

  const parsedVars = parseEnv(content);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parsedVars.length === 0) {
      setParsingError("No valid KEY=VALUE pairs found. Please check format.");
      return;
    }

    try {
      setImporting(true);
      await onImport(parsedVars);
      setContent("");
      setParsingError("");
      onClose();
    } catch (err) {
      setParsingError(err.message || "Failed to import variables.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setContent("");
        setParsingError("");
        onClose();
      }}
      title="Bulk Import Environment Variables"
    >
      <form onSubmit={handleSubmit} className="eh-env-modal">
        <p style={{ color: "var(--eh-text-secondary, #a1a1aa)", fontSize: "0.9rem", margin: 0 }}>
          Paste raw <code>.env</code> file contents below. Comments and empty lines will be automatically skipped.
        </p>

        <textarea
          rows={10}
          placeholder={`# Paste .env contents here\nDATABASE_URL=postgres://...\nJWT_SECRET=mysecretkey\nPORT=3000`}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setParsingError("");
          }}
          style={{
            fontFamily: "monospace",
            fontSize: "0.85rem",
            lineHeight: "1.4",
          }}
        />

        {parsingError && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#ef4444", fontSize: "0.85rem" }}>
            <AlertCircle size={16} />
            <span>{parsingError}</span>
          </div>
        )}

        {parsedVars.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981", fontSize: "0.85rem" }}>
            <CheckCircle2 size={16} />
            <span>Parsed {parsedVars.length} variable{parsedVars.length === 1 ? "" : "s"} ready to import</span>
          </div>
        )}

        <div className="eh-modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setContent("");
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={parsedVars.length === 0 || importing}
            loading={importing}
          >
            Import {parsedVars.length > 0 ? `(${parsedVars.length})` : ""}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
