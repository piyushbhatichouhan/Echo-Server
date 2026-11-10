import React, { useState } from "react";
import Modal from "../../common/modal/modal";
import Button from "../../common/button/button";
import {
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  Sparkles,
} from "lucide-react";

export const DB_TEMPLATES = [
  {
    id: "mongodb",
    name: "MongoDB",
    subtitle: "MongoDB Atlas / Railway / Self-Hosted",
    icon: "🍃",
    color: "#10b981",
    variables: [
      {
        key: "MONGODB_URI",
        value: "mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/myDatabase?retryWrites=true&w=majority",
        description: "MongoDB connection string. Replace username, password, and database.",
      },
    ],
    hint: "External databases require whitelisting the server's Outbound IP in Atlas Network Access.",
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    subtitle: "Supabase / Neon / AWS RDS / Render",
    icon: "🐘",
    color: "#3b82f6",
    variables: [
      {
        key: "DATABASE_URL",
        value: "postgresql://postgres:<password>@db.xxx.supabase.co:5432/postgres?sslmode=require",
        description: "Postgres connection string. Cloud providers require sslmode=require.",
      },
      {
        key: "PGSSLMODE",
        value: "require",
        description: "Forces SSL connection for managed cloud databases.",
      },
    ],
    hint: "For Supabase, use port 6543 (transaction pooling) for serverless and containerized apps.",
  },
  {
    id: "mysql",
    name: "MySQL / MariaDB",
    subtitle: "PlanetScale / AWS RDS / Aiven",
    icon: "🐬",
    color: "#06b6d4",
    variables: [
      {
        key: "DATABASE_URL",
        value: "mysql://user:<password>@host:3306/dbname?ssl=true",
        description: "Full MySQL connection URI string.",
      },
      {
        key: "MYSQL_HOST",
        value: "db.myhost.com",
        description: "Alternative: Parameter-based host.",
      },
      {
        key: "MYSQL_USER",
        value: "admin",
        description: "MySQL user name.",
      },
      {
        key: "MYSQL_PASSWORD",
        value: "",
        description: "MySQL user password.",
      },
      {
        key: "MYSQL_DATABASE",
        value: "production_db",
        description: "Target database name.",
      },
    ],
    hint: "Ensure user privileges are granted for '%' or this server's Outbound IP, not just 'localhost'.",
  },
  {
    id: "redis",
    name: "Redis",
    subtitle: "Upstash / Redis Cloud / AWS ElastiCache",
    icon: "🔴",
    color: "#ef4444",
    variables: [
      {
        key: "REDIS_URL",
        value: "rediss://default:<password>@cluster.upstash.io:6379",
        description: "Redis URI. Note 'rediss://' (double s) enforces TLS encryption.",
      },
      {
        key: "REDIS_PASSWORD",
        value: "",
        description: "Optional auth token or password.",
      },
    ],
    hint: "Cloud Redis providers enforce TLS. Always use 'rediss://' (with double 's') in REDIS_URL.",
  },
  {
    id: "firebase",
    name: "Firebase",
    subtitle: "Firestore / Auth / Realtime Database",
    icon: "🔥",
    color: "#f59e0b",
    variables: [
      {
        key: "FIREBASE_PROJECT_ID",
        value: "my-app-project-12345",
        description: "Firebase Project ID from Project Settings.",
      },
      {
        key: "FIREBASE_CLIENT_EMAIL",
        value: "firebase-adminsdk-xxx@my-app-project-12345.iam.gserviceaccount.com",
        description: "Firebase Service Account client email.",
      },
      {
        key: "FIREBASE_PRIVATE_KEY",
        value: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
        description: "Private key with \\n preserved. Do not commit JSON files to git.",
      },
    ],
    hint: "In Node.js, replace literal \\n in private key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, '\\n').",
  },
];

export default function DatabasePresetModal({
  open,
  onClose,
  onApply,
  onOpenGuide,
}) {
  const [selectedDbId, setSelectedDbId] = useState("mongodb");
  const [formValues, setFormValues] = useState({});
  const [applying, setApplying] = useState(false);

  if (!open) return null;

  const currentTemplate = DB_TEMPLATES.find((t) => t.id === selectedDbId);

  const handleSelectDb = (id) => {
    setSelectedDbId(id);
    const tmpl = DB_TEMPLATES.find((t) => t.id === id);
    if (tmpl) {
      const initial = {};
      tmpl.variables.forEach((v) => {
        initial[v.key] = v.value;
      });
      setFormValues(initial);
    }
  };

  const handleInputChange = (key, value) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleApplyPreset = async () => {
    if (!currentTemplate) return;
    try {
      setApplying(true);
      const toImport = currentTemplate.variables.map((v) => ({
        key: v.key,
        value: formValues[v.key] ?? v.value,
      }));
      await onApply(toImport);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Database Environment Presets"
      width="780px"
    >
      <div className="eh-db-preset-container">
        <p className="eh-db-preset-lead">
          Choose a database to pre-configure standard connection environment variables.
        </p>

        {/* Database Selector Tabs */}
        <div className="eh-db-selector-grid">
          {DB_TEMPLATES.map((tmpl) => {
            const isSelected = tmpl.id === selectedDbId;
            return (
              <button
                key={tmpl.id}
                type="button"
                className={`eh-db-card-btn ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelectDb(tmpl.id)}
              >
                <div className="eh-db-card-icon">{tmpl.icon}</div>
                <div className="eh-db-card-meta">
                  <strong>{tmpl.name}</strong>
                  <span>{tmpl.subtitle}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Variable Config for Selected Database */}
        {currentTemplate && (
          <div className="eh-db-vars-panel">
            <div className="eh-db-vars-header">
              <div className="eh-db-vars-title">
                <span className="eh-db-vars-icon">{currentTemplate.icon}</span>
                <h4>{currentTemplate.name} Configuration</h4>
              </div>
              <button
                type="button"
                className="eh-db-guide-link-btn"
                onClick={() => {
                  onClose();
                  if (onOpenGuide) onOpenGuide(currentTemplate.id);
                }}
              >
                <BookOpen size={14} />
                <span>View {currentTemplate.name} Setup Guide</span>
              </button>
            </div>

            <div className="eh-db-hint-box">
              <Sparkles size={16} />
              <span>{currentTemplate.hint}</span>
            </div>

            <div className="eh-db-fields-list">
              {currentTemplate.variables.map((v) => (
                <div key={v.key} className="eh-db-field-group">
                  <div className="eh-db-field-meta">
                    <label className="eh-db-field-key">{v.key}</label>
                    <span className="eh-db-field-desc">{v.description}</span>
                  </div>
                  <input
                    type="text"
                    className="eh-db-field-input"
                    value={formValues[v.key] ?? v.value}
                    onChange={(e) => handleInputChange(v.key, e.target.value)}
                    placeholder={`Enter ${v.key}`}
                  />
                </div>
              ))}
            </div>

            <div className="eh-db-actions-row">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleApplyPreset}
                loading={applying}
              >
                Apply {currentTemplate.name} Variables
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

