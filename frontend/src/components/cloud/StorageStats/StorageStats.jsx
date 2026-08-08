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
    stats.limit == null ? 0 : Math.min(100, (stats.used / stats.limit) * 100);

  return (
    <div className="storage-card">
      <div className="storage-title">Storage</div>

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
