import { useState, useEffect } from "react";
import "./RepositoryCard.css";
import Button from "../../common/button/button";
import RepositoryInfoCard from "../repository/info/RepositoryInfoCard";
import GitStatusCard from "../repository/status/GitStatusCard";
import { useToast } from "../../../context/ToastContext";

import {
  connectRepository,
  validateRepository,
  disconnectRepository,
  cloneRepository,
  commitChanges,
  pullRepository,
  pushRepository,
  fetchRepository,
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

import RepositoryConnectionCard from "../repository/connection/RepositoryConnectionCard";

import CommitCard from "../repository/commit/CommitCard";

export default function RepositoryCard({
  projectId,
  repository,
  refresh,
  gitStatus,
  refreshStatus,
}) {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [validating, setValidating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [validation, setValidation] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const changes = gitStatus?.changes ?? [];
  const toast = useToast();

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

  const canCommit = gitStatus && !gitStatus.clean;
  const canPush = gitStatus && gitStatus.ahead > 0;

  return (
    <div className="eh-repository-page">
      <>
        <div className="eh-repository-top">
          <RepositoryConnectionCard
            repositoryUrl={repositoryUrl}
            setRepositoryUrl={setRepositoryUrl}
            branch={branch}
            setBranch={setBranch}
            repository={repository}
            validation={validation}
            connecting={connecting}
            cloning={cloning}
            onValidate={async () => {
              try {
                setValidating(true);

                const result = await validateRepository(
                  projectId,
                  repositoryUrl,
                  branch,
                );

                setValidation(result);
                toast.success(
                  "Repository Validated",
                  "Repository Validation Succesfull",
                );
              } catch (error) {
                toast.error(
                  error.response?.data?.message ??
                    error.message ??
                    "Unknown error",
                );
              } finally {
                setValidating(false);
              }
            }}
            onConnect={async () => {
              try {
                setConnecting(true);

                await connectRepository(projectId, repositoryUrl, branch);

                await refresh();
                toast.success(
                  "Repository Connected",
                  "Repository Connected Succesfully",
                );
              } catch (error) {
                toast.error(
                  error.response?.data?.message ??
                    error.message ??
                    "Unknown error",
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
                toast.success(
                  "Repository Cloned Succesfully",
                  "Whole repository downloaded.",
                );
              } catch (error) {
                toast.error(
                  error.response?.data?.message ??
                    error.message ??
                    "Unknown error",
                );
              } finally {
                setCloning(false);
              }
            }}
          />

          <RepositoryInfoCard validation={validation} />
        </div>

        <GitStatusCard gitStatus={gitStatus} />

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

              toast.success("Commit Created", "Changes have been committed.");
            } catch (error) {
              toast.error(
                error.response?.data?.message ??
                  error.message ??
                  "Unknown error",
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
              toast.success("Repository Pulled", "Latest changes downloaded.");
            } catch (error) {
              toast.error(
                error.response?.data?.message ??
                  error.message ??
                  "Unknown error",
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

              toast.success("Repository Pushed", "Changes uploaded to GitHub.");
            } catch (error) {
              toast.error(
                error.response?.data?.message ??
                  error.message ??
                  "Unknown error",
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

              toast.success(
                "Repository Updated",
                "Fetched latest remote information.",
              );
            } catch (error) {
              toast.error(
                error.response?.data?.message ??
                  error.message ??
                  "Unknown error",
              );
            } finally {
              setFetching(false);
            }
          }}
        />
      </>
    </div>
  );
}
