import "./deploymentcard.css";

export default function DeploymentCard({ status }) {
  return (
    <div className="eh-deployment-card">
      <h3>Deployment</h3>

      <div className="eh-deployment-info">
        <div className="eh-info-row">
          <span>Status</span>
          <strong>{status?.status ?? "Unknown"}</strong>
        </div>

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
