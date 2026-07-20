import { useEffect, useState } from "react";

import { getRepository } from "../services/git.api";
import { getGitStatus } from "../services/git.api";

export default function useGit(projectId) {
  const [repository, setRepository] = useState(null);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  const refreshStatus = async () => {
    const data = await getGitStatus(projectId);

    setStatus(data);
  };

  const refresh = async () => {
    const repo = await getRepository(projectId);

    setRepository(repo);

    if (repo) {
      await refreshStatus();
    } else {
      setStatus(null);
    }
  };
  useEffect(() => {
    if (projectId) {
      refresh();
    }
  }, [projectId]);

  return {
    repository,
    loading,
    refresh,
    setRepository,
    status,
    refreshStatus,
  };
}
