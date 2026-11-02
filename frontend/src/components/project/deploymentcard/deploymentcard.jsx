import React, { useEffect, useState } from "react";
import "./deploymentcard.css";
import { getContainerTelemetry } from "../../../services/project.api";
import { Cpu, HardDrive } from "lucide-react";

export default function DeploymentCard({ status, projectId }) {
  const [telemetry, setTelemetry] = useState(null);

  useEffect(() => {
    if (!projectId || !status?.running) {
      setTelemetry(null);
      return;
    }

    let isMounted = true;

    const fetchTelemetry = async () => {
      try {
        const data = await getContainerTelemetry(projectId);
        if (isMounted) setTelemetry(data);
      } catch (err) {
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

  const cpuVal = telemetry?.cpuPercent ?? 0;
  const ramVal = telemetry?.memoryPercent ?? 0;

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
          <strong className={`eh-status-val ${status?.running ? "running" : ""}`}>
            {status?.status ?? "Unknown"}
          </strong>
        </div>

        {status?.running && (
          <>
            <div className="eh-telemetry-block">
              <div className="eh-telemetry-header">
                <span className="eh-telemetry-label">
                  <Cpu size={14} /> CPU Usage
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
                  <HardDrive size={14} /> RAM Usage
                </span>
                <strong>{telemetry?.memoryFormatted || `${ramVal.toFixed(1)}%`}</strong>
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
            {status?.startedAt
              ? new Date(status.startedAt).toLocaleString()
              : "-"}
          </strong>
        </div>
      </div>
    </div>
  );
}
