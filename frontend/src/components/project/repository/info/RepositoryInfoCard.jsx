import { useState } from "react";
import "./RepositoryInfoCard.css";
import { FolderGit2, User, GitBranch, ExternalLink, Copy, Check, Shield } from "lucide-react";

export default function RepositoryInfoCard({ validation, repository }) {
  const [copied, setCopied] = useState(false);

  const info = validation || (repository ? {
    name: repository.repository_name,
    owner: repository.owner,
    branch: repository.branch || repository.default_branch || "main",
    defaultBranch: repository.default_branch || "main",
    cloneUrl: repository.clone_url,
    repoUrl: repository.repository_url,
    visibility: repository.access_token ? "Private" : "Public",
  } : null);

  if (!info) return null;

  const repoUrl = info.repoUrl || (info.owner && info.name ? `https://github.com/${info.owner}/${info.name}` : null);

  const handleCopy = () => {
    if (info.cloneUrl) {
      navigator.clipboard.writeText(info.cloneUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="eh-repository-info-card">
      <div className="eh-repository-info-header">
        <FolderGit2 size={22} />
        <div>
          <div className="eh-info-header-row">
            <h2>Repository Metadata</h2>
            {info.visibility && (
              <span className={`eh-visibility-badge ${info.visibility.toLowerCase()}`}>
                <Shield size={12} /> {info.visibility}
              </span>
            )}
          </div>
          <p>
            {validation && !repository
              ? "Detected repository configuration from GitHub."
              : "Active repository details connected to this project."}
          </p>
        </div>
      </div>

      <div className="eh-repository-info-grid">
        <div className="eh-info-tile">
          <div className="eh-tile-header">
            <FolderGit2 size={16} />
            <small>Repository</small>
          </div>
          <div className="eh-tile-value-row">
            <strong>{info.name}</strong>
            {repoUrl && (
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="eh-external-repo-link"
                title="View on GitHub"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>

        <div className="eh-info-tile">
          <div className="eh-tile-header">
            <User size={16} />
            <small>Owner</small>
          </div>
          <strong>{info.owner}</strong>
        </div>

        <div className="eh-info-tile">
          <div className="eh-tile-header">
            <GitBranch size={16} />
            <small>Active Branch</small>
          </div>
          <strong>{info.branch || info.defaultBranch}</strong>
        </div>
      </div>

      {info.cloneUrl && (
        <div className="eh-clone-url-bar">
          <span className="eh-clone-url-label">Clone URL</span>
          <code className="eh-clone-url-text">{info.cloneUrl}</code>
          <button
            type="button"
            className="eh-clone-copy-btn"
            onClick={handleCopy}
            title="Copy Clone URL"
          >
            {copied ? <Check size={14} className="copied" /> : <Copy size={14} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

