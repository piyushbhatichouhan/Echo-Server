import {
  HardDrive,
  Server,
  Cloud,
  FolderGit2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Database,
} from "lucide-react";
import "./StorageStats.css";

export default function StorageStats({ stats, title = "Storage Quota" }) {
  if (!stats) {
    return (
      <div className="eh-storage-card eh-storage-card--skeleton">
        <div className="eh-storage-skeleton-line short" />
        <div className="eh-storage-skeleton-bar" />
        <div className="eh-storage-skeleton-grid">
          <div className="eh-storage-skeleton-chip" />
          <div className="eh-storage-skeleton-chip" />
          <div className="eh-storage-skeleton-chip" />
          <div className="eh-storage-skeleton-chip" />
        </div>
      </div>
    );
  }

  const formatBytes = (bytes) => {
    if (bytes == null) return "Unlimited";
    if (bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let value = Number(bytes);

    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }

    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const hasLimit = stats.limit != null && Number(stats.limit) > 0;
  const usedBytes = Number(stats.used || 0);
  const limitBytes = Number(stats.limit || 0);
  const projectsBytes = Number(stats.projectsUsed || 0);
  const cloudBytes = Number(stats.cloudUsed || 0);

  const percentage = hasLimit
    ? Math.min(100, Math.round((usedBytes / limitBytes) * 100))
    : 0;

  // Segment widths
  const projectPct = hasLimit
    ? Math.min(100, (projectsBytes / limitBytes) * 100)
    : 0;
  const cloudPct = hasLimit
    ? Math.min(Math.max(0, 100 - projectPct), (cloudBytes / limitBytes) * 100)
    : 0;

  const isCritical = hasLimit && percentage >= 90;
  const isWarning = hasLimit && percentage >= 75 && percentage < 90;

  return (
    <div
      className={`eh-storage-card ${
        isCritical ? "is-critical" : isWarning ? "is-warning" : ""
      }`}
    >
      <div className="eh-storage-header">
        <div className="eh-storage-title-area">
          <div className="eh-storage-icon-pill">
            <HardDrive size={18} />
          </div>
          <div className="eh-storage-title-group">
            <div className="eh-storage-title-row">
              <span className="eh-storage-heading">{title}</span>
              {stats.isOwner && (
                <span className="eh-storage-badge eh-storage-badge--owner">
                  <Server size={12} />
                  <span>Server Host Disk</span>
                </span>
              )}
            </div>
            <span className="eh-storage-subtitle">
              {hasLimit
                ? `${formatBytes(usedBytes)} of ${formatBytes(limitBytes)} capacity allocated`
                : `${formatBytes(usedBytes)} utilized across all resources (Unlimited)`}
            </span>
          </div>
        </div>

        <div className="eh-storage-status-area">
          {hasLimit ? (
            <div
              className={`eh-storage-pct-pill ${
                isCritical ? "critical" : isWarning ? "warning" : "normal"
              }`}
            >
              {isCritical ? (
                <AlertTriangle size={13} />
              ) : isWarning ? (
                <AlertTriangle size={13} />
              ) : (
                <CheckCircle2 size={13} />
              )}
              <span>{percentage}% Used</span>
            </div>
          ) : (
            <div className="eh-storage-pct-pill unlimited">
              <Sparkles size={13} />
              <span>Unlimited</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="eh-storage-bar-wrapper">
        <div className="eh-storage-bar-track">
          {hasLimit ? (
            <>
              {projectPct > 0 && (
                <div
                  className="eh-storage-bar-segment projects"
                  style={{ width: `${projectPct}%` }}
                  title={`Projects: ${formatBytes(projectsBytes)} (${projectPct.toFixed(1)}%)`}
                />
              )}
              {cloudPct > 0 && (
                <div
                  className="eh-storage-bar-segment cloud"
                  style={{ width: `${cloudPct}%` }}
                  title={`Cloud Storage: ${formatBytes(cloudBytes)} (${cloudPct.toFixed(1)}%)`}
                />
              )}
              {projectsBytes === 0 && cloudBytes === 0 && usedBytes > 0 && (
                <div
                  className="eh-storage-bar-segment generic"
                  style={{ width: `${percentage}%` }}
                  title={`Used: ${formatBytes(usedBytes)} (${percentage}%)`}
                />
              )}
            </>
          ) : (
            <div className="eh-storage-bar-segment unlimited" style={{ width: "100%" }} />
          )}
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="eh-storage-metrics-grid">
        <div className="eh-storage-metric-chip">
          <div className="eh-storage-metric-header">
            <span className="eh-storage-metric-dot total" />
            <span className="eh-storage-metric-label">Total Allocated</span>
            <Database size={13} className="eh-storage-metric-icon" />
          </div>
          <div className="eh-storage-metric-val">
            {formatBytes(usedBytes)}
          </div>
          <div className="eh-storage-metric-meta">
            {hasLimit ? `${percentage}% of limit` : "Active consumption"}
          </div>
        </div>

        <div className="eh-storage-metric-chip">
          <div className="eh-storage-metric-header">
            <span className="eh-storage-metric-dot projects" />
            <span className="eh-storage-metric-label">Projects Files</span>
            <FolderGit2 size={13} className="eh-storage-metric-icon" />
          </div>
          <div className="eh-storage-metric-val">
            {formatBytes(projectsBytes)}
          </div>
          <div className="eh-storage-metric-meta">
            {hasLimit && limitBytes > 0
              ? `${((projectsBytes / limitBytes) * 100).toFixed(1)}% of quota`
              : "Source & build assets"}
          </div>
        </div>

        <div className="eh-storage-metric-chip">
          <div className="eh-storage-metric-header">
            <span className="eh-storage-metric-dot cloud" />
            <span className="eh-storage-metric-label">Cloud Drives</span>
            <Cloud size={13} className="eh-storage-metric-icon" />
          </div>
          <div className="eh-storage-metric-val">
            {formatBytes(cloudBytes)}
          </div>
          <div className="eh-storage-metric-meta">
            {hasLimit && limitBytes > 0
              ? `${((cloudBytes / limitBytes) * 100).toFixed(1)}% of quota`
              : "User drive storage"}
          </div>
        </div>

        <div className="eh-storage-metric-chip">
          <div className="eh-storage-metric-header">
            <span className="eh-storage-metric-dot free" />
            <span className="eh-storage-metric-label">Available Free</span>
            <Sparkles size={13} className="eh-storage-metric-icon" />
          </div>
          <div className="eh-storage-metric-val free">
            {formatBytes(stats.free)}
          </div>
          <div className="eh-storage-metric-meta">
            {hasLimit ? `${Math.max(0, 100 - percentage)}% remaining` : "Unrestricted space"}
          </div>
        </div>
      </div>
    </div>
  );
}

