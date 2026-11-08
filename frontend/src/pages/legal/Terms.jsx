import "./legal.css";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, FileText } from "lucide-react";

export default function Terms() {
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
          <Link to="/terms" className="legal-page__tab legal-page__tab--active">
            <FileText size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
            Terms of Service
          </Link>
          <Link to="/privacy" className="legal-page__tab">
            <ShieldCheck size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "-2px" }} />
            Privacy & Data Policy
          </Link>
        </nav>

        <article className="legal-page__card">
          <div className="legal-page__title-area">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span className="legal-page__badge">Legal Agreement</span>
            </div>
            <h2>Terms of Service</h2>
            <div className="legal-page__meta">
              <span>Effective Date: November 8, 2026</span>
              <span>•</span>
              <span>Last Updated: November 8, 2026</span>
            </div>
          </div>

          <div className="legal-page__content">
            <p>
              Welcome to <strong>EchoServer</strong> (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;, or the &quot;Platform&quot;).
              By creating an account, accessing, or using EchoServer (including all associated websites, subdomains,
              APIs, CLI utilities, and application deployment services), you (&quot;User&quot;, &quot;you&quot;, or &quot;your&quot;)
              agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not
              access or use EchoServer.
            </p>

            <h3>1. Description of the Service</h3>
            <p>
              EchoServer is a developer-focused platform-as-a-service (PaaS) and self-hosted application deployment system.
              Services provided include:
            </p>
            <ul>
              <li>Source code ingestion, automated containerized builds, and runtime execution.</li>
              <li>Application hosting, static website serving, and cloud workspace file storage.</li>
              <li>Reverse proxy routing, automated SSL/TLS certificate issuance, and domain mapping.</li>
              <li>Traffic telemetry, execution logs, and project diagnostic tools.</li>
            </ul>

            <h3>2. Account Eligibility &amp; Responsibilities</h3>
            <ul>
              <li><strong>Account Credentials:</strong> You must provide an accurate email address and unique username. You are solely responsible for maintaining the confidentiality of your account credentials.</li>
              <li><strong>Account Responsibility:</strong> Any action, deployment, or request initiated under your authenticated account is your legal responsibility.</li>
              <li><strong>Usernames &amp; Subdomains:</strong> Usernames and subdomains are provided as part of the service namespace. EchoServer reserves the right to reclaim, reassign, or rename any username or subdomain that is misleading, infringes on registered trademarks, impersonates another entity, or violates platform policies.</li>
            </ul>

            <h3>3. Acceptable Use Policy (Zero Tolerance)</h3>
            <div className="legal-page__callout legal-page__callout--danger">
              <strong>Strict Enforcement:</strong> EchoServer maintains a zero-tolerance policy for malicious activity, network abuse, or illegal computing. Accounts in breach are terminated immediately without refund or warning.
            </div>
            <p>You agree <strong>NOT</strong> to use EchoServer, its servers, or its network for:</p>
            <ul>
              <li>
                <strong>Malware &amp; Exploits:</strong> Hosting, compiling, spreading, or executing malware, viruses, worms, Trojan horses, ransomware, keyloggers, rootkits, or automated exploits.
              </li>
              <li>
                <strong>Network Attacks:</strong> Performing Denial of Service (DoS/DDoS) attacks, network port scanning, brute-forcing, IP spoofing, packet flooding, or unauthorized security testing.
              </li>
              <li>
                <strong>Cryptocurrency Mining:</strong> Running crypto miners, proof-of-work algorithms, coin nodes, or any automated process intended to monopolize compute resources.
              </li>
              <li>
                <strong>Phishing &amp; Deception:</strong> Creating fake login portals, phishing pages, credential harvesters, scams, or deceptive websites.
              </li>
              <li>
                <strong>Spam &amp; Mail Relays:</strong> Operating unsolicited bulk mailers, spam bots, or command-and-control (C2) servers.
              </li>
              <li>
                <strong>Illegal Content:</strong> Storing or distributing child sexual abuse material (CSAM), non-consensual explicit content, violent extremism, or content infringing copyright or intellectual property rights.
              </li>
              <li>
                <strong>Sandbox &amp; Host Tampering:</strong> Attempting container escapes, gaining unauthorized host root access, snooping on adjacent containers, or bypassing resource limits.
              </li>
            </ul>

            <h3>4. User Content &amp; Intellectual Property Ownership</h3>
            <ul>
              <li><strong>Your Code Belongs to You:</strong> You retain 100% full and exclusive intellectual property ownership of all source code, software, assets, environment variables, databases, and files you upload or deploy to EchoServer.</li>
              <li><strong>Limited Operational License:</strong> You grant EchoServer only the strictly limited, non-exclusive license required to ingest, compile, containerize, host, route network traffic to, and display your applications solely for the purpose of operating the service on your behalf.</li>
              <li><strong>Licensing &amp; Rights:</strong> You are responsible for ensuring that you have all required licenses, permissions, and rights to deploy any software or dependencies hosted in your projects.</li>
            </ul>

            <h3>5. Resource Limits &amp; Fair Usage</h3>
            <p>
              EchoServer operates on shared host infrastructure. CPU, RAM, disk space, network bandwidth, and concurrent
              connections are subject to container quotas and fair usage constraints. EchoServer reserves the right to
              throttle, sleep, or terminate processes that degrade host stability or impair service for other users.
            </p>

            <h3>6. Service Availability &amp; &quot;As Is&quot; Disclaimer</h3>
            <div className="legal-page__callout">
              <strong>Disclaimer of Warranties:</strong> EchoServer is provided strictly on an <strong>&quot;AS IS&quot;</strong> and <strong>&quot;AS AVAILABLE&quot;</strong> basis without warranties of any kind, whether express, implied, statutory, or otherwise.
            </div>
            <ul>
              <li>EchoServer does not guarantee uninterrupted, error-free, or 100% available operation.</li>
              <li><strong>Independent Backups:</strong> You are solely responsible for maintaining external, offsite backups of your source code, environment secrets, and databases. EchoServer is not liable for data loss, service interruptions, or hardware failures.</li>
            </ul>

            <h3>7. Limitation of Liability</h3>
            <p>
              To the fullest extent permitted by applicable law, in no event shall EchoServer, its creator, operators,
              contributors, or infrastructure providers be liable for any direct, indirect, incidental, consequential,
              special, or punitive damages (including loss of profits, data, goodwill, work stoppage, or equipment failure),
              under any legal theory (contract, tort, negligence, or strict liability).
            </p>

            <h3>8. Indemnification</h3>
            <p>
              You agree to indemnify, defend, and hold harmless EchoServer and its operators against any claims, damages,
              losses, liabilities, and expenses (including reasonable legal fees) arising from your use of the platform,
              your deployed applications, or any violation of these Terms.
            </p>

            <h3>9. Account Termination &amp; Immediate Data Deletion</h3>
            <div className="legal-page__callout legal-page__callout--success">
              <strong>Immediate Permanent Purge:</strong> When you delete a project or delete your account, all associated source code, environment secrets, custom domains, and database records are immediately and permanently erased from active systems.
            </div>
            <p>
              You may terminate your account at any time. EchoServer reserves the right to suspend or terminate any account
              immediately and without prior notice if you violate these Terms or threaten platform security.
            </p>

            <h3>10. Modifications to Terms</h3>
            <p>
              We reserve the right to revise these Terms at any time. Material changes may be announced via in-app notices
              or administrative email broadcasts. Continued use of EchoServer following revisions constitutes acceptance
              of the updated Terms.
            </p>

            <h3>11. Contact</h3>
            <p>
              For legal inquiries, abuse notifications, or security concerns, please contact the platform administrator
              via your dashboard support channels or email the operator directly.
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

