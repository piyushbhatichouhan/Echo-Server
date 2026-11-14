import "./environment.css";

import {
  Plus,
  FileText,
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Network,
  Copy,
  Check,
  BookOpen,
  Database,
} from "lucide-react";

import Button from "../../common/button/button";
import Card from "../../common/card/card";

import EnvironmentItem from "./environmentItem";
import BulkEnvModal from "./BulkEnvModal";
import DatabasePresetModal from "./DatabasePresetModal";
import DeploymentGuideModal from "../guide/DeploymentGuideModal";

import useEnvironment from "../../../hooks/useEnvironment";
import { useState, useEffect } from "react";

import EnvironmentModal from "./EnvironmentModal";
import { useToast } from "../../../context/ToastContext";
import { redeployProject } from "../../../services/deployment.api";
import { getExampleEnvironmentVariables } from "../../../services/environment.api";
import { getOutboundIp } from "../../../services/system.api";

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
  const [exampleEnv, setExampleEnv] = useState(null);

  const [outboundIp, setOutboundIp] = useState(null);
  const [copiedIp, setCopiedIp] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState("db");
  const [dbPresetModalOpen, setDbPresetModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    getOutboundIp()
      .then((res) => {
        if (mounted && res) {
          const ipVal = typeof res === "string" ? res : res?.outboundIp || res?.ip || null;
          if (ipVal) setOutboundIp(ipVal.trim());
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleCopyIp = () => {
    if (!outboundIp) return;
    navigator.clipboard.writeText(outboundIp);
    setCopiedIp(true);
    toast.success("Copied to Clipboard", `Outbound IP ${outboundIp} copied.`);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  useEffect(() => {
    let mounted = true;
    getExampleEnvironmentVariables(projectId)
      .then((data) => {
        if (mounted && data?.found) {
          setExampleEnv(data);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [projectId]);

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
              icon={Database}
              onClick={() => setDbPresetModalOpen(true)}
            >
              DB Presets
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

      {outboundIp && (
        <div className="eh-env-ip-banner">
          <div className="eh-env-ip-left">
            <div className="eh-env-ip-icon">
              <Network size={18} />
            </div>
            <div className="eh-env-ip-text">
              <div className="eh-env-ip-title">
                <strong>Outbound Server IP:</strong>
                <code className="eh-env-ip-code">{outboundIp}</code>
                <button
                  type="button"
                  className="eh-env-ip-copy-btn"
                  onClick={handleCopyIp}
                  title="Copy IP for MongoDB Atlas / Supabase whitelist"
                >
                  {copiedIp ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedIp ? "Copied!" : "Copy IP"}</span>
                </button>
              </div>
              <p className="eh-env-ip-desc">
                External databases (MongoDB Atlas, Supabase, Neon, AWS RDS) require whitelisting this IP under their Network Access settings.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="eh-env-ip-guide-btn"
            onClick={() => {
              setGuideTab("db");
              setGuideOpen(true);
            }}
          >
            <BookOpen size={14} />
            <span>DB Whitelist Guide</span>
          </button>
        </div>
      )}

      {exampleEnv && (
        <div className="eh-env-example-banner">
          <div className="eh-env-example-left">
            <Sparkles size={18} className="eh-sparkle-icon" />
            <div>
              <strong>Template Detected ({exampleEnv.source}):</strong>
              <span>
                Found {exampleEnv.variables.length} suggested environment variables.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="eh-env-import-example-btn"
            onClick={() => handleBulkImport(exampleEnv.variables)}
          >
            Import from {exampleEnv.source}
          </button>
        </div>
      )}

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

      <DatabasePresetModal
        open={dbPresetModalOpen}
        onClose={() => setDbPresetModalOpen(false)}
        onApply={handleBulkImport}
        onOpenGuide={(dbId) => {
          setGuideTab(dbId);
          setGuideOpen(true);
        }}
      />

      <DeploymentGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        initialTab={guideTab}
      />
    </div>
  );
}
