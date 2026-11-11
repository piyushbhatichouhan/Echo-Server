import { useEffect, useState, useCallback, useRef } from "react";
import { getRepository, getGitStatus } from "../services/git.api";

export default function useGit(projectId) {
  const [repository, setRepository] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await getGitStatus(projectId);
      if (isMountedRef.current) {
        setStatus(data);
      }
      return data;
    } catch (err) {
      console.warn("[useGit] refreshStatus error:", err.message);
      if (isMountedRef.current) {
        setStatus(null);
      }
    }
  }, [projectId]);

  const refresh = useCallback(async () => {
    if (!projectId) {
      if (isMountedRef.current) {
        setLoading(false);
      }
      return;
    }

    try {
      if (isMountedRef.current) {
        setLoading(true);
      }
      const repo = await getRepository(projectId);
      if (isMountedRef.current) {
        setRepository(repo);
      }

      if (repo) {
        await refreshStatus();
      } else {
        if (isMountedRef.current) {
          setStatus(null);
        }
      }
    } catch (err) {
      console.warn("[useGit] refresh error:", err.message);
      if (isMountedRef.current) {
        setRepository(null);
        setStatus(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [projectId, refreshStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    repository,
    loading,
    refresh,
    setRepository,
    status,
    refreshStatus,
  };
}
