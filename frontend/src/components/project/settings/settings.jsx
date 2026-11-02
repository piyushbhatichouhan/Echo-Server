import { useEffect, useState } from "react";
import "./settings.css";

import Button from "../../common/button/button";
import useProjectSettings from "../../../hooks/useProjectSettings";
import { useToast } from "../../../context/ToastContext";
import CodeEditor from "../../common/CodeEditor/CodeEditor";

import {
  deleteProject,
  detectFramework,
  applyDetectedPreset,
} from "../../../services/project.api";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../../common/modal/ConfirmationModal";
import PublicationStatus from "../publication/PublicationStatus";
import usePublication from "../../../hooks/usePublication";
import * as publicationApi from "../../../services/publication.api";

export default function Settings({ projectId }) {
  const { project, settings, loading, save } = useProjectSettings(projectId);

  const toast = useToast();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const navigate = useNavigate();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const handleDetect = async () => {
    try {
      setDetecting(true);
      const res = await detectFramework(projectId);
      setDetectionResult(res);
      toast.success(
        "Framework Detected",
        `Identified ${res.framework} (${Math.round(res.confidence * 100)}% match)`,
      );
    } catch (err) {
      toast.error(
        "Detection Failed",
        err.response?.data?.message || err.message,
      );
    } finally {
      setDetecting(false);
    }
  };

  const handleApplyPreset = async () => {
    try {
      setApplyingPreset(true);
      const res = await applyDetectedPreset(projectId);
      setForm((prev) => ({
        ...prev,
        ...res.data.settings,
      }));
      toast.success(
        "Preset Applied",
        `Applied ${res.data.framework} configuration preset.`,
      );
      setDetectionResult(null);
    } catch (err) {
      toast.error(
        "Failed to Apply Preset",
        err.response?.data?.message || err.message,
      );
    } finally {
      setApplyingPreset(false);
    }
  };

  const {
    publication,
    loading: publoading,
    pubrefresh,
  } = usePublication(projectId);

  const handlePublish = async () => {
    try {
      await publicationApi.publishProject(projectId);

      await pubrefresh();

      toast.success("Website published");
    } catch (err) {
      toast.error("Action Failed", err.response?.data?.message || err.message);
    }
  };

  const handleUnpublish = async () => {
    try {
      await publicationApi.unpublishProject(projectId);

      await pubrefresh();

      toast.success("Website unpublished");
    } catch (err) {
      toast.error("Action Failed", err.response?.data?.message || err.message);
    }
  };

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

      {/* Framework Auto-Detector Section */}
      <div className="eh-autodetect-card">
        <div className="eh-autodetect-left">
          <div className="eh-autodetect-sparkle">✨</div>
          <div>
            <h3>Zero-Config Framework Detector</h3>
            <p>
              Automatically inspect your project files to configure runtime, build commands, and output directories.
            </p>
          </div>
        </div>

        <div className="eh-autodetect-actions">
          <button
            type="button"
            className="eh-autodetect-btn"
            onClick={handleDetect}
            disabled={detecting}
          >
            {detecting ? "Scanning repository..." : "Auto-Detect Framework"}
          </button>
        </div>
      </div>

      {detectionResult && (
        <div className="eh-detection-result-card">
          <div className="eh-detection-result-header">
            <div>
              <span className="eh-detection-badge">Framework Detected</span>
              <h4>{detectionResult.framework}</h4>
            </div>
            <button
              type="button"
              className="eh-apply-preset-btn"
              onClick={handleApplyPreset}
              disabled={applyingPreset}
            >
              {applyingPreset ? "Applying..." : "Apply Detected Preset"}
            </button>
          </div>
          <div className="eh-detection-grid">
            <div>
              <span className="eh-det-label">Runtime</span>
              <code>{detectionResult.runtime}</code>
            </div>
            <div>
              <span className="eh-det-label">Port</span>
              <code>{detectionResult.port}</code>
            </div>
            <div>
              <span className="eh-det-label">Install Command</span>
              <code>{detectionResult.install_command || "None"}</code>
            </div>
            <div>
              <span className="eh-det-label">Build Command</span>
              <code>{detectionResult.build_command || "None"}</code>
            </div>
            <div>
              <span className="eh-det-label">Start Command</span>
              <code>{detectionResult.start_command || "None"}</code>
            </div>
            <div>
              <span className="eh-det-label">Output Directory</span>
              <code>{detectionResult.output_directory || "."}</code>
            </div>
          </div>
        </div>
      )}

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

      <PublicationStatus
        publication={publication}
        loading={publoading}
        onPublish={handlePublish}
        onUnpublish={handleUnpublish}
        refresh={pubrefresh}
      />

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
