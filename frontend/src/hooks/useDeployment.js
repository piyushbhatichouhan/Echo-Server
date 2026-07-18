import { useCallback, useEffect, useState } from "react";

import { getDeploymentStatus } from "../services/deployment.api";

import { getLogs } from "../services/log.api";

export default function useDeployment(projectId) {
  const [status, setStatus] = useState(null);

  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(true);

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
        console.log("Loading deployment...");

        await Promise.all([refreshStatus(), refreshLogs()]);

        console.log("Finished.");
      } catch (err) {
        console.error(err);
      } finally {
        console.log("Loading false");

        setLoading(false);
      }
    };

    load();
  }, [projectId, refreshStatus, refreshLogs]);

  return {
    status,

    logs,

    loading,

    refreshStatus,

    refreshLogs,

    setLogs,
  };
}
