import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Terminal,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Download,
  Copy,
  Check,
  Trash2,
  Search,
  X,
  Radio,
  Box,
  Layers,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
  ArrowDownCircle,
  Filter,
} from "lucide-react";
import useServerLogs from "../../../hooks/useServerLogs";
import useAuth from "../../../hooks/useAuth";
import { useToast } from "../../../context/ToastContext";
import ConfirmationModal from "../../../components/common/modal/ConfirmationModal";
import "./ServerLogs.css";

const CATEGORIES = [
  { id: "all", label: "All Logs", icon: Terminal },
  { id: "deployments", label: "Deployments", icon: Layers },
  { id: "system", label: "System & Audit", icon: Server },
  { id: "docker", label: "Docker Containers", icon: Box },
  { id: "api", label: "HTTP Requests", icon: Activity },
];

const LOG_LEVELS = [
  { id: "all", label: "ALL" },
  { id: "info", label: "INFO" },
  { id: "success", label: "SUCCESS" },
  { id: "warn", label: "WARN" },
  { id: "error", label: "ERROR" },
];

export default function Logs() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const {
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
    autoRefreshInterval,
    setAutoRefreshInterval,
    autoScroll,
    setAutoScroll,
    refresh,
    clearLogsOnServer,
    exportLogs,
  } = useServerLogs(5000);

  const [copied, setCopied] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState(null);

  const consoleEndRef = useRef(null);
  const consoleBodyRef = useRef(null);

  // Guard: Super Admin only
  if (!user?.isOwner) {
    return (
      <div className="logs-unauthorized">
        <div className="logs-unauthorized-card">
          <ShieldAlert size={48} className="unauthorized-icon" />
          <h2>Super Admin Access Required</h2>
          <p>
            Server administrative logs and container diagnostics are restricted to the platform owner.
          </p>
          <button
            type="button"
            className="logs-btn logs-btn--primary"
            onClick={() => navigate("/dashboard")}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Auto-scroll to bottom if enabled and logs change
  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = async () => {
    if (logs.length === 0) return;
    try {
      const text = logs
        .map(
          (l) =>
            `[${l.timestamp}] [${(l.level || "INFO").toUpperCase()}] [${(
              l.source || "SYSTEM"
            ).toUpperCase()}] ${l.message}`,
        )
        .join("\n");

      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied", `${logs.length} log lines copied to clipboard.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy Failed", "Could not write logs to clipboard.");
    }
  };

  const handleConfirmClear = async () => {
    try {
      setClearing(true);
      const res = await clearLogsOnServer();
      toast.success("Logs Cleared", res.message || "Server logs buffer cleared.");
      setClearModalOpen(false);
    } catch (err) {
      toast.error("Clear Failed", err.response?.data?.message || err.message);
    } finally {
      setClearing(false);
    }
  };

  const scrollToBottom = () => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const formattedPolledTime = useMemo(() => {
    if (!lastUpdated) return "Connecting...";
    return lastUpdated.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastUpdated]);

  return (
    <div className="server-logs-page">
      {/* Header Banner */}
      <div className="logs-header">
        <div className="logs-header-left">
          <button
            type="button"
            className="logs-back-btn"
            onClick={() => navigate("/server")}
          >
            <ArrowLeft size={16} />
            <span>Server Management</span>
          </button>

          <div className="logs-title-group">
            <div className="logs-title-row">
              <h1 className="logs-title">Server System & Audit Logs</h1>
              <span className="super-admin-pill">
                <ShieldCheck size={12} />
                <span>Super Admin</span>
              </span>
            </div>
            <p className="logs-subtitle">
              Live inspection of application runtimes, Docker container output, deployment build logs, and HTTP traffic.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="logs-header-actions">
          {/* Live Tail Status Indicator */}
          <div className="logs-live-indicator">
            <span
              className={`live-ping-dot ${autoRefreshInterval > 0 ? "live-active" : "live-paused"}`}
            />
            <span className="live-text">
              {autoRefreshInterval > 0 ? `Streaming (${autoRefreshInterval / 1000}s)` : "Live Stream Paused"}
            </span>
          </div>

          {/* Polling Interval Selector */}
          <div className="logs-interval-picker">
            <Radio size={12} />
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="logs-interval-select"
            >
              <option value={3000}>Live (3s)</option>
              <option value={5000}>5s Normal</option>
              <option value={10000}>10s</option>
              <option value={0}>Paused</option>
            </select>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            className="logs-btn logs-btn--secondary"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            title="Copy logs to clipboard"
          >
            {copied ? <Check size={15} className="btn-icon-success" /> : <Copy size={15} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            className="logs-btn logs-btn--secondary"
            onClick={exportLogs}
            disabled={logs.length === 0}
            title="Export logs as .log file"
          >
            <Download size={15} />
            <span>Export</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            className={`logs-btn logs-btn--secondary ${isRefreshing ? "refreshing" : ""}`}
            onClick={refresh}
            disabled={isRefreshing}
            title="Fetch latest log entries"
          >
            <RefreshCw size={15} />
            <span>{isRefreshing ? "Fetching..." : "Refresh"}</span>
          </button>

          {/* Clear Buffer Button */}
          <button
            type="button"
            className="logs-btn logs-btn--danger"
            onClick={() => setClearModalOpen(true)}
            title="Purge in-memory log buffer"
          >
            <Trash2 size={15} />
            <span>Clear Buffer</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="logs-category-tabs">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className={`logs-category-tab ${isActive ? "active" : ""}`}
              onClick={() => {
                setCategory(cat.id);
                setExpandedLogId(null);
              }}
            >
              <Icon size={16} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar & Filters Strip */}
      <div className="logs-toolbar">
        {/* Search Input */}
        <div className="logs-search-box">
          <Search size={15} className="logs-search-icon" />
          <input
            type="text"
            placeholder="Filter logs by keyword, project, path, or error..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="logs-search-input"
          />
          {search && (
            <button
              type="button"
              className="logs-search-clear"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Log Level Filter Pills */}
        <div className="logs-level-pills">
          {LOG_LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              className={`logs-level-pill pill--${lvl.id} ${
                level === lvl.id ? "active" : ""
              }`}
              onClick={() => setLevel(lvl.id)}
            >
              {lvl.label}
            </button>
          ))}
        </div>

        {/* Container Selector (when on Docker tab or when containers available) */}
        {category === "docker" && containers.length > 0 && (
          <div className="logs-container-selector">
            <Box size={14} />
            <select
              value={selectedContainer}
              onChange={(e) => setSelectedContainer(e.target.value)}
              className="logs-container-select"
            >
              {containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id} ({c.state})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Log Lines Limit Selector */}
        <div className="logs-limit-selector">
          <span className="limit-label">Limit:</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="logs-limit-select"
          >
            <option value={100}>100 lines</option>
            <option value={250}>250 lines</option>
            <option value={500}>500 lines</option>
            <option value={1000}>1000 lines</option>
          </select>
        </div>

        {/* Auto Scroll Checkbox */}
        <label className="logs-autoscroll-label">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          <span>Auto-Scroll</span>
        </label>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="logs-alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={refresh} className="logs-alert-retry">
            Retry
          </button>
        </div>
      )}

      {/* Terminal Console Window */}
      <div className="logs-terminal-window">
        {/* Terminal Header Bar */}
        <div className="logs-terminal-titlebar">
          <div className="terminal-dots">
            <span className="dot dot--red" />
            <span className="dot dot--yellow" />
            <span className="dot dot--green" />
          </div>

          <div className="terminal-info">
            <Terminal size={14} className="terminal-icon" />
            <span className="terminal-title">
              echohub@{user?.username || "admin"}: /var/log/{category} (Showing {logs.length} of {totalCount} events)
            </span>
          </div>

          <div className="terminal-meta">
            <Clock size={12} />
            <span>Updated {formattedPolledTime}</span>
          </div>
        </div>

        {/* Terminal Body / Log Stream */}
        <div className="logs-terminal-body" ref={consoleBodyRef}>
          {loading && logs.length === 0 ? (
            <div className="logs-terminal-loading">
              <RefreshCw size={24} className="spin-icon" />
              <p>Establishing log stream connection...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="logs-terminal-empty">
              <Terminal size={40} className="empty-icon" />
              <h4>No Log Entries Found</h4>
              <p>
                {search
                  ? `No events matching search query "${search}". Try adjusting your filters.`
                  : "No events recorded in this category yet."}
              </p>
            </div>
          ) : (
            <div className="logs-lines-list">
              {logs.map((log, index) => {
                const lineNum = String(index + 1).padStart(3, "0");
                const isExpanded = expandedLogId === log.id;
                const hasDetails = log.details && Object.keys(log.details).length > 0;

                return (
                  <div
                    key={log.id || index}
                    className={`log-line line--${log.level || "info"} ${
                      isExpanded ? "expanded" : ""
                    }`}
                    onClick={() => {
                      if (hasDetails) {
                        setExpandedLogId(isExpanded ? null : log.id);
                      }
                    }}
                  >
                    <span className="line-num">{lineNum}</span>
                    <span className="line-timestamp">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "--:--:--"}
                    </span>
                    <span className={`line-source-badge source--${log.source || "sys"}`}>
                      {log.source || "sys"}
                    </span>
                    <span className={`line-level-badge level--${log.level || "info"}`}>
                      {log.level || "INFO"}
                    </span>
                    <span className="line-message">{log.message}</span>
                    {hasDetails && (
                      <span className="line-expand-hint">
                        {isExpanded ? "▲ Hide" : "▼ Details"}
                      </span>
                    )}

                    {/* Expandable JSON details block */}
                    {isExpanded && hasDetails && (
                      <div className="log-line-details">
                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={consoleEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Floating Jump Button */}
        {!autoScroll && logs.length > 20 && (
          <button
            type="button"
            className="logs-jump-bottom-btn"
            onClick={scrollToBottom}
            title="Scroll to bottom"
          >
            <ArrowDownCircle size={16} />
            <span>Jump to Latest</span>
          </button>
        )}
      </div>

      {/* Confirmation Modal to Clear Server Logs */}
      <ConfirmationModal
        open={clearModalOpen}
        title="Clear Server Log Buffer"
        message="Are you sure you want to purge in-memory server logs? This action will reset live system and API logs recorded in RAM. Database deployment logs will remain preserved."
        confirmText={clearing ? "Clearing..." : "Yes, Purge Logs"}
        onConfirm={handleConfirmClear}
        onCancel={() => setClearModalOpen(false)}
        variant="danger"
      />
    </div>
  );
}
