import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  BarChart3,
  Globe,
  TrendingUp,
  Server,
  ArrowUpRight,
} from "lucide-react";
import { getProjectAnalytics, simulateProjectTraffic } from "../../../services/analytics.api";
import { useToast } from "../../../context/ToastContext";
import "./ProjectAnalytics.css";

function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes) || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let s = Number(bytes);
  let i = 0;
  while (s >= 1024 && i < units.length - 1) {
    s /= 1024;
    i++;
  }
  return `${s.toFixed(1)} ${units[i]}`;
}

export default function ProjectAnalytics({ projectId, projectName }) {
  const toast = useToast();
  const [timeRange, setTimeRange] = useState("24h");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [hoveredBucket, setHoveredBucket] = useState(null);

  const fetchAnalytics = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await getProjectAnalytics(projectId, timeRange);
      setData(res);
    } catch (err) {
      toast.error("Failed to load analytics", err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, timeRange, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleSimulate = async () => {
    if (simulating) return;
    try {
      setSimulating(true);
      const res = await simulateProjectTraffic(projectId, 25);
      toast.success("Traffic Simulated", res.message || "Simulated 25 telemetry requests.");
      await fetchAnalytics(true);
    } catch (err) {
      toast.error("Simulation failed", err.response?.data?.message || err.message);
    } finally {
      setSimulating(false);
    }
  };

  const summary = data?.summary || {};
  const statusBreakdown = summary.statusBreakdown || {};
  const timeline = data?.timeline || [];
  const topPaths = data?.topPaths || [];

  // Calculate max requests for timeline scale
  const maxRequests = Math.max(...timeline.map((t) => t.requests), 1);

  const formatBucketTime = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (timeRange === "24h") {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getLatencyClass = (ms) => {
    if (ms < 75) return "latency-good";
    if (ms < 200) return "latency-fair";
    return "latency-slow";
  };

  return (
    <div className="eh-analytics-container">
      {/* Header bar with controls */}
      <div className="eh-analytics-header">
        <div className="eh-analytics-title-group">
          <div className="eh-analytics-icon-badge">
            <BarChart3 size={20} />
          </div>
          <div>
            <h2>Traffic & HTTP Analytics</h2>
            <p className="eh-analytics-sub">
              Real-time HTTP metrics, status distribution, and response latencies
            </p>
          </div>
        </div>

        <div className="eh-analytics-actions">
          {/* Time range switcher */}
          <div className="eh-time-switcher">
            <button
              type="button"
              className={`eh-time-btn ${timeRange === "24h" ? "active" : ""}`}
              onClick={() => setTimeRange("24h")}
            >
              Last 24h
            </button>
            <button
              type="button"
              className={`eh-time-btn ${timeRange === "7d" ? "active" : ""}`}
              onClick={() => setTimeRange("7d")}
            >
              Last 7d
            </button>
            <button
              type="button"
              className={`eh-time-btn ${timeRange === "30d" ? "active" : ""}`}
              onClick={() => setTimeRange("30d")}
            >
              Last 30d
            </button>
          </div>

          <button
            type="button"
            className="eh-btn eh-btn--secondary"
            onClick={handleSimulate}
            disabled={simulating}
            title="Generate sample test requests to verify live telemetry"
          >
            <Zap size={15} className={simulating ? "eh-spin" : ""} />
            <span>{simulating ? "Simulating..." : "Simulate Traffic"}</span>
          </button>

          <button
            type="button"
            className="eh-btn eh-btn--secondary eh-btn-icon"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            title="Refresh metrics"
          >
            <RefreshCw size={15} className={refreshing ? "eh-spin" : ""} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="eh-analytics-loading">
          <RefreshCw size={32} className="eh-spin" />
          <p>Analyzing HTTP traffic logs & telemetry...</p>
        </div>
      ) : (
        <>
          {/* Stat Cards Grid */}
          <div className="eh-analytics-grid">
            {/* Total Requests */}
            <div className="eh-stat-card">
              <div className="eh-stat-header">
                <span className="eh-stat-label">Total Requests</span>
                <span className="eh-stat-icon-wrap icon--blue">
                  <Activity size={18} />
                </span>
              </div>
              <div className="eh-stat-value">
                {summary.totalRequests?.toLocaleString() ?? 0}
              </div>
              <div className="eh-stat-footer">
                <span className="eh-stat-pill pill--neutral">
                  <Globe size={13} /> {formatBytes(summary.totalBytesSent)} transferred
                </span>
                <span className="eh-stat-caption">in last {timeRange}</span>
              </div>
            </div>

            {/* Unique Visitors */}
            <div className="eh-stat-card">
              <div className="eh-stat-header">
                <span className="eh-stat-label">Unique Visitors</span>
                <span className="eh-stat-icon-wrap icon--purple">
                  <Users size={18} />
                </span>
              </div>
              <div className="eh-stat-value">
                {summary.uniqueVisitors?.toLocaleString() ?? 0}
              </div>
              <div className="eh-stat-footer">
                <span className="eh-stat-pill pill--purple">
                  <TrendingUp size={13} /> Distinct IPs
                </span>
                <span className="eh-stat-caption">client fingerprint</span>
              </div>
            </div>

            {/* Average Latency */}
            <div className="eh-stat-card">
              <div className="eh-stat-header">
                <span className="eh-stat-label">Average Latency</span>
                <span className="eh-stat-icon-wrap icon--green">
                  <Clock size={18} />
                </span>
              </div>
              <div className="eh-stat-value-group">
                <span className={`eh-stat-value ${getLatencyClass(summary.avgLatencyMs)}`}>
                  {summary.avgLatencyMs ?? 0}
                </span>
                <span className="eh-stat-unit">ms</span>
              </div>
              <div className="eh-stat-footer">
                <span className={`eh-stat-pill ${summary.avgLatencyMs < 100 ? "pill--success" : "pill--amber"}`}>
                  Min {summary.minLatencyMs ?? 0}ms • Max {summary.maxLatencyMs ?? 0}ms
                </span>
                <span className="eh-stat-caption">round-trip</span>
              </div>
            </div>

            {/* Success Rate */}
            <div className="eh-stat-card">
              <div className="eh-stat-header">
                <span className="eh-stat-label">Success Rate</span>
                <span className="eh-stat-icon-wrap icon--teal">
                  <CheckCircle2 size={18} />
                </span>
              </div>
              <div className="eh-stat-value-group">
                <span className="eh-stat-value text--success">
                  {summary.successRate ?? 100}%
                </span>
              </div>
              <div className="eh-stat-footer">
                <span className="eh-stat-pill pill--neutral">
                  {summary.errorRate ?? 0}% errors
                </span>
                <span className="eh-stat-caption">
                  {(statusBreakdown["4xx"]?.count || 0) + (statusBreakdown["5xx"]?.count || 0)} anomalies
                </span>
              </div>
            </div>
          </div>

          {/* HTTP Status Code Breakdown Section */}
          <div className="eh-analytics-card">
            <div className="eh-card-header">
              <div className="eh-card-title-group">
                <h3>HTTP Status Code Distribution</h3>
                <span className="eh-card-subtitle">
                  Proportion of 2xx success, 3xx redirects, 4xx client errors, and 5xx server issues
                </span>
              </div>
            </div>

            {/* Visual stacked percentage bar */}
            <div className="eh-status-stacked-bar">
              {summary.totalRequests > 0 ? (
                <>
                  <div
                    className="eh-status-segment seg--2xx"
                    style={{ width: `${statusBreakdown["2xx"]?.percentage || 0}%` }}
                    title={`2xx Success: ${statusBreakdown["2xx"]?.count} (${statusBreakdown["2xx"]?.percentage}%)`}
                  />
                  <div
                    className="eh-status-segment seg--3xx"
                    style={{ width: `${statusBreakdown["3xx"]?.percentage || 0}%` }}
                    title={`3xx Redirects: ${statusBreakdown["3xx"]?.count} (${statusBreakdown["3xx"]?.percentage}%)`}
                  />
                  <div
                    className="eh-status-segment seg--4xx"
                    style={{ width: `${statusBreakdown["4xx"]?.percentage || 0}%` }}
                    title={`4xx Client Error: ${statusBreakdown["4xx"]?.count} (${statusBreakdown["4xx"]?.percentage}%)`}
                  />
                  <div
                    className="eh-status-segment seg--5xx"
                    style={{ width: `${statusBreakdown["5xx"]?.percentage || 0}%` }}
                    title={`5xx Server Error: ${statusBreakdown["5xx"]?.count} (${statusBreakdown["5xx"]?.percentage}%)`}
                  />
                </>
              ) : (
                <div className="eh-status-segment seg--empty" style={{ width: "100%" }} />
              )}
            </div>

            {/* 4 Status Breakdown Pills */}
            <div className="eh-status-grid">
              {/* 2xx */}
              <div className="eh-status-pill-card pill-card--2xx">
                <div className="eh-status-pill-top">
                  <div className="eh-status-dot dot--2xx" />
                  <span className="eh-status-code">2xx Success</span>
                  <span className="eh-status-percent">{statusBreakdown["2xx"]?.percentage ?? 0}%</span>
                </div>
                <div className="eh-status-pill-bottom">
                  <span className="eh-status-count">{statusBreakdown["2xx"]?.count ?? 0} requests</span>
                  <span className="eh-status-desc">200 OK, 201 Created</span>
                </div>
              </div>

              {/* 3xx */}
              <div className="eh-status-pill-card pill-card--3xx">
                <div className="eh-status-pill-top">
                  <div className="eh-status-dot dot--3xx" />
                  <span className="eh-status-code">3xx Redirects</span>
                  <span className="eh-status-percent">{statusBreakdown["3xx"]?.percentage ?? 0}%</span>
                </div>
                <div className="eh-status-pill-bottom">
                  <span className="eh-status-count">{statusBreakdown["3xx"]?.count ?? 0} requests</span>
                  <span className="eh-status-desc">301, 302, 304 Cache</span>
                </div>
              </div>

              {/* 4xx */}
              <div className="eh-status-pill-card pill-card--4xx">
                <div className="eh-status-pill-top">
                  <div className="eh-status-dot dot--4xx" />
                  <span className="eh-status-code">4xx Client Errors</span>
                  <span className="eh-status-percent">{statusBreakdown["4xx"]?.percentage ?? 0}%</span>
                </div>
                <div className="eh-status-pill-bottom">
                  <span className="eh-status-count">{statusBreakdown["4xx"]?.count ?? 0} requests</span>
                  <span className="eh-status-desc">404 Not Found, 401/403</span>
                </div>
              </div>

              {/* 5xx */}
              <div className="eh-status-pill-card pill-card--5xx">
                <div className="eh-status-pill-top">
                  <div className="eh-status-dot dot--5xx" />
                  <span className="eh-status-code">5xx Server Errors</span>
                  <span className="eh-status-percent">{statusBreakdown["5xx"]?.percentage ?? 0}%</span>
                </div>
                <div className="eh-status-pill-bottom">
                  <span className="eh-status-count">{statusBreakdown["5xx"]?.count ?? 0} requests</span>
                  <span className="eh-status-desc">500 Internal, 502/504</span>
                </div>
              </div>
            </div>
          </div>

          {/* Traffic Volume & Latency Timeline */}
          <div className="eh-analytics-card">
            <div className="eh-card-header">
              <div className="eh-card-title-group">
                <h3>Traffic Volume & Latency Timeline</h3>
                <span className="eh-card-subtitle">
                  Historical query density and average response speed across the selected interval
                </span>
              </div>
              {hoveredBucket && (
                <div className="eh-hover-tooltip-pill">
                  <Clock size={12} />
                  <span>{formatBucketTime(hoveredBucket.time)}</span>
                  <span className="eh-tooltip-divider">•</span>
                  <strong>{hoveredBucket.requests} reqs</strong>
                  <span className="eh-tooltip-divider">•</span>
                  <span>{hoveredBucket.avgLatency}ms avg</span>
                </div>
              )}
            </div>

            {timeline.length === 0 ? (
              <div className="eh-empty-timeline">
                <Activity size={32} />
                <p>No historical traffic logged during this timeframe.</p>
                <button
                  type="button"
                  className="eh-btn eh-btn--secondary"
                  onClick={handleSimulate}
                >
                  Generate sample requests
                </button>
              </div>
            ) : (
              <div className="eh-timeline-chart-wrap">
                <div className="eh-chart-bars">
                  {timeline.map((bucket, index) => {
                    const heightPercent = Math.max(8, Math.round((bucket.requests / maxRequests) * 100));
                    const hasErrors = bucket.errorCount > 0;

                    return (
                      <div
                        key={index}
                        className="eh-chart-column"
                        onMouseEnter={() => setHoveredBucket(bucket)}
                        onMouseLeave={() => setHoveredBucket(null)}
                      >
                        <div className="eh-bar-track">
                          <div
                            className={`eh-bar-fill ${hasErrors ? "bar--with-error" : ""}`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="eh-bar-label">
                          {formatBucketTime(bucket.time)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Top Requested Endpoints */}
          {topPaths.length > 0 && (
            <div className="eh-analytics-card">
              <div className="eh-card-header">
                <div className="eh-card-title-group">
                  <h3>Top Requested Endpoints</h3>
                  <span className="eh-card-subtitle">
                    Most frequently queried routes, latency, and error breakdown
                  </span>
                </div>
              </div>

              <div className="eh-table-responsive">
                <table className="eh-analytics-table">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Path / Route</th>
                      <th>Requests</th>
                      <th>Avg Latency</th>
                      <th>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPaths.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className={`eh-method-badge method--${item.method.toLowerCase()}`}>
                            {item.method}
                          </span>
                        </td>
                        <td className="eh-path-cell">
                          <code>{item.path}</code>
                        </td>
                        <td>
                          <strong>{item.requests.toLocaleString()}</strong>
                        </td>
                        <td>
                          <span className={`eh-latency-badge ${getLatencyClass(item.avgLatency)}`}>
                            {item.avgLatency} ms
                          </span>
                        </td>
                        <td>
                          {item.errors > 0 ? (
                            <span className="eh-badge-error">{item.errors} failed</span>
                          ) : (
                            <span className="eh-badge-ok">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
