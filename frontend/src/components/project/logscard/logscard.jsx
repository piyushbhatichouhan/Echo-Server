import "./logscard.css";

import { useRef, useEffect, useState, useMemo } from "react";
import Card from "../../common/card/card";
import Button from "../../common/button/button";
import DeploymentStepper from "../deploymentstepper/DeploymentStepper";
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  Download,
  ArrowDown,
  Search,
  X,
  AlertTriangle,
  AlertCircle,
  Cpu,
  Layers,
  CheckCircle2,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function LogsCard({
  logs = [],
  onClear,
  status,
  project,
  isConnected = true,
}) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);

  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [latestLogId, setLatestLogId] = useState(null);

  // Category counts
  const categoryCounts = useMemo(() => {
    let runtime = 0;
    let build = 0;
    let system = 0;
    let errors = 0;
    let warnings = 0;

    for (const log of logs) {
      const cat = (log.category || "").toLowerCase();
      const lvl = (log.level || "").toLowerCase();

      if (cat === "runtime") runtime++;
      else if (cat === "build") build++;
      else if (cat === "system") system++;

      if (lvl === "error") errors++;
      else if (lvl === "warn") warnings++;
    }

    return {
      all: logs.length,
      runtime,
      build,
      system,
      errors: errors + warnings,
      errorCount: errors,
      warnCount: warnings,
    };
  }, [logs]);

  // Filtered logs based on active tab and search query
  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return logs.filter((log) => {
      const cat = (log.category || "").toLowerCase();
      const lvl = (log.level || "").toLowerCase();

      // Category filter
      if (activeCategory === "runtime" && cat !== "runtime") return false;
      if (activeCategory === "build" && cat !== "build") return false;
      if (activeCategory === "system" && cat !== "system" && cat !== "health") return false;
      if (activeCategory === "errors" && lvl !== "error" && lvl !== "warn") return false;

      // Search query filter
      if (q && !(log.message || "").toLowerCase().includes(q)) {
        return false;
      }

      return true;
    });
  }, [logs, activeCategory, searchQuery]);

  // Track latest log arrival for subtle highlight
  useEffect(() => {
    if (logs.length === 0) return;
    const newest = logs[logs.length - 1];
    if (newest?.id) {
      setLatestLogId(newest.id);
      const timer = setTimeout(() => setLatestLogId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [logs]);

  // Handle auto-scrolling
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs, autoScroll]);

  // Detect user scroll to pause/resume auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (isAtBottom !== autoScroll) {
      setAutoScroll(isAtBottom);
    }
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map(
        (l, i) =>
          `[${new Date(l.timestamp).toLocaleTimeString()}] [${(l.level || "INFO").toUpperCase()}] [${(l.category || "SYS").toUpperCase()}] ${l.message}`,
      )
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const text = logs
      .map(
        (l) =>
          `[${new Date(l.timestamp).toISOString()}] [${(l.level || "INFO").toUpperCase()}] [${(l.category || "SYS").toUpperCase()}] ${l.message}`,
      )
      .join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project?.name || "deployment"}-logs-${new Date().toISOString().slice(0, 10)}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <div className="eh-logs-card">
        {/* Pipeline Stepper */}
        <DeploymentStepper status={status} logs={logs} />

        {/* Card Header */}
        <div className="eh-logs-header">
          <div className="eh-logs-title-wrap">
            <div className="eh-logs-title-row">
              <h3>Deployment Logs</h3>
              <div className="eh-logs-stats-strip">
                <span className="eh-stat-tag total" title="Total active logs">
                  {categoryCounts.all} lines
                </span>
                {categoryCounts.errorCount > 0 && (
                  <span className="eh-stat-tag errors" title="Total errors">
                    {categoryCounts.errorCount} errors
                  </span>
                )}
                {categoryCounts.warnCount > 0 && (
                  <span className="eh-stat-tag warnings" title="Total warnings">
                    {categoryCounts.warnCount} warnings
                  </span>
                )}
              </div>
            </div>
            <p className="eh-log-subtitle">
              Live deployment pipeline and container runtime terminal
            </p>
          </div>

          <div className="eh-log-actions">
            {/* Live SSE status indicator */}
          

            {/* Auto scroll toggle button */}
            <button
              type="button"
              className={`eh-console-btn ${autoScroll ? "active" : ""}`}
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? "Auto-scroll is ON" : "Auto-scroll is paused"}
            >
              <ArrowDown size={14} className={autoScroll ? "bounce" : ""} />
              <span className="eh-btn-label">Auto-scroll</span>
            </button>

            {/* Copy logs button */}
            <button
              type="button"
              className="eh-console-btn"
              onClick={handleCopyLogs}
              title="Copy filtered logs to clipboard"
            >
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span className="eh-btn-label">{copied ? "Copied!" : "Copy"}</span>
            </button>

            {/* Download logs */}
            <button
              type="button"
              className="eh-console-btn"
              onClick={handleDownloadLogs}
              title="Download raw logs file"
            >
              <Download size={14} />
              <span className="eh-btn-label">Download</span>
            </button>

            {/* Clear logs */}
            <Button variant="secondary" icon={Trash2} onClick={onClear}>
              Clear
            </Button>
          </div>
        </div>

        {/* Toolbar: Category Tabs + Quick Search */}
        <div className="eh-logs-toolbar">
          <div className="eh-category-tabs" role="tablist">
            <button
              type="button"
              className={`eh-category-tab ${activeCategory === "all" ? "active" : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              <Terminal size={13} />
              <span>All Logs</span>
              <span className="eh-tab-count">{categoryCounts.all}</span>
            </button>

            <button
              type="button"
              className={`eh-category-tab ${activeCategory === "runtime" ? "active" : ""}`}
              onClick={() => setActiveCategory("runtime")}
            >
              <Cpu size={13} />
              <span>Runtime</span>
              <span className="eh-tab-count">{categoryCounts.runtime}</span>
            </button>

            <button
              type="button"
              className={`eh-category-tab ${activeCategory === "build" ? "active" : ""}`}
              onClick={() => setActiveCategory("build")}
            >
              <Layers size={13} />
              <span>Build</span>
              <span className="eh-tab-count">{categoryCounts.build}</span>
            </button>

            <button
              type="button"
              className={`eh-category-tab ${activeCategory === "system" ? "active" : ""}`}
              onClick={() => setActiveCategory("system")}
            >
              <Activity size={13} />
              <span>System</span>
              <span className="eh-tab-count">{categoryCounts.system}</span>
            </button>

            <button
              type="button"
              className={`eh-category-tab ${activeCategory === "errors" ? "active" : ""} ${
                categoryCounts.errors > 0 ? "has-errors" : ""
              }`}
              onClick={() => setActiveCategory("errors")}
            >
              <AlertTriangle size={13} />
              <span>Errors</span>
              {categoryCounts.errors > 0 && (
                <span className="eh-tab-count error-badge">
                  {categoryCounts.errors}
                </span>
              )}
            </button>
          </div>

          <div className="eh-logs-search-wrap">
            <Search size={13} className="eh-search-icon" />
            <input
              type="text"
              placeholder="Search in logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="eh-logs-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="eh-search-clear"
                onClick={() => setSearchQuery("")}
                title="Clear filter"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Terminal Console View */}
        <div className="eh-log-console">
          <div
            className="eh-log-container"
            ref={containerRef}
            onScroll={handleScroll}
          >
            {logs.length === 0 ? (
              <div className="eh-log-empty">
                <Terminal size={36} />
                <h4>No deployment logs</h4>
                <p>Deploy your project to stream live container & build output.</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="eh-log-empty">
                <Search size={32} />
                <h4>No matching logs found</h4>
                <p>
                  No logs matching category &ldquo;{activeCategory}&rdquo; and query &ldquo;
                  {searchQuery}&rdquo;.
                </p>
                <button
                  type="button"
                  className="eh-clear-filter-btn"
                  onClick={() => {
                    setActiveCategory("all");
                    setSearchQuery("");
                  }}
                >
                  Reset filters
                </button>
              </div>
            ) : (
              filteredLogs.map((log, index) => {
                const level = (log.level || "info").toLowerCase();
                const category = (log.category || "system").toLowerCase();
                const isStep = level === "step";

                return (
                  <div
                    key={log.id || `log_${index}`}
                    className={`eh-log-line log--${level} cat--${category} ${
                      log.id === latestLogId ? "eh-log-latest" : ""
                    }`}
                  >
                    <span className="eh-log-index">
                      {(index + 1).toString().padStart(3, "0")}
                    </span>

                    <span className="eh-log-time">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleTimeString([], {
                            hour12: false,
                          })
                        : "--:--:--"}
                    </span>

                    {/* Category Tag */}
                    <span className={`eh-log-cat-pill cat-${category}`}>
                      {category === "runtime"
                        ? "APP"
                        : category === "build"
                          ? "BUILD"
                          : category === "health"
                            ? "HEALTH"
                            : "SYS"}
                    </span>

                    {/* Level Badge if non-info */}
                    {level !== "info" && !isStep && (
                      <span className={`eh-log-level-pill lvl-${level}`}>
                        {level === "error"
                          ? "ERR"
                          : level === "warn"
                            ? "WARN"
                            : level === "success"
                              ? "OK"
                              : level.toUpperCase()}
                      </span>
                    )}

                    {isStep ? (
                      <div className="eh-log-step-wrapper">
                        <span className="eh-step-accent-icon">✦</span>
                        <span className="eh-step-text">{log.message}</span>
                      </div>
                    ) : (
                      <span className="eh-log-message">{log.message}</span>
                    )}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Floating resume auto-scroll button when scrolled up */}
          {!autoScroll && logs.length > 0 && (
            <button
              type="button"
              className="eh-floating-scroll-btn"
              onClick={scrollToBottom}
            >
              <ArrowDown size={14} />
              <span>Resume Auto-scroll</span>
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

