import { useState, useEffect } from "react";
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
} from "lucide-react";
import { getDeploymentGuide } from "../../../services/system.api";
import "./DeploymentGuideModal.css";

export default function DeploymentGuideModal({ isOpen, onClose, initialTab = "rules" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [guideData, setGuideData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (!guideData) {
        getDeploymentGuide()
          .then((data) => setGuideData(data))
          .catch(() => {});
      }
    }
  }, [isOpen, initialTab, guideData]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const outboundIp = guideData?.outboundIp || "Auto-detected";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Deployment Quick Guide & Cheatsheet"
      className="eh-guide-modal"
      width="820px"
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
            <span>Database Whitelisting</span>
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
                    <strong>Whitelist Server Outbound IP in MongoDB / Supabase</strong>
                    <p>
                      External databases need the server's public IP in their network whitelist to allow connections.
                    </p>
                    <div className="eh-ip-pill">
                      <span>Server Outbound IP:</span>
                      <code>{outboundIp}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(outboundIp, "ip1")}
                      >
                        {copiedKey === "ip1" ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
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

          {/* TAB 6: DATABASE WHITELIST */}
          {activeTab === "database" && (
            <div className="eh-guide-section">
              <h3>External Database Whitelisting (MongoDB Atlas, Supabase, Neon)</h3>
              <p>
                When your container connects to external databases, outbound traffic exits through this server's public IP.
              </p>

              <div className="eh-outbound-box">
                <div className="eh-outbound-head">
                  <span className="eh-outbound-label">Host Server Outbound IP:</span>
                  <code className="eh-outbound-val">{outboundIp}</code>
                  <button
                    type="button"
                    className="eh-copy-ip-btn"
                    onClick={() => copyToClipboard(outboundIp, "ip2")}
                  >
                    {copiedKey === "ip2" ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    <span>{copiedKey === "ip2" ? "Copied" : "Copy IP"}</span>
                  </button>
                </div>
                <p className="eh-outbound-hint">
                  In MongoDB Atlas, navigate to <strong>Network Access</strong> → <strong>Add IP Address</strong> → paste this IP with <code>/32</code> (e.g. <code>{outboundIp}/32</code>).
                </p>
              </div>

              <h4>Connecting to MongoDB in Node.js</h4>
              <div className="eh-code-block">
                <pre>{`const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));`}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
