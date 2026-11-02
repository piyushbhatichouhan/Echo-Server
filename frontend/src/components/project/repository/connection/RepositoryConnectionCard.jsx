import { useState } from "react";
import "./RepositoryConnectionCard.css";
import {
  GitBranch,
  CheckCircle2,
  Lock,
  Key,
  Eye,
  EyeOff,
  Unlink,
  FolderGit2,
  ExternalLink,
} from "lucide-react";

import Input from "../../../common/input/input";
import Button from "../../../common/button/button";

export default function RepositoryConnectionCard({
  repositoryUrl,
  setRepositoryUrl,
  branch,
  setBranch,
  token,
  setToken,
  repository,
  validation,
  validating,
  connecting,
  cloning,
  disconnecting,
  availableBranches = [],
  onValidate,
  onConnect,
  onClone,
  onDisconnect,
}) {
  const [showToken, setShowToken] = useState(false);
  const [showTokenField, setShowTokenField] = useState(false);

  const isConnected = Boolean(repository);

  return (
    <div className="eh-repository-connection-card">
      <div className="eh-repository-card-header">
        <div className="eh-repository-card-title">
          <FolderGit2 size={24} />
          <div>
            <div className="eh-card-heading-row">
              <h2>GitHub Repository</h2>
              {isConnected && (
                <span className="eh-repo-connected-badge">
                  <span className="eh-badge-dot" /> Connected
                </span>
              )}
            </div>
            <p>
              {isConnected
                ? "Manage repository synchronization, branch configuration, and credentials."
                : "Connect a GitHub repository to automatically build and deploy this project."}
            </p>
          </div>
        </div>

        {isConnected && onDisconnect && (
          <Button
            variant="ghost"
            size="sm"
            loading={disconnecting}
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to disconnect this repository? Local workspace files will be preserved.",
                )
              ) {
                onDisconnect();
              }
            }}
            className="eh-repo-disconnect-btn"
          >
            <Unlink size={15} /> Disconnect
          </Button>
        )}
      </div>

      <div className="eh-repository-fields">
        <Input
          label="Repository URL"
          placeholder="https://github.com/owner/repo.git"
          value={repositoryUrl}
          onChange={(e) => setRepositoryUrl(e.target.value)}
          disabled={isConnected}
        />

        <div className="eh-branch-input-group">
          {availableBranches && availableBranches.length > 0 ? (
            <div className="eh-branch-select-wrapper">
              <label className="eh-input-label">Branch</label>
              <div className="eh-branch-select-box">
                <GitBranch size={16} className="eh-branch-icon" />
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="eh-branch-select"
                >
                  {availableBranches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <Input
              label="Branch"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          )}
        </div>

        {!isConnected && (
          <div className="eh-token-toggle-section">
            <button
              type="button"
              className="eh-token-toggle-btn"
              onClick={() => setShowTokenField(!showTokenField)}
            >
              <Lock size={14} />
              <span>
                {showTokenField
                  ? "Hide Access Token"
                  : "Private Repository? Provide Personal Access Token"}
              </span>
            </button>

            {showTokenField && (
              <div className="eh-token-input-row">
                <div className="eh-token-input-wrap">
                  <Input
                    label="Personal Access / Deploy Token"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    type={showToken ? "text" : "password"}
                    value={token || ""}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <button
                    type="button"
                    className="eh-token-eye-btn"
                    onClick={() => setShowToken(!showToken)}
                    title={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <small className="eh-token-hint">
                  Requires <code className="eh-inline-code">repo</code> scope for private
                  GitHub repositories. Stored encrypted.
                </small>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="eh-repository-actions">
        {!isConnected && (
          <>
            <Button
              variant="secondary"
              loading={validating}
              disabled={!repositoryUrl || validating}
              onClick={onValidate}
            >
              Validate
            </Button>

            {validation && (
              <Button loading={connecting} onClick={onConnect}>
                Connect Repository
              </Button>
            )}
          </>
        )}

        {isConnected && (
          <Button loading={cloning} onClick={onClone}>
            Re-clone & Sync
          </Button>
        )}
      </div>

      {validation && (
        <div className="eh-validation-success">
          <CheckCircle2 size={18} />
          <span>
            Repository validated: <strong>{validation.owner}/{validation.name}</strong> (Branch: <strong>{validation.branch}</strong>)
          </span>
        </div>
      )}
    </div>
  );
}

