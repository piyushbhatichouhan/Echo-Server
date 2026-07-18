import { useEffect, useState } from "react";

import { getDeploymentStatus } from "../services/deployment.api";

export default function useDeploymentStatus(projectId) {
  const [status, setStatus] = useState(null);

  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await getDeploymentStatus(projectId);

      setStatus(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      refresh();
    }
  }, [projectId]);

  return {
    status,
    loading,
    refresh,
  };
}
