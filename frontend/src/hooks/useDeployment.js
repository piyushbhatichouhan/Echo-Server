import { useCallback, useEffect, useState } from "react";

import { getDeploymentStatus } from "../services/deployment.api";

import { getLogs } from "../services/log.api";

import { getDeployments } from "../services/deployment.api";

export default function useDeployment(projectId) {
  const [status, setStatus] = useState(null);

  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);

  const [deployments, setDeployments] = useState([]);

  const refreshDeployments = useCallback(async () => {
    const data = await getDeployments(projectId);

    setDeployments(data);
  }, [projectId]);

  const refreshStatus = useCallback(async () => {
    console.log("Fetching status...");

    const data = await getDeploymentStatus(projectId);

    console.log("Status:", data);

    setStatus(data);
  }, [projectId]);

  const refreshLogs = useCallback(async () => {
    console.log("Fetching logs...");

    const data = await getLogs(projectId);

    console.log("Logs:", data);

    setLogs(data);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const load = async () => {
      try {
        await Promise.all([
          refreshStatus(),
          refreshLogs(),
          refreshDeployments(),
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Initial load
    load();

    // Poll deployment status every 3 seconds
    const statusInterval = setInterval(() => {
      refreshStatus().catch(console.error);
    }, 3000);

    return () => {
      clearInterval(statusInterval);
    };
  }, [projectId, refreshStatus, refreshLogs]);

  return {
    status,

    logs,

    loading,

    refreshStatus,

    refreshLogs,

    setLogs,

    deployments,
    refreshDeployments,
  };
}
