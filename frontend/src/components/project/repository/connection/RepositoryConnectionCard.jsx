import { useState } from "react";
import "./RepositoryConnectionCard.css";
import {
  GitBranch,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Unlink,
  FolderGit2,
  ExternalLink,
  RefreshCw,
  HelpCircle,
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
  switchingBranch,
  availableBranches = [],
  onValidate,
  onConnect,
  onClone,
  onDisconnect,
  onSwitchBranch,
}) {
  const [showToken, setShowToken] = useState(false);
  const [showTokenField, setShowTokenField] = useState(false);

  const isConnected = Boolean(repository);
  const repoUrl =
    repository?.repository_url ||
    (validation?.owner && validation?.name
      ? `https://github.com/${validation.owner}/${validation.name}`
      : null);

  const handleBranchChange = (newBranch) => {
    setBranch(newBranch);
    if (
      isConnected &&
      onSwitchBranch &&
      repository?.branch &&
      newBranch !== repository.branch
    ) {
      onSwitchBranch(newBranch);
    }
  };

  return (
    <div className="eh-repository-connection-card">
      <div className="eh-repository-card-header">
        <div className="eh-repository-card-title">
          <FolderGit2 size={24} />
          <div>
            <div className="eh-card-heading-row">
              <h2>GitHub Repository</h2>
              {isConnected ? (
                <span className="eh-repo-connected-badge">
                  <span className="eh-badge-dot" /> Connected
                </span>
              ) : (
                <span className="eh-repo-unlinked-badge">Not Connected</span>
              )}
            </div>
            <p>
              {isConnected
                ? "Manage repository synchronization, branch switching, and credentials."
                : "Connect a GitHub repository to automatically synchronize, build, and deploy this project."}
            </p>
          </div>
        </div>

        {isConnected && onDisconnect && (
          <Button
            variant="ghost"
            size="sm"
            loading={disconnecting}
            disabled={disconnecting || cloning}
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to disconnect this repository? Your local workspace files will remain intact.",
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
        <div className="eh-repo-url-wrapper">
          <Input
            label="Repository URL"
            placeholder="https://github.com/owner/repository"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            disabled={isConnected}
          />
          {isConnected && repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="eh-repo-url-link"
              title="Open repository on GitHub"
            >
              <ExternalLink size={14} />
              <span>GitHub</span>
            </a>
          )}
        </div>

        <div className="eh-branch-input-group">
          <div className="eh-branch-select-wrapper">
            <div className="eh-branch-label-row">
              <label className="eh-input-label">Branch</label>
              {isConnected && repository?.branch && (
                <span className="eh-branch-active-indicator">
                  Active: <strong>{repository.branch}</strong>
                </span>
              )}
            </div>

            <div className="eh-branch-control-row">
              <div className="eh-branch-select-box">
                <GitBranch size={16} className="eh-branch-icon" />
                {availableBranches && availableBranches.length > 0 ? (
                  <select
                    value={branch}
                    onChange={(e) => handleBranchChange(e.target.value)}
                    disabled={switchingBranch}
                    className="eh-branch-select"
                  >
                    {availableBranches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                        {b === repository?.default_branch ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="eh-branch-input"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    disabled={isConnected && switchingBranch}
                  />
                )}
              </div>

              {isConnected &&
                onSwitchBranch &&
                (!availableBranches || availableBranches.length === 0) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={switchingBranch}
                    disabled={
                      switchingBranch || !branch || branch === repository?.branch
                    }
                    onClick={() => onSwitchBranch(branch)}
                  >
                    Switch
                  </Button>
                )}
            </div>
          </div>
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
                    label="Personal Access Token (PAT)"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
                <div className="eh-token-hint-box">
                  <HelpCircle size={14} />
                  <span>
                    Requires <code className="eh-inline-code">repo</code> scope for private
                    repositories. Tokens are encrypted at rest.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="eh-repository-actions">
        {!isConnected && (
          <div className="eh-connection-action-buttons">
            <Button
              variant="secondary"
              loading={validating}
              disabled={!repositoryUrl || validating || connecting}
              onClick={onValidate}
            >
              Validate Repository
            </Button>

            {validation && (
              <Button
                variant="primary"
                loading={connecting}
                disabled={connecting}
                onClick={onConnect}
              >
                Connect & Sync Repository
              </Button>
            )}
          </div>
        )}

        {isConnected && (
          <div className="eh-connected-actions-row">
            <Button
              variant="secondary"
              loading={cloning}
              disabled={cloning}
              onClick={onClone}
              className="eh-reclone-btn"
            >
              <RefreshCw size={15} className={cloning ? "eh-spin" : ""} />
              <span>{cloning ? "Syncing..." : "Re-clone & Sync"}</span>
            </Button>
          </div>
        )}
      </div>

      {validation && !isConnected && (
        <div className="eh-validation-success">
          <div className="eh-validation-success-left">
            <CheckCircle2 size={18} className="eh-val-icon" />
            <div>
              <strong>
                {validation.owner}/{validation.name}
              </strong>
              <span>
                Default branch: <code>{validation.defaultBranch}</code>
                {validation.branches?.length > 0 &&
                  ` • ${validation.branches.length} branches discovered`}
              </span>
            </div>
          </div>
          {validation.visibility && (
            <span
              className={`eh-val-visibility-tag ${validation.visibility.toLowerCase()}`}
            >
              {validation.visibility}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
