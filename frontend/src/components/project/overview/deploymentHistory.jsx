import React, { useState } from "react";
import "./deploymentHistory.css";

import Card from "../../common/card/card";
import { CheckCircle2, AlertCircle, Square, Hammer, Bomb, RotateCcw } from "lucide-react";
import { rollbackDeployment } from "../../../services/project.api";
import { useToast } from "../../../context/ToastContext";

const statusIcon = (status) => {
  switch (status) {
    case "running":
      return <CheckCircle2 className="eh-history-icon running" size={18} />;

    case "building":
    case "creating_container":
    case "starting_container":
      return <Hammer className="eh-history-icon building" size={18} />;

    case "failed":
      return <AlertCircle className="eh-history-icon failed" size={18} />;

    case "crashed":
      return <Bomb className="eh-history-icon crashed" size={18} />;

    case "stopped":
      return <Square className="eh-history-icon stopped" size={18} />;

    default:
      return <Square className="eh-history-icon stopped" size={18} />;
  }
};

export default function DeploymentHistory({
  deployments = [],
  projectId,
  onRollback,
}) {
  const [rollingBackId, setRollingBackId] = useState(null);
  const toast = useToast();

  const handleRollback = async (deploymentId) => {
    try {
      setRollingBackId(deploymentId);
      await rollbackDeployment(projectId, deploymentId);
      toast.success(
        "Rollback Successful",
        `Application rolled back to deployment #${deploymentId.slice(0, 8)}.`,
      );
      onRollback?.();
    } catch (err) {
      toast.error(
        "Rollback Failed",
        err.response?.data?.message || err.message,
      );
    } finally {
      setRollingBackId(null);
    }
  };

  return (
    <Card>
      <div className="eh-deployment-history">
        <h2>Deployment History</h2>

        {deployments.length === 0 ? (
          <div className="eh-history-empty">No deployments yet.</div>
        ) : (
          <div className="eh-history-list">
            {deployments.map((deployment) => {
              const canRollback =
                deployment.status !== "running" &&
                Boolean(deployment.image_name);

              return (
                <div key={deployment.id} className="eh-history-item">
                  <div className="eh-history-left">
                    {statusIcon(deployment.status)}
                  </div>

                  <div className="eh-history-center">
                    <div className="eh-history-status">
                      {deployment.status.replaceAll("_", " ").toUpperCase()}
                    </div>

                    <div className="eh-history-date">
                      {new Date(deployment.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div
                    className="eh-history-right"
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <span>#{deployment.id.slice(0, 8)}</span>
                    {canRollback && (
                      <button
                        type="button"
                        className="eh-rollback-btn"
                        onClick={() => handleRollback(deployment.id)}
                        disabled={rollingBackId !== null}
                      >
                        <RotateCcw size={13} />
                        <span>
                          {rollingBackId === deployment.id
                            ? "Rolling back..."
                            : "Rollback"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
