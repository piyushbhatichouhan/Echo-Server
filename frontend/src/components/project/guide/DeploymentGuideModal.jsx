import { useState, useEffect, useCallback } from "react";
import Modal from "../../common/modal/modal";
import {
  BookOpen,
  Copy,
  Check,
  Terminal,
  ShieldAlert,
  Layers,
  Globe,
  Cpu,
  Database,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { getDeploymentGuide, getOutboundIp } from "../../../services/system.api";
import { useToast } from "../../../context/ToastContext";
import "./DeploymentGuideModal.css";

const DB_IDS = ["mongodb", "postgresql", "mysql", "redis", "firebase"];

const FALLBACK_DATABASES = [
  {
    id: "mongodb",
    name: "MongoDB (Atlas / Self-Hosted)",
    icon: "🍃",
    defaultPort: 27017,
    providers: ["MongoDB Atlas", "Railway", "DigitalOcean", "Self-Hosted"],
    envVariables: [
      {
        key: "MONGODB_URI",
        example: "mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/myDatabase?retryWrites=true&w=majority",
        description: "Full MongoDB connection string. Replace username, password, and database name.",
        required: true,
      },
    ],
    whitelistInstruction: "In MongoDB Atlas: Go to Security → Network Access → '+ Add IP Address' → Enter this Server Outbound IP with /32.",
    nodeSnippet: `const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;`,
    pythonSnippet: `from pymongo import MongoClient
import os

client = MongoClient(os.getenv("MONGODB_URI"))
db = client.get_default_database()
print("MongoDB Connected:", db.name)`,
    gotchas: [
      "Inside Docker, 'localhost' points to the container itself. Use MongoDB Atlas or your remote database host.",
      "If your password has special characters (@, #, %, :), percent-encode them in the URI.",
      "Ensure your Atlas database user has the 'readWriteAnyDatabase' or specific DB readWrite privilege.",
    ],
  },
  {
    id: "postgresql",
    name: "PostgreSQL (Supabase / Neon / RDS)",
    icon: "🐘",
    defaultPort: 5432,
    providers: ["Supabase", "Neon", "AWS RDS", "Render", "Railway"],
    envVariables: [
      {
        key: "DATABASE_URL",
        example: "postgresql://postgres:<password>@db.xxx.supabase.co:5432/postgres?sslmode=require",
        description: "Postgres connection string. Ensure sslmode=require is included for cloud providers.",
        required: true,
      },
      {
        key: "PGSSLMODE",
        example: "require",
        description: "Forces SSL connections. Required by Neon and Supabase.",
        required: false,
      },
    ],
    whitelistInstruction: "In Supabase / Neon / AWS RDS: Under Network Settings / Security Groups, ensure inbound connections on port 5432 (or 6543 for PgBouncer) are allowed from this Server Outbound IP.",
    nodeSnippet: `const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Postgres connection error:', err);
  else console.log('Postgres Connected:', res.rows[0]);
});

module.exports = pool;`,
    pythonSnippet: `import os
import psycopg2

conn = psycopg2.connect(
    os.getenv("DATABASE_URL"),
    sslmode="require"
)
print("PostgreSQL Connected")`,
    gotchas: [
      "For Supabase, use port 6543 with transaction pooling (PgBouncer) for high concurrency.",
      "Always include '?sslmode=require' in cloud Postgres connection strings.",
      "If using Prisma, define 'DATABASE_URL' in Environment Variables and run 'npx prisma generate' in your build command.",
    ],
  },
  {
    id: "mysql",
    name: "MySQL / MariaDB (PlanetScale / RDS)",
    icon: "🐬",
    defaultPort: 3306,
    providers: ["PlanetScale", "AWS RDS", "Aiven", "DigitalOcean"],
    envVariables: [
      {
        key: "DATABASE_URL",
        example: "mysql://user:<password>@host:3306/dbname?ssl=true",
        description: "Standard MySQL URI connection string.",
        required: true,
      },
      {
        key: "MYSQL_HOST",
        example: "db.myhost.com",
        description: "Alternative parameter-based configuration host.",
        required: false,
      },
      {
        key: "MYSQL_USER",
        example: "admin",
        description: "MySQL user name.",
        required: false,
      },
      {
        key: "MYSQL_PASSWORD",
        example: "your_strong_password",
        description: "MySQL user password.",
        required: false,
      },
      {
        key: "MYSQL_DATABASE",
        example: "production_db",
        description: "Target database name.",
        required: false,
      },
    ],
    whitelistInstruction: "In AWS RDS / Cloud Firewall: Add an Inbound Rule on port 3306 for this Server Outbound IP with /32. Ensure user grant: GRANT ALL ON db.* TO 'user'@'%';",
    nodeSnippet: `const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: { rejectUnauthorized: false },
});

pool.getConnection()
  .then((conn) => {
    console.log('MySQL Connected');
    conn.release();
  })
  .catch((err) => console.error('MySQL connection error:', err));

module.exports = pool;`,
    pythonSnippet: `import os
import pymysql

conn = pymysql.connect(
    host=os.getenv("MYSQL_HOST"),
    user=os.getenv("MYSQL_USER"),
    password=os.getenv("MYSQL_PASSWORD"),
    database=os.getenv("MYSQL_DATABASE"),
    ssl={"rejectUnauthorized": False}
)
print("MySQL Connected")`,
    gotchas: [
      "Use 'mysql2' instead of 'mysql' in Node.js for Promise support and modern auth methods.",
      "Cloud MySQL providers (like PlanetScale) require SSL enabled on connections.",
      "Ensure MySQL user host is configured to '%' or your specific Outbound IP, not 'localhost'.",
    ],
  },
  {
    id: "redis",
    name: "Redis (Upstash / Redis Cloud)",
    icon: "🔴",
    defaultPort: 6379,
    providers: ["Upstash (Serverless)", "Redis Cloud", "AWS ElastiCache", "Aiven"],
    envVariables: [
      {
        key: "REDIS_URL",
        example: "rediss://default:<password>@cluster.upstash.io:6379",
        description: "Redis connection URI. Note 'rediss://' (with double 's') enforces TLS encryption.",
        required: true,
      },
      {
        key: "REDIS_PASSWORD",
        example: "your_redis_token_or_password",
        description: "Redis auth token / password.",
        required: false,
      },
    ],
    whitelistInstruction: "In Redis Cloud or Upstash: In Security / IP Whitelist settings, add this Server Outbound IP.",
    nodeSnippet: `const Redis = require('ioredis');

// Note: rediss:// protocol automatically enables TLS
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});

redis.on('connect', () => console.log('Redis Connected Successfully'));
redis.on('error', (err) => console.error('Redis Error:', err.message));

module.exports = redis;`,
    pythonSnippet: `import os
import redis

# rediss:// enables SSL
r = redis.from_url(os.getenv("REDIS_URL"))
r.ping()
print("Redis Connected Successfully")`,
    gotchas: [
      "Always use 'rediss://' (two 's's) for managed Redis instances that require TLS/SSL.",
      "Configure maxRetriesPerRequest and retryStrategy in ioredis to prevent unhandled promise rejection crashes.",
      "If running background queue jobs (BullMQ / Celery), ensure the connection pool is separate from cache operations.",
    ],
  },
  {
    id: "firebase",
    name: "Firebase (Firestore / Auth / Realtime DB)",
    icon: "🔥",
    defaultPort: 443,
    providers: ["Google Firebase", "Google Cloud Platform"],
    envVariables: [
      {
        key: "FIREBASE_PROJECT_ID",
        example: "my-app-project-12345",
        description: "Your Firebase Project ID from Project Settings.",
        required: true,
      },
      {
        key: "FIREBASE_CLIENT_EMAIL",
        example: "firebase-adminsdk-xxx@my-app-project-12345.iam.gserviceaccount.com",
        description: "The service account email address.",
        required: true,
      },
      {
        key: "FIREBASE_PRIVATE_KEY",
        example: "-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk...\\n-----END PRIVATE KEY-----\\n",
        description: "The private key from serviceAccountKey.json. Keep the \\n newline characters intact.",
        required: true,
      },
      {
        key: "FIREBASE_SERVICE_ACCOUNT",
        example: "eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6Ii4uLiJ9",
        description: "Alternative: Base64-encoded or raw JSON of serviceAccountKey.json.",
        required: false,
      },
    ],
    whitelistInstruction: "Firebase Admin SDK connects over standard outbound HTTPS (port 443). If your Google Cloud project enforces VPC Service Controls or API restrictions, whitelist this Server Outbound IP.",
    nodeSnippet: `const admin = require('firebase-admin');

if (!admin.apps.length) {
  // Supports individual env variables with newline fix
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\\\n/g, '\\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const db = admin.firestore();
console.log('Firebase Admin Initialized');
module.exports = { admin, db };`,
    pythonSnippet: `import os
import firebase_admin
from firebase_admin import credentials, firestore

private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\\\n", "\\n")

cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "private_key": private_key,
    "token_uri": "https://oauth2.googleapis.com/token"
})

firebase_admin.initialize_app(cred)
db = firestore.client()
print("Firebase Admin Initialized")`,
    gotchas: [
      "Never commit 'serviceAccountKey.json' to Git! Use environment variables instead.",
      "The private key contains literal newlines. In Node, always do: process.env.FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, '\\n').",
      "Ensure the Firebase Admin SDK service account has Cloud Datastore User / Firebase Admin role in GCP IAM.",
    ],
  },
];

export default function DeploymentGuideModal({ isOpen, onClose, initialTab = "rules" }) {
  const isDbInit = DB_IDS.includes(initialTab) || initialTab === "database" || initialTab === "db";

  const [activeTab, setActiveTab] = useState(isDbInit ? "database" : (initialTab || "rules"));
  const [activeDb, setActiveDb] = useState(DB_IDS.includes(initialTab) ? initialTab : "mongodb");
  const [guideData, setGuideData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [ip, setIp] = useState(null);
  const [loadingIp, setLoadingIp] = useState(false);
  const [refreshingIp, setRefreshingIp] = useState(false);

  const toast = useToast();

  const fetchIp = useCallback(async (force = false) => {
    try {
      if (force) setRefreshingIp(true);
      else setLoadingIp(true);
      const resIp = await getOutboundIp(force);
      if (resIp && resIp !== "Auto-detected") {
        setIp(resIp);
      }
    } catch (e) {
      console.warn("Failed to fetch outbound IP:", e);
    } finally {
      setLoadingIp(false);
      setRefreshingIp(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        if (DB_IDS.includes(initialTab)) {
          setActiveTab("database");
          setActiveDb(initialTab);
        } else if (initialTab === "db" || initialTab === "database") {
          setActiveTab("database");
        } else {
          setActiveTab(initialTab);
        }
      }
      if (!guideData) {
        getDeploymentGuide()
          .then((data) => {
            setGuideData(data);
            if (data?.outboundIp && data.outboundIp !== "Auto-detected") {
              setIp(data.outboundIp);
            }
          })
          .catch(() => {});
      }
      if (!ip) {
        fetchIp();
      }
    }
  }, [isOpen, initialTab, guideData, ip, fetchIp]);

  const isPublicIpv4 = (val) =>
    typeof val === "string" &&
    /^(?!0\.)(?!127\.)(?!10\.)(?!172\.(1[6-9]|2\d|3[01])\.)(?!192\.168\.)(\d{1,3}\.){3}\d{1,3}$/.test(
      val.trim()
    );

  const copyToClipboard = (text, key) => {
    if (!isPublicIpv4(text)) {
      toast?.info?.("Detecting IP", "Still detecting server outbound IP, please wait...");
      fetchIp(true);
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast?.success?.("Copied to Clipboard", `Server Outbound IP ${text} copied.`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const outboundIp = isPublicIpv4(ip)
    ? ip.trim()
    : isPublicIpv4(guideData?.outboundIp)
    ? guideData.outboundIp.trim()
    : isPublicIpv4(import.meta.env.VITE_SERVER_IP)
    ? import.meta.env.VITE_SERVER_IP.trim()
    : "Detecting...";
  const databaseList = guideData?.databases || FALLBACK_DATABASES;
  const currentDb = databaseList.find((d) => d.id === activeDb) || databaseList[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deployment Quick Guide & Cheatsheet"
      className="eh-guide-modal"
      width="860px"
    >
      <div className="eh-guide-container">
        {/* Navigation Sidebar Tabs */}
        <div className="eh-guide-sidebar">
          <button
            type="button"
            className={`eh-guide-tab ${activeTab === "rules" ? "active" : ""}`}
            onClick={() => setActiveTab("rules")}
          >
            <Sparkles size={16} />
            <span>Golden Rules</span>
          </button>

          <button
            type="button"
            className={`eh-guide-tab ${activeTab === "node" ? "active" : ""}`}
            onClick={() => setActiveTab("node")}
          >
            <Cpu size={16} />
            <span>Node.js / Express</span>
          </button>

          <button
            type="button"
            className={`eh-guide-tab ${activeTab === "mern" ? "active" : ""}`}
            onClick={() => setActiveTab("mern")}
          >
            <Layers size={16} />
            <span>MERN / Full-Stack</span>
          </button>

          <button
            type="button"
            className={`eh-guide-tab ${activeTab === "static" ? "active" : ""}`}
            onClick={() => setActiveTab("static")}
          >
            <Globe size={16} />
            <span>Static & Vite SPA</span>
          </button>

          <button
            type="button"
            className={`eh-guide-tab ${activeTab === "python" ? "active" : ""}`}
            onClick={() => setActiveTab("python")}
          >
            <Terminal size={16} />
            <span>Python (FastAPI / Flask)</span>
          </button>

          <button
            type="button"
            className={`eh-guide-tab ${activeTab === "database" ? "active" : ""}`}
            onClick={() => setActiveTab("database")}
          >
            <Database size={16} />
            <span>Database Guides</span>
          </button>
        </div>

        {/* Content Panel */}
        <div className="eh-guide-content">
          {/* TAB 1: GOLDEN RULES */}
          {activeTab === "rules" && (
            <div className="eh-guide-section">
              <h3>4 Golden Rules for 100% Reliable Deployments</h3>
              <p className="eh-guide-lead">
                Follow these simple practices to guarantee your application boots on the first try without errors.
              </p>

              <div className="eh-guide-cards-grid">
                <div className="eh-rule-card">
                  <div className="eh-rule-number">1</div>
                  <div className="eh-rule-body">
                    <strong>Always listen on <code>process.env.PORT</code></strong>
                    <p>
                      EchoServer assigns dynamic ports to each application. Do not hardcode port 3000 or 5000 in your code.
                    </p>
                    <div className="eh-code-snippet">
                      <code>const PORT = process.env.PORT || 3000;</code>
                    </div>
                  </div>
                </div>

                <div className="eh-rule-card">
                  <div className="eh-rule-number">2</div>
                  <div className="eh-rule-body">
                    <strong>Bind your server to <code>0.0.0.0</code> (Not 127.0.0.1)</strong>
                    <p>
                      Inside Docker, 127.0.0.1 (localhost) is isolated to the container. Binding to 0.0.0.0 is required for external traffic.
                    </p>
                    <div className="eh-code-snippet">
                      <code>app.listen(PORT, '0.0.0.0');</code>
                    </div>
                  </div>
                </div>

                <div className="eh-rule-card">
                  <div className="eh-rule-number">3</div>
                  <div className="eh-rule-body">
                    <strong>Full-Stack Single Port Serving</strong>
                    <p>
                      In monorepos with frontend and backend, build the frontend into <code>dist</code> and let Express serve it statically.
                    </p>
                    <div className="eh-code-snippet">
                      <code>app.use(express.static('frontend/dist'));</code>
                    </div>
                  </div>
                </div>

                <div className="eh-rule-card">
                  <div className="eh-rule-number">4</div>
                  <div className="eh-rule-body">
                    <strong>Whitelist Server Outbound IP in External Databases</strong>
                    <p>
                      MongoDB Atlas, Supabase, Neon, and MySQL need the server's public IP in their network whitelist to allow connections.
                    </p>
                    <div className="eh-ip-pill">
                      <span>Server Outbound IP:</span>
                      <code>
                        {loadingIp && !ip ? (
                          <span className="eh-ip-loading-inline">
                            <RefreshCw size={11} className="eh-spin" /> Detecting...
                          </span>
                        ) : (
                          outboundIp
                        )}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(outboundIp, "ip1")}
                        disabled={loadingIp && !ip}
                        title={loadingIp && !ip ? "Detecting IP..." : "Copy IP"}
                      >
                        {copiedKey === "ip1" ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                      </button>
                      <button
                        type="button"
                        className="eh-inline-refresh-btn"
                        onClick={() => fetchIp(true)}
                        disabled={refreshingIp}
                        title="Re-check Server Outbound IP"
                      >
                        <RefreshCw size={12} className={refreshingIp ? "eh-spin" : ""} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NODE.JS */}
          {activeTab === "node" && (
            <div className="eh-guide-section">
              <h3>Node.js Backend Applications (Express, Fastify, NestJS)</h3>
              <p>EchoServer supports modern Node.js with npm, pnpm, and yarn out of the box.</p>

              <div className="eh-guide-table">
                <div className="eh-table-row">
                  <span className="eh-table-key">Runtime:</span>
                  <span className="eh-table-val"><code>Node.js</code></span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">Working Directory:</span>
                  <span className="eh-table-val"><code>.</code> (or <code>backend</code> if in subfolder)</span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">Install Command:</span>
                  <span className="eh-table-val"><code>npm install</code></span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">Start Command:</span>
                  <span className="eh-table-val"><code>node server.js</code> (or <code>npm start</code>)</span>
                </div>
              </div>

              <h4>Express Server Bootstrap Code</h4>
              <div className="eh-code-block">
                <pre>{`const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

app.listen(PORT, HOST, () => {
  console.log(\`Server is listening on \${HOST}:\${PORT}\`);
});`}</pre>
                <button
                  type="button"
                  className="eh-copy-code-btn"
                  onClick={() =>
                    copyToClipboard(
                      `const express = require('express');\nconst app = express();\nconst PORT = process.env.PORT || 3000;\nconst HOST = '0.0.0.0';\napp.use(express.json());\napp.get('/api/health', (req, res) => res.json({ status: 'ok' }));\napp.listen(PORT, HOST, () => console.log(\`Server on \${PORT}\`));`,
                      "node_code"
                    )
                  }
                >
                  {copiedKey === "node_code" ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MERN / MONOREPO */}
          {activeTab === "mern" && (
            <div className="eh-guide-section">
              <h3>MERN / Full-Stack Monorepo Architecture</h3>
              <p>
                When your project contains both <code>backend/</code> and <code>frontend/</code> folders in the same repository:
              </p>

              <div className="eh-guide-table">
                <div className="eh-table-row">
                  <span className="eh-table-key">Framework Preset:</span>
                  <span className="eh-table-val"><code>MERN / Full-Stack Monorepo</code></span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">Install Command:</span>
                  <span className="eh-table-val"><code>npm run install:all</code></span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">Build Command:</span>
                  <span className="eh-table-val"><code>npm run build</code></span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">Start Command:</span>
                  <span className="eh-table-val"><code>node backend/server.js</code></span>
                </div>
              </div>

              <h4>Recommended Root package.json Scripts</h4>
              <div className="eh-code-block">
                <pre>{`"scripts": {
  "install:backend": "cd backend && npm install",
  "install:frontend": "cd frontend && npm install",
  "install:all": "npm run install:backend && npm run install:frontend",
  "build": "cd frontend && npm run build",
  "start": "node backend/server.js"
}`}</pre>
                <button
                  type="button"
                  className="eh-copy-code-btn"
                  onClick={() =>
                    copyToClipboard(
                      `"scripts": {\n  "install:backend": "cd backend && npm install",\n  "install:frontend": "cd frontend && npm install",\n  "install:all": "npm run install:backend && npm run install:frontend",\n  "build": "cd frontend && npm run build",\n  "start": "node backend/server.js"\n}`,
                      "mern_pkg"
                    )
                  }
                >
                  {copiedKey === "mern_pkg" ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                </button>
              </div>

              <h4>How Express Serves the Vite/React Frontend in Production</h4>
              <div className="eh-code-block">
                <pre>{`const path = require('path');
const express = require('express');
const app = express();

// 1. API routes first
app.use('/api', apiRouter);

// 2. Serve compiled frontend assets
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

// 3. SPA Fallback: send index.html for all client routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});`}</pre>
              </div>
            </div>
          )}

          {/* TAB 4: STATIC & VITE */}
          {activeTab === "static" && (
            <div className="eh-guide-section">
              <h3>Static Frontends (Vite, React, Vue, Svelte, HTML)</h3>
              <p>
                Deployed automatically to a dedicated high-performance Nginx web server with SPA routing fallback and Gzip compression.
              </p>

              <div className="eh-guide-table">
                <div className="eh-table-row">
                  <span className="eh-table-key">Runtime Engine:</span>
                  <span className="eh-table-val"><code>Static Web (SPA / Nginx)</code></span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">Build Command:</span>
                  <span className="eh-table-val"><code>npm run build</code> (or <code>npx vite build</code>)</span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">Output Directory:</span>
                  <span className="eh-table-val"><code>dist</code> (Vite / Astro) or <code>build</code> (CRA)</span>
                </div>
              </div>

              <div className="eh-tip-callout">
                <strong>Auto-Recovery Output Shield:</strong>
                <p>
                  If your framework outputs to <code>dist</code> but your settings say <code>build</code> (or vice versa), EchoServer will automatically discover your assets and serve them without failing the build.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: PYTHON */}
          {activeTab === "python" && (
            <div className="eh-guide-section">
              <h3>Python Web Applications (FastAPI, Flask, Django)</h3>
              <p>Runs in an optimized Python 3.12 container with build tools and PostgreSQL drivers pre-installed.</p>

              <div className="eh-guide-table">
                <div className="eh-table-row">
                  <span className="eh-table-key">Runtime Engine:</span>
                  <span className="eh-table-val"><code>Python (WSGI / ASGI)</code></span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">Install Command:</span>
                  <span className="eh-table-val"><code>pip install -r requirements.txt</code></span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">FastAPI Start:</span>
                  <span className="eh-table-val"><code>uvicorn main:app --host 0.0.0.0 --port 8000</code></span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">Flask Start:</span>
                  <span className="eh-table-val"><code>python app.py</code></span>
                </div>
                <div className="eh-table-row">
                  <span className="eh-table-key">Django Start:</span>
                  <span className="eh-table-val"><code>python manage.py runserver 0.0.0.0:8000</code></span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DATABASE GUIDES (ALL 5 MAJOR DATABASES) */}
          {activeTab === "database" && (
            <div className="eh-guide-section">
              <div className="eh-db-guide-header">
                <div>
                  <h3>Database Connection & Whitelisting Guides</h3>
                  <p className="eh-guide-lead">
                    Select a database to view connection code, environment variables, and whitelisting instructions.
                  </p>
                </div>
              </div>

              {/* Database Selector Pills */}
              <div className="eh-db-nav-pills">
                {databaseList.map((db) => {
                  const isSelected = db.id === currentDb.id;
                  return (
                    <button
                      key={db.id}
                      type="button"
                      className={`eh-db-nav-pill ${isSelected ? "active" : ""}`}
                      onClick={() => setActiveDb(db.id)}
                    >
                      <span className="eh-db-nav-icon">{db.icon}</span>
                      <span className="eh-db-nav-name">{db.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Database Detail View */}
              {currentDb && (
                <div className="eh-db-detail-card">
                  <div className="eh-db-detail-top">
                    <div className="eh-db-detail-title-row">
                      <span className="eh-db-detail-icon">{currentDb.icon}</span>
                      <div>
                        <h4>{currentDb.name}</h4>
                        <div className="eh-db-providers-list">
                          {currentDb.providers?.map((p) => (
                            <span key={p} className="eh-db-provider-tag">{p}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outbound IP Whitelist Box for this DB */}
                  <div className="eh-outbound-box">
                    <div className="eh-outbound-head">
                      <span className="eh-outbound-label">Server Outbound IP:</span>
                      <code className="eh-outbound-val">
                        {loadingIp && !ip ? (
                          <span className="eh-ip-loading-inline">
                            <RefreshCw size={12} className="eh-spin" /> Detecting...
                          </span>
                        ) : (
                          outboundIp
                        )}
                      </code>
                      <button
                        type="button"
                        className="eh-copy-ip-btn"
                        onClick={() => copyToClipboard(outboundIp, `ip_${currentDb.id}`)}
                        disabled={loadingIp && !ip}
                        title={loadingIp && !ip ? "Detecting IP..." : "Copy IP"}
                      >
                        {copiedKey === `ip_${currentDb.id}` ? (
                          <Check size={14} color="#032115" />
                        ) : (
                          <Copy size={14} />
                        )}
                        <span>{copiedKey === `ip_${currentDb.id}` ? "Copied" : "Copy IP"}</span>
                      </button>
                      <button
                        type="button"
                        className="eh-ip-refresh-btn"
                        onClick={() => fetchIp(true)}
                        disabled={refreshingIp}
                        title="Re-check Server Outbound IP"
                      >
                        <RefreshCw size={13} className={refreshingIp ? "eh-spin" : ""} />
                        <span>{refreshingIp ? "Checking..." : "Refresh"}</span>
                      </button>
                    </div>
                    <p className="eh-outbound-hint">
                      {currentDb.whitelistInstruction?.replace(
                        /{{IP}}/g,
                        outboundIp !== "Auto-detected" && outboundIp !== "Detecting..."
                          ? outboundIp
                          : "YOUR_SERVER_IP"
                      )}
                    </p>
                  </div>

                  <div className="eh-cgnat-notice">
                    <Sparkles size={16} style={{ color: "#34d399", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong>Behind CGNAT or Home Server? (Recommended)</strong>
                      <p>
                        If your server is behind CGNAT or a residential ISP, your carrier rotates outbound IP pools. In <strong>MongoDB Atlas Network Access</strong>, select <strong>"Allow Access From Anywhere (0.0.0.0/0)"</strong>. Combined with strong database user credentials and SSL/TLS, this prevents unexpected database disconnections when your ISP rotates IP pools.
                      </p>
                    </div>
                  </div>

                  {/* Required Environment Variables */}
                  <div className="eh-db-env-section">
                    <h5>Required Environment Variables</h5>
                    <div className="eh-db-env-table">
                      {currentDb.envVariables?.map((v) => (
                        <div key={v.key} className="eh-db-env-row">
                          <div className="eh-db-env-key-cell">
                            <code>{v.key}</code>
                            {v.required && <span className="eh-db-required-tag">Required</span>}
                          </div>
                          <div className="eh-db-env-val-cell">
                            <span className="eh-db-env-desc">{v.description}</span>
                            <div className="eh-db-env-code-pill">
                              <code>{v.example}</code>
                              <button
                                type="button"
                                className="eh-copy-small-btn"
                                onClick={() => copyToClipboard(v.example, `var_${v.key}`)}
                                title="Copy example"
                              >
                                {copiedKey === `var_${v.key}` ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Code Snippets: Node.js */}
                  {currentDb.nodeSnippet && (
                    <div className="eh-db-code-section">
                      <h5>Node.js Integration Snippet</h5>
                      <div className="eh-code-block">
                        <pre>{currentDb.nodeSnippet}</pre>
                        <button
                          type="button"
                          className="eh-copy-code-btn"
                          onClick={() => copyToClipboard(currentDb.nodeSnippet, `node_${currentDb.id}`)}
                        >
                          {copiedKey === `node_${currentDb.id}` ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Code Snippets: Python */}
                  {currentDb.pythonSnippet && (
                    <div className="eh-db-code-section">
                      <h5>Python Integration Snippet</h5>
                      <div className="eh-code-block">
                        <pre>{currentDb.pythonSnippet}</pre>
                        <button
                          type="button"
                          className="eh-copy-code-btn"
                          onClick={() => copyToClipboard(currentDb.pythonSnippet, `python_${currentDb.id}`)}
                        >
                          {copiedKey === `python_${currentDb.id}` ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Gotchas & Common Pitfalls */}
                  {currentDb.gotchas && currentDb.gotchas.length > 0 && (
                    <div className="eh-db-gotchas-box">
                      <strong>Important Notes & Common Gotchas:</strong>
                      <ul>
                        {currentDb.gotchas.map((g, idx) => (
                          <li key={idx}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
