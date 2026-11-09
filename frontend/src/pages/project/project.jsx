import "./project.css";
import { useParams } from "react-router-dom";
import useProject from "../../hooks/useProject";
import ProjectHeader from "../../components/project/projectheader/projectheader";
import { useState, useEffect, useCallback } from "react";
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
import Deployments from "../../components/project/deployments/deployments";
import Settings from "../../components/project/settings/settings";
import DeploymentHistory from "../../components/project/overview/deploymentHistory";
import { useToast } from "../../context/ToastContext";
import Environment from "../../components/project/environment/Environment";
import FileBrowser from "../../components/files/FileBrowser/FileBrowser";
import projectWorkspace from "../../services/projectWorkspace";
import * as projectFile from "../../services/projectFiles.api";
import PublicationStatus from "../../components/project/publication/PublicationStatus";
import usePublication from "../../hooks/usePublication";
import * as publicationApi from "../../services/publication.api";
import ProjectTerminal from "../../components/project/terminal/ProjectTerminal";
import StorageStats from "../../components/cloud/StorageStats/StorageStats";
import { getMyStorageStats } from "../../services/storage.api";
import ProjectAnalytics from "../../components/project/analytics/ProjectAnalytics";

export default function Project() {
  const { id } = useParams();
  const [actionLoading, setActionLoading] = useState(null);
  const { project, loading: projectLoading, refresh } = useProject(id);
  const [activeTab, setActiveTab] = useState("overview");
  const [storageStats, setStorageStats] = useState(null);

  const loadStorageStats = async () => {
    try {
      const data = await getMyStorageStats();
      setStorageStats(data);
    } catch (err) {
      console.error("Failed to load user storage stats:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "files") {
      loadStorageStats();
    }
  }, [activeTab]);

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

  const handleIncomingLog = useCallback(
    (log) => {
      setLogs((previous) => [...previous, log]);

      if (
        log?.category === "system" ||
        log?.level === "status" ||
        (log?.message &&
          typeof log.message === "string" &&
          log.message.toLowerCase().includes("status"))
      ) {
        refreshStatus();
      }
    },
    [setLogs, refreshStatus],
  );

  const { isConnected } = useLogStream(id, handleIncomingLog);

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

  const { publication, loading, pubrefresh } = usePublication(id);

  const handlePublish = async (options) => {
    try {
      await publicationApi.publishProject(id, options);

      await pubrefresh();

      toast.success("Website published");
      refresh();
    } catch (err) {
      toast.error("Action Failed", err.response?.data?.message || err.message);
    }
  };

  const handleUpdateSubdomain = async (options) => {
    try {
      const updated = await publicationApi.updateSubdomain(id, options);

      await pubrefresh();

      toast.success(
        "Subdomain Updated",
        `Website is now live at https://${updated.hostname}`,
      );
      refresh();
      return updated;
    } catch (err) {
      toast.error("Update Failed", err.response?.data?.message || err.message);
      throw err;
    }
  };

  const handleUnpublish = async () => {
    try {
      await publicationApi.unpublishProject(id);

      await pubrefresh();

      toast.success("Website unpublished");
      refresh();
    } catch (err) {
      toast.error("Action Failed", err.response?.data?.message || err.message);
    }
  };

  if (projectLoading || deploymentLoading) {
    return <p>Loading...</p>;
  }

  const deploymentState = status?.state ?? "not_deployed";

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

              <DeploymentCard status={status} projectId={id} />
            </div>
            <PublicationStatus
              publication={publication}
              loading={loading}
              project={project}
              onPublish={handlePublish}
              onUpdateSubdomain={handleUpdateSubdomain}
              onUnpublish={handleUnpublish}
              refresh={pubrefresh}
            />
            <LogsCard
              status={status}
              logs={logs}
              project={project}
              isConnected={isConnected}
              onClear={() => setLogs([])}
            />
          </>
        )}
        {activeTab === "analytics" && (
          <ProjectAnalytics projectId={id} projectName={project?.name} />
        )}
        {activeTab === "files" && (
          <div className="eh-project-files-view" style={{ width: "100%", display: "flex", flexDirection: "column" }}>
            <StorageStats stats={storageStats} title="Project Workspace Storage Quota" />
            <FileBrowser
              adapter={projectWorkspace}
              workspaceId={id}
              onStorageChange={() => {
                refresh?.();
                loadStorageStats();
              }}
            />
          </div>
        )}
        {activeTab === "deployments" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <Deployments projectId={id} />
            <DeploymentHistory
              deployments={deployments}
              projectId={id}
              onRollback={() => {
                refreshStatus();
                refreshLogs();
              }}
            />
          </div>
        )}

        {activeTab === "terminal" && (
          <ProjectTerminal projectId={id} isRunning={isRunning} />
        )}

        {activeTab === "environment" && <Environment projectId={project.id} />}
        {activeTab === "settings" && <Settings projectId={id} />}
      </div>
    </div>
  );
}
