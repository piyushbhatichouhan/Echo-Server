import "./environment.css";

import {
  Plus,
  FileText,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCw,
} from "lucide-react";

import Button from "../../common/button/button";
import Card from "../../common/card/card";

import EnvironmentItem from "./environmentItem";
import BulkEnvModal from "./BulkEnvModal";

import useEnvironment from "../../../hooks/useEnvironment";
import { useState } from "react";

import EnvironmentModal from "./EnvironmentModal";
import { useToast } from "../../../context/ToastContext";
import { redeployProject } from "../../../services/deployment.api";

export default function Environment({ projectId }) {
  const toast = useToast();
  const { variables, loading, createVariable, updateVariable, removeVariable } =
    useEnvironment(projectId);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [showAllSecrets, setShowAllSecrets] = useState(false);
  const [needsRedeploy, setNeedsRedeploy] = useState(false);
  const [redeploying, setRedeploying] = useState(false);

  const handleBulkImport = async (parsedList) => {
    let count = 0;
    for (const item of parsedList) {
      const existing = variables.find((v) => v.key === item.key);
      if (existing) {
        await updateVariable(existing.id, item);
      } else {
        await createVariable(item);
      }
      count++;
    }
    toast.success("Bulk Import Complete", `Imported/updated ${count} environment variables.`);
    setNeedsRedeploy(true);
  };

  const handleExportEnv = () => {
    if (variables.length === 0) {
      toast.error("Export Empty", "No environment variables to export.");
      return;
    }
    const envText = variables.map((v) => `${v.key}=${v.value}`).join("\n");
    navigator.clipboard.writeText(envText);
    toast.success("Exported to Clipboard", `${variables.length} variables formatted and copied.`);
  };

  const handleRedeploy = async () => {
    try {
      setRedeploying(true);
      await redeployProject(projectId);
      toast.success("Project Redeployed", "New environment variables are now active in the container.");
      setNeedsRedeploy(false);
    } catch (err) {
      toast.error("Redeploy Failed", err.response?.data?.message || err.message);
    } finally {
      setRedeploying(false);
    }
  };

  return (
    <div className="eh-environment">
      <Card>
        <div className="eh-environment-header">
          <div>
            <h2>Environment Variables</h2>
            <p>Manage runtime configuration, build-time arguments, and secrets.</p>
          </div>

          <div className="eh-env-header-actions">
            <Button
              variant="secondary"
              icon={showAllSecrets ? EyeOff : Eye}
              onClick={() => setShowAllSecrets(!showAllSecrets)}
            >
              {showAllSecrets ? "Mask All" : "Reveal All"}
            </Button>

            <Button
              variant="secondary"
              icon={Download}
              onClick={handleExportEnv}
            >
              Export .env
            </Button>

            <Button
              variant="secondary"
              icon={FileText}
              onClick={() => setBulkModalOpen(true)}
            >
              Import .env
            </Button>

            <Button
              icon={Plus}
              variant="primary"
              onClick={() => {
                setEditingVariable(null);
                setModalOpen(true);
              }}
            >
              Add Variable
            </Button>
          </div>
        </div>
      </Card>

      {needsRedeploy && (
        <div className="eh-env-redeploy-banner">
          <div className="eh-env-redeploy-left">
            <AlertTriangle size={20} />
            <span>
              Environment variables have been modified. Redeploy to inject updated variables into the live container.
            </span>
          </div>
          <button
            type="button"
            className="eh-env-redeploy-btn"
            onClick={handleRedeploy}
            disabled={redeploying}
          >
            {redeploying ? "Redeploying..." : "Redeploy Project Now"}
          </button>
        </div>
      )}

      {loading ? (
        <Card>Loading...</Card>
      ) : variables.length === 0 ? (
        <Card>
          <div className="eh-environment-empty">
            No environment variables configured yet. Click "Add Variable" or "Import .env" to start.
          </div>
        </Card>
      ) : (
        <div className="eh-environment-list">
          {variables.map((variable) => (
            <EnvironmentItem
              key={variable.id}
              variable={variable}
              forcedVisible={showAllSecrets}
              onEdit={(variable) => {
                setEditingVariable(variable);
                setModalOpen(true);
              }}
              onDelete={async (variable) => {
                try {
                  const confirmed = window.confirm(`Delete "${variable.key}"?`);
                  if (!confirmed) return;

                  await removeVariable(variable.id);
                  setNeedsRedeploy(true);
                  toast.success(
                    "Variable Deleted",
                    `"${variable.key}" removed. Redeploy to apply.`,
                  );
                } catch (error) {
                  const message =
                    error.response?.data?.message || error.message;
                  toast.error("Error", message);
                }
              }}
            />
          ))}
        </div>
      )}

      <EnvironmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        variable={editingVariable}
        onSave={async (payload) => {
          if (editingVariable) {
            await updateVariable(editingVariable.id, payload);
          } else {
            await createVariable(payload);
          }
          setNeedsRedeploy(true);
        }}
      />

      <BulkEnvModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
}
