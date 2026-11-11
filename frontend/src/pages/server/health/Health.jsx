import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Cpu,
  HardDrive,
  Database,
  Box,
  Layers,
  Server,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Radio,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  Gauge,
  MemoryStick,
  Wifi,
  Trash2,
  Users,
  Search,
} from "lucide-react";
import useServerHealth from "../../../hooks/useServerHealth";
import useAuth from "../../../hooks/useAuth";
import { cleanupPorts, pruneDocker } from "../../../services/server.api";
import { getSuperAdminUserAnalytics } from "../../../services/analytics.api";
import { useToast } from "../../../context/ToastContext";
import "./Health.css";

function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let s = Number(bytes);
  let i = 0;
  while (s >= 1024 && i < units.length - 1) {
    s /= 1024;
    i++;
  }
  return `${s.toFixed(1)} ${units[i]}`;
}

export default function Health() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const {
    health,
    loading,
    error,
    lastUpdated,
    isRefreshing,
    refresh,
    autoRefreshInterval,
    setAutoRefreshInterval,
  } = useServerHealth(10000);

  const [cleaningPorts, setCleaningPorts] = useState(false);
  const [pruningDocker, setPruningDocker] = useState(false);

  const [userAnalytics, setUserAnalytics] = useState(null);
  const [userAnalyticsLoading, setUserAnalyticsLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");

  const fetchUserAnalytics = useCallback(async () => {
    try {
      setUserAnalyticsLoading(true);
      const data = await getSuperAdminUserAnalytics();
      setUserAnalytics(data);
    } catch (err) {
      console.warn("Failed to fetch superadmin user analytics:", err.message);
    } finally {
      setUserAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.isOwner) {
      fetchUserAnalytics();
    }
  }, [user?.isOwner, fetchUserAnalytics]);

  const filteredUsers = useMemo(() => {
    const list = userAnalytics?.users || [];
    if (!userSearchTerm.trim()) return list;
    const term = userSearchTerm.toLowerCase();
    return list.filter(
      (u) =>
        u.username?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term),
    );
  }, [userAnalytics?.users, userSearchTerm]);

  // Format time since last update
  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return "Just now";
    return lastUpdated.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastUpdated]);

  // Guard: Super admin only
  if (!user?.isOwner) {
    return (
      <div className="health-unauthorized">
        <div className="health-unauthorized-card">
          <ShieldAlert size={48} className="unauthorized-icon" />
          <h2>Super Admin Access Required</h2>
          <p>
            Server infrastructure health telemetry is restricted to the platform owner.
          </p>
          <button
            type="button"
            className="health-btn health-btn--primary"
            onClick={() => navigate("/dashboard")}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleCleanupPorts = async () => {
    if (cleaningPorts) return;
    try {
      setCleaningPorts(true);
      const res = await cleanupPorts();
      toast.success(
        "Ports Cleaned",
        res.message || `Cleaned ${res.releasedCount || 0} pseudo-allocated ports.`,
      );
      refresh();
    } catch (err) {
      toast.error("Cleanup Failed", err.response?.data?.message || err.message);
    } finally {
      setCleaningPorts(false);
    }
  };

  const handlePruneDocker = async () => {
    if (pruningDocker) return;
    try {
      setPruningDocker(true);
      const res = await pruneDocker();
      toast.success(
        "Docker Cache Purged",
        res.message ||
          `Pruned ${res.imagesDeleted || 0} images and reclaimed ${res.reclaimedMB || 0} MB.`,
      );
      refresh();
    } catch (err) {
      toast.error("Prune Failed", err.response?.data?.message || err.message);
    } finally {
      setPruningDocker(false);
    }
  };

  const overallStatus = health?.overallStatus || "healthy";

  const statusConfig = {
    healthy: {
      label: "All Systems Operational",
      badgeClass: "badge--healthy",
      icon: CheckCircle2,
      bannerText: "All server components, database nodes, and container runtimes are operating normally.",
    },
    degraded: {
      label: "System Degraded",
      badgeClass: "badge--warning",
      icon: AlertTriangle,
      bannerText: "One or more system telemetry monitors reported high utilization or warnings.",
    },
    critical: {
      label: "Critical Attention Required",
      badgeClass: "badge--critical",
      icon: XCircle,
      bannerText: "A core service (database or container daemon) is currently unreachable or failing.",
    },
  }[overallStatus] || {
    label: "Monitoring Active",
    badgeClass: "badge--healthy",
    icon: Activity,
    bannerText: "Telemetry polling active.",
  };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="server-health-page">
      {/* Header Banner */}
      <div className="health-header">
        <div className="health-header-left">
          <button
            type="button"
            className="health-back-btn"
            onClick={() => navigate("/server")}
          >
            <ArrowLeft size={16} />
            <span>Server Management</span>
          </button>

          <div className="health-title-group">
            <div className="health-title-row">
              <h1 className="health-title">Server Infrastructure Health</h1>
              <span className="super-admin-pill">
                <ShieldCheck size={12} />
                <span>Super Admin</span>
              </span>
            </div>
            <p className="health-subtitle">
              Host hardware diagnostics, PostgreSQL performance, Docker daemon status, and process telemetry.
            </p>
          </div>
        </div>

        {/* Header Actions / Telemetry Controls */}
        <div className="health-header-actions">
          {/* Status Badge */}
          <div className={`health-status-badge ${statusConfig.badgeClass}`}>
            <span className="health-ping-dot" />
            <StatusIcon size={14} />
            <span>{statusConfig.label}</span>
          </div>

          {/* Auto Refresh Interval Selector */}
          <div className="health-interval-selector">
            <span className="interval-label">
              <Radio size={12} />
              <span>Interval:</span>
            </span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="health-interval-select"
            >
              <option value={5000}>5s (Live)</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={0}>Paused</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            type="button"
            className={`health-btn health-btn--secondary ${isRefreshing || userAnalyticsLoading ? "refreshing" : ""}`}
            onClick={() => {
              refresh();
              fetchUserAnalytics();
            }}
            disabled={isRefreshing || userAnalyticsLoading}
            title="Refresh metrics immediately"
          >
            <RefreshCw size={15} />
            <span>{isRefreshing || userAnalyticsLoading ? "Fetching..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Error Alert if request failed */}
      {error && (
        <div className="health-alert health-alert--error">
          <XCircle size={18} />
          <div className="health-alert-content">
            <strong>Failed to fetch health telemetry:</strong> {error}
          </div>
          <button type="button" className="health-alert-retry" onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {/* Live System Status Strip Banner */}
      {health && (
        <div className={`health-banner ${statusConfig.badgeClass}`}>
          <div className="health-banner-left">
            <StatusIcon size={18} className="health-banner-icon" />
            <div>
              <span className="health-banner-heading">{statusConfig.label}</span>
              <p className="health-banner-desc">{statusConfig.bannerText}</p>
            </div>
          </div>
          <div className="health-banner-meta">
            <Clock size={13} />
            <span>Last polled: {formattedLastUpdated}</span>
          </div>
        </div>
      )}

      {/* Skeleton Loading State */}
      {loading && !health && (
        <div className="health-skeleton-container">
          <div className="health-gauges-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="health-card-skeleton" />
            ))}
          </div>
          <div className="health-details-grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="health-card-skeleton large" />
            ))}
          </div>
        </div>
      )}

      {/* Main Health Content */}
      {health && (
        <div className="health-content">
          {/* Primary Hardware Gauges Strip (4 Cards) */}
          <div className="health-gauges-grid">
            {/* 1. CPU Card */}
            <div className="health-card gauge-card">
              <div className="gauge-header">
                <div className="gauge-icon-wrapper icon--cpu">
                  <Cpu size={20} />
                </div>
                <div className="gauge-title-box">
                  <span className="gauge-title">Host Processor</span>
                  <span className="gauge-subtitle">
                    {health.cpu?.cores} Cores • {health.cpu?.speedMhz ? `${health.cpu.speedMhz} MHz` : "Multi-Thread"}
                  </span>
                </div>
                <span className="gauge-value-pill">
                  {health.cpu?.usagePercent}%
                </span>
              </div>

              <div className="gauge-progress-track">
                <div
                  className={`gauge-progress-bar ${
                    health.cpu?.usagePercent > 85
                      ? "bar--danger"
                      : health.cpu?.usagePercent > 65
                        ? "bar--warning"
                        : "bar--normal"
                  }`}
                  style={{ width: `${Math.max(4, health.cpu?.usagePercent || 0)}%` }}
                />
              </div>

              <div className="gauge-meta-row">
                <span className="gauge-meta-label">Model:</span>
                <span className="gauge-meta-value truncate" title={health.cpu?.model}>
                  {health.cpu?.model}
                </span>
              </div>

              <div className="load-avg-strip">
                <span className="load-avg-tag">
                  1m: <strong>{health.cpu?.loadAverage?.[0]?.toFixed(2) ?? "0.00"}</strong>
                </span>
                <span className="load-avg-tag">
                  5m: <strong>{health.cpu?.loadAverage?.[1]?.toFixed(2) ?? "0.00"}</strong>
                </span>
                <span className="load-avg-tag">
                  15m: <strong>{health.cpu?.loadAverage?.[2]?.toFixed(2) ?? "0.00"}</strong>
                </span>
              </div>
            </div>

            {/* 2. RAM Memory Card */}
            <div className="health-card gauge-card">
              <div className="gauge-header">
                <div className="gauge-icon-wrapper icon--memory">
                  <MemoryStick size={20} />
                </div>
                <div className="gauge-title-box">
                  <span className="gauge-title">Physical Memory</span>
                  <span className="gauge-subtitle">
                    {formatBytes(health.memory?.usedBytes)} / {formatBytes(health.memory?.totalBytes)}
                  </span>
                </div>
                <span className="gauge-value-pill">
                  {health.memory?.usagePercent}%
                </span>
              </div>

              <div className="gauge-progress-track">
                <div
                  className={`gauge-progress-bar ${
                    health.memory?.usagePercent > 90
                      ? "bar--danger"
                      : health.memory?.usagePercent > 75
                        ? "bar--warning"
                        : "bar--normal"
                  }`}
                  style={{ width: `${Math.max(4, health.memory?.usagePercent || 0)}%` }}
                />
              </div>

              <div className="gauge-meta-row">
                <span className="gauge-meta-label">Free RAM:</span>
                <span className="gauge-meta-value highlight">
                  {formatBytes(health.memory?.freeBytes)} Available
                </span>
              </div>

              <div className="gauge-meta-row">
                <span className="gauge-meta-label">Node Process RSS:</span>
                <span className="gauge-meta-value">
                  {formatBytes(health.memory?.process?.rss)}
                </span>
              </div>
            </div>

            {/* 3. Disk Storage Card */}
            <div className="health-card gauge-card">
              <div className="gauge-header">
                <div className="gauge-icon-wrapper icon--disk">
                  <HardDrive size={20} />
                </div>
                <div className="gauge-title-box">
                  <span className="gauge-title">Storage Drive</span>
                  <span className="gauge-subtitle">
                    Mount {health.disk?.mount || "/"}
                  </span>
                </div>
                <span className="gauge-value-pill">
                  {health.disk?.percentage ?? 0}%
                </span>
              </div>

              <div className="gauge-progress-track">
                <div
                  className={`gauge-progress-bar ${
                    (health.disk?.percentage || 0) > 90
                      ? "bar--danger"
                      : (health.disk?.percentage || 0) > 75
                        ? "bar--warning"
                        : "bar--normal"
                  }`}
                  style={{ width: `${Math.max(4, health.disk?.percentage || 0)}%` }}
                />
              </div>

              <div className="gauge-meta-row">
                <span className="gauge-meta-label">Allocated / Total:</span>
                <span className="gauge-meta-value">
                  {formatBytes(health.disk?.used)} / {formatBytes(health.disk?.total)}
                </span>
              </div>

              <div className="gauge-meta-row">
                <span className="gauge-meta-label">Remaining Space:</span>
                <span className="gauge-meta-value highlight">
                  {formatBytes(health.disk?.free)} Free
                </span>
              </div>
            </div>

            {/* 4. Container Workloads Card */}
            <div className="health-card gauge-card">
              <div className="gauge-header">
                <div className="gauge-icon-wrapper icon--docker">
                  <Box size={20} />
                </div>
                <div className="gauge-title-box">
                  <span className="gauge-title">Container Engine</span>
                  <span className="gauge-subtitle">
                    {health.docker?.connected ? "Docker Daemon Active" : "Daemon Offline"}
                  </span>
                </div>
                <span
                  className={`gauge-value-pill ${
                    health.docker?.connected ? "pill--success" : "pill--danger"
                  }`}
                >
                  {health.docker?.connected ? "ONLINE" : "OFFLINE"}
                </span>
              </div>

              <div className="docker-summary-counts">
                <div className="docker-mini-tile tile--running">
                  <span className="mini-tile-val">{health.docker?.containers?.running ?? 0}</span>
                  <span className="mini-tile-lbl">Running</span>
                </div>
                <div className="docker-mini-tile tile--paused">
                  <span className="mini-tile-val">{health.docker?.containers?.paused ?? 0}</span>
                  <span className="mini-tile-lbl">Paused</span>
                </div>
                <div className="docker-mini-tile tile--stopped">
                  <span className="mini-tile-val">{health.docker?.containers?.stopped ?? 0}</span>
                  <span className="mini-tile-lbl">Stopped</span>
                </div>
                <div className="docker-mini-tile tile--images">
                  <span className="mini-tile-val">{health.docker?.images ?? 0}</span>
                  <span className="mini-tile-lbl">Images</span>
                </div>
              </div>

              <div className="gauge-meta-row">
                <span className="gauge-meta-label">Total Containers:</span>
                <span className="gauge-meta-value">
                  {health.docker?.containers?.total ?? 0} provisioned
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic Checks Strip */}
          {health.checks && health.checks.length > 0 && (
            <div className="health-card checks-section">
              <div className="section-card-header">
                <div className="section-card-title-group">
                  <ShieldCheck size={18} className="section-icon" />
                  <h3>Subsystem Health Checks</h3>
                </div>
                <span className="checks-count-badge">
                  {health.checks.filter((c) => c.status === "pass").length} / {health.checks.length} Passed
                </span>
              </div>

              <div className="checks-grid">
                {health.checks.map((check, idx) => (
                  <div key={idx} className={`check-item check--${check.status}`}>
                    <div className="check-icon">
                      {check.status === "pass" ? (
                        <CheckCircle2 size={16} />
                      ) : check.status === "warn" ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                    </div>
                    <div className="check-body">
                      <span className="check-component">{check.component}</span>
                      <span className="check-message">{check.message}</span>
                    </div>
                    <span className={`check-status-tag tag--${check.status}`}>
                      {check.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Telemetry Grid: Database, Docker Engine, Runtime & Network */}
          <div className="health-details-grid">
            {/* Database Deep Telemetry */}
            <div className="health-card detail-card">
              <div className="section-card-header">
                <div className="section-card-title-group">
                  <Database size={18} className="section-icon" />
                  <div>
                    <h3>PostgreSQL Database</h3>
                    <span className="card-sub">{health.database?.version || "PostgreSQL Service"}</span>
                  </div>
                </div>

                <div
                  className={`status-pill ${
                    health.database?.connected ? "pill--success" : "pill--danger"
                  }`}
                >
                  <span className="status-ping" />
                  <span>{health.database?.connected ? "Connected" : "Disconnected"}</span>
                </div>
              </div>

              <div className="telemetry-stat-list">
                <div className="telemetry-row">
                  <span className="row-label">Probe Latency:</span>
                  <span className="row-value highlight">
                    {health.database?.latencyMs != null ? `${health.database.latencyMs} ms` : "N/A"}
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Database Disk Size:</span>
                  <span className="row-value">{health.database?.dbSize}</span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Active Connections:</span>
                  <span className="row-value">
                    {health.database?.activeConnections} / {health.database?.maxConnections} max
                  </span>
                </div>

                <div className="telemetry-progress-block">
                  <div className="block-label-row">
                    <span>Connection Utilization</span>
                    <span>
                      {Math.round(
                        ((health.database?.activeConnections || 1) /
                          (health.database?.maxConnections || 100)) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="gauge-progress-track">
                    <div
                      className="gauge-progress-bar bar--normal"
                      style={{
                        width: `${Math.max(
                          2,
                          Math.round(
                            ((health.database?.activeConnections || 1) /
                              (health.database?.maxConnections || 100)) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Connection Pool State:</span>
                  <span className="row-value">
                    {health.database?.pool?.total ?? 0} total • {health.database?.pool?.idle ?? 0} idle •{" "}
                    {health.database?.pool?.waiting ?? 0} waiting
                  </span>
                </div>
              </div>

              {health.database?.error && (
                <div className="health-error-box">
                  <strong>Database Error:</strong> {health.database.error}
                </div>
              )}
            </div>

            {/* Docker Daemon Deep Telemetry */}
            <div className="health-card detail-card">
              <div className="section-card-header">
                <div className="section-card-title-group">
                  <Box size={18} className="section-icon" />
                  <div>
                    <h3>Docker Container Host</h3>
                    <span className="card-sub">
                      {health.docker?.serverVersion || "Container Engine"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    className="quick-clean-btn"
                    onClick={handlePruneDocker}
                    disabled={pruningDocker}
                    title="Prune dangling image layers and build cache"
                  >
                    <Trash2 size={13} />
                    <span>{pruningDocker ? "Pruning..." : "Prune Cache"}</span>
                  </button>
                  <div
                    className={`status-pill ${
                      health.docker?.connected ? "pill--success" : "pill--danger"
                    }`}
                  >
                    <span className="status-ping" />
                    <span>{health.docker?.connected ? "Engine Ready" : "Daemon Offline"}</span>
                  </div>
                </div>
              </div>

              <div className="telemetry-stat-list">
                <div className="telemetry-row">
                  <span className="row-label">Storage Driver:</span>
                  <span className="row-value code-pill">{health.docker?.storageDriver || "N/A"}</span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Daemon OS:</span>
                  <span className="row-value">{health.docker?.operatingSystem || "Linux / Docker"}</span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Container Workloads:</span>
                  <span className="row-value">
                    {health.docker?.containers?.running ?? 0} running, {health.docker?.containers?.stopped ?? 0} stopped
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Stored Image Layers:</span>
                  <span className="row-value">{health.docker?.images ?? 0} cached images</span>
                </div>
              </div>

              {health.docker?.error && (
                <div className="health-error-box">
                  <strong>Docker Notice:</strong> {health.docker.error}
                </div>
              )}
            </div>

            {/* Node.js Process & V8 Memory */}
            <div className="health-card detail-card">
              <div className="section-card-header">
                <div className="section-card-title-group">
                  <Terminal size={18} className="section-icon" />
                  <div>
                    <h3>Node.js Backend Process</h3>
                    <span className="card-sub">{health.system?.nodeVersion} • PID {health.system?.pid}</span>
                  </div>
                </div>

                <div className="status-pill pill--success">
                  <span className="status-ping" />
                  <span>Online</span>
                </div>
              </div>

              <div className="telemetry-stat-list">
                <div className="telemetry-row">
                  <span className="row-label">Process Uptime:</span>
                  <span className="row-value highlight">
                    {health.system?.processUptimeFormatted || "Active"}
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">V8 Heap Allocation:</span>
                  <span className="row-value">
                    {formatBytes(health.memory?.process?.heapUsed)} / {formatBytes(health.memory?.process?.heapTotal)}
                  </span>
                </div>

                <div className="telemetry-progress-block">
                  <div className="block-label-row">
                    <span>Heap Utilization</span>
                    <span>{health.memory?.process?.heapPercent ?? 0}%</span>
                  </div>
                  <div className="gauge-progress-track">
                    <div
                      className="gauge-progress-bar bar--normal"
                      style={{ width: `${Math.max(4, health.memory?.process?.heapPercent || 0)}%` }}
                    />
                  </div>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Resident Set Size (RSS):</span>
                  <span className="row-value">
                    {formatBytes(health.memory?.process?.rss)}
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">External C++ Memory:</span>
                  <span className="row-value">
                    {formatBytes(health.memory?.process?.external)}
                  </span>
                </div>
              </div>
            </div>

            {/* Network & Port Allocation Pool */}
            <div className="health-card detail-card">
              <div className="section-card-header">
                <div className="section-card-title-group">
                  <Wifi size={18} className="section-icon" />
                  <div>
                    <h3>Port Pool & Networking</h3>
                    <span className="card-sub">Dynamic reverse routing range: {health.network?.portRange}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="quick-clean-btn"
                  onClick={handleCleanupPorts}
                  disabled={cleaningPorts}
                  title="Purge orphaned deployment ports"
                >
                  <Zap size={13} />
                  <span>{cleaningPorts ? "Cleaning..." : "Purge Ports"}</span>
                </button>
              </div>

              <div className="telemetry-stat-list">
                <div className="telemetry-row">
                  <span className="row-label">Allocated Ports:</span>
                  <span className="row-value highlight">
                    {health.network?.allocatedPorts ?? 0} active deployments
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Free Allocatable Slots:</span>
                  <span className="row-value">
                    {health.network?.freePorts ?? 999} of {health.network?.totalAllocatablePorts ?? 999}
                  </span>
                </div>

                <div className="telemetry-progress-block">
                  <div className="block-label-row">
                    <span>Port Pool Saturation</span>
                    <span>{health.network?.utilizationPercent ?? 0}%</span>
                  </div>
                  <div className="gauge-progress-track">
                    <div
                      className="gauge-progress-bar bar--normal"
                      style={{ width: `${Math.max(2, health.network?.utilizationPercent || 0)}%` }}
                    />
                  </div>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Host Uptime:</span>
                  <span className="row-value">
                    {health.system?.uptimeFormatted}
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Host OS & Architecture:</span>
                  <span className="row-value">
                    {health.system?.type} ({health.system?.arch}) • {health.system?.hostname}
                  </span>
                </div>
              </div>
            </div>

            {/* Workload Protection & Resource Shields */}
            <div className="health-card detail-card">
              <div className="section-card-header">
                <div className="section-card-title-group">
                  <ShieldCheck size={18} className="section-icon" style={{ color: "#38bdf8" }} />
                  <div>
                    <h3>Workload Protection & Shields</h3>
                    <span className="card-sub">OOM Prevention • Build Governor • Circuit Breakers</span>
                  </div>
                </div>

                <div className="status-pill pill--success">
                  <span className="status-ping" />
                  <span>Shields Armed</span>
                </div>
              </div>

              <div className="telemetry-stat-list">
                <div className="telemetry-row">
                  <span className="row-label">Per-App Memory Ceiling:</span>
                  <span className="row-value highlight">
                    {health.safetyLimits?.maxMemoryMB ? `${health.safetyLimits.maxMemoryMB} MB / container` : "256 MB"}
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Memory Soft Guarantee:</span>
                  <span className="row-value">
                    {health.safetyLimits?.memoryReservationMB ? `${health.safetyLimits.memoryReservationMB} MB reserved` : "64 MB"}
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Container CPU Cap:</span>
                  <span className="row-value">
                    {health.safetyLimits?.maxCpus ? `${health.safetyLimits.maxCpus} Cores max` : "1.5 Cores"}
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Build Concurrency Governor:</span>
                  <span className="row-value code-pill">
                    {health.buildQueue?.active ?? 0} compiling • {health.buildQueue?.queued ?? 0} queued (Limit: {health.buildQueue?.maxConcurrent ?? 1})
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Lifetime Builds Processed:</span>
                  <span className="row-value">
                    {health.buildQueue?.totalProcessed ?? 0} completed
                  </span>
                </div>

                <div className="telemetry-row">
                  <span className="row-label">Pre-Flight Circuit Breaker:</span>
                  <span className="row-value" style={{ color: "#4ade80", fontWeight: 600 }}>
                    Active (Requires &gt;250MB RAM &amp; &gt;2.5GB Disk)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================
              Per-User HTTP Traffic & Analytics (Super Admin)
              ========================================================= */}
          <div className="health-card user-analytics-card">
            <div className="section-card-header">
              <div className="section-card-title-group">
                <Users size={18} className="section-icon" style={{ color: "#38bdf8" }} />
                <div>
                  <h3>Per-User Traffic &amp; Analytics</h3>
                  <span className="card-sub">
                    Tenant HTTP traffic telemetry, request distribution, response times, and active containers
                  </span>
                </div>
              </div>

              <div className="user-analytics-actions">
                <div className="user-search-wrap">
                  <Search size={14} className="user-search-icon" />
                  <input
                    type="text"
                    placeholder="Search user or email..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="user-search-input"
                  />
                  {userSearchTerm && (
                    <button
                      type="button"
                      className="user-search-clear"
                      onClick={() => setUserSearchTerm("")}
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="health-btn health-btn--secondary user-refresh-btn"
                  onClick={fetchUserAnalytics}
                  disabled={userAnalyticsLoading}
                  title="Refresh user traffic telemetry"
                >
                  <RefreshCw size={13} className={userAnalyticsLoading ? "spin" : ""} />
                  <span>{userAnalyticsLoading ? "Updating..." : "Refresh"}</span>
                </button>
              </div>
            </div>

            {/* Platform Quick Summary Stats */}
            {userAnalytics?.platform && (
              <div className="platform-traffic-summary-strip">
                <div className="summary-stat-item">
                  <span className="stat-label">30-Day Platform Requests:</span>
                  <span className="stat-val highlight">{userAnalytics.platform.totalRequests30d?.toLocaleString() ?? 0}</span>
                </div>
                <div className="summary-stat-divider" />
                <div className="summary-stat-item">
                  <span className="stat-label">Past 24h Queries:</span>
                  <span className="stat-val">{userAnalytics.platform.totalRequests24h?.toLocaleString() ?? 0}</span>
                </div>
                <div className="summary-stat-divider" />
                <div className="summary-stat-item">
                  <span className="stat-label">Unique Visitors:</span>
                  <span className="stat-val">{userAnalytics.platform.uniqueVisitors30d?.toLocaleString() ?? 0}</span>
                </div>
                <div className="summary-stat-divider" />
                <div className="summary-stat-item">
                  <span className="stat-label">Platform Avg Latency:</span>
                  <span className="stat-val">{userAnalytics.platform.avgLatencyMs ?? 0} ms</span>
                </div>
                <div className="summary-stat-divider" />
                <div className="summary-stat-item">
                  <span className="stat-label">Total Bandwidth:</span>
                  <span className="stat-val">{formatBytes(userAnalytics.platform.totalBytesSent)}</span>
                </div>
              </div>
            )}

            {/* User Breakdown Table */}
            <div className="user-analytics-table-wrap">
              <table className="user-analytics-table">
                <thead>
                  <tr>
                    <th>User Account</th>
                    <th>Hosted Projects</th>
                    <th>30d Requests</th>
                    <th>Unique Visitors</th>
                    <th>Avg Latency</th>
                    <th>Bandwidth</th>
                    <th>Status / Health</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="user-table-empty">
                        {userAnalyticsLoading
                          ? "Loading tenant traffic telemetry..."
                          : `No user accounts found matching "${userSearchTerm}"`}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const hasActivity = u.totalRequests30d > 0;
                      return (
                        <tr key={u.userId} className="user-table-row">
                          <td className="user-identity-cell">
                            <div className="user-avatar-badge">
                              {u.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-info-text">
                              <div className="user-name-row">
                                <strong className="user-username">{u.username}</strong>
                                {u.isOwner && (
                                  <span className="user-badge-owner">SuperAdmin</span>
                                )}
                                {u.canCustomSubdomain && (
                                  <span className="user-badge-subdomain" title="Has permission to assign custom subdomains">
                                    Custom Domain
                                  </span>
                                )}
                              </div>
                              <span className="user-email">{u.email}</span>
                            </div>
                          </td>

                          <td>
                            <span className="user-projects-pill">
                              <strong>{u.runningProjectCount}</strong> running / {u.projectCount} total
                            </span>
                          </td>

                          <td>
                            <div className="requests-cell">
                              <strong>{u.totalRequests30d.toLocaleString()}</strong>
                              <span className="requests-sub">
                                +{u.totalRequests24h.toLocaleString()} in 24h
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="visitors-pill">
                              <Users size={12} /> {u.uniqueVisitors30d.toLocaleString()}
                            </span>
                          </td>

                          <td>
                            <span className={`latency-pill ${
                              u.avgLatencyMs < 80 ? "pill--success" : u.avgLatencyMs < 200 ? "pill--warning" : "pill--slow"
                            }`}>
                              {u.avgLatencyMs > 0 ? `${u.avgLatencyMs} ms` : "—"}
                            </span>
                          </td>

                          <td>
                            <span className="bandwidth-text">
                              {formatBytes(u.totalBytesSent)}
                            </span>
                          </td>

                          <td>
                            {hasActivity ? (
                              <div className="status-mini-stack">
                                <div className="status-mini-bar">
                                  <span
                                    className="mini-seg mini-seg--2xx"
                                    style={{
                                      width: `${Math.round(((u.statusBreakdown["2xx"] || 0) / u.totalRequests30d) * 100)}%`,
                                    }}
                                  />
                                  <span
                                    className="mini-seg mini-seg--err"
                                    style={{
                                      width: `${Math.min(100, Math.round(((u.statusBreakdown["4xx"] + u.statusBreakdown["5xx"]) / u.totalRequests30d) * 100))}%`,
                                    }}
                                  />
                                </div>
                                <span className="status-mini-label">
                                  {u.errorRate > 0 ? `${u.errorRate}% errors` : "100% OK"}
                                </span>
                              </div>
                            ) : (
                              <span className="user-idle-badge">Idle / No Traffic</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
