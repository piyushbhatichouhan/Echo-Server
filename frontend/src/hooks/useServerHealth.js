import { useState, useEffect, useCallback, useRef } from "react";
import { getServerHealth } from "../services/server.api";

export default function useServerHealth(defaultInterval = 10000) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(defaultInterval);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsRefreshing(true);
    }
    try {
      const data = await getServerHealth();
      setHealth(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("[useServerHealth] Failed to fetch server health:", err);
      setError(err.response?.data?.message || err.message || "Failed to load server health data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchHealth(false);
  }, [fetchHealth]);

  // Periodic polling if interval > 0
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchHealth(true);
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, fetchHealth]);

  const refresh = () => fetchHealth(false);

  return {
    health,
    loading,
    error,
    lastUpdated,
    isRefreshing,
    refresh,
    autoRefreshInterval,
    setAutoRefreshInterval,
  };
}
