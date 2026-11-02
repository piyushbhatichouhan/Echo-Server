import "./CommitCard.css";
import {
  GitCommitHorizontal,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  GitBranch,
  CheckCircle2,
  Clock,
} from "lucide-react";

import Input from "../../../common/input/input";
import Button from "../../../common/button/button";

export default function CommitCard({
  gitStatus,
  commitMessage,
  setCommitMessage,
  committing,
  pulling,
  pushing,
  fetching,
  onCommit,
  onPull,
  onPush,
  onFetch,
  canCommit,
  canPush,
}) {
  if (!gitStatus) return null;

  const isUpToDate = gitStatus.ahead === 0 && gitStatus.behind === 0;

  return (
    <div className="eh-commit-card">
      {/* Synchronization Section */}
      <div className="eh-sync-toolbar-section">
        <div className="eh-sync-top">
          <div className="eh-sync-branch-tag">
            <GitBranch size={15} />
            <span>{gitStatus.branch || "main"}</span>
          </div>

          <div className="eh-sync-status-pill">
            {isUpToDate ? (
              <span className="eh-sync-pill in-sync">
                <CheckCircle2 size={13} /> Up to date
              </span>
            ) : (
              <span className="eh-sync-pill out-of-sync">
                <Clock size={13} />
                {gitStatus.ahead > 0 && `${gitStatus.ahead} ahead `}
                {gitStatus.behind > 0 && `${gitStatus.behind} behind`}
              </span>
            )}
          </div>
        </div>

        <div className="eh-sync-actions">
          <Button
            variant="secondary"
            loading={pulling}
            disabled={pulling || fetching}
            onClick={onPull}
            className="eh-sync-btn"
          >
            <ArrowDown size={15} />
            <span>Pull</span>
            {gitStatus.behind > 0 && (
              <span className="eh-sync-badge behind">{gitStatus.behind}</span>
            )}
          </Button>

          <Button
            variant="secondary"
            loading={pushing}
            onClick={onPush}
            disabled={pushing || !canPush || fetching}
            className="eh-sync-btn"
          >
            <ArrowUp size={15} />
            <span>Push</span>
            {gitStatus.ahead > 0 && (
              <span className="eh-sync-badge ahead">{gitStatus.ahead}</span>
            )}
          </Button>

          <Button
            variant="secondary"
            loading={fetching}
            disabled={fetching || pulling || pushing}
            onClick={onFetch}
            className="eh-sync-btn"
            title="Fetch all remotes"
          >
            <RefreshCw size={15} className={fetching ? "eh-spin" : ""} />
            <span>Fetch</span>
          </Button>
        </div>
      </div>

      {/* Commit Section */}
      <div className="eh-commit-divider" />

      <div className="eh-commit-section">
        <div className="eh-commit-header">
          <GitCommitHorizontal size={22} />
          <div>
            <h2>Commit Working Tree</h2>
            <p>
              {gitStatus.clean
                ? "Working directory clean. No uncommitted modifications."
                : `${gitStatus.changes?.length || 0} modified file(s) ready to stage & commit.`}
            </p>
          </div>
        </div>

        <div className="eh-commit-body">
          <Input
            label="Commit Message"
            placeholder="feat: describe your changes..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            disabled={committing || !canCommit}
          />
        </div>

        <div className="eh-commit-footer">
          <Button
            fullWidth
            loading={committing}
            disabled={committing || !canCommit || !commitMessage.trim()}
            onClick={onCommit}
          >
            Commit Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

