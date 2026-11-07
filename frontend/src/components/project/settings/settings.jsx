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

import {
  Sparkles,
  Hammer,
  Globe,
  AlertTriangle,
  Folder,
  FolderOutput,
  Terminal,
  Check,
  X,
  RefreshCw,
  Save,
  Cpu,
  Info,
  Layers,
} from "lucide-react";

export default function Settings({ projectId }) {
  const { project, settings, loading, save } = useProjectSettings(projectId);
  const toast = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("build");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [applyingPreset, setApplyingPreset] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    publication,
    loading: publoading,
    pubrefresh,
  } = usePublication(projectId);

  const handleDetect = async () => {
    try {
      setDetecting(true);
      const res = await detectFramework(projectId);
      setDetectionResult(res);
      toast.success(
        "Framework Detected",
        `Identified ${res.framework} (${Math.round((res.confidence || 0.9) * 100)}% match)`,
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
      if (res.data?.settings) {
        setForm((prev) => ({
          ...prev,
          ...res.data.settings,
          runtime: res.data.settings.runtime || prev?.runtime || "node",
          working_directory: res.data.settings.working_directory || ".",
          install_command: res.data.settings.install_command ?? "",
          build_command: res.data.settings.build_command ?? "",
          start_command: res.data.settings.start_command ?? "",
          output_directory: res.data.settings.output_directory || ".",
          dockerfile: res.data.settings.dockerfile ?? "",
        }));
      }
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

  const handlePublish = async (options = {}) => {
    try {
      await publicationApi.publishProject(projectId, options);
      await pubrefresh();
      toast.success("Website published");
    } catch (err) {
      toast.error("Action Failed", err.response?.data?.message || err.message);
    }
  };

  const handleUpdateSubdomain = async (options) => {
    try {
      await publicationApi.updateSubdomain(projectId, options);
      await pubrefresh();
      toast.success("Subdomain updated");
    } catch (err) {
      toast.error("Action Failed", err.response?.data?.message || err.message);
      throw err;
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
      setForm({
        runtime: settings.runtime || "node",
        working_directory: settings.working_directory || ".",
        install_command: settings.install_command ?? "npm install",
        build_command: settings.build_command ?? "npm run build",
        start_command: settings.start_command ?? "npm start",
        output_directory: settings.output_directory || ".",
        dockerfile: settings.dockerfile ?? "",
      });
    }
  }, [settings]);

  if (loading || !form || !project) {
    return (
      <div className="eh-settings-loading">
        <RefreshCw className="eh-spin" size={24} />
        <span>Loading settings...</span>
      </div>
    );
  }

  const update = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const sanitized = {
        runtime: form.runtime || "node",
        working_directory:
          form.working_directory && form.working_directory.trim()
            ? form.working_directory.trim()
            : ".",
        install_command: form.install_command ?? "",
        build_command: form.build_command ?? "",
        start_command: form.start_command ?? "",
        output_directory:
          form.output_directory && form.output_directory.trim()
            ? form.output_directory.trim()
            : ".",
        dockerfile: form.dockerfile ?? "",
      };

      await save(sanitized);
      toast.success("Success", "Settings saved successfully");
    } catch (error) {
      toast.error("Error", error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRuntimeInfo = () => {
    switch (project.application_type) {
      case "node":
        return {
          icon: "🟢",
          name: "Node.js Application",
          description: "Runs Node.js, Express, Fastify, Next.js, or Nuxt with npm runtime.",
          defaultPort: "3000",
        };
      case "python":
        return {
          icon: "🐍",
          name: "Python Application",
          description: "Runs Python WSGI/ASGI web servers (FastAPI, Flask, Django, Uvicorn).",
          defaultPort: "8000",
        };
      case "static":
        return {
          icon: "🌐",
          name: "Static Web (SPA)",
          description: "Built HTML/CSS/JS deployed to high-performance Nginx with SPA routing fallback.",
          defaultPort: "80",
        };
      case "custom":
        return {
          icon: "⚙️",
          name: "Custom Dockerfile",
          description: "Custom Docker build specifications configured via the embedded editor.",
          defaultPort: "3000",
        };
      default:
        return {
          icon: "📦",
          name: project.application_type?.toUpperCase() || "Application",
          description: "Containerized project execution environment.",
          defaultPort: "3000",
        };
    }
  };

  const runtimeInfo = getRuntimeInfo();

  return (
    <div className="eh-settings-container">
      {/* Settings Top Header */}
      <div className="eh-settings-topbar">
        <div className="eh-settings-title-group">
          <div className="eh-settings-badge">
            <span className="eh-badge-dot" />
            Project Settings
          </div>
          <h1>{project.name}</h1>
          <p>Manage framework presets, directories, build pipelines, and domains.</p>
        </div>

        <div className="eh-settings-topbar-actions">
          {activeTab === "build" && (
            <Button
              variant="primary"
              loading={saving}
              onClick={handleSave}
              className="eh-save-btn"
            >
              <Save size={16} />
              <span>Save Changes</span>
            </Button>
          )}
        </div>
      </div>

      {/* Segmented Navigation Sub-Tabs */}
      <div className="eh-segmented-tabs">
        <button
          type="button"
          className={`eh-tab-btn ${activeTab === "build" ? "eh-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("build")}
        >
          <Hammer size={16} />
          <span>Build & Deployment</span>
        </button>

        <button
          type="button"
          className={`eh-tab-btn ${activeTab === "domains" ? "eh-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("domains")}
        >
          <Globe size={16} />
          <span>Domains & Publishing</span>
        </button>

        <button
          type="button"
          className={`eh-tab-btn ${activeTab === "danger" ? "eh-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("danger")}
        >
          <AlertTriangle size={16} />
          <span>Danger Zone</span>
        </button>
      </div>

      {/* Tab 1: Build & Deployment */}
      {activeTab === "build" && (
        <div className="eh-tab-panel">
          {/* Zero-Config Framework Auto-Detector Card */}
          <div className="eh-card eh-autodetect-box">
            <div className="eh-autodetect-row">
              <div className="eh-autodetect-info">
                <div className="eh-sparkle-pill">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3>Framework Auto-Detection</h3>
                  <p>
                    Inspect your repository files to automatically recognize your framework,
                    build commands, output paths, and ports.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="eh-scan-btn"
                onClick={handleDetect}
                disabled={detecting}
              >
                <RefreshCw size={15} className={detecting ? "eh-spin" : ""} />
                <span>{detecting ? "Scanning repository..." : "Auto-Detect Framework"}</span>
              </button>
            </div>

            {/* Detection Result Dropdown Banner */}
            {detectionResult && (
              <div className="eh-detected-banner">
                <div className="eh-detected-banner-head">
                  <div className="eh-detected-title-area">
                    <span className="eh-detected-tag">Detected Framework</span>
                    <h4>{detectionResult.title || detectionResult.framework}</h4>
                    {detectionResult.confidence && (
                      <span className="eh-confidence-badge">
                        {Math.round(detectionResult.confidence * 100)}% Match
                      </span>
                    )}
                  </div>

                  <div className="eh-detected-actions">
                    <button
                      type="button"
                      className="eh-dismiss-btn"
                      onClick={() => setDetectionResult(null)}
                      title="Dismiss"
                    >
                      <X size={16} />
                    </button>
                    <button
                      type="button"
                      className="eh-apply-btn"
                      onClick={handleApplyPreset}
                      disabled={applyingPreset}
                    >
                      <Check size={16} />
                      <span>{applyingPreset ? "Applying..." : "Apply Detected Preset"}</span>
                    </button>
                  </div>
                </div>

                {detectionResult.description && (
                  <p className="eh-detected-desc">{detectionResult.description}</p>
                )}

                <div className="eh-detected-chips">
                  <div className="eh-chip">
                    <span className="eh-chip-label">Runtime</span>
                    <code>{detectionResult.runtime}</code>
                  </div>
                  <div className="eh-chip">
                    <span className="eh-chip-label">Target Port</span>
                    <code>{detectionResult.port}</code>
                  </div>
                  <div className="eh-chip">
                    <span className="eh-chip-label">Root Directory</span>
                    <code>{detectionResult.working_directory || "."}</code>
                  </div>
                  <div className="eh-chip">
                    <span className="eh-chip-label">Output Directory</span>
                    <code>{detectionResult.output_directory || "."}</code>
                  </div>
                  <div className="eh-chip">
                    <span className="eh-chip-label">Install Command</span>
                    <code>{detectionResult.install_command || "None"}</code>
                  </div>
                  <div className="eh-chip">
                    <span className="eh-chip-label">Build Command</span>
                    <code>{detectionResult.build_command || "None"}</code>
                  </div>
                  <div className="eh-chip">
                    <span className="eh-chip-label">Start Command</span>
                    <code>{detectionResult.start_command || "None"}</code>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Runtime & Environment Summary Card */}
          <div className="eh-card eh-runtime-summary">
            <div className="eh-card-header">
              <div className="eh-card-title">
                <Cpu size={18} className="eh-header-icon" />
                <h3>Active Runtime</h3>
              </div>
              <span className="eh-port-badge">Default Port: {runtimeInfo.defaultPort}</span>
            </div>

            <div className="eh-runtime-body">
              <div className="eh-runtime-big-icon">{runtimeInfo.icon}</div>
              <div className="eh-runtime-meta">
                <h4>{runtimeInfo.name}</h4>
                <p>{runtimeInfo.description}</p>
              </div>
            </div>
          </div>

          {/* Paths & Directories Configuration */}
          <div className="eh-card">
            <div className="eh-card-header">
              <div className="eh-card-title">
                <Folder size={18} className="eh-header-icon" />
                <h3>Paths & Directories</h3>
              </div>
            </div>

            <div className="eh-form-grid">
              <div className="eh-field-group">
                <label>
                  <span>Working / Root Directory</span>
                  <span className="eh-label-hint">Root folder containing application files</span>
                </label>
                <div className="eh-input-affix">
                  <Folder size={16} className="eh-affix-icon" />
                  <input
                    type="text"
                    value={form.working_directory ?? "."}
                    onChange={(e) => update("working_directory", e.target.value)}
                    placeholder="."
                  />
                </div>
                <small>Relative path to your application directory inside the repository.</small>
              </div>

              {form.runtime === "static" && (
                <div className="eh-field-group">
                  <label>
                    <span>Output Directory</span>
                    <span className="eh-label-hint">Built static assets directory</span>
                  </label>
                  <div className="eh-input-affix">
                    <FolderOutput size={16} className="eh-affix-icon" />
                    <input
                      type="text"
                      value={form.output_directory ?? "."}
                      onChange={(e) => update("output_directory", e.target.value)}
                      placeholder="dist"
                    />
                  </div>
                  <small>Folder served by Nginx containing index.html (e.g. dist, build, .)</small>
                </div>
              )}
            </div>
          </div>

          {/* Command Pipeline (Standard Runtimes) */}
          {form.runtime !== "custom" && (
            <div className="eh-card">
              <div className="eh-card-header">
                <div className="eh-card-title">
                  <Terminal size={18} className="eh-header-icon" />
                  <h3>Command Pipeline</h3>
                </div>
              </div>

              <div className="eh-pipeline-stack">
                {/* 1. Install Command */}
                <div className="eh-pipeline-step">
                  <div className="eh-step-indicator">
                    <span className="eh-step-number">1</span>
                    <span className="eh-step-name">Install</span>
                  </div>
                  <div className="eh-step-content">
                    <label>Install Command</label>
                    <div className="eh-code-input-wrapper">
                      <span className="eh-code-prompt">$</span>
                      <input
                        type="text"
                        value={form.install_command ?? ""}
                        onChange={(e) => update("install_command", e.target.value)}
                        placeholder="npm install"
                      />
                    </div>
                    <small>Executed first to install dependencies before building.</small>
                  </div>
                </div>

                {/* 2. Build Command (Non-Python) */}
                {form.runtime !== "python" && (
                  <div className="eh-pipeline-step">
                    <div className="eh-step-indicator">
                      <span className="eh-step-number">2</span>
                      <span className="eh-step-name">Build</span>
                    </div>
                    <div className="eh-step-content">
                      <label>Build Command</label>
                      <div className="eh-code-input-wrapper">
                        <span className="eh-code-prompt">$</span>
                        <input
                          type="text"
                          value={form.build_command ?? ""}
                          onChange={(e) => update("build_command", e.target.value)}
                          placeholder="npm run build"
                        />
                      </div>
                      <small>Optional command to build/bundle assets. Leave blank if not required.</small>
                    </div>
                  </div>
                )}

                {/* 3. Start Command (Non-Static) */}
                {form.runtime !== "static" && (
                  <div className="eh-pipeline-step">
                    <div className="eh-step-indicator">
                      <span className="eh-step-number">{form.runtime === "python" ? "2" : "3"}</span>
                      <span className="eh-step-name">Start</span>
                    </div>
                    <div className="eh-step-content">
                      <label>Start Command</label>
                      <div className="eh-code-input-wrapper">
                        <span className="eh-code-prompt">$</span>
                        <input
                          type="text"
                          value={form.start_command ?? ""}
                          onChange={(e) => update("start_command", e.target.value)}
                          placeholder="npm start"
                        />
                      </div>
                      <small>Command executed inside the container to boot your server process.</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dockerfile Editor (Custom Runtime) */}
          {form.runtime === "custom" && (
            <div className="eh-card">
              <div className="eh-card-header">
                <div className="eh-card-title">
                  <Layers size={18} className="eh-header-icon" />
                  <h3>Custom Dockerfile</h3>
                </div>
              </div>

              <div className="eh-dockerfile-card">
                <div className="eh-docker-notice">
                  <Info size={18} />
                  <div>
                    <strong>Custom Runtime Container</strong>
                    <p>
                      EchoHub will build and launch the container using this Dockerfile directly.
                      Ensure all installations, build commands, and container port exposes are included.
                    </p>
                  </div>
                </div>

                <div className="eh-editor-frame">
                  <CodeEditor
                    language="dockerfile"
                    value={form.dockerfile ?? ""}
                    onChange={(value) => update("dockerfile", value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bottom Floating/Sticky Save Action */}
          <div className="eh-bottom-bar">
            <div className="eh-bottom-bar-hint">
              <Info size={15} />
              <span>Settings will automatically apply on your next build & deployment.</span>
            </div>

            <Button
              variant="primary"
              loading={saving}
              onClick={handleSave}
              className="eh-save-btn"
            >
              <Save size={16} />
              <span>Save Settings</span>
            </Button>
          </div>
        </div>
      )}

      {/* Tab 2: Domains & Publishing */}
      {activeTab === "domains" && (
        <div className="eh-tab-panel">
          <div className="eh-card">
            <div className="eh-card-header">
              <div className="eh-card-title">
                <Globe size={18} className="eh-header-icon" />
                <h3>Domains & Public Access</h3>
              </div>
            </div>

            <div className="eh-publishing-container">
              <PublicationStatus
                publication={publication}
                loading={publoading}
                project={project}
                onPublish={handlePublish}
                onUpdateSubdomain={handleUpdateSubdomain}
                onUnpublish={handleUnpublish}
                refresh={pubrefresh}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Danger Zone */}
      {activeTab === "danger" && (
        <div className="eh-tab-panel">
          <div className="eh-card eh-danger-card">
            <div className="eh-danger-head">
              <div className="eh-danger-icon-badge">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3>Delete Project</h3>
                <p>Irreversible deletion of all code, deployments, images, and logs.</p>
              </div>
            </div>

            <div className="eh-danger-body">
              <p>
                Deleting this project is permanent. Once deleted, all associated resources cannot be recovered:
              </p>
              <ul className="eh-danger-list">
                <li>Project files and workspace directory</li>
                <li>Local git repository & branches</li>
                <li>Docker images and container instances</li>
                <li>All environment variables and secrets</li>
                <li>Deployment logs and historical records</li>
                <li>Public routing and domain assignments</li>
              </ul>
            </div>

            <div className="eh-danger-action-row">
              <Button
                variant="danger"
                onClick={() => setDeleteOpen(true)}
                className="eh-delete-trigger-btn"
              >
                Delete This Project
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
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
