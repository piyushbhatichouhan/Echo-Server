import { useState, useEffect } from "react";
import "./repositorycard.css";
import Button from "../../common/button/button";
import RepositoryInfoCard from "../repository/info/RepositoryInfoCard";
import GitStatusCard from "../repository/status/GitStatusCard";
import RepositoryConnectionCard from "../repository/connection/RepositoryConnectionCard";
import CommitCard from "../repository/commit/CommitCard";
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

  const loadGitExtras = async () => {
    if (!repository) return;
    try {
      setLoadingCommits(true);
      const [commitsRes, branchesRes] = await Promise.allSettled([
        getCommits(projectId, 8),
        getBranches(projectId),
      ]);
      if (commitsRes.status === "fulfilled" && Array.isArray(commitsRes.value)) {
        setCommits(commitsRes.value);
      }
      if (branchesRes.status === "fulfilled" && branchesRes.value?.all) {
        setAvailableBranches(branchesRes.value.all);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoadingCommits(false);
    }
  };

  useEffect(() => {
    if (repository) {
      setRepositoryUrl(repository.repository_url || "");
      setBranch(repository.branch || "main");
      loadGitExtras();
    }
  }, [repository]);

  const canCommit = gitStatus && !gitStatus.clean;
  const canPush = gitStatus && gitStatus.ahead > 0;

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

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
          availableBranches={availableBranches}
          onValidate={async () => {
            try {
              setValidating(true);
              const result = await validateRepository(
                projectId,
                repositoryUrl,
                branch,
                token,
              );
              setValidation(result);
              toast.success(
                "Repository Validated",
                "Repository validation successful.",
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
          }}
          onConnect={async () => {
            try {
              setConnecting(true);
              await connectRepository(
                projectId,
                repositoryUrl,
                branch,
                token,
              );
              await refresh();
              toast.success(
                "Repository Connected",
                "Repository connected successfully.",
              );
            } catch (error) {
              toast.error(
                error.response?.data?.message ??
                  error.message ??
                  "Connection failed",
              );
            } finally {
              setConnecting(false);
            }
          }}
          onClone={async () => {
            try {
              setCloning(true);
              await cloneRepository(projectId);
              await refresh();
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
          }}
          onDisconnect={async () => {
            try {
              setDisconnecting(true);
              await disconnectRepository(projectId);
              setValidation(null);
              setCommits([]);
              setAvailableBranches([]);
              await refresh();
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
          }}
        />

        <RepositoryInfoCard validation={validation} repository={repository} />
      </div>

      <GitStatusCard gitStatus={gitStatus} projectId={projectId} />

      <CommitCard
        canPush={canPush}
        canCommit={canCommit}
        gitStatus={gitStatus}
        commitMessage={commitMessage}
        setCommitMessage={setCommitMessage}
        committing={committing}
        onCommit={async () => {
          if (!canCommit) {
            toast.info("Nothing to Commit", "There are no modified files.");
            return;
          }

          try {
            setCommitting(true);
            await commitChanges(projectId, commitMessage);
            setCommitMessage("");
            await refreshStatus();
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
        }}
        pulling={pulling}
        pushing={pushing}
        fetching={fetching}
        onPull={async () => {
          try {
            setPulling(true);
            await pullRepository(projectId);
            await refresh();
            await refreshStatus();
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
        }}
        onPush={async () => {
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
            await refreshStatus();
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
        }}
        onFetch={async () => {
          try {
            setFetching(true);
            await fetchRepository(projectId);
            await refreshStatus();
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
        }}
      />

      {/* Recent Commits List */}
      {repository && (
        <div className="eh-commits-card">
          <div className="eh-commits-header">
            <div className="eh-commits-title">
              <History size={20} />
              <div>
                <h2>Recent Commits</h2>
                <p>Latest version control history on active branch.</p>
              </div>
            </div>
          </div>

          <div className="eh-commits-body">
            {loadingCommits ? (
              <div className="eh-commits-empty">Loading commit history...</div>
            ) : commits.length === 0 ? (
              <div className="eh-commits-empty">
                No commit history recorded yet.
              </div>
            ) : (
              <div className="eh-commits-list">
                {commits.map((c) => (
                  <div key={c.hash} className="eh-commit-item">
                    <div className="eh-commit-item-left">
                      <GitCommit size={16} className="eh-commit-icon" />
                      <div className="eh-commit-info">
                        <span className="eh-commit-msg">{c.message}</span>
                        <div className="eh-commit-meta">
                          <span className="eh-commit-author">
                            <User size={12} /> {c.author_name}
                          </span>
                          <span className="eh-commit-date">
                            <Calendar size={12} />{" "}
                            {c.date ? new Date(c.date).toLocaleString() : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="eh-commit-hash-btn"
                      onClick={() => handleCopyHash(c.hash)}
                      title="Copy full commit hash"
                    >
                      <code className="eh-commit-short-hash">
                        {c.shortHash || c.hash.slice(0, 7)}
                      </code>
                      {copiedHash === c.hash ? (
                        <Check size={12} className="copied" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

