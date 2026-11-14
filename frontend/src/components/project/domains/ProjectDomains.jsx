import { useState, useEffect, useCallback } from "react";
import "./ProjectDomains.css";
import {
  Globe,
  Plus,
  ShieldCheck,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  AlertCircle,
  Server,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import Button from "../../common/button/button";
import { useToast } from "../../../context/ToastContext";
import {
  getProjectDomains,
  addCustomDomain,
  deleteCustomDomain,
  verifyCustomDomain,
} from "../../../services/domain.api";

export default function ProjectDomains({
  projectId,
  project,
  publication,
  onPublish,
  onUpdateSubdomain,
  onUnpublish,
  pubRefresh,
}) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [customHostname, setCustomHostname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [copiedText, setCopiedText] = useState(null);

  const toast = useToast();

  const fetchDomains = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await getProjectDomains(projectId);
      setDomains(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to load project domains:", err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedText(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    const clean = customHostname.trim().toLowerCase().replace(/^https?:\/\//i, "").split("/")[0];
    if (!clean) {
      toast.error("Please enter a valid domain name");
      return;
    }

    try {
      setSubmitting(true);
      const res = await addCustomDomain(projectId, clean);
      toast.success(res.message || `Custom domain '${clean}' attached successfully.`);
      setCustomHostname("");
      setModalOpen(false);
      await fetchDomains();
      if (pubRefresh) pubRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to add domain");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDomain = async (domain) => {
    if (
      !window.confirm(
        `Are you sure you want to remove '${domain.hostname}'? Web traffic to this domain will stop resolving to this container.`
      )
    ) {
      return;
    }

    try {
      setActionLoadingId(domain.id);
      await deleteCustomDomain(projectId, domain.id);
      toast.success(`Domain '${domain.hostname}' removed successfully.`);
      await fetchDomains();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to delete domain");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVerifySsl = async (domain) => {
    try {
      setActionLoadingId(domain.id);
      const updated = await verifyCustomDomain(projectId, domain.id);
      toast.success(
        `SSL certificate verified and renewed for '${domain.hostname}'.`
      );
      setDomains((prev) =>
        prev.map((d) => (d.id === domain.id ? { ...d, ...updated } : d))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Verification failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const serverIpTarget =
    import.meta.env.VITE_SERVER_IP ||
    (window.location.hostname &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
      ? window.location.hostname
      : "127.0.0.1 (Server IP)");
  const primaryDomain = domains.find((d) => d.is_primary) || (publication?.hostname ? {
    hostname: publication.hostname,
    is_primary: true,
    ssl_status: publication.ssl_status || "active",
    verification_status: publication.verification_status || "verified",
  } : null);

  const formatExpiry = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="eh-domains-view">
      {/* Top Header */}
      <div className="eh-domains-header">
        <div className="eh-domains-header-left">
          <div className="eh-domains-icon-box">
            <Globe size={22} />
          </div>
          <div>
            <h2>Custom Domains & Zero-Config SSL/TLS</h2>
            <p>
              Route web traffic to your container using custom apex or subdomains with automated Edge Router SNI certificate termination.
            </p>
          </div>
        </div>

        <div className="eh-domains-header-actions">
          <Button
            variant="secondary"
            onClick={fetchDomains}
            disabled={loading}
            title="Refresh domains"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </Button>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            <span>Add Custom Domain</span>
          </Button>
        </div>
      </div>

      {/* Primary Platform Domain */}
      <div className="eh-domain-section-card">
        <div className="eh-domain-section-header">
          <div className="eh-domain-section-title">
            <Layers size={18} className="eh-accent-blue" />
            <div>
              <h3>Default Platform Domain</h3>
              <p>Managed public domain automatically configured for this project.</p>
            </div>
          </div>
          {primaryDomain && (
            <span className="eh-domain-badge badge-primary">Primary Service Route</span>
          )}
        </div>

        {primaryDomain ? (
          <div className="eh-domain-row primary-row">
            <div className="eh-domain-info">
              <div className="eh-domain-name-line">
                <span className="eh-domain-url">https://{primaryDomain.hostname}</span>
                <span className="eh-ssl-badge ssl-active">
                  <Lock size={12} />
                  <span>Zero-Config HTTPS (Active)</span>
                </span>
              </div>
              <span className="eh-domain-subtext">
                Direct edge routing via SNI reverse proxy • TLS 1.3 End-to-End
              </span>
            </div>

            <div className="eh-domain-actions">
              <button
                type="button"
                className="eh-domain-btn-icon"
                onClick={() => handleCopy(`https://${primaryDomain.hostname}`, "primary")}
                title="Copy URL"
              >
                {copiedText === "primary" ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <a
                href={`https://${primaryDomain.hostname}`}
                target="_blank"
                rel="noreferrer"
                className="eh-domain-btn-link"
              >
                <span>Visit</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ) : (
          <div className="eh-domains-empty-prompt">
            <Info size={18} />
            <span>
              Project is not published yet. Publish the project on the Overview tab or add a custom domain below.
            </span>
          </div>
        )}
      </div>

      {/* Attached Custom Domains List */}
      <div className="eh-domain-section-card">
        <div className="eh-domain-section-header">
          <div className="eh-domain-section-title">
            <Globe size={18} className="eh-accent-green" />
            <div>
              <h3>Attached Custom Domains</h3>
              <p>Your external brand domains and CNAME aliases.</p>
            </div>
          </div>
          <span className="eh-domain-count-badge">
            {customDomainsList.length} Custom {customDomainsList.length === 1 ? "Domain" : "Domains"}
          </span>
        </div>

        {loading ? (
          <div className="eh-domains-loading-state">
            <RefreshCw size={22} className="spin" />
            <span>Loading domains and SSL certificates...</span>
          </div>
        ) : customDomainsList.length === 0 ? (
          <div className="eh-domains-empty-state">
            <div className="eh-empty-icon-circle">
              <Globe size={28} />
            </div>
            <h4>No custom domains connected yet</h4>
            <p>
              Connect your own domain (e.g., <code>app.yourdomain.com</code> or <code>yourdomain.com</code>) to brand this service with automatic SSL certificates.
            </p>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              <span>Connect Custom Domain</span>
            </Button>
          </div>
        ) : (
          <div className="eh-domains-list">
            {customDomainsList.map((domain) => {
              const isActionLoading = actionLoadingId === domain.id;
              const expiryDate = formatExpiry(domain.cert_expires_at);

              return (
                <div key={domain.id} className="eh-domain-row">
                  <div className="eh-domain-info">
                    <div className="eh-domain-name-line">
                      <span className="eh-domain-url">https://{domain.hostname}</span>
                      <span className="eh-ssl-badge ssl-active">
                        <Lock size={12} />
                        <span>HTTPS Active</span>
                      </span>
                      {domain.verification_status === "verified" && (
                        <span className="eh-dns-badge dns-verified">
                          <CheckCircle2 size={12} />
                          <span>DNS Verified</span>
                        </span>
                      )}
                    </div>
                    <div className="eh-domain-meta-line">
                      <span>Edge Router SNI Proxy</span>
                      {domain.cert_issuer && (
                        <span>• Issuer: <code>{domain.cert_issuer}</code></span>
                      )}
                      {expiryDate && (
                        <span>• Valid until: <strong>{expiryDate}</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="eh-domain-actions">
                    <button
                      type="button"
                      className="eh-domain-btn-icon"
                      onClick={() => handleCopy(`https://${domain.hostname}`, domain.id)}
                      title="Copy URL"
                    >
                      {copiedText === domain.id ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                    <button
                      type="button"
                      className="eh-domain-btn-secondary"
                      onClick={() => handleVerifySsl(domain)}
                      disabled={isActionLoading}
                      title="Verify DNS & Refresh SSL Certificate"
                    >
                      <RefreshCw size={13} className={isActionLoading ? "spin" : ""} />
                      <span>Verify SSL</span>
                    </button>
                    <a
                      href={`https://${domain.hostname}`}
                      target="_blank"
                      rel="noreferrer"
                      className="eh-domain-btn-link"
                    >
                      <span>Visit</span>
                      <ExternalLink size={14} />
                    </a>
                    <button
                      type="button"
                      className="eh-domain-btn-danger"
                      onClick={() => handleDeleteDomain(domain)}
                      disabled={isActionLoading}
                      title="Remove domain"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DNS Setup Guide Card */}
      <div className="eh-domain-section-card eh-dns-guide-card">
        <div className="eh-domain-section-header">
          <div className="eh-domain-section-title">
            <Server size={18} className="eh-accent-purple" />
            <div>
              <h3>DNS Configuration Instructions</h3>
              <p>Configure these DNS records at your domain registrar (GoDaddy, Cloudflare, Namecheap, Route53, etc.).</p>
            </div>
          </div>
        </div>

        <div className="eh-dns-table-wrap">
          <table className="eh-dns-table">
            <thead>
              <tr>
                <th>Record Type</th>
                <th>Host / Name</th>
                <th>Target Value</th>
                <th>TTL</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="eh-dns-type-tag">CNAME</span>
                  <span className="eh-dns-tag-desc">For Subdomains (e.g. app, api)</span>
                </td>
                <td>
                  <code>app</code> or <code>subdomain</code>
                </td>
                <td>
                  <code className="eh-dns-target-val">devpiyush.in</code>
                </td>
                <td>Automatic / 3600</td>
                <td>
                  <button
                    type="button"
                    className="eh-dns-copy-btn"
                    onClick={() => handleCopy("devpiyush.in", "cname")}
                  >
                    {copiedText === "cname" ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedText === "cname" ? "Copied" : "Copy Value"}</span>
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="eh-dns-type-tag type-a">A</span>
                  <span className="eh-dns-tag-desc">For Root / Apex (@) Domains</span>
                </td>
                <td>
                  <code>@</code>
                </td>
                <td>
                  <code className="eh-dns-target-val">{serverIpTarget}</code>
                </td>
                <td>Automatic / 3600</td>
                <td>
                  <button
                    type="button"
                    className="eh-dns-copy-btn"
                    onClick={() => handleCopy(serverIpTarget.split(" ")[0], "a-record")}
                  >
                    {copiedText === "a-record" ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedText === "a-record" ? "Copied" : "Copy Value"}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="eh-dns-callout">
          <ShieldCheck size={20} className="eh-accent-green" />
          <div>
            <strong>Automated Zero-Config SSL Provisioning</strong>
            <p>
              Once your DNS propagates, EchoServer automatically provisions a 2048-bit RSA TLS certificate and binds it into the Edge Router SNI cache. No certbot scripts or port forwarding required.
            </p>
          </div>
        </div>
      </div>

      {/* Add Custom Domain Modal */}
      {modalOpen && (
        <div className="eh-modal-backdrop" onClick={() => !submitting && setModalOpen(false)}>
          <div className="eh-domain-modal" onClick={(e) => e.stopPropagation()}>
            <div className="eh-domain-modal-header">
              <div className="eh-domain-modal-title">
                <Globe size={22} className="eh-accent-blue" />
                <div>
                  <h3>Add Custom Domain</h3>
                  <p>Attach your own apex or subdomain to this service.</p>
                </div>
              </div>
              <button
                type="button"
                className="eh-modal-close-btn"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDomain} className="eh-domain-modal-form">
              <div className="eh-form-group">
                <label htmlFor="custom-hostname-input">Domain or Subdomain</label>
                <div className="eh-input-prefix-wrap">
                  <span className="eh-input-prefix">https://</span>
                  <input
                    id="custom-hostname-input"
                    type="text"
                    placeholder="app.yourdomain.com or yourbrand.com"
                    value={customHostname}
                    onChange={(e) => setCustomHostname(e.target.value)}
                    required
                    autoFocus
                    disabled={submitting}
                  />
                </div>
                <span className="eh-form-help">
                  Enter your fully qualified domain name (FQDN). Point your CNAME or A record to EchoServer to complete routing.
                </span>
              </div>

              <div className="eh-ssl-guarantee-box">
                <Lock size={16} className="eh-accent-green" />
                <span>
                  <strong>Zero-Config HTTPS Included:</strong> A 2048-bit RSA SSL/TLS certificate will be generated and renewed automatically for this domain.
                </span>
              </div>

              <div className="eh-domain-modal-footer">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting || !customHostname.trim()}>
                  {submitting ? <RefreshCw size={14} className="spin" /> : <Plus size={16} />}
                  <span>{submitting ? "Attaching & Provisioning SSL..." : "Add Domain"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

