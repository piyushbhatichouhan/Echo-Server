import { useState, useEffect, useCallback, useRef } from "react";
import {
  getServerLogs,
  getLogContainers,
  clearServerLogs as apiClearServerLogs,
} from "../services/server.api";

export default function useServerLogs(defaultInterval = 5000) {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filters
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(250);
  const [selectedContainer, setSelectedContainer] = useState("");
  const [containers, setContainers] = useState([]);

  // Auto-refresh & streaming
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(defaultInterval);
  const [autoScroll, setAutoScroll] = useState(true);

  // Load container list
  const loadContainers = useCallback(async () => {
    try {
      const data = await getLogContainers();
      setContainers(data || []);
      if (data && data.length > 0 && !selectedContainer) {
        setSelectedContainer(data[0].id);
      }
    } catch (err) {
      console.warn("[useServerLogs] Failed to load container list:", err);
    }
  }, [selectedContainer]);

  useEffect(() => {
    loadContainers();
  }, [loadContainers]);

  // Fetch logs
  const fetchLogs = useCallback(
    async (isSilent = false) => {
      if (!isSilent) {
        setIsRefreshing(true);
      }
      try {
        const params = {
          category,
          level: level === "all" ? undefined : level,
          search: search.trim() || undefined,
          limit,
          containerId: category === "docker" ? selectedContainer || undefined : undefined,
        };

        const res = await getServerLogs(params);
        setLogs(res?.logs || []);
        setTotalCount(res?.totalCount || 0);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error("[useServerLogs] Fetch error:", err);
        setError(err.response?.data?.message || err.message || "Failed to retrieve server logs");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [category, level, search, limit, selectedContainer],
  );

  // Fetch when filters change
  useEffect(() => {
    fetchLogs(false);
  }, [fetchLogs]);

  // Polling loop for live log streaming
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchLogs(true);
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval, fetchLogs]);

  const refresh = () => fetchLogs(false);

  // Clear in-memory logs
  const clearLogsOnServer = async () => {
    try {
      const res = await apiClearServerLogs();
      await fetchLogs(false);
      return res;
    } catch (err) {
      throw err;
    }
  };

  // Export logs to a downloadable text file
  const exportLogs = () => {
    if (logs.length === 0) return;

    const content = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${(l.level || "INFO").toUpperCase()}] [${(
            l.source || "SYSTEM"
          ).toUpperCase()}] ${l.message}`,
      )
      .join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `echoserver-server-${category}-logs-${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    logs,
    totalCount,
    loading,
    isRefreshing,
    error,
    lastUpdated,
    category,
    setCategory,
    level,
    setLevel,
    search,
    setSearch,
    limit,
    setLimit,
    selectedContainer,
    setSelectedContainer,
    containers,
    loadContainers,
    autoRefreshInterval,
    setAutoRefreshInterval,
    autoScroll,
    setAutoScroll,
    refresh,
    clearLogsOnServer,
    exportLogs,
  };
}
