import { useState, useEffect, useCallback } from "react";
import "./ProjectDatabases.css";
import {
  Database,
  Plus,
  Play,
  Square,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Server,
  HardDrive,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import Button from "../../common/button/button";
import { useToast } from "../../../context/ToastContext";
import {
  getProjectDatabases,
  provisionDatabase,
  startDatabase,
  stopDatabase,
  deleteDatabase,
} from "../../../services/database.api";

const ENGINE_DETAILS = {
  postgres: {
    name: "PostgreSQL",
    color: "#336791",
    badgeClass: "engine-postgres",
    icon: "🐘",
    description: "Enterprise-grade relational SQL database with JSON support.",
    defaultPort: 5432,
    defaultVersion: "17-alpine",
    versions: ["17-alpine", "16-alpine", "15-alpine"],
  },
  redis: {
    name: "Redis",
    color: "#dc382d",
    badgeClass: "engine-redis",
    icon: "⚡",
    description: "Ultra-fast in-memory data store, cache, and message broker.",
    defaultPort: 6379,
    defaultVersion: "7-alpine",
    versions: ["7-alpine", "6-alpine"],
  },
  mysql: {
    name: "MySQL",
    color: "#00758f",
    badgeClass: "engine-mysql",
    icon: "🐬",
    description: "World's most popular open-source relational database engine.",
    defaultPort: 3306,
    defaultVersion: "8.0",
    versions: ["8.0", "5.7"],
  },
  mongo: {
    name: "MongoDB",
    color: "#13aa52",
    badgeClass: "engine-mongo",
    icon: "🍃",
    description: "Scalable NoSQL document database storing BSON JSON records.",
    defaultPort: 27017,
    defaultVersion: "7.0",
    versions: ["7.0", "6.0"],
  },
};

const ENGINE_CONFIGS = ENGINE_DETAILS;

export default function ProjectDatabases({ projectId }) {
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState("postgres");
  const [instanceName, setInstanceName] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("17-alpine");
  const [provisioning, setProvisioning] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const toast = useToast();

  const fetchDatabases = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await getProjectDatabases(projectId);
      setDatabases(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to load databases");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  const handleOpenModal = () => {
    setSelectedEngine("postgres");
    setSelectedVersion(ENGINE_DETAILS.postgres.defaultVersion);
    setInstanceName("postgres-db");
    setModalOpen(true);
  };

  const handleEngineChange = (engineKey) => {
    setSelectedEngine(engineKey);
    setSelectedVersion(ENGINE_DETAILS[engineKey].defaultVersion);
    setInstanceName(`${engineKey}-db`);
  };

  const handleProvision = async (e) => {
    e.preventDefault();
    if (!instanceName.trim()) {
      toast.error("Please enter a database instance name");
      return;
    }

    try {
      setProvisioning(true);
      await provisionDatabase(projectId, {
        engine: selectedEngine,
        name: instanceName.trim(),
        version: selectedVersion,
      });
      toast.success(
        `Successfully provisioned ${ENGINE_DETAILS[selectedEngine]?.name}! Connection strings have been auto-injected.`,
      );
      setModalOpen(false);
      fetchDatabases();
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to provision database",
      );
    } finally {
      setProvisioning(false);
    }
  };

  const handleStart = async (dbId) => {
    try {
      setActionLoadingId(dbId);
      await startDatabase(projectId, dbId);
      toast.success("Database started successfully");
      fetchDatabases();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to start database");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStop = async (dbId) => {
    try {
      setActionLoadingId(dbId);
      await stopDatabase(projectId, dbId);
      toast.success("Database stopped");
      fetchDatabases();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to stop database");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (dbId, name) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete '${name}' and its persistent data volume? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setActionLoadingId(dbId);
      await deleteDatabase(projectId, dbId);
      toast.success(`Database '${name}' deleted.`);
      fetchDatabases();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete database");
    } finally {
      setActionLoadingId(null);
    }
  };

  const togglePasswordVisibility = (dbId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [dbId]: !prev[dbId],
    }));
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Connection string copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="eh-databases-view">
      <div className="eh-databases-header">
        <div className="eh-databases-header-left">
          <div className="eh-databases-icon-box">
            <Database size={24} />
          </div>
          <div>
            <h2>One-Click Managed Databases</h2>
            <p>
              Dedicated, containerized databases with persistent volumes and
              automatic environment variable injection.
            </p>
          </div>
        </div>

        <div className="eh-databases-header-actions">
          <Button
            variant="secondary"
            onClick={fetchDatabases}
            disabled={loading}
            title="Refresh database statuses"
          >
            <RefreshCw size={15} className={loading ? "eh-spin" : ""} />
            <span>Refresh</span>
          </Button>

          <Button onClick={handleOpenModal}>
            <Plus size={16} />
            <span>Provision Database</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {loading && databases.length === 0 ? (
        <div className="eh-databases-loading">
          <RefreshCw size={24} className="eh-spin" />
          <p>Loading database instances...</p>
        </div>
      ) : databases.length === 0 ? (
        <div className="eh-databases-empty">
          <div className="eh-empty-icon-wrap">
            <Database size={36} />
          </div>
          <h3>No Managed Databases Yet</h3>
          <p>
            Add an isolated PostgreSQL, Redis, MySQL, or MongoDB database to your
            project with a single click. Connection strings are auto-injected
            directly into your application runtime.
          </p>
          <Button onClick={handleOpenModal}>
            <Plus size={16} />
            <span>Provision Your First Database</span>
          </Button>
        </div>
      ) : (
        <div className="eh-databases-grid">
          {databases.map((db) => {
            const engineKey = db.engine ? String(db.engine).toLowerCase() : "";
            const engineInfo = ENGINE_DETAILS[engineKey] || {
              name: db.engine || "Database",
              icon: "🗄️",
              badgeClass: "",
            };
            const isRunning = db.status === "running";
            const isActionLoading = actionLoadingId === db.id;
            const isPasswordVisible = Boolean(visiblePasswords[db.id]);

            // Formatted connection string with password masking if hidden
            let displayConnStr = db.connection_string || "";
            if (!isPasswordVisible && db.db_password && displayConnStr) {
              const encodedPw = encodeURIComponent(db.db_password);
              if (displayConnStr.includes(encodedPw)) {
                displayConnStr = displayConnStr.split(encodedPw).join("••••••••••••••••");
              } else if (displayConnStr.includes(db.db_password)) {
                displayConnStr = displayConnStr.split(db.db_password).join("••••••••••••••••");
              }
            }

            return (
              <div key={db.id} className="eh-database-card">
                <div className="eh-db-card-header">
                  <div className="eh-db-title-group">
                    <span className="eh-db-emoji-icon">{engineInfo.icon}</span>
                    <div>
                      <div className="eh-db-name-row">
                        <h3>{db.name}</h3>
                        <span className={`eh-db-engine-badge ${engineInfo.badgeClass}`}>
                          {engineInfo.name} {db.version}
                        </span>
                      </div>
                      <span className="eh-db-container-name">
                        {db.container_name}
                      </span>
                    </div>
                  </div>

                  <div className="eh-db-status-pill-wrap">
                    <span
                      className={`eh-db-status-pill ${
                        isRunning ? "running" : "stopped"
                      }`}
                    >
                      <span className="eh-status-dot" />
                      {isRunning ? "Running" : "Stopped"}
                    </span>
                  </div>
                </div>

                {/* Specs / Port mapping */}
                <div className="eh-db-specs-grid">
                  <div className="eh-spec-item">
                    <span className="eh-spec-label">Host Port:</span>
                    <code className="eh-spec-value">:{db.host_port}</code>
                  </div>
                  <div className="eh-spec-item">
                    <span className="eh-spec-label">Internal:</span>
                    <code className="eh-spec-value">:{db.internal_port}</code>
                  </div>
                  <div className="eh-spec-item">
                    <span className="eh-spec-label">Volume:</span>
                    <span className="eh-spec-vol" title={db.volume_name}>
                      <HardDrive size={12} /> {db.volume_name}
                    </span>
                  </div>
                </div>

                {/* Connection String Box */}
                <div className="eh-db-connection-section">
                  <div className="eh-db-conn-header">
                    <label>Connection String (Auto-Injected)</label>
                    <div className="eh-db-conn-tools">
                      <button
                        type="button"
                        className="eh-conn-tool-btn"
                        onClick={() => togglePasswordVisibility(db.id)}
                        title={
                          isPasswordVisible ? "Mask password" : "Show password"
                        }
                      >
                        {isPasswordVisible ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                        <span>{isPasswordVisible ? "Hide" : "Show"}</span>
                      </button>

                      <button
                        type="button"
                        className="eh-conn-tool-btn"
                        onClick={() => handleCopy(db.connection_string, db.id)}
                        title="Copy connection string"
                      >
                        {copiedId === db.id ? (
                          <Check size={14} className="copied" />
                        ) : (
                          <Copy size={14} />
                        )}
                        <span>{copiedId === db.id ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="eh-db-conn-box">
                    <code>{displayConnStr}</code>
                  </div>
                </div>

                {/* Credentials Details (if applicable) */}
                {db.db_user && (
                  <div className="eh-db-creds-drawer">
                    <div className="eh-cred-pill">
                      <span>User:</span> <strong>{db.db_user}</strong>
                    </div>
                    {db.db_name && (
                      <div className="eh-cred-pill">
                        <span>Database:</span> <strong>{db.db_name}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Actions */}
                <div className="eh-db-actions-row">
                  {isRunning ? (
                    <button
                      type="button"
                      className="eh-db-btn stop"
                      onClick={() => handleStop(db.id)}
                      disabled={isActionLoading}
                      title="Stop container"
                    >
                      <Square size={14} />
                      <span>{isActionLoading ? "Stopping..." : "Stop"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="eh-db-btn start"
                      onClick={() => handleStart(db.id)}
                      disabled={isActionLoading}
                      title="Start container"
                    >
                      <Play size={14} />
                      <span>{isActionLoading ? "Starting..." : "Start"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="eh-db-btn delete"
                    onClick={() => handleDelete(db.id, db.name)}
                    disabled={isActionLoading}
                    title="Delete database instance and volume"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Provision Database Modal */}
      {modalOpen && (
        <div className="eh-db-modal-overlay">
          <div className="eh-db-modal">
            <div className="eh-db-modal-header">
              <div className="eh-modal-title-group">
                <Sparkles size={20} className="eh-sparkle" />
                <h3>Provision Managed Database</h3>
              </div>
              <button
                type="button"
                className="eh-modal-close"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleProvision} className="eh-db-modal-form">
              {/* Engine Selector */}
              <div className="eh-modal-field">
                <label>Select Database Engine</label>
                <div className="eh-engine-select-grid">
                  {Object.entries(ENGINE_DETAILS).map(([key, item]) => {
                    const isSelected = selectedEngine === key;
                    return (
                      <div
                        key={key}
                        className={`eh-engine-option ${
                          isSelected ? "selected" : ""
                        }`}
                        onClick={() => handleEngineChange(key)}
                      >
                        <span className="eh-engine-opt-icon">{item.icon}</span>
                        <div className="eh-engine-opt-info">
                          <strong>{item.name}</strong>
                          <p>{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instance Name */}
              <div className="eh-modal-field">
                <label htmlFor="db-name-input">Database Instance Name</label>
                <input
                  id="db-name-input"
                  type="text"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="e.g. main-db"
                  required
                />
              </div>

              {/* Version */}
              <div className="eh-modal-field">
                <label htmlFor="db-version-select">Engine Version / Image</label>
                <select
                  id="db-version-select"
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                >
                  {ENGINE_DETAILS[selectedEngine]?.versions.map((ver) => (
                    <option key={ver} value={ver}>
                      {ENGINE_DETAILS[selectedEngine]?.name} {ver}
                    </option>
                  ))}
                </select>
              </div>

              {/* Automated Injection Notice */}
              <div className="eh-modal-notice">
                <AlertCircle size={18} />
                <div>
                  <strong>Zero-Config Automated Injection</strong>
                  <p>
                    Upon provisioning, this database container will be launched
                    with a dedicated Docker storage volume. Connection strings
                    (e.g. <code>DATABASE_URL</code>, <code>REDIS_URL</code>) are
                    automatically injected into your project's environment variables.
                  </p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="eh-db-modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={provisioning}
                >
                  Cancel
                </Button>

                <Button type="submit" loading={provisioning}>
                  <Database size={15} />
                  <span>
                    {provisioning ? "Spinning Up Container..." : "Provision Database"}
                  </span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

