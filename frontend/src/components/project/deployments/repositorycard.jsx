import { useState, useEffect } from "react";
import "./RepositoryCard.css";
import Button from "../../common/Button/Button";

import {
  connectRepository,
  validateRepository,
  disconnectRepository,
  cloneRepository,
  commitChanges,
} from "../../../services/git.api";

const STATUS_LABELS = {
  modified: "Modified",
  created: "Added",
  deleted: "Deleted",
  renamed: "Renamed",
  untracked: "Added",
};

const STATUS_COLORS = {
  modified: "modified",
  created: "added",
  deleted: "deleted",
  renamed: "renamed",
  untracked: "added",
};

const getFileName = (path) => {
  return path.split("/").pop();
};

const getDirectory = (path) => {
  const parts = path.split("/");

  parts.pop();

  return parts.join("/");
};

export default function RepositoryCard({
  projectId,
  repository,
  refresh,
  gitStatus,
  refreshStatus,
}) {
  console.log("RepositoryCard projectId:", projectId);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [branch, setBranch] = useState("main");

  const [validating, setValidating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [validation, setValidation] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const [commitMessage, setCommitMessage] = useState("");

  const [committing, setCommitting] = useState(false);

  const changes = gitStatus?.changes ?? [];

  const summary = {
    modified: 0,
    added: 0,
    deleted: 0,
    renamed: 0,
  };

  changes.forEach((change) => {
    switch (change.status) {
      case "modified":
        summary.modified++;
        break;

      case "created":
      case "untracked":
        summary.added++;
        break;

      case "deleted":
        summary.deleted++;
        break;

      case "renamed":
        summary.renamed++;
        break;

      default:
        break;
    }
  });

  const visibleChanges = showAll ? changes : changes.slice(0, 5);

  useEffect(() => {
    if (repository) {
      setRepositoryUrl(repository.repository_url);
      setBranch(repository.branch);
    }
  }, [repository]);

  return (
    <div className="eh-repository-card">
      <>
        <div className="eh-field">
          <label>Repository URL</label>

          <input
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
          />
        </div>

        <div className="eh-field">
          <label>Branch</label>

          <input
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="main"
          />

          <div className="eh-repository-actions">
            <Button
              variant="secondary"
              disabled={!repositoryUrl || validating}
              loading={validating}
              onClick={async () => {
                try {
                  setValidating(true);

                  const result = await validateRepository(
                    projectId,
                    repositoryUrl,
                    branch,
                  );

                  setValidation(result);
                } finally {
                  setValidating(false);
                }
              }}
            >
              Validate Repository
            </Button>
            {validation && !repository && (
              <Button
                variant="primary"
                loading={connecting}
                onClick={async () => {
                  try {
                    setConnecting(true);

                    await connectRepository(projectId, repositoryUrl, branch);

                    await refresh();
                  } finally {
                    setConnecting(false);
                  }
                }}
              >
                Connect Repository
              </Button>
            )}

            {repository && (
              <Button
                variant="secondary"
                loading={cloning}
                onClick={async () => {
                  try {
                    setCloning(true);

                    await cloneRepository(projectId);

                    alert("Repository cloned successfully.");
                  } finally {
                    setCloning(false);
                  }
                }}
              >
                Clone Repository
              </Button>
            )}
          </div>
          {validation && (
            <div className="eh-validation">
              <div>
                <strong>Name</strong>
                <span>{validation.name}</span>
              </div>

              <div>
                <strong>Owner</strong>
                <span>{validation.owner}</span>
              </div>

              <div>
                <strong>Default Branch</strong>
                <span>{validation.defaultBranch}</span>
              </div>
            </div>
          )}

          {gitStatus && (
            <div className="eh-git-status">
              <h3>Repository Status</h3>

              {gitStatus.clean ? (
                <div className="eh-status-clean">Repository is up to date.</div>
              ) : (
                <>
                  <div className="eh-status-summary">
                    <div className="eh-summary modified">
                      <span>12</span>
                      <small>Modified</small>
                    </div>

                    <div className="eh-summary added">
                      <span>15</span>
                      <small>Added</small>
                    </div>

                    <div className="eh-summary deleted">
                      <span>6</span>
                      <small>Deleted</small>
                    </div>
                  </div>

                  <div className="eh-change-list">
                    {visibleChanges.map((change) => (
                      <div key={change.path} className="eh-change-item">
                        <div
                          className={`eh-change-badge ${
                            STATUS_COLORS[change.status]
                          }`}
                        >
                          {STATUS_LABELS[change.status]}
                        </div>

                        <div className="eh-change-info">
                          <strong>{getFileName(change.path)}</strong>

                          <small>{getDirectory(change.path)}</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  {changes.length > 5 && (
                    <button
                      className="eh-show-more"
                      onClick={() => setShowAll(!showAll)}
                    >
                      {showAll ? "Show Less" : `Show All (${changes.length})`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div className="eh-commit-section">
            <div className="eh-commit-card">
              <h3>Commit Changes</h3>

              <label>Commit message</label>

              <input
                placeholder="Commit message"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
              />

              <Button
                loading={committing}
                disabled={gitStatus?.clean || !commitMessage.trim()}
                onClick={async () => {
                  try {
                    setCommitting(true);

                    await commitChanges(projectId, commitMessage);

                    setCommitMessage("");

                    await refreshStatus();
                  } finally {
                    setCommitting(false);
                  }
                }}
              >
                Commit Changes
              </Button>
            </div>
          </div>
        </div>
      </>
    </div>
  );
}
