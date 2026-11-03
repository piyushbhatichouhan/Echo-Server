import { Activity, Server, Cpu, HardDrive, Clock } from "lucide-react";
import "./ServerHealth.css";

function formatUptime(seconds) {
  if (!seconds || seconds <= 0) return "Just started";
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(" ");
}

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

export default function ServerHealth({ server }) {
  const isDockerActive = !!server?.docker;
  const ram = server?.ram;
  const disk = server?.disk;
  const cpu = server?.cpu;

  return (
    <div className="server-health-card">
      <div className="server-health-header">
        <div className="server-health-title-group">
          <div className="server-health-icon-badge">
            <Server size={18} />
          </div>
          <div>
            <h3 className="server-health-title">Host Infrastructure</h3>
            <span className="server-health-subtitle">
              {server?.hostname || "Local Node"} &bull; {server?.platform || "Docker Host"}
            </span>
          </div>
        </div>

        <div className={`docker-status-pill ${isDockerActive ? "docker-status-pill--active" : "docker-status-pill--error"}`}>
          <span className="docker-status-dot" />
          <span>{isDockerActive ? "Docker Online" : "Docker Disconnected"}</span>
        </div>
      </div>

      <div className="server-health-metrics">
        {/* Memory Meter */}
        <div className="server-metric-row">
          <div className="server-metric-header">
            <div className="server-metric-name">
              <Activity size={15} className="metric-icon" />
              <span>Host Memory (RAM)</span>
            </div>
            <span className="server-metric-val">
              {ram ? `${formatBytes(ram.used)} / ${formatBytes(ram.total)}` : "--"}
              {ram && <span className="metric-percentage"> ({ram.percentage}%)</span>}
            </span>
          </div>
          <div className="server-progress-track">
            <div
              className="server-progress-bar"
              style={{
                width: `${ram?.percentage || 0}%`,
                backgroundColor:
                  (ram?.percentage || 0) > 85
                    ? "var(--danger, #ef4444)"
                    : (ram?.percentage || 0) > 70
                    ? "var(--warning, #f59e0b)"
                    : "var(--accent, #ff8a00)",
              }}
            />
          </div>
        </div>

        {/* Disk Space Meter */}
        <div className="server-metric-row">
          <div className="server-metric-header">
            <div className="server-metric-name">
              <HardDrive size={15} className="metric-icon" />
              <span>Server Disk Storage</span>
            </div>
            <span className="server-metric-val">
              {disk ? `${formatBytes(disk.free)} free of ${formatBytes(disk.size)}` : "--"}
              {disk && <span className="metric-percentage"> ({disk.percentage}% used)</span>}
            </span>
          </div>
          <div className="server-progress-track">
            <div
              className="server-progress-bar"
              style={{
                width: `${disk?.percentage || 0}%`,
                backgroundColor:
                  (disk?.percentage || 0) > 90
                    ? "var(--danger, #ef4444)"
                    : (disk?.percentage || 0) > 75
                    ? "var(--warning, #f59e0b)"
                    : "var(--accent, #ff8a00)",
              }}
            />
          </div>
        </div>

        {/* CPU Telemetry */}
        <div className="server-metric-footer">
          <div className="cpu-pill">
            <Cpu size={14} />
            <span>
              <strong>{cpu?.cores || 1}</strong> vCPUs &bull; {cpu?.model ? cpu.model.split("@")[0].trim() : "Multi-Core CPU"}
            </span>
          </div>

          <div className="uptime-pill">
            <Clock size={14} />
            <span>Up {formatUptime(server?.uptime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
