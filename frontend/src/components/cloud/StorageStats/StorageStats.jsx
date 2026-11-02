import "./StorageStats.css";

export default function StorageStats({ stats }) {
  if (!stats) return null;

  const formatBytes = (bytes) => {
    if (bytes == null) return "Unlimited";

    const units = ["B", "KB", "MB", "GB", "TB"];

    let i = 0;
    let value = bytes; 

    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }

    return `${value.toFixed(1)} ${units[i]}`;
  };

  const percentage =
    !stats.limit || stats.limit === 0
      ? 0
      : Math.min(100, Math.round(((stats.used || 0) / stats.limit) * 100));

  return (
    <div className="storage-card">
      <div className="storage-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Storage</span>
        {stats.isOwner && (
          <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-primary, #6366f1)", background: "rgba(99, 102, 241, 0.1)", padding: "2px 8px", borderRadius: "12px" }}>
            Server Disk
          </span>
        )}
      </div>

      <div className="storage-bar">
        <div
          className="storage-fill"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <div className="storage-text">
        {formatBytes(stats.used)}
        {" / "}
        {formatBytes(stats.limit)}
        <span style={{ marginLeft: "8px", fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)" }}>
          ({percentage}%)
        </span>
      </div>

      <div className="storage-details">
        <div>
          Projects
          <span>{formatBytes(stats.projectsUsed)}</span>
        </div>

        <div>
          Cloud
          <span>{formatBytes(stats.cloudUsed)}</span>
        </div>

        <div>
          Free
          <span>{formatBytes(stats.free)}</span>
        </div>
      </div>
    </div>
  );
}
