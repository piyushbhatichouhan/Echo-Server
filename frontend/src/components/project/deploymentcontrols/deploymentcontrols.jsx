import "./deploymentcontrols.css";

import Card from "../../common/card/card";
import Button from "../../common/button/button";
import { Rocket, RefreshCw, Play, Square, RotateCw } from "lucide-react";

export default function DeploymentControls({
  status,
  loading,

  hasDeployment,
  isRunning,

  onDeploy,
  onRedeploy,
  onStart,
  onStop,
  onRestart,
  deploymentState,
}) {
  return (
    <Card>
      <div className="eh-deployment-controls">
        <h2>Deployment Controls</h2>
        <div className={`eh-deployment-status eh-${deploymentState}`}>
          {deploymentState.replaceAll("_", " ").toUpperCase()}
        </div>
        <div className="eh-control-grid">
          <Button
            variant="deploy"
            icon={Rocket}
            onClick={onDeploy}
            loading={loading === "deploy"}
            disabled={deploymentState !== "not_found"}
          >
            Deploy
          </Button>

          <Button
            variant="redeploy"
            icon={RefreshCw}
            onClick={onRedeploy}
            loading={loading === "redeploy"}
            disabled={
              deploymentState === "building" ||
              deploymentState === "creating_container" ||
              deploymentState === "starting_container"
            }
          >
            Redeploy
          </Button>

          <Button
            variant="start"
            icon={Play}
            onClick={onStart}
            loading={loading === "start"}
            disabled={
              deploymentState === "running" || deploymentState === "building"
            }
          >
            Start
          </Button>

          <Button
            variant="restart"
            icon={RotateCw}
            onClick={onRestart}
            loading={loading === "restart"}
            disabled={deploymentState !== "running"}
          >
            Restart
          </Button>

          <Button
            variant="stop"
            icon={Square}
            onClick={onStop}
            loading={loading === "stop"}
            disabled={deploymentState !== "running"}
          >
            Stop
          </Button>
        </div>
      </div>
    </Card>
  );
}
