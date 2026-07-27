import { useEffect, useState } from "react";
import "./Settings.css";

import Button from "../../common/Button/Button";
import useProjectSettings from "../../../hooks/useProjectSettings";
import { useToast } from "../../../context/ToastContext";
export default function Settings({ projectId }) {
  const { settings, loading, save } = useProjectSettings(projectId);
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
    <div className="eh-settings">
      <div className="eh-settings-card">
        <h2>Deployment Configuration</h2>
        <p className="eh-settings-subtitle">
          Configure how Echo installs, builds and starts your project.
        </p>

        <div className="eh-settings-grid">
          <div className="eh-setting">
            <label>Runtime</label>

            <input
              value={form.runtime}
              onChange={(e) => update("runtime", e.target.value)}
            />

            <small>Project runtime environment.</small>
          </div>

          <div className="eh-setting">
            <label>Working Directory</label>

            <input
              value={form.working_directory}
              onChange={(e) => update("working_directory", e.target.value)}
            />

            <small>Directory where deployment starts.</small>
          </div>

          <div className="eh-setting">
            <label>Port</label>

            <input
              type="number"
              value={form.port}
              onChange={(e) => update("port", Number(e.target.value))}
            />

            <small>Internal application port.</small>
          </div>
        </div>

        <div className="eh-section-title">
          <span>Build Commands</span>
        </div>

        <div className="eh-setting">
          <label>Install Command</label>

          <input
            className="eh-command"
            value={form.install_command}
            onChange={(e) => update("install_command", e.target.value)}
          />

          <small>Executed before the build step.</small>
        </div>

        <div className="eh-setting">
          <label>Build Command</label>

          <input
            className="eh-command"
            value={form.build_command}
            onChange={(e) => update("build_command", e.target.value)}
          />

          <small>Compiles or prepares the project.</small>
        </div>

        <div className="eh-setting">
          <label>Start Command</label>

          <input
            className="eh-command"
            value={form.start_command}
            onChange={(e) => update("start_command", e.target.value)}
          />

          <small>Command used to launch the application.</small>
        </div>

        <div className="eh-settings-actions">
          <Button
            loading={saving}
            onClick={async () => {
              try {
                setSaving(true);

                await save(form);

                toast.success("Sucess", "Settings saved succesfully");
              } catch (error) {
                const message = error.response?.data?.message || error.message;

                toast.error("Error", message);
              } finally {
                setSaving(false);
              }
            }}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
