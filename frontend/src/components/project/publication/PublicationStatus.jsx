import "./PublicationStatus.css";

import Button from "../../common/button/button";

const formatStatus = (value) => {
  if (!value) return "Unknown";

  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function PublicationStatus({
  publication,
  loading,
  onPublish,
  onUnpublish,
}) {
  if (loading) {
    return (
      <div className="publication-card">
        <h3>Publication</h3>
        <p>Loading publication...</p>
      </div>
    );
  }

  if (!publication) {
    return (
      <div className="publication-card">
        <div className="publication-header">
          <div>
            <h3>Publication</h3>
            <p>This project is not currently published.</p>
          </div>
        </div>

        <div className="publication-actions">
          <Button onClick={onPublish}>Publish Project</Button>
        </div>
      </div>
    );
  }

  const url = `https://${publication.hostname}`;

  return (
    <div className="publication-card">
      <div className="publication-header">
        <div>
          <h3>Publication</h3>
          <p>Public access information</p>
        </div>
      </div>

      <div className="publication-status-grid">
        <StatusItem label="Status" value={publication.publication_status} />

        <StatusItem
          label="Verification"
          value={publication.verification_status}
        />
      </div>

      <div className="publication-info">
        <span className="publication-label">Public URL</span>

        <div className="publication-box publication-link">
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        </div>
      </div>

      <div className="publication-actions">
        <Button onClick={() => window.open(url, "_blank")}>Open Site</Button>

        <Button
          variant="secondary"
          onClick={() => navigator.clipboard.writeText(url)}
        >
          Copy URL
        </Button>

        <Button variant="danger" onClick={onUnpublish}>
          Unpublish
        </Button>
      </div>
    </div>
  );
}

function StatusItem({ label, value }) {
  return (
    <div className="publication-status-item">
      <span className="publication-status-label">{label}</span>

      <div className={`status-badge status-${value}`}>
        <span className="status-dot" />
        {formatStatus(value)}
      </div>
    </div>
  );
}
