import { useState } from "react";
import "./WebhookCard.css";
import {
  Zap,
  Webhook,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "../../../../context/ToastContext";
import {
  toggleAutoDeploy,
  regenerateWebhookSecret,
} from "../../../../services/git.api";

export default function WebhookCard({ projectId, repository, onRefresh }) {
  const [showSecret, setShowSecret] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [updatingAutoDeploy, setUpdatingAutoDeploy] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const toast = useToast();

  if (!repository) {
    return (
      <div className="eh-webhook-card eh-webhook-unconnected">
        <div className="eh-webhook-header">
          <div className="eh-webhook-title-group">
            <div className="eh-webhook-icon-bubble">
              <Zap size={20} className="eh-webhook-icon" />
            </div>
            <div>
              <div className="eh-webhook-heading-row">
                <h2>Automated Git Push-to-Deploy</h2>
                <span className="eh-webhook-status-badge paused">
                  Connect Repository Above
                </span>
              </div>
              <p>
                Trigger instant zero-downtime container builds whenever code is pushed to your
                GitHub repository.
              </p>
            </div>
          </div>
        </div>

        <div className="eh-webhook-guide-callout" style={{ marginTop: "16px" }}>
          <div className="eh-callout-icon">
            <HelpCircle size={18} />
          </div>
          <div>
            <strong>Automated Webhook Pipeline:</strong>
            <p style={{ margin: "4px 0 0 0", color: "#8b949e", fontSize: "0.85rem" }}>
              Once you connect a GitHub or GitLab repository above, EchoServer will generate an automated webhook endpoint and SHA-256 HMAC secret. Any <code>git push</code> will automatically build and hot-swap your live container.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const apiBase =
    import.meta.env.VITE_API_URL ||
    (window.location.origin.includes(":5173")
      ? "http://localhost:3000"
      : window.location.origin);
  const webhookUrl =
    repository.webhook_url ||
    `${apiBase}/api/webhooks/github/${projectId}`;
  const webhookSecret = repository.webhook_secret || "••••••••••••••••••••••••";
  const autoDeploy = repository.auto_deploy !== false;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    toast.success("Webhook URL copied to clipboard");
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopySecret = () => {
    if (repository.webhook_secret) {
      navigator.clipboard.writeText(repository.webhook_secret);
      setCopiedSecret(true);
      toast.success("Webhook secret copied to clipboard");
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleToggleAutoDeploy = async () => {
    try {
      setUpdatingAutoDeploy(true);
      const nextState = !autoDeploy;
      await toggleAutoDeploy(projectId, nextState);
      toast.success(
        nextState
          ? "Push-to-deploy enabled. Future pushes will automatically trigger builds."
          : "Push-to-deploy paused.",
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to update auto-deploy");
    } finally {
      setUpdatingAutoDeploy(false);
    }
  };

  const handleRegenerateSecret = async () => {
    if (
      !window.confirm(
        "Are you sure you want to regenerate this webhook secret? You must update the secret in your GitHub repository settings to keep deployments working.",
      )
    ) {
      return;
    }

    try {
      setRegenerating(true);
      await regenerateWebhookSecret(projectId);
      toast.success("New webhook secret generated successfully!");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to regenerate secret");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="eh-webhook-card">
      <div className="eh-webhook-header">
        <div className="eh-webhook-title-group">
          <div className="eh-webhook-icon-bubble">
            <Zap size={20} className="eh-webhook-icon" />
          </div>
          <div>
            <div className="eh-webhook-heading-row">
              <h2>Automated Git Push-to-Deploy</h2>
              <span
                className={`eh-webhook-status-badge ${
                  autoDeploy ? "active" : "paused"
                }`}
              >
                {autoDeploy ? "Auto-Deploy Active" : "Auto-Deploy Paused"}
              </span>
            </div>
            <p>
              Trigger instant zero-downtime builds whenever code is pushed to your
              GitHub repository.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={`eh-toggle-btn ${autoDeploy ? "on" : "off"}`}
          onClick={handleToggleAutoDeploy}
          disabled={updatingAutoDeploy}
          title="Toggle automatic deployments on git push"
        >
          <span className="eh-toggle-slider" />
          <span className="eh-toggle-label">
            {updatingAutoDeploy
              ? "Saving..."
              : autoDeploy
              ? "Enabled"
              : "Disabled"}
          </span>
        </button>
      </div>

      <div className="eh-webhook-body">
        {/* Webhook URL Input */}
        <div className="eh-webhook-field-group">
          <label className="eh-webhook-label">
            Payload URL
            <span className="eh-webhook-label-sub">
              (Paste into GitHub Webhook settings)
            </span>
          </label>
          <div className="eh-webhook-input-wrapper">
            <code className="eh-webhook-code">{webhookUrl}</code>
            <button
              type="button"
              className="eh-webhook-action-btn"
              onClick={handleCopyUrl}
              title="Copy Webhook URL"
            >
              {copiedUrl ? <Check size={16} className="eh-copied-icon" /> : <Copy size={16} />}
              <span>{copiedUrl ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Webhook Secret Input */}
        <div className="eh-webhook-field-group">
          <label className="eh-webhook-label">
            Secret Key
            <span className="eh-webhook-label-sub">
              (HMAC SHA-256 payload verification)
            </span>
          </label>
          <div className="eh-webhook-input-wrapper">
            <code className="eh-webhook-code">
              {showSecret
                ? repository.webhook_secret || "Not generated yet"
                : "••••••••••••••••••••••••••••••••••••••••••••••••"}
            </code>

            <div className="eh-webhook-btn-group">
              <button
                type="button"
                className="eh-webhook-action-btn"
                onClick={() => setShowSecret(!showSecret)}
                title={showSecret ? "Hide secret" : "Reveal secret"}
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>

              <button
                type="button"
                className="eh-webhook-action-btn"
                onClick={handleCopySecret}
                title="Copy Secret"
              >
                {copiedSecret ? (
                  <Check size={16} className="eh-copied-icon" />
                ) : (
                  <Copy size={16} />
                )}
                <span>{copiedSecret ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                className="eh-webhook-action-btn eh-regenerate-btn"
                onClick={handleRegenerateSecret}
                disabled={regenerating}
                title="Regenerate secret"
              >
                <RefreshCw
                  size={15}
                  className={regenerating ? "eh-spin" : ""}
                />
                <span>{regenerating ? "Regenerating..." : "Regenerate"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expandable Setup Instructions */}
        <div className="eh-webhook-guide-section">
          <button
            type="button"
            className="eh-webhook-guide-toggle"
            onClick={() => setShowGuide(!showGuide)}
          >
            <div className="eh-guide-toggle-left">
              <HelpCircle size={16} />
              <span>How to configure GitHub Webhook in 60 seconds</span>
            </div>
            {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showGuide && (
            <div className="eh-webhook-guide-content">
              <ol className="eh-guide-steps">
                <li>
                  Open your repository on GitHub and navigate to{" "}
                  <strong>Settings</strong> &gt; <strong>Webhooks</strong>.
                </li>
                <li>
                  Click the <strong>Add webhook</strong> button.
                </li>
                <li>
                  In <strong>Payload URL</strong>, paste the Payload URL copied
                  above.
                </li>
                <li>
                  Set <strong>Content type</strong> to{" "}
                  <code>application/json</code>.
                </li>
                <li>
                  In <strong>Secret</strong>, paste the Secret Key from above.
                </li>
                <li>
                  Under <em>Which events would you like to trigger this webhook?</em>, select{" "}
                  <strong>Just the <code>push</code> event</strong>.
                </li>
                <li>
                  Ensure <strong>Active</strong> is checked, then click{" "}
                  <strong>Add webhook</strong>.
                </li>
              </ol>
              <div className="eh-guide-note">
                ✨ That's it! Every push to branch{" "}
                <code>{repository.branch || "main"}</code> will automatically trigger a clean
                build, run health checks, and swap your container live with zero downtime.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

