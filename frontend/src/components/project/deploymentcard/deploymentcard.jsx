import { useEffect, useState } from "react";
import "./deploymentcard.css";
import { getContainerTelemetry } from "../../../services/project.api";
import { Cpu, HardDrive } from "lucide-react";

export default function DeploymentCard({ status, projectId }) {
  const [telemetry, setTelemetry] = useState(null);

  useEffect(() => {
    if (!projectId || !status?.running) return;

    let isMounted = true;

    const fetchTelemetry = async () => {
      try {
        const data = await getContainerTelemetry(projectId);
        if (isMounted) setTelemetry(data);
      } catch {
        // Silently skip if container is stopped/starting
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [projectId, status?.running]);

  const activeTelemetry = status?.running ? telemetry : null;
  const cpuVal = activeTelemetry?.cpuPercent ?? 0;
  const ramVal = activeTelemetry?.memoryPercent ?? 0;

  return (
    <div className="eh-deployment-card">
      <div className="eh-card-header-row">
        <h3>Deployment</h3>
        {status?.running && (
          <span className="eh-live-pulse-badge">
            <span className="eh-pulse-dot" /> Live Telemetry
          </span>
        )}
      </div>

      <div className="eh-deployment-info">
        <div className="eh-info-row">
          <span>Status</span>
          <strong
            className={`eh-status-val ${
              status?.running ? "running" : status?.state || "stopped"
            }`}
          >
            {status?.display || (status?.state ? status.state.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Stopped")}
          </strong>
        </div>

        {status?.running && (
          <>
            <div className="eh-telemetry-block">
              <div className="eh-telemetry-header">
                <span className="eh-telemetry-label">
                  <Cpu size={14} /> CPU Usage (of quota)
                </span>
                <strong>{cpuVal.toFixed(1)}%</strong>
              </div>
              <div className="eh-progress-track">
                <div
                  className="eh-progress-bar cpu"
                  style={{ width: `${Math.min(cpuVal, 100)}%` }}
                />
              </div>
            </div>

            <div className="eh-telemetry-block">
              <div className="eh-telemetry-header">
                <span className="eh-telemetry-label">
                  <HardDrive size={14} /> RAM Usage (of quota)
                </span>
                <strong>{activeTelemetry?.memoryFormatted || `${ramVal.toFixed(1)}%`}</strong>
              </div>
              <div className="eh-progress-track">
                <div
                  className="eh-progress-bar ram"
                  style={{ width: `${Math.min(ramVal, 100)}%` }}
                />
              </div>
            </div>
          </>
        )}

        <div className="eh-info-row">
          <span>Restart Count</span>
          <strong>{status?.restartCount ?? 0}</strong>
        </div>

        <div className="eh-info-row">
          <span>Started</span>
          <strong>
            {status?.running && status?.startedAt
              ? new Date(status.startedAt).toLocaleString()
              : !status?.running
              ? "Stopped"
              : "-"}
          </strong>
        </div>
      </div>
    </div>
  );
}
