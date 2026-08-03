import { useEffect, useState } from "react";
import "./settings.css";

import Button from "../../common/button/button";
import useProjectSettings from "../../../hooks/useProjectSettings";
import { useToast } from "../../../context/ToastContext";
import CodeEditor from "../../common/CodeEditor/CodeEditor";

import { deleteProject } from "../../../services/project.api";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../../common/modal/ConfirmationModal";

export default function Settings({ projectId }) {
  const { project, settings, loading, save } = useProjectSettings(projectId);

  const toast = useToast();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const handleDeleteProject = async () => {
    setDeleting(true);

    try {
      await deleteProject(projectId);

      toast.success(
        "Project deleted",
        "The project has been permanently removed.",
      );

      navigate("/dashboard");
    } catch (error) {
      toast.error("Error", error.response?.data?.message || error.message);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  if (loading || !form) {
    return <p>Loading...</p>;
  }

  const update = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  return (
    <div className="eh-settings-page">
      {/* Header */}

      <div className="eh-settings-header">
        <div>
          <h1>Deployment Settings</h1>

          <p>Configure how EchoHub builds, deploys and manages this project.</p>
        </div>

        <Button
          loading={saving}
          onClick={async () => {
            try {
              setSaving(true);

              await save(form);

              toast.success("Success", "Settings saved successfully");
            } catch (error) {
              toast.error(
                "Error",
                error.response?.data?.message || error.message,
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          Save Settings
        </Button>
      </div>

      <div className="eh-top-row">
        {/* Runtime */}

        <div className="eh-panel eh-runtime-panel">
          <h2>Runtime</h2>

          <div className="eh-runtime-card">
            <div className="eh-runtime-icon">
              {project.application_type === "node" && "🟢"}
              {project.application_type === "python" && "🐍"}
              {project.application_type === "static" && "🌐"}
              {project.application_type === "custom" && "⚙️"}
            </div>

            <div className="eh-runtime-content">
              <h3>{project.application_type.toUpperCase()}</h3>

              <p>
                {project.application_type === "node" &&
                  "Node.js application runtime."}

                {project.application_type === "python" &&
                  "Python application runtime."}

                {project.application_type === "static" &&
                  "Static website deployment."}

                {project.application_type === "custom" &&
                  "User supplied Docker deployment."}
              </p>
            </div>
          </div>
        </div>

        {/* General */}

        <div className="eh-panel eh-general-panel">
          <h2>General</h2>

          <div className="eh-settings-grid">
            <div className="eh-setting">
              <label>Runtime</label>

              <input value={form.runtime} readOnly />
            </div>

            <div className="eh-setting">
              <label>Port</label>

              <input
                type="number"
                value={form.port}
                onChange={(e) => update("port", Number(e.target.value))}
              />
            </div>

            <div className="eh-setting eh-span-2">
              <label>Working Directory</label>

              <input
                value={form.working_directory}
                onChange={(e) => update("working_directory", e.target.value)}
              />
            </div>

            {form.runtime === "static" && (
              <div className="eh-setting eh-span-2">
                <label>Output Directory</label>

                <input
                  value={form.output_directory}
                  onChange={(e) => update("output_directory", e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Commands */}
      {/* Commands */}

      {form.runtime !== "custom" && (
        <section className="eh-settings-section">
          <h2>Commands</h2>

          <div className="eh-command-grid">
            <div className="eh-setting eh-install-command">
              <label>Install Command</label>

              <textarea
                rows={3}
                value={form.install_command}
                onChange={(e) => update("install_command", e.target.value)}
              />
            </div>

            {form.runtime !== "python" && (
              <div className="eh-setting">
                <label>Build Command</label>

                <textarea
                  rows={3}
                  value={form.build_command}
                  onChange={(e) => update("build_command", e.target.value)}
                />
              </div>
            )}

            {form.runtime !== "static" && (
              <div className="eh-setting">
                <label>Start Command</label>

                <textarea
                  rows={3}
                  value={form.start_command}
                  onChange={(e) => update("start_command", e.target.value)}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Dockerfile */}

      {form.runtime === "custom" && (
        <section className="eh-settings-section">
          <h2>Dockerfile</h2>

          <div className="eh-docker-notice">
            <strong>Custom Runtime</strong>

            <p>
              EchoHub will use the Dockerfile exactly as provided. Include all
              installation, build and startup steps inside the Dockerfile. Paste
              your Docker file here
            </p>
          </div>

          {/* Monaco editor goes here */}

          <CodeEditor
            language="dockerfile"
            value={form.dockerfile}
            onChange={(value) => update("dockerfile", value)}
          />
        </section>
      )}
      <section className="eh-settings-section eh-danger-zone">
        <h2>Danger Zone</h2>

        <div className="eh-danger-card">
          <div>
            <h3>Delete Project</h3>

            <p>
              Permanently delete this project.
              <br />
              <br />
              The following will be removed immediately:
              <br />
              • Project files
              <br />
              • Git repository
              <br />
              • Deployments
              <br />
              • Environment Variables
              <br />
              • Docker images & containers
              <br />
              • Logs
              <br />
              <br />
              <strong>This action cannot be undone.</strong>
            </p>
          </div>

          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Delete Project
          </Button>
        </div>
      </section>
      <ConfirmationModal
        open={deleteOpen}
        title="Delete Project"
        projectMode
        user={{
          username: project.name,
          email: "",
        }}
        loading={deleting}
        onDelete={handleDeleteProject}
        onClose={() => setDeleteOpen(false)}
        project={project}
      />
    </div>
  );
}
