import "./createprojectmodal.css";

import { useState } from "react";
import { createProject } from "../../../services/project.api";

import {
  Globe,
  Server,
  Terminal,
  Box,
  CheckCircle2,
  GitBranch,
  PlugZap,
} from "lucide-react";

const APPLICATIONS = {
  node: {
    title: "Node.js",
    icon: <Server size={28} />,
    description: "Express, Fastify, NestJS and other Node applications.",
    runtime: "Node.js",
    install: "npm install",
    build: "npm run build",
    start: "npm start",
    output: "-",
  },

  static: {
    title: "Static Website",
    icon: <Globe size={28} />,
    description: "HTML, CSS, JavaScript, Vite or other static websites.",
    runtime: "Static Website",
    install: "npm install",
    build: "npm run build",
    start: "Served automatically",
    output: "dist/",
  },

  python: {
    title: "Python",
    icon: <Terminal size={28} />,
    description: "Flask, FastAPI, Django and Python web applications.",
    runtime: "Python",
    install: "pip install -r requirements.txt",
    build: "-",
    start: "python app.py",
    output: "-",
  },

  custom: {
    title: "Custom",
    icon: <Box size={28} />,
    description: "Configure runtime and commands manually.",
    runtime: "Custom",
    install: "Custom",
    build: "Custom",
    start: "Custom",
    output: "-",
  },
};

export default function CreateProjectModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [applicationType, setApplicationType] = useState("node");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const current = APPLICATIONS[applicationType];

  const submit = async (e) => {
    e.preventDefault();

    if (!name.trim()) return;

    try {
      setLoading(true);

      await createProject({
        name,
        description,
        applicationType,
      });

      setName("");
      setDescription("");
      setApplicationType("node");

      onCreated?.();
      onClose?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="createProjectOverlay" onClick={onClose}>
      <div className="createProjectDialog" onClick={(e) => e.stopPropagation()}>
        <div className="createProjectHeader">
          <div>
            <h1>Create New Project</h1>

            <p>
              Choose what you want to deploy. Runtime commands can be customized
              later from Project Settings.
            </p>
          </div>

          <button className="createProjectClose" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="createProjectBody" onSubmit={submit}>
          <div className="projectInfoSection">
            <div className="field">
              <label>Project Name</label>

              <input
                placeholder="Portfolio API"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Description</label>

              <textarea
                rows={3}
                placeholder="Describe your project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="runtimeSection">
            <div className="runtimeHeading">
              <h3>Application Type</h3>

              <span>Select one deployment template.</span>
            </div>

            <div className="runtimeGrid">
              {Object.entries(APPLICATIONS).map(([key, app]) => (
                <div
                  key={key}
                  className={`runtimeCard ${
                    applicationType === key ? "active" : ""
                  }`}
                  onClick={() => setApplicationType(key)}
                >
                  <div className="runtimeCardTop">
                    <div className="runtimeIcon">{app.icon}</div>

                    {applicationType === key && (
                      <CheckCircle2 size={22} className="runtimeSelected" />
                    )}
                  </div>

                  <h4>{app.title}</h4>

                  <p>{app.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="runtimePreview">
            <div className="runtimePreviewHeader">
              <h3>{current.title}</h3>

              <span>{current.runtime}</span>
            </div>

            <div className="runtimePreviewGrid">
              <div>
                <label>Install</label>

                <code>{current.install}</code>
              </div>

              <div>
                <label>Build</label>

                <code>{current.build}</code>
              </div>

              <div>
                <label>Start</label>

                <code>{current.start}</code>
              </div>

              <div>
                <label>Output Directory</label>

                <code>{current.output}</code>
              </div>
            </div>
          </div>

          <div className="projectFooter">
            <div className="footerInfo">
              <div>
                <GitBranch size={18} />

                <span>Git can be connected later</span>
              </div>
            </div>

            <div className="footerButtons">
              <button
                type="button"
                className="secondaryButton"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                className="primaryButton"
                disabled={!name.trim() || loading}
                type="submit"
              >
                {loading ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
