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
import ProjectTabs from "../../components/project/projecttabs/ProjectTabs";
import FileManager from "../../components/project/filemanager/FileManager";
import useFiles from "../../hooks/useFiles";
import FileEditor from "../../components/project/fileeditor/FileEditor";
import { getFileContent } from "../../services/file.api";
import { useEffect } from "react";
import { saveFileContent, downloadFile } from "../../services/file.api";
import { deleteFile } from "../../services/file.api";
import { deletePath as deleteWorkspacePath } from "../../services/file.api";
import Deployments from "../../components/project/deployments/deployments";
import Settings from "../../components/project/settings/Settings";
import DeploymentHistory from "../../components/project/overview/deploymentHistory";

import Environment from "../../components/project/environment/Environment";

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

  const { upload, remove } = useFiles(id);

  const { files, loading: filesLoading, refresh: refreshFiles } = useFiles(id);

  const [selectedFile, setSelectedFile] = useState(null);
  const [dirty, setDirty] = useState(false);
  useLogStream(id, (log) => {
    setLogs((previous) => [...previous, log]);

    refreshStatus();
  });

  const runAction = async (action, name) => {
    try {
      setActionLoading(name);

      await action(id);

      await Promise.all([refreshStatus(), refreshLogs()]);
    } finally {
      setActionLoading(null);
    }
  };

  const [fileContent, setFileContent] = useState("");

  useEffect(() => {
    if (!selectedFile) return;

    const load = async () => {
      const text = await getFileContent(selectedFile.id);

      setFileContent(text);
      setDirty(false);
    };

    load();
  }, [selectedFile]);

  const handleEditorChange = (value) => {
    setFileContent(value);
    setDirty(true);
  };

  const saveCurrentFile = async () => {
    if (!selectedFile) return;

    await saveFileContent(selectedFile.id, fileContent);

    setDirty(false);
  };
  if (projectLoading || deploymentLoading) {
    return <p>Loading...</p>;
  }

  const handleDelete = async (path, type) => {
    await deleteWorkspacePath(id, path, type);

    if (
      selectedFile &&
      type === "file" &&
      selectedFile.relative_path === path
    ) {
      setSelectedFile(null);
    }

    refreshFiles();
  };

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
          <>
            {!selectedFile ? (
              <FileManager
                projectId={id}
                refresh={refreshFiles}
                files={files}
                loading={filesLoading}
                onOpen={setSelectedFile}
                onDelete={handleDelete}
              />
            ) : (
              <FileEditor
                file={selectedFile}
                content={fileContent}
                onChange={handleEditorChange}
                onSave={saveCurrentFile}
                onDownload={() => downloadFile(selectedFile.id)}
                onBack={() => setSelectedFile(null)}
                dirty={dirty}
              />
            )}
          </>
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
