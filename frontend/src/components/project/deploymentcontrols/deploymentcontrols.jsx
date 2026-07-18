import "./DeploymentControls.css";

import Card from "../../common/Card/Card";
import Button from "../../common/Button/Button";
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
}) {
  return (
    <Card>
      <div className="eh-deployment-controls">
        <h2>Deployment Controls</h2>

        <div className="eh-control-grid">
          <Button
            variant="deploy"
            icon={Rocket}
            onClick={onDeploy}
            loading={loading === "deploy"}
            disabled={hasDeployment}
          >
            Deploy
          </Button>

          <Button
            variant="redeploy"
            icon={RefreshCw}
            onClick={onRedeploy}
            loading={loading === "redeploy"}
            disabled={!hasDeployment}
          >
            Redeploy
          </Button>

          <Button
            variant="start"
            icon={Play}
            onClick={onStart}
            loading={loading === "start"}
            disabled={!hasDeployment || isRunning}
          >
            Start
          </Button>

          <Button
            variant="restart"
            icon={RotateCw}
            onClick={onRestart}
            loading={loading === "restart"}
            disabled={!isRunning}
          >
            Restart
          </Button>

          <Button
            variant="stop"
            icon={Square}
            onClick={onStop}
            loading={loading === "stop"}
            disabled={!isRunning}
          >
            Stop
          </Button>
        </div>
      </div>
    </Card>
  );
}
