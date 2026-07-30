import { useEffect, useState } from "react";
import "./Settings.css";

import Button from "../../common/Button/Button";
import useProjectSettings from "../../../hooks/useProjectSettings";
import { useToast } from "../../../context/ToastContext";
import CodeEditor from "../../common/CodeEditor/CodeEditor";

export default function Settings({ projectId }) {
  const { project, settings, loading, save } = useProjectSettings(projectId);

  const toast = useToast();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

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
              console.log("Saving form:", form);

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
    </div>
  );
}
