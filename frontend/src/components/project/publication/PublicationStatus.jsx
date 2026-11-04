import { useState, useEffect, useCallback } from "react";
import "./PublicationStatus.css";
import {
  Globe,
  Crown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import Button from "../../common/button/button";
import useAuth from "../../../hooks/useAuth";
import * as publicationApi from "../../../services/publication.api";

const formatStatus = (value) => {
  if (!value) return "Unknown";
  return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const BASE_DOMAIN = "devpiyush.in";

export default function PublicationStatus({
  publication,
  loading,
  project,
  onPublish,
  onUnpublish,
}) {
  const { user } = useAuth();
  const hasSubdomainPrivilege = Boolean(
    user?.isOwner || user?.canCustomSubdomain,
  );

  // Subdomain selection state for unpublished projects
  const [subdomainType, setSubdomainType] = useState("default"); // 'default' | 'custom'
  const [customSubdomain, setCustomSubdomain] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Debounced availability check
  useEffect(() => {
    if (subdomainType !== "custom") {
      setCheckResult(null);
      return;
    }

    const trimmed = customSubdomain.trim().toLowerCase();

    if (!trimmed) {
      setCheckResult(null);
      return;
    }

    if (trimmed.length < 3) {
      setCheckResult({
        available: false,
        message: "Subdomain must be at least 3 characters long.",
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setChecking(true);
        const result = await publicationApi.checkSubdomainAvailability(trimmed);
        setCheckResult(result);
      } catch (err) {
        setCheckResult({
          available: false,
          message:
            err.response?.data?.message || "Failed to verify subdomain availability.",
        });
      } finally {
        setChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [customSubdomain, subdomainType]);

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublishSubmit = async () => {
    try {
      setIsPublishing(true);
      if (subdomainType === "custom") {
        await onPublish({
          subdomainType: "custom",
          customSubdomain: customSubdomain.trim().toLowerCase(),
        });
      } else {
        await onPublish({
          subdomainType: "default",
        });
      }
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="publication-card">
        <h3>Publication</h3>
        <p>Loading publication status...</p>
      </div>
    );
  }

  // State A: Project is NOT yet published
  if (!publication) {
    const defaultHostnamePreview = `${(user?.username || "user")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")}-${(project?.name || "project")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")}.${BASE_DOMAIN}`;

    return (
      <div className="publication-card">
        <div className="publication-header">
          <div className="publication-title-row">
            <div>
              <h3>Publish Project</h3>
              <p>Host this containerized service on a public domain with automatic HTTPS routing.</p>
            </div>
            {hasSubdomainPrivilege && (
              <span className="exclusive-feature-tag" title="Super Admin granted custom subdomain privilege">
                <Crown size={13} />
                <span>Custom Subdomain Eligible</span>
              </span>
            )}
          </div>
        </div>

        {/* If user has privilege (or is Owner), show domain choice selector */}
        {hasSubdomainPrivilege ? (
          <div className="subdomain-selector-block">
            <div className="subdomain-type-tabs" role="tablist">
              <button
                type="button"
                className={`subdomain-tab ${subdomainType === "default" ? "active" : ""}`}
                onClick={() => setSubdomainType("default")}
              >
                <Globe size={14} />
                <span>Standard Domain</span>
              </button>

              <button
                type="button"
                className={`subdomain-tab ${subdomainType === "custom" ? "active" : ""}`}
                onClick={() => setSubdomainType("custom")}
              >
                <Crown size={14} />
                <span>Custom Subdomain</span>
                <span className="tab-pill-badge">Exclusive</span>
              </button>
            </div>

            {subdomainType === "default" ? (
              <div className="default-subdomain-preview-box">
                <span className="preview-label">Generated Domain:</span>
                <div className="preview-value-box">
                  <code>https://{defaultHostnamePreview}</code>
                </div>
                <span className="preview-hint">
                  Automatically combines your username and project name.
                </span>
              </div>
            ) : (
              <div className="custom-subdomain-input-box">
                <label className="custom-subdomain-label" htmlFor="custom-subdomain-input">
                  Choose Your Exclusive Subdomain:
                </label>

                <div className="custom-subdomain-input-wrap">
                  <span className="subdomain-prefix">https://</span>
                  <input
                    id="custom-subdomain-input"
                    type="text"
                    value={customSubdomain}
                    onChange={(e) => setCustomSubdomain(e.target.value.toLowerCase().trim())}
                    placeholder="my-cool-app"
                    className="custom-subdomain-field"
                    maxLength={63}
                    autoComplete="off"
                    autoFocus
                  />
                  <span className="subdomain-suffix">.{BASE_DOMAIN}</span>
                </div>

                {/* Live validation feedback */}
                <div className="subdomain-validation-row">
                  {checking ? (
                    <div className="subdomain-feedback checking">
                      <Loader2 size={13} className="spin" />
                      <span>Checking availability on {BASE_DOMAIN}...</span>
                    </div>
                  ) : checkResult ? (
                    checkResult.available ? (
                      <div className="subdomain-feedback available">
                        <CheckCircle2 size={13} />
                        <span>Available! Will publish as <strong>{checkResult.hostname}</strong></span>
                      </div>
                    ) : (
                      <div className="subdomain-feedback unavailable">
                        <AlertCircle size={13} />
                        <span>{checkResult.message || "This subdomain cannot be used."}</span>
                      </div>
                    )
                  ) : (
                    <span className="subdomain-hint">
                      3-63 characters, letters, numbers, and hyphens. Certain names are reserved for the Super Admin.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="standard-subdomain-notice">
            <div className="standard-preview-row">
              <span className="preview-label">Assigned Domain:</span>
              <div className="preview-value-box">
                <code>https://{defaultHostnamePreview}</code>
              </div>
            </div>
            <div className="exclusive-info-callout">
              <Crown size={14} className="exclusive-callout-icon" />
              <span>
                Want a custom subdomain like <code>app.{BASE_DOMAIN}</code>? Custom subdomains are an exclusive feature directly approved by the Super Admin.
              </span>
            </div>
          </div>
        )}

        <div className="publication-actions">
          <Button
            onClick={handlePublishSubmit}
            loading={isPublishing}
            disabled={
              isPublishing ||
              (subdomainType === "custom" && (!checkResult?.available || checking))
            }
          >
            {subdomainType === "custom"
              ? "Publish with Custom Subdomain"
              : "Publish Project"}
          </Button>
        </div>
      </div>
    );
  }

  // State B: Project IS published
  const url = `https://${publication.hostname}`;
  const isCustomSubdomain = Boolean(publication.is_custom);

  return (
    <div className="publication-card">
      <div className="publication-header">
        <div className="publication-title-row">
          <div>
            <h3>Public Deployment</h3>
            <p>Your service is routed through reverse proxy and accessible worldwide.</p>
          </div>
          <span
            className={`publication-mode-pill ${
              isCustomSubdomain ? "custom" : "standard"
            }`}
          >
            {isCustomSubdomain ? (
              <>
                <Crown size={12} />
                <span>Custom Subdomain</span>
              </>
            ) : (
              <>
                <Globe size={12} />
                <span>Standard Domain</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="publication-status-grid">
        <StatusItem label="Status" value={publication.publication_status} />
        <StatusItem
          label="Verification"
          value={publication.verification_status}
        />
        <StatusItem
          label="Domain Type"
          value={isCustomSubdomain ? "Custom Exclusive" : "Default Generated"}
          isRaw
        />
      </div>

      <div className="publication-info">
        <span className="publication-label">Live Public Endpoint</span>

        <div className="publication-box publication-link">
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        </div>
      </div>

      <div className="publication-actions">
        <Button onClick={() => window.open(url, "_blank")}>
          <ExternalLink size={15} />
          <span>Open Site</span>
        </Button>

        <Button
          variant="secondary"
          onClick={() => handleCopy(url)}
        >
          <Copy size={15} />
          <span>{copied ? "Copied!" : "Copy URL"}</span>
        </Button>

        <Button variant="danger" onClick={onUnpublish}>
          <Trash2 size={15} />
          <span>Unpublish</span>
        </Button>
      </div>
    </div>
  );
}

function StatusItem({ label, value, isRaw = false }) {
  return (
    <div className="publication-status-item">
      <span className="publication-status-label">{label}</span>

      <div className={`status-badge status-${value}`}>
        <span className="status-dot" />
        {isRaw ? value : formatStatus(value)}
      </div>
    </div>
  );
}
