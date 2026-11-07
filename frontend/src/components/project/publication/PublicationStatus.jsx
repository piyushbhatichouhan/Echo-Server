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
  Pencil,
  Check,
  X,
  Clock,
  Send,
  XCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Button from "../../common/button/button";
import useAuth from "../../../hooks/useAuth";
import { useToast } from "../../../context/ToastContext";
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
  onUpdateSubdomain,
  onUnpublish,
  refresh,
}) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const isSuperAdmin = Boolean(user?.isOwner || user?.is_owner);
  const hasSubdomainPrivilege = Boolean(
    isSuperAdmin || user?.canCustomSubdomain || user?.can_custom_subdomain,
  );

  // Sync latest user privileges on mount so newly granted permissions appear immediately
  useEffect(() => {
    if (typeof refreshUser === "function") {
      refreshUser();
    }
  }, [refreshUser]);

  // Project Subdomain Request State
  const [subdomainRequest, setSubdomainRequest] = useState(null);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Subdomain selection state for unpublished projects
  const [subdomainType, setSubdomainType] = useState("default"); // 'default' | 'custom'
  const [customSubdomain, setCustomSubdomain] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Subdomain editing state for already-published projects
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState("custom"); // 'default' | 'custom'
  const [editCustomSubdomain, setEditCustomSubdomain] = useState("");
  const [editChecking, setEditChecking] = useState(false);
  const [editCheckResult, setEditCheckResult] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load project's current subdomain request (load for all project owners so revocation notes are visible)
  const loadSubdomainRequest = useCallback(async () => {
    if (!project?.id) return;
    try {
      setLoadingRequest(true);
      const req = await publicationApi.getSubdomainRequest(project.id);
      setSubdomainRequest(req || null);
    } catch {
      // not found / error
    } finally {
      setLoadingRequest(false);
    }
  }, [project?.id]);

  useEffect(() => {
    loadSubdomainRequest();
  }, [loadSubdomainRequest]);

  // Debounced availability check for INITIAL publishing
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
        const result = await publicationApi.checkSubdomainAvailability(trimmed, project?.id);
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
  }, [customSubdomain, subdomainType, project?.id]);

  // Debounced availability check for EDITING published projects
  useEffect(() => {
    if (!isEditing || editType !== "custom") {
      setEditCheckResult(null);
      return;
    }

    const trimmed = editCustomSubdomain.trim().toLowerCase();
    if (!trimmed) {
      setEditCheckResult(null);
      return;
    }

    if (trimmed.length < 3) {
      setEditCheckResult({
        available: false,
        message: "Subdomain must be at least 3 characters long.",
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setEditChecking(true);
        const result = await publicationApi.checkSubdomainAvailability(trimmed, project?.id);
        setEditCheckResult(result);
      } catch (err) {
        setEditCheckResult({
          available: false,
          message:
            err.response?.data?.message || "Failed to verify subdomain availability.",
        });
      } finally {
        setEditChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [editCustomSubdomain, editType, isEditing, project?.id]);

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestSubdomain = async (customPrefix) => {
    const sub = (customPrefix || customSubdomain).trim().toLowerCase();
    if (!sub || sub.length < 3) return;

    try {
      setIsRequesting(true);
      const res = await publicationApi.requestCustomSubdomain(project?.id, sub);
      toast?.success(
        "Request Submitted",
        res.message || "Custom subdomain request submitted to Super Admin for approval.",
      );
      await loadSubdomainRequest();
      setCustomSubdomain("");
    } catch (err) {
      toast?.error("Request Failed", err.response?.data?.message || err.message);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelRequest = async () => {
    try {
      setIsCancelling(true);
      await publicationApi.cancelSubdomainRequest(project?.id);
      toast?.success("Notification Dismissed", "Custom subdomain notification dismissed.");
      setSubdomainRequest(null);
      if (typeof refresh === "function") {
        await refresh();
      }
    } catch (err) {
      toast?.error("Action Failed", err.response?.data?.message || err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePublishSubmit = async () => {
    try {
      setIsPublishing(true);
      if (subdomainType === "custom") {
        const targetSub = (customSubdomain || subdomainRequest?.subdomain || "")
          .trim()
          .toLowerCase();

        await onPublish({
          subdomainType: "custom",
          customSubdomain: targetSub,
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

  const handleStartEdit = () => {
    const isCustom = Boolean(publication?.is_custom);
    setEditType(isCustom ? "custom" : "default");
    const initialPrefix =
      publication?.custom_domain ||
      publication?.hostname?.replace(new RegExp(`\\.${BASE_DOMAIN}$`, "i"), "") ||
      subdomainRequest?.subdomain ||
      "";
    setEditCustomSubdomain(initialPrefix);
    setEditCheckResult(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditCheckResult(null);
  };

  const handleSaveEdit = async () => {
    if (!onUpdateSubdomain) return;
    try {
      setIsUpdating(true);
      if (editType === "custom") {
        const targetSub = (editCustomSubdomain || "").trim().toLowerCase();

        await onUpdateSubdomain({
          subdomainType: "custom",
          customSubdomain: targetSub,
        });
      } else {
        await onUpdateSubdomain({
          subdomainType: "default",
        });
      }
      setIsEditing(false);
    } finally {
      setIsUpdating(false);
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

  const defaultHostnamePreview = `${(user?.username || project?.username || "user")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")}-${(project?.name || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")}.${BASE_DOMAIN}`;

  const hasApprovedSubdomain =
    subdomainRequest && subdomainRequest.status === "approved";
  const hasPendingSubdomain =
    subdomainRequest && subdomainRequest.status === "pending";
  const hasRejectedSubdomain =
    subdomainRequest && subdomainRequest.status === "rejected";

  // State A: Project is NOT yet published
  if (!publication) {
    return (
      <div className="publication-card">
        <div className="publication-header">
          <div className="publication-title-row">
            <div>
              <h3>Publish Project</h3>
              <p>Host this containerized service on a public domain with automatic HTTPS routing.</p>
            </div>
            {hasSubdomainPrivilege && (
              <span className="exclusive-feature-tag" title="Custom subdomain privilege active">
                <Crown size={13} />
                <span>Custom Subdomain Eligible</span>
              </span>
            )}
          </div>
        </div>

        {/* Prominent Custom Subdomain Declined/Revoked Alert Banner for Unpublished Projects */}
        {hasRejectedSubdomain && (
          <div className="subdomain-revocation-notice-banner">
            <div className="revocation-banner-main">
              <div className="revocation-banner-icon-box">
                <AlertCircle size={22} className="revocation-alert-icon" />
              </div>
              <div className="revocation-banner-content">
                <div className="revocation-banner-title">
                  <strong>Custom Subdomain Request Declined / Revoked</strong>
                  <span className="revocation-badge">Declined</span>
                </div>
                <p className="revocation-banner-desc">
                  The custom subdomain <code>https://{subdomainRequest.hostname}</code> was declined or revoked by the Super Admin.
                  You can publish this project using your standard domain below.
                </p>
                {subdomainRequest.admin_notes && (
                  <div className="revocation-reason-box">
                    <span className="revocation-reason-label">Reason / Admin Note:</span>
                    <span className="revocation-reason-text">{subdomainRequest.admin_notes}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              className="revocation-dismiss-btn"
              onClick={handleCancelRequest}
              disabled={isCancelling}
              title="Dismiss this notification"
            >
              {isCancelling ? <Loader2 size={14} className="spin" /> : <X size={16} />}
              <span>Dismiss</span>
            </button>
          </div>
        )}

        {/* Domain choice selector */}
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
                  Standard format combining your username and project name.
                </span>
              </div>
            ) : (
              /* Privileged users can directly input and claim their custom subdomain */
              <div className="custom-subdomain-input-box">
                <label className="custom-subdomain-label" htmlFor="custom-subdomain-input">
                  Choose Custom Subdomain:
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
                      Custom subdomain privilege active. Enter 3-63 characters, numbers, and hyphens.
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
                Want an exclusive custom subdomain like <code>app.{BASE_DOMAIN}</code>? Custom subdomains can be granted by the Super Admin in Server Settings.
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
              (subdomainType === "custom" &&
                (!checkResult?.available || checking))
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
          <div className="header-badges-row">
            {hasSubdomainPrivilege && (
              <span className="exclusive-feature-tag" title="Custom subdomain privilege active">
                <Crown size={12} />
                <span>Custom Eligible</span>
              </span>
            )}
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

      {/* Prominent Custom Subdomain Revocation Alert Banner for Published Projects */}
      {hasRejectedSubdomain && (
        <div className="subdomain-revocation-notice-banner">
          <div className="revocation-banner-main">
            <div className="revocation-banner-icon-box">
              <AlertCircle size={22} className="revocation-alert-icon" />
            </div>
            <div className="revocation-banner-content">
              <div className="revocation-banner-title">
                <strong>Custom Subdomain Revoked</strong>
                <span className="revocation-badge">Revoked by Admin</span>
              </div>
              <p className="revocation-banner-desc">
                Your custom subdomain <code>https://{subdomainRequest.hostname}</code> has been revoked by the Super Admin.
                Your website traffic has been automatically reverted to your standard domain:{" "}
                <a href={url} target="_blank" rel="noreferrer">
                  <code>{url}</code>
                </a>.
              </p>
              {subdomainRequest.admin_notes && (
                <div className="revocation-reason-box">
                  <span className="revocation-reason-label">Reason / Admin Note:</span>
                  <span className="revocation-reason-text">{subdomainRequest.admin_notes}</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className="revocation-dismiss-btn"
            onClick={handleCancelRequest}
            disabled={isCancelling}
            title="Dismiss this notification"
          >
            {isCancelling ? <Loader2 size={14} className="spin" /> : <X size={16} />}
            <span>Dismiss</span>
          </button>
        </div>
      )}

      {/* Prominent Approved Subdomain Notification if currently on standard domain */}
      {!isCustomSubdomain && hasApprovedSubdomain && !isEditing && (
        <div className="approved-ready-banner">
          <div className="banner-left">
            <Sparkles size={20} className="banner-sparkle" />
            <div>
              <strong>Approved Custom Subdomain Ready</strong>
              <p>
                The Super Admin approved <code>https://{subdomainRequest.hostname}</code> for this project.
              </p>
            </div>
          </div>

          <Button
            onClick={() =>
              onUpdateSubdomain({
                subdomainType: "custom",
                customSubdomain: subdomainRequest.subdomain,
              })
            }
            loading={isUpdating}
          >
            <Crown size={14} />
            <span>Switch to Approved Subdomain</span>
          </Button>
        </div>
      )}

      {/* Endpoint & Edit Section */}
      <div className="publication-info">
        <div className="publication-info-header">
          <span className="publication-label">Live Public Endpoint</span>
          {hasSubdomainPrivilege && !isEditing && (
            <button
              type="button"
              className="btn-edit-subdomain"
              onClick={handleStartEdit}
              title="Edit or change this project's subdomain"
            >
              <Pencil size={13} />
              <span>Change Subdomain</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="publication-edit-box">
            <div className="subdomain-selector-block" style={{ marginBottom: 0 }}>
              <div className="subdomain-type-tabs" role="tablist">
                <button
                  type="button"
                  className={`subdomain-tab ${editType === "default" ? "active" : ""}`}
                  onClick={() => setEditType("default")}
                >
                  <Globe size={14} />
                  <span>Standard Domain</span>
                </button>

                <button
                  type="button"
                  className={`subdomain-tab ${editType === "custom" ? "active" : ""}`}
                  onClick={() => setEditType("custom")}
                >
                  <Crown size={14} />
                  <span>Custom Subdomain</span>
                  <span className="tab-pill-badge">Exclusive</span>
                </button>
              </div>

              {editType === "default" ? (
                <div className="default-subdomain-preview-box">
                  <span className="preview-label">Revert to Standard Domain:</span>
                  <div className="preview-value-box">
                    <code>https://{defaultHostnamePreview}</code>
                  </div>
                  <span className="preview-hint">
                    Reverts this project to the standard username-project domain format.
                  </span>
                </div>
              ) : (
                <div className="custom-subdomain-input-box">
                  <label className="custom-subdomain-label" htmlFor="edit-custom-subdomain-input">
                    Choose New Custom Subdomain:
                  </label>

                  <div className="custom-subdomain-input-wrap">
                    <span className="subdomain-prefix">https://</span>
                    <input
                      id="edit-custom-subdomain-input"
                      type="text"
                      value={editCustomSubdomain}
                      onChange={(e) => setEditCustomSubdomain(e.target.value.toLowerCase().trim())}
                      placeholder="my-cool-app"
                      className="custom-subdomain-field"
                      maxLength={63}
                      autoComplete="off"
                      autoFocus
                    />
                    <span className="subdomain-suffix">.{BASE_DOMAIN}</span>
                  </div>

                  <div className="subdomain-validation-row">
                    {editChecking ? (
                      <div className="subdomain-feedback checking">
                        <Loader2 size={13} className="spin" />
                        <span>Checking availability on {BASE_DOMAIN}...</span>
                      </div>
                    ) : editCheckResult ? (
                      editCheckResult.available ? (
                        <div className="subdomain-feedback available">
                          <CheckCircle2 size={13} />
                          <span>
                            {editCheckResult.isCurrent
                              ? "Currently assigned to this project."
                              : `Available! Will route to `}
                            {!editCheckResult.isCurrent && <strong>{editCheckResult.hostname}</strong>}
                          </span>
                        </div>
                      ) : (
                        <div className="subdomain-feedback unavailable">
                          <AlertCircle size={13} />
                          <span>{editCheckResult.message || "This subdomain cannot be used."}</span>
                        </div>
                      )
                    ) : (
                      <span className="subdomain-hint">
                        3-63 characters, letters, numbers, and hyphens. Reserved hostnames are restricted.
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="publication-edit-actions">
                <Button
                  onClick={handleSaveEdit}
                  loading={isUpdating}
                  disabled={
                    isUpdating ||
                    (editType === "custom" &&
                      (!editCheckResult?.available || editChecking))
                  }
                >
                  <Check size={14} />
                  <span>Apply Subdomain</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  <X size={14} />
                  <span>Cancel</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="publication-box publication-link">
            <a href={url} target="_blank" rel="noreferrer">
              {url}
            </a>
          </div>
        )}
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

        {hasSubdomainPrivilege && !isEditing && (
          <Button
            variant="secondary"
            onClick={handleStartEdit}
          >
            <Pencil size={14} />
            <span>Change Subdomain</span>
          </Button>
        )}

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
