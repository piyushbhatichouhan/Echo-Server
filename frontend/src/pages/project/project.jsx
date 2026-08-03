import "./Project.css";
import { useParams } from "react-router-dom";
import useProject from "../../hooks/useProject";
import ProjectHeader from "../../components/project/ProjectHeader/ProjectHeader";
import { useState } from "react";
import DeploymentControls from "../../components/project/deploymentcontrols/deploymentcontrols";
import LogsCard from "../../components/project/logscard/logscard";
import useDeployment from "../../hooks/useDeployment";
import {
  deployProject,
  redeployProject,
  startProject,
  stopProject,
  restartProject,
} from "../../services/deployment.api";
import DeploymentCard from "../../components/project/deploymentcard/deploymentcard";
import useLogStream from "../../hooks/useLogStream";
import ProjectTabs from "../../components/project/projecttabs/projecttabs";
import { useEffect } from "react";
import Deployments from "../../components/project/deployments/deployments";
import Settings from "../../components/project/settings/settings";
import DeploymentHistory from "../../components/project/overview/deploymentHistory";
import { useToast } from "../../context/ToastContext";
import Environment from "../../components/project/environment/Environment";
import FileBrowser from "../../components/files/FileBrowser/FileBrowser";
import projectWorkspace from "../../services/projectWorkspace";
import * as projectFile from "../../services/projectFiles.api";

export default function Project() {
  const { id } = useParams();
  const [actionLoading, setActionLoading] = useState(null);
  const { project, loading: projectLoading, refresh } = useProject(id);
  const [activeTab, setActiveTab] = useState("overview");

  const {
    status,
    logs,
    loading: deploymentLoading,
    refreshStatus,
    refreshLogs,
    setLogs,
    deployments,
  } = useDeployment(id);

  const isRunning = status?.running;
  const hasDeployment = status?.exists;

  useLogStream(id, (log) => {
    setLogs((previous) => [...previous, log]);

    refreshStatus();
  });

  const toast = useToast();

  const actionMessages = {
    deploy: {
      title: "Project Deployed",
      message: "Deployment completed successfully.",
    },
    redeploy: {
      title: "Project Redeployed",
      message: "Project has been Redeployed.",
    },
    start: {
      title: "Project Started",
      message: "The project is now running.",
    },
    stop: {
      title: "Project Stopped",
      message: "The project has been Stopped.",
    },
    restart: {
      title: "Project Restarted",
      message: "The project Restarted successfully.",
    },
  };

  const runAction = async (action, name) => {
    try {
      setActionLoading(name);

      await action(id);

      await Promise.all([refreshStatus(), refreshLogs()]);
      const { title, message } = actionMessages[name];

      toast.success(title, message);
    } catch (err) {
      toast.error("Action Failed", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (projectLoading || deploymentLoading) {
    return <p>Loading...</p>;
  }

  const deploymentState = status?.status || "unknown";

  return (
    <div className="eh-project-page">
      <ProjectHeader project={project} status={status} />

      <ProjectTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="eh-project-grid">
        {activeTab === "overview" && (
          <>
            <div className="eh-project-top">
              <DeploymentControls
                status={status}
                loading={actionLoading}
                deploymentState={deploymentState}
                hasDeployment={hasDeployment}
                isRunning={isRunning}
                onDeploy={() => runAction(deployProject, "deploy")}
                onRedeploy={() => runAction(redeployProject, "redeploy")}
                onStart={() => runAction(startProject, "start")}
                onStop={() => runAction(stopProject, "stop")}
                onRestart={() => runAction(restartProject, "restart")}
              />

              <DeploymentCard status={status} />
            </div>

            <LogsCard logs={logs} onClear={() => setLogs([])} />
          </>
        )}
        {activeTab === "files" && (
          <FileBrowser adapter={projectWorkspace} workspaceId={id} />
        )}
        {activeTab === "deployments" && (
          <>
            <Deployments projectId={id} />
          </>
        )}

        {activeTab === "environment" && <Environment projectId={project.id} />}
        {activeTab === "settings" && <Settings projectId={id} />}
      </div>
    </div>
  );
}
