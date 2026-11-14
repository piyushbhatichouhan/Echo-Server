import "./createprojectmodal.css";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { createProject } from "../../../services/project.api";
import { useToast } from "../../../context/ToastContext";

import {
  Globe,
  Server,
  Terminal,
  Box,
  CheckCircle2,
  GitBranch,
  Zap,
  Layers,
  X,
  FolderPlus,
  Plus,
  AlertTriangle,
  Cpu,
  Code2,
  Coffee,
} from "lucide-react";

const APPLICATIONS = {
  node: {
    title: "Node.js",
    icon: <Server size={24} />,
    description: "Express, Fastify, NestJS, and Node.js backend servers.",
    runtime: "Node.js (node:22-alpine)",
    install: "npm install",
    build: "npm run build",
    start: "npm start",
    output: "-",
  },

  vite: {
    title: "Vite (React / Vue)",
    icon: <Zap size={24} />,
    description: "Modern Single Page Apps served through high-performance Nginx.",
    runtime: "Multi-stage Nginx",
    install: "npm install",
    build: "npm run build",
    start: "Automatic Nginx SPA router",
    output: "dist/",
  },

  next: {
    title: "Next.js",
    icon: <Layers size={24} />,
    description: "Next.js SSR and full-stack React applications.",
    runtime: "Node.js (node:22-alpine)",
    install: "npm install",
    build: "npm run build",
    start: "npm start",
    output: ".next",
  },

  static: {
    title: "Static Website",
    icon: <Globe size={24} />,
    description: "Pure HTML, CSS, JavaScript files or pre-built static assets.",
    runtime: "Nginx Alpine",
    install: "-",
    build: "-",
    start: "Automatic Nginx static server",
    output: "./",
  },

  python: {
    title: "Python",
    icon: <Terminal size={24} />,
    description: "FastAPI, Flask, Django, and Python web applications.",
    runtime: "Python 3.12 Slim",
    install: "pip install -r requirements.txt",
    build: "-",
    start: "python app.py",
    output: "-",
  },

  go: {
    title: "Go (Golang)",
    icon: <Cpu size={24} />,
    description: "Compiled Go web services and APIs via multi-stage Alpine buildpack.",
    runtime: "Go 1.23 Alpine",
    install: "go mod download",
    build: "go build -o server .",
    start: "./server",
    output: "-",
  },

  rust: {
    title: "Rust",
    icon: <Cpu size={24} />,
    description: "High-performance Rust applications built with Cargo.",
    runtime: "Rust 1.82 Alpine",
    install: "-",
    build: "cargo build --release",
    start: "./target/release/app",
    output: "-",
  },

  bun: {
    title: "Bun",
    icon: <Zap size={24} />,
    description: "Fast all-in-one JavaScript and TypeScript runtime.",
    runtime: "Bun Latest Alpine",
    install: "bun install",
    build: "-",
    start: "bun run start",
    output: "-",
  },

  php: {
    title: "PHP",
    icon: <Globe size={24} />,
    description: "PHP 8.2 web applications running on Apache.",
    runtime: "PHP 8.2 Apache",
    install: "composer install",
    build: "-",
    start: "Apache HTTP Server",
    output: "-",
  },

  ruby: {
    title: "Ruby",
    icon: <Code2 size={24} />,
    description: "Ruby on Rails, Sinatra, and Rack applications with Bundler.",
    runtime: "Ruby 3.3 Alpine",
    install: "bundle install",
    build: "-",
    start: "bundle exec rackup -p 3000",
    output: "-",
  },

  java: {
    title: "Java",
    icon: <Coffee size={24} />,
    description: "Spring Boot, Quarkus, and Java services running on OpenJDK 17.",
    runtime: "OpenJDK 17 / Maven",
    install: "-",
    build: "mvn clean package -DskipTests",
    start: "java -jar target/*.jar",
    output: "-",
  },

  custom: {
    title: "Custom Docker",
    icon: <Box size={24} />,
    description: "User-defined Dockerfile or custom container settings.",
    runtime: "Custom Dockerfile",
    install: "Custom",
    build: "Custom",
    start: "Custom",
    output: "-",
  },
};

