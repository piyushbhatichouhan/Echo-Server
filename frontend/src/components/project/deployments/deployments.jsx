import "./deployments.css";

import useGit from "../../../hooks/useGit";

import RepositoryCard from "./repositorycard";

export default function Deployments({ projectId }) {
  const {
    repository,
    status,

    loading,

    refresh,

    refreshStatus,

    setRepository,
  } = useGit(projectId);

  return (
    <div className="eh-deployments">
      <RepositoryCard
        projectId={projectId}
        repository={repository}
        gitStatus={status}
        refreshStatus={refreshStatus}
        loading={loading}
        refresh={refresh}
        setRepository={setRepository}
      />
    </div>
  );
}
