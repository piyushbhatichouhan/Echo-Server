import "./CommitCard.css";

import { GitCommitHorizontal, MessageSquare } from "lucide-react";

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

  return (
    <div className="eh-commit-card">
      <div className="eh-commit-header">
        <GitCommitHorizontal size={22} />

        <div>
          <h2>Commit Changes</h2>

          <p>
            {gitStatus.clean
              ? "Nothing to commit."
              : `${gitStatus.changes.length} file(s) ready`}
          </p>
        </div>
      </div>

      <div className="eh-commit-body">
        <Input
          label="Commit Message"
          placeholder="Describe your changes..."
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
        />
      </div>

      <div className="eh-commit-footer">
        {gitStatus && (
          <div className="eh-sync-section">
            <div className="eh-sync-header">
              <h3>Repository Sync</h3>

              <p>Synchronize your local repository with GitHub.</p>
            </div>

            <div className="eh-sync-actions">
              <Button variant="secondary" loading={pulling} onClick={onPull}>
                Pull
              </Button>

              <Button
                variant="secondary"
                loading={pushing}
                onClick={onPush}
                disabled={pushing || !canPush}
              >
                Push
              </Button>

              <Button variant="secondary" loading={fetching} onClick={onFetch}>
                Fetch
              </Button>
            </div>
          </div>
        )}
        <Button
          fullWidth
          loading={committing}
          disabled={gitStatus.clean || !commitMessage.trim()}
          onClick={onCommit}
          disabled={committing || !canCommit}
        >
          Commit Changes
        </Button>
      </div>
    </div>
  );
}