export default function CreateProjectModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [applicationType, setApplicationType] = useState("node");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    if (loading) return;
    setError("");
    onClose?.();
  }, [loading, onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  const current = APPLICATIONS[applicationType];

  const submit = async (e) => {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return;

    setError("");

    try {
      setLoading(true);

      await createProject({
        name: trimmed,
        description: description?.trim() || "",
        applicationType,
      });

      setName("");
      setDescription("");
      setApplicationType("node");
      setError("");

      toast.success("Project Created", `Project "${trimmed}" has been created successfully.`);
      onCreated?.();
      onClose?.();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create project.";
      setError(msg);
      toast.error("Project Creation Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="createProjectOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="createProjectDialog" onClick={(e) => e.stopPropagation()}>
        <div className="createProjectHeader">
          <div className="createProjectHeaderLeft">
            <div className="createProjectIconBadge">
              <FolderPlus size={22} />
            </div>
            <div>
              <h1>Create New Project</h1>
              <p>
                Choose what you want to deploy. Runtime commands can be customized
                later from Project Settings.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="createProjectClose"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form className="createProjectBody" onSubmit={submit}>
          {error && (
            <div className="createProjectErrorBanner" role="alert">
              <AlertTriangle size={18} className="createProjectErrorIcon" />
              <span>{error}</span>
            </div>
          )}

          <div className="projectInfoSection">
            <div className="field">
              <label htmlFor="project-name-input">Project Name <span className="fieldRequired">*</span></label>

              <input
                id="project-name-input"
                placeholder="e.g. portfolio-api or payments-worker"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                autoFocus
                disabled={loading}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="project-desc-input">Description <span className="fieldOptional">(optional)</span></label>

              <textarea
                id="project-desc-input"
                rows={3}
                placeholder="Briefly describe this project or service..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="runtimeSection">
            <div className="runtimeHeading">
              <div>
                <h3>Application Type</h3>
                <span>Select a deployment template to preconfigure build & runtime settings.</span>
              </div>
            </div>

            <div className="runtimeGrid">
              {Object.entries(APPLICATIONS).map(([key, app]) => {
                const isSelected = applicationType === key;
                return (
                  <div
                    key={key}
                    role="button"
                    tabIndex={0}
                    className={`runtimeCard ${isSelected ? "active" : ""}`}
                    onClick={() => setApplicationType(key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setApplicationType(key);
                      }
                    }}
                  >
                    <div className="runtimeCardTop">
                      <div className="runtimeIcon">{app.icon}</div>

                      {isSelected && (
                        <CheckCircle2 size={20} className="runtimeSelected" />
                      )}
                    </div>

                    <h4>{app.title}</h4>
                    <p>{app.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="runtimePreview">
            <div className="runtimePreviewHeader">
              <div className="runtimePreviewTitleWrap">
                <span className="runtimePreviewLabel">Default Configuration</span>
                <h3>{current.title}</h3>
              </div>
              <span className="runtimeBadge">{current.runtime}</span>
            </div>

            <div className="runtimePreviewGrid">
              <div className="runtimePreviewField">
                <label>Install Command</label>
                <code>{current.install}</code>
              </div>

              <div className="runtimePreviewField">
                <label>Build Command</label>
                <code>{current.build}</code>
              </div>

              <div className="runtimePreviewField">
                <label>Start Command</label>
                <code>{current.start}</code>
              </div>

              <div className="runtimePreviewField">
                <label>Output Directory</label>
                <code>{current.output}</code>
              </div>
            </div>
          </div>

          <div className="projectFooter">
            <div className="footerInfo">
              <div>
                <GitBranch size={16} />
                <span>Git repository and auto-deploy webhook can be configured after creation.</span>
              </div>
            </div>

            <div className="footerButtons">
              <button
                type="button"
                className="secondaryButton"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                className="primaryButton"
                disabled={!name.trim() || loading}
                type="submit"
              >
                {loading ? (
                  <span className="createProjectSpinnerWrap">
                    <span className="createProjectSpinner" />
                    Creating...
                  </span>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Create Project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

