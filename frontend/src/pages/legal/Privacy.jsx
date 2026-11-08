import "./legal.css";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, FileText, Lock, EyeOff, Trash2, CheckCircle2 } from "lucide-react";

export default function Privacy() {
  return (
    <div className="legal-page">
      <div className="legal-page__background">
        <div className="legal-page__glow legal-page__glow--1" />
        <div className="legal-page__glow legal-page__glow--2" />
        <div className="legal-page__grid" />
      </div>

      <div className="legal-page__container">
        <header className="legal-page__header">
          <Link to="/" className="legal-page__brand">
            <h1>EchoServer</h1>
          </Link>

          <div className="legal-page__actions">
            <Link to="/register" className="legal-page__btn-back">
              <ArrowLeft size={16} />
              <span>Back to Sign Up</span>
            </Link>
          </div>
        </header>

        <nav className="legal-page__tabs" aria-label="Legal Documents">
          <Link to="/terms" className="legal-page__tab">
            <FileText size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
            Terms of Service
          </Link>
          <Link to="/privacy" className="legal-page__tab legal-page__tab--active">
            <ShieldCheck size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
            Privacy &amp; Data Policy
          </Link>
        </nav>

        <article className="legal-page__card">
          <div className="legal-page__title-area">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span className="legal-page__badge">Transparency &amp; Trust</span>
            </div>
            <h2>Privacy &amp; Data Collection Policy</h2>
            <div className="legal-page__meta">
              <span>Effective Date: November 8, 2026</span>
              <span>•</span>
              <span>Last Updated: November 8, 2026</span>
            </div>
          </div>

          <div className="legal-page__content">
            <p>
              At <strong>EchoServer</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), we treat your privacy and
              developer code with utmost care. This policy outlines exactly what information we collect, why we need it,
              how it is used to deliver the platform, and your control over its permanent deletion.
            </p>

            <div className="legal-page__callout legal-page__callout--success">
              <strong>Our Core Privacy Commitments:</strong>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
                <li><strong>No Ad Trackers:</strong> We never sell, rent, or monetize your personal data or user traffic.</li>
                <li><strong>Anonymized Telemetry:</strong> Public visitor IPs to your apps are irreversibly hashed (SHA-256). Raw visitor IPs are never stored in analytics.</li>
                <li><strong>Zero Plaintext Passwords:</strong> Passwords are cryptographically salted and hashed with bcrypt.</li>
                <li><strong>Immediate Permanent Purge:</strong> When you delete a project or account, all files, environment variables, and databases are deleted immediately.</li>
              </ul>
            </div>

            <h3>1. Information We Collect Directly from You</h3>
            <p>We collect only the essential information necessary to provide hosting and deployment services:</p>

            <div className="legal-page__table-wrapper">
              <table className="legal-page__table">
                <thead>
                  <tr>
                    <th>Data Category</th>
                    <th>What We Collect</th>
                    <th>Why We Collect It</th>
                    <th>How We Use It</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Account Identity</strong></td>
                    <td>Username, Email address, Salted password hash (bcrypt)</td>
                    <td>Authentication and namespace isolation.</td>
                    <td>Validating logins, issuing session JWTs, sending password resets, and generating subdomains (e.g. <code>username-project.domain</code>).</td>
                  </tr>
                  <tr>
                    <td><strong>Source Code &amp; Files</strong></td>
                    <td>Git repo URLs, uploaded code files, static assets, cloud files</td>
                    <td>Core PaaS hosting functionality.</td>
                    <td>Compiling applications, building containers, running workloads, and serving web assets.</td>
                  </tr>
                  <tr>
                    <td><strong>Environment Variables</strong></td>
                    <td>Key-value secrets (API keys, database URLs, auth secrets)</td>
                    <td>Dynamic application configuration.</td>
                    <td>Injected securely into your isolated container runtime. Never exposed to other users or public endpoints.</td>
                  </tr>
                  <tr>
                    <td><strong>Domain Settings</strong></td>
                    <td>Custom domain names, requested subdomains, SSL cert status</td>
                    <td>Traffic routing and TLS encryption.</td>
                    <td>Configuring reverse proxy rules and issuing Let&apos;s Encrypt certificates.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>2. Information Collected Automatically</h3>
            <p>When your projects run or when you access the platform, our infrastructure collects operational telemetry:</p>

            <div className="legal-page__table-wrapper">
              <table className="legal-page__table">
                <thead>
                  <tr>
                    <th>Telemetry Type</th>
                    <th>Data Points</th>
                    <th>Privacy Safeguard</th>
                    <th>Operational Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>HTTP Analytics</strong></td>
                    <td>HTTP method, request path, status code, response time (ms), bytes sent, timestamp</td>
                    <td><strong>Irreversible IP Hashing:</strong> Raw visitor IPs are passed through a cryptographic SHA-256 one-way hash. Raw visitor IPs are never persisted in the database.</td>
                    <td>Powering your project dashboard traffic charts, error rate monitoring, and detecting DDoS spikes.</td>
                  </tr>
                  <tr>
                    <td><strong>Deployment Logs</strong></td>
                    <td>Container stdout/stderr and build terminal logs</td>
                    <td>Isolated per project; visible only to the project owner and superadmin.</td>
                    <td>Assisting you in debugging failed builds, runtime exceptions, and application logs.</td>
                  </tr>
                  <tr>
                    <td><strong>System Telemetry</strong></td>
                    <td>Host CPU, RAM, disk space per container, watchdog restarts</td>
                    <td>Aggregated system health metrics.</td>
                    <td>Preventing resource exhaustion, alerting operators, and maintaining high platform stability.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>3. Administrative Communications</h3>
            <ul>
              <li><strong>Transactional Notifications:</strong> Automated emails for account verification, password reset links, and critical security warnings.</li>
              <li><strong>Superadmin Broadcasts:</strong> Important service announcements (scheduled maintenance, critical upgrades) sent to platform users. Broadcast events are logged in the <code>broadcast_emails</code> table (timestamp, subject, and delivery count) for auditing.</li>
              <li><strong>No Marketing Spam:</strong> EchoServer will never send marketing promotions or sell your email to third-party advertisers.</li>
            </ul>

            <h3>4. Security Architecture &amp; Data Protection</h3>
            <ul>
              <li><strong>Cryptographic Password Protection:</strong> We use industry-standard salted hashing (<code>bcrypt</code> / <code>pgcrypto</code>). No one, including the platform administrator, can see or recover your raw password.</li>
              <li><strong>Encrypted Transport:</strong> All data transmitted between your browser and EchoServer is protected by HTTPS / TLS 1.3 encryption.</li>
              <li><strong>Container Sandbox Isolation:</strong> Each project runs in an isolated containerized environment to prevent unauthorized cross-project access or host tampering.</li>
            </ul>

            <h3>5. Third-Party Sharing &amp; Disclosures</h3>
            <p>
              EchoServer does <strong>NOT</strong> sell, trade, rent, or lease personal information. Data is only shared
              under the following necessary operational conditions:
            </p>
            <ul>
              <li><strong>Certificate Authorities (Let&apos;s Encrypt / ACME):</strong> When you configure a custom domain or subdomain, the hostname is transmitted to Let&apos;s Encrypt to issue an automated SSL certificate.</li>
              <li><strong>Legal Compliance:</strong> If required by a valid, legally enforceable court order or subpoena investigating serious criminal offenses (e.g. cyberattacks or malware hosting), data may be produced in compliance with applicable law.</li>
            </ul>

            <h3>6. Immediate Permanent Purge (Data Retention Policy)</h3>
            <div className="legal-page__callout legal-page__callout--success">
              <strong>Your Right to Immediate Erasure:</strong> When you delete a project, cloud file, or your entire account, all associated records, source files, environment variables, routing entries, and logs are <strong>permanently and immediately deleted</strong> from active servers and databases. No lingering copies or dormant files are retained.
            </div>

            <h3>7. Your Rights</h3>
            <p>Under developer data protection standards, you have the full right to:</p>
            <ul>
              <li><strong>Access &amp; Inspect:</strong> View all projects, files, and environment secrets directly via your console.</li>
              <li><strong>Modify:</strong> Update your username, email, password, and project configurations at any time.</li>
              <li><strong>Export:</strong> Download or clone your source code and cloud assets freely.</li>
              <li><strong>Delete:</strong> Purge any project or your entire account permanently with zero hurdles.</li>
            </ul>

            <h3>8. Changes to this Policy</h3>
            <p>
              We may revise this Privacy Policy periodically. Any updates will be reflected with a revised &quot;Last Updated&quot;
              date. Material adjustments will be highlighted via in-app alerts or administrative broadcast emails.
            </p>

            <h3>9. Contact Us</h3>
            <p>
              For privacy inquiries, audit questions, or data requests, please reach out to the server administrator
              via your project console or contact the operator directly.
            </p>
          </div>
        </article>

        <footer className="legal-page__footer">
          <p>&copy; {new Date().getFullYear()} EchoServer. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

