import { useState, useEffect, useCallback } from "react";
import "./repositorycard.css";
import Button from "../../common/button/button";
import RepositoryInfoCard from "../repository/info/RepositoryInfoCard";
import GitStatusCard from "../repository/status/GitStatusCard";
import RepositoryConnectionCard from "../repository/connection/RepositoryConnectionCard";
import CommitCard from "../repository/commit/CommitCard";
import WebhookCard from "../repository/webhook/WebhookCard";
import { useToast } from "../../../context/ToastContext";
import {
  GitCommit,
  User,
  Calendar,
  Copy,
  Check,
  History,
  GitBranch,
} from "lucide-react";

import {
  connectRepository,
  validateRepository,
  disconnectRepository,
  cloneRepository,
  commitChanges,
  pullRepository,
  pushRepository,
  fetchRepository,
  getCommits,
  getBranches,
  switchBranch,
} from "../../../services/git.api";

export default function RepositoryCard({
  projectId,
  repository,
  refresh,
  gitStatus,
  refreshStatus,
}) {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [token, setToken] = useState("");
  const [validating, setValidating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const [validation, setValidation] = useState(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [copiedHash, setCopiedHash] = useState(null);

  const toast = useToast();

  const loadGitExtras = useCallback(async () => {
    if (!repository || !projectId) return;
    try {
      setLoadingCommits(true);
      const [commitsRes, branchesRes] = await Promise.allSettled([
        getCommits(projectId, 15),
        getBranches(projectId),
      ]);

      if (commitsRes.status === "fulfilled" && Array.isArray(commitsRes.value)) {
        setCommits(commitsRes.value);
      } else {
        setCommits([]);
      }

      if (branchesRes.status === "fulfilled" && branchesRes.value?.all) {
        setAvailableBranches(branchesRes.value.all);
      }
    } catch (e) {
      console.warn("[RepositoryCard] loadGitExtras failed:", e.message);
    } finally {
      setLoadingCommits(false);
    }
  }, [projectId, repository]);

  useEffect(() => {
    if (repository) {
      setRepositoryUrl(repository.repository_url || "");
      setBranch(repository.branch || "main");
      loadGitExtras();
    } else {
      setCommits([]);
      setAvailableBranches([]);
      setValidation(null);
    }
  }, [repository, loadGitExtras]);

  const canCommit = Boolean(gitStatus && !gitStatus.clean);
  const canPush = Boolean(gitStatus && gitStatus.ahead > 0);

  const handleCopyHash = (hash) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleValidate = async () => {
    try {
      setValidating(true);
      const result = await validateRepository(
        projectId,
        repositoryUrl,
        branch,
        token,
      );
      setValidation(result);

      if (result.branches && result.branches.length > 0) {
        setAvailableBranches(result.branches);
      }
      if (result.branch) {
        setBranch(result.branch);
      } else if (result.defaultBranch) {
        setBranch(result.defaultBranch);
      }

      toast.success(
        "Repository Validated",
        `Validated ${result.owner}/${result.name} (Default: ${result.defaultBranch})`,
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ??
          error.message ??
          "Validation failed",
      );
    } finally {
      setValidating(false);
    }
  };

  const handleConnect = async () => {
    const isDifferentRepo =
      repository &&
      repositoryUrl &&
      repository.repository_url?.trim().toLowerCase() !== repositoryUrl.trim().toLowerCase();

    if (isDifferentRepo) {
      const confirmed = window.confirm(
        "Connecting a different repository will permanently delete the current project's workspace files and reset Docker containers and build cache.\n\nDo you want to continue?",
      );
      if (!confirmed) return;
    }

    try {
      setConnecting(true);
      const res = await connectRepository(
        projectId,
        repositoryUrl,
        branch,
        token,
      );

      // Automatically clone & sync workspace on initial connection
      try {
        await cloneRepository(projectId);
      } catch (cloneErr) {
        console.warn("[Initial Clone Notice]:", cloneErr.message);
      }

      await refresh();
      if (refreshStatus) await refreshStatus();
      await loadGitExtras();

      if (res?.wasReset || isDifferentRepo) {
        toast.success(
          "Different Repository Connected",
          "Existing files were deleted and Docker environment was reset.",
        );
      } else {
        toast.success(
          "Repository Connected & Synchronized",
          "Repository connected and workspace files synchronized.",
        );
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ??
          error.message ??
          "Connection failed",
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleClone = async () => {
    try {
      setCloning(true);
      await cloneRepository(projectId);
      await refresh();
      if (refreshStatus) await refreshStatus();
      await loadGitExtras();
      toast.success(
        "Repository Cloned",
        "Workspace synchronized with repository.",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ??
          error.message ??
          "Clone failed",
      );
    } finally {
      setCloning(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      await disconnectRepository(projectId);
      setValidation(null);
      setCommits([]);
      setAvailableBranches([]);
      await refresh();
      if (refreshStatus) await refreshStatus();
      toast.success(
        "Repository Disconnected",
        "Project unlinked from GitHub repository.",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ??
          error.message ??
          "Disconnect failed",
      );
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSwitchBranch = async (newBranch) => {
    if (!newBranch || newBranch === branch) return;
    try {
      setSwitchingBranch(true);
      await switchBranch(projectId, newBranch);
      setBranch(newBranch);
      await refresh();
      if (refreshStatus) await refreshStatus();
      await loadGitExtras();
      toast.success(
        "Branch Switched",
        `Active branch switched to "${newBranch}". Workspace synchronized.`,
      );
    } catch (err) {
      toast.error(
        "Branch Switch Failed",
        err.response?.data?.message || err.message,
      );
    } finally {
      setSwitchingBranch(false);
    }
  };

  const handleCommit = async () => {
    if (!canCommit) {
      toast.info("Nothing to Commit", "Working directory is already clean.");
      return;
    }

    if (!commitMessage.trim()) {
      toast.error("Commit Message Required", "Please enter a commit message.");
      return;
    }

    try {
      setCommitting(true);
      await commitChanges(projectId, commitMessage);
      setCommitMessage("");
      if (refreshStatus) await refreshStatus();
      await loadGitExtras();
      toast.success("Commit Created", "Changes committed to local branch.");
    } catch (error) {
      toast.error(
        error.response?.data?.message ??
          error.message ??
          "Commit failed",
      );
    } finally {
      setCommitting(false);
    }
  };

  const handlePull = async () => {
    try {
      setPulling(true);
      await pullRepository(projectId);
      await refresh();
      if (refreshStatus) await refreshStatus();
      await loadGitExtras();
      toast.success("Repository Pulled", "Latest changes downloaded.");
    } catch (error) {
      toast.error(
        error.response?.data?.message ??
          error.message ??
          "Pull failed",
      );
    } finally {
      setPulling(false);
    }
  };

  const handlePush = async () => {
    if (!canPush) {
      toast.info(
        "Nothing to Push",
        "All local commits are already on GitHub.",
      );
      return;
    }

    try {
      setPushing(true);
      await pushRepository(projectId);
      if (refreshStatus) await refreshStatus();
      await loadGitExtras();
      toast.success("Repository Pushed", "Changes uploaded to GitHub.");
    } catch (error) {
      toast.error(
        error.response?.data?.message ??
          error.message ??
          "Push failed",
      );
    } finally {
      setPushing(false);
    }
  };

  const handleFetch = async () => {
    try {
      setFetching(true);
      await fetchRepository(projectId);
      if (refreshStatus) await refreshStatus();
      await loadGitExtras();
      toast.success(
        "Repository Fetched",
        "Fetched latest remote branch information.",
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ??
          error.message ??
          "Fetch failed",
      );
    } finally {
      setFetching(false);
    }
  };

  const safeCommits = Array.isArray(commits) ? commits : [];

  return (
    <div className="eh-repository-page">
      <div className="eh-repository-top">
        <RepositoryConnectionCard
          repositoryUrl={repositoryUrl}
          setRepositoryUrl={setRepositoryUrl}
          branch={branch}
          setBranch={setBranch}
          token={token}
          setToken={setToken}
          repository={repository}
          validation={validation}
          validating={validating}
          connecting={connecting}
          cloning={cloning}
          disconnecting={disconnecting}
          switchingBranch={switchingBranch}
          availableBranches={availableBranches}
          onValidate={handleValidate}
          onConnect={handleConnect}
          onClone={handleClone}
          onDisconnect={handleDisconnect}
          onSwitchBranch={handleSwitchBranch}
        />

        <RepositoryInfoCard validation={validation} repository={repository} />
      </div>

      <WebhookCard
        projectId={projectId}
        repository={repository}
        onRefresh={refresh}
      />

      <GitStatusCard gitStatus={gitStatus} projectId={projectId} />

      <CommitCard
        canPush={canPush}
        canCommit={canCommit}
        gitStatus={gitStatus}
        commitMessage={commitMessage}
        setCommitMessage={setCommitMessage}
        committing={committing}
        onCommit={handleCommit}
        pulling={pulling}
        pushing={pushing}
        fetching={fetching}
        onPull={handlePull}
        onPush={handlePush}
        onFetch={handleFetch}
      />

      {/* Recent Commits List */}
      {repository && (
        <div className="eh-commits-card">
          <div className="eh-commits-header">
            <div className="eh-commits-title">
              <History size={20} />
              <div>
                <h2>Recent Commits</h2>
                <p>
                  Latest version control history on active branch (
                  <code>{branch || repository.branch || "main"}</code>).
                </p>
              </div>
            </div>
            {safeCommits.length > 0 && (
              <span className="eh-commits-count-badge">
                {safeCommits.length}{" "}
                {safeCommits.length === 1 ? "commit" : "commits"}
              </span>
            )}
          </div>

          <div className="eh-commits-body">
            {loadingCommits ? (
              <div className="eh-commits-empty">Loading commit history...</div>
            ) : safeCommits.length === 0 ? (
              <div className="eh-commits-empty">
                No commit history recorded yet. Commits will appear here once
                files are committed or synchronized.
              </div>
            ) : (
              <div className="eh-commits-list">
                {safeCommits.map((c, idx) => {
                  const hash = c?.hash || "";
                  const shortHash =
                    c?.shortHash ||
                    (hash ? hash.slice(0, 7) : `commit-${idx}`);
                  const formattedDate =
                    c?.date && !isNaN(new Date(c.date).getTime())
                      ? new Date(c.date).toLocaleString()
                      : c?.date || "Recently";

                  return (
                    <div key={hash || idx} className="eh-commit-item">
                      <div className="eh-commit-item-left">
                        <GitCommit size={16} className="eh-commit-icon" />
                        <div className="eh-commit-info">
                          <span className="eh-commit-msg">
                            {c?.message || "No commit message"}
                          </span>
                          <div className="eh-commit-meta">
                            <span className="eh-commit-author">
                              <User size={12} /> {c?.author_name || "Author"}
                            </span>
                            <span className="eh-commit-date">
                              <Calendar size={12} /> {formattedDate}
                            </span>
                          </div>
                        </div>
                      </div>

                      {hash && (
                        <button
                          type="button"
                          className="eh-commit-hash-btn"
                          onClick={() => handleCopyHash(hash)}
                          title="Copy full commit hash"
                        >
                          <code className="eh-commit-short-hash">
                            {shortHash}
                          </code>
                          {copiedHash === hash ? (
                            <Check size={12} className="copied" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
