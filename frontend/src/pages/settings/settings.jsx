import "./Settings.css";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { forgotPassword, getCurrentUser, deleteAccount } from "../../services/auth.api";
import cloudWorkspace from "../../services/cloudWorkspace";
import ConfirmationModal from "../../components/common/modal/ConfirmationModal";
import useAuth from "../../hooks/useAuth";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import {
  User,
  Mail,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Lock,
  KeyRound,
  AlertTriangle,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  Circle,
  Sparkles,
  Shield,
  Clock,
  Database,
  X,
  ExternalLink,
  Send,
  Palette,
  Moon,
  Flame,
  Sun,
  Zap,
} from "lucide-react";

export default function Settings() {
  const { logout } = useAuth();
  const toast = useToast();
  const { theme: currentTheme, setTheme, themes } = useTheme();

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const sendResetEmail = async () => {
    setSendingReset(true);
    try {
      await forgotPassword(user.email);
      setResetSent(true);
      toast?.success("Email Sent", "Password reset instructions sent to your email.");
    } catch (err) {
      toast?.error("Error", err.response?.data?.message || err.message || "Failed to send reset email");
    } finally {
      setSendingReset(false);
    }
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await cloudWorkspace.getStats();
        setStats(data);
      } catch {
        // storage stats fallback
      }
    };
    loadStats();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData?.data ?? userData);
      } catch (err) {
        toast?.error("Error", "Failed to load account profile.");
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Prevent background scrolling when reset modal is open
  useEffect(() => {
    if (!resetModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [resetModalOpen]);

  // Handle escape key for reset modal
  useEffect(() => {
    if (!resetModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setResetModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resetModalOpen]);

  const formatBytes = (bytes) => {
    if (bytes == null) return "Unlimited";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let value = Number(bytes);
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }
    return `${value.toFixed(1)} ${units[i]}`;
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast?.success(
        "Account scheduled for deletion",
        "Your account will be deleted after 24 hours.",
      );
      logout?.();
    } catch (err) {
      toast?.error(
        "Deletion Failed",
        err.response?.data?.message || err.message || "Could not delete account",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="settings-loading-wrap">
        <div className="settings-spinner" />
        <span>Loading account preferences...</span>
      </div>
    );
  }

  const avatar = user.username ? user.username.charAt(0).toUpperCase() : "U";
  const formattedJoinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const storageUsed = stats?.used ?? 0;
  const storageLimit = stats?.limit ?? 0;
  const storagePercent =
    storageLimit > 0
      ? Math.min(100, Math.round((storageUsed / storageLimit) * 100))
      : 0;
  const storageRemaining = Math.max(0, storageLimit - storageUsed);

  return (
    <div className="settings-page">
      {/* Page Header */}
      <div className="settings-header">
        <div className="settings-header-badge">
          <Sparkles size={14} />
          <span>Account & Security</span>
        </div>
        <h1>Account Settings</h1>
        <p>Manage your profile identity, security credentials, storage quota, and preferences.</p>
      </div>

      {/* User Hero Banner */}
      <div className="settings-hero-card">
        <div className="settings-hero-avatar-wrap">
          <div className="settings-hero-avatar">{avatar}</div>
          <div className="settings-avatar-glow" />
        </div>

        <div className="settings-hero-details">
          <div className="settings-hero-top-row">
            <h2 className="settings-hero-username">@{user.username}</h2>
            <div className="settings-hero-badges">
              {user.is_owner ? (
                <span className="settings-role-badge settings-role-badge--owner">
                  <ShieldAlert size={13} />
                  <span>Super Admin</span>
                </span>
              ) : (
                <span className="settings-role-badge">
                  <ShieldCheck size={13} />
                  <span>Member</span>
                </span>
              )}
              <span className="settings-status-badge">
                <span className="settings-pulse-dot" />
                <span>Active</span>
              </span>
            </div>
          </div>

          <div className="settings-hero-meta">
            <button
              type="button"
              className="settings-meta-chip settings-meta-chip--clickable"
              onClick={() => handleCopy(user.email, "hero-email")}
              title="Click to copy email"
            >
              <Mail size={14} />
              <span>{user.email}</span>
              {copiedField === "hero-email" ? (
                <Check size={12} className="settings-chip-copied" />
              ) : (
                <Copy size={12} className="settings-chip-copy" />
              )}
            </button>

            <div className="settings-meta-chip">
              <Calendar size={14} />
              <span>Joined {formattedJoinDate}</span>
            </div>

            <div className="settings-meta-chip">
              <HardDrive size={14} />
              <span>{storagePercent}% Quota Used</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details Card */}
      <div className="settings-section">
        <div className="settings-section-title">
          <User size={18} />
          <h2>Profile & Identity</h2>
        </div>

        <div className="settings-card">
          <div className="settings-grid-tiles">
            {/* Tile 1: Username */}
            <div className="settings-tile">
              <div className="settings-tile-header">
                <span className="settings-tile-label">Username</span>
                <button
                  type="button"
                  className="settings-tile-copy-btn"
                  onClick={() => handleCopy(user.username, "tile-username")}
                  aria-label="Copy username"
                >
                  {copiedField === "tile-username" ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div className="settings-tile-value">@{user.username}</div>
              <span className="settings-tile-sub">Public platform handle</span>
            </div>

            {/* Tile 2: Primary Email */}
            <div className="settings-tile">
              <div className="settings-tile-header">
                <span className="settings-tile-label">Primary Email</span>
                <button
                  type="button"
                  className="settings-tile-copy-btn"
                  onClick={() => handleCopy(user.email, "tile-email")}
                  aria-label="Copy email"
                >
                  {copiedField === "tile-email" ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div className="settings-tile-value settings-tile-value--email">{user.email}</div>
              <div className="settings-tile-verified">
                <CheckCircle2 size={13} />
                <span>Verified Address</span>
              </div>
            </div>

            {/* Tile 3: Account ID */}
            <div className="settings-tile">
              <div className="settings-tile-header">
                <span className="settings-tile-label">Account ID</span>
                <button
                  type="button"
                  className="settings-tile-copy-btn"
                  onClick={() => handleCopy(String(user.id), "tile-id")}
                  aria-label="Copy ID"
                >
                  {copiedField === "tile-id" ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div className="settings-tile-value settings-tile-value--mono">
                {String(user.id).slice(0, 16)}...
              </div>
              <span className="settings-tile-sub">Unique user identifier</span>
            </div>

            {/* Tile 4: Member Since */}
            <div className="settings-tile">
              <div className="settings-tile-header">
                <span className="settings-tile-label">Member Since</span>
                <Clock size={14} className="settings-tile-icon-dim" />
              </div>
              <div className="settings-tile-value">{formattedJoinDate}</div>
              <span className="settings-tile-sub">Console registration date</span>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance & Interface Theme Card */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Palette size={18} />
          <h2>Appearance & Interface Theme</h2>
        </div>

        <div className="settings-card">
          <div className="settings-theme-header">
            <div>
              <span className="settings-theme-heading">Theme Palette</span>
              <p className="settings-theme-sub">
                Select your preferred visual atmosphere. The theme applies instantly across all consoles, dashboards, code viewers, and storage managers.
              </p>
            </div>
            <div className="settings-theme-active-tag">
              <span>Active:</span>
              <strong>{themes.find((t) => t.id === currentTheme)?.name || "Dark Grey"}</strong>
            </div>
          </div>

          <div className="settings-theme-grid" role="radiogroup" aria-label="Theme Selection">
            {themes.map((t) => {
              const isActive = currentTheme === t.id;
              const IconComponent =
                t.id === "dark-grey"
                  ? Moon
                  : t.id === "amber-brown"
                  ? Flame
                  : t.id === "light-white"
                  ? Sun
                  : Zap;

              return (
                <button
                  key={t.id}
                  type="button"
                  className={`settings-theme-card ${isActive ? "settings-theme-card--active" : ""}`}
                  onClick={() => {
                    setTheme(t.id);
                    toast?.success("Theme Updated", `Switched interface to ${t.name}.`);
                  }}
                  style={{
                    "--card-accent": t.accentColor,
                  }}
                  role="radio"
                  aria-checked={isActive}
                >
                  <div className="settings-theme-preview" style={{ background: t.primaryColor }}>
                    <div className="settings-theme-preview-window">
                      <div className="settings-theme-preview-bar">
                        <span className="settings-theme-preview-dot dot-red" />
                        <span className="settings-theme-preview-dot dot-yellow" />
                        <span className="settings-theme-preview-dot dot-green" />
                      </div>
                      <div className="settings-theme-preview-body" style={{ background: t.cardColor }}>
                        <div className="settings-theme-preview-header">
                          <div
                            className="settings-theme-preview-line short"
                            style={{ background: t.textColor, opacity: 0.7 }}
                          />
                          <div
                            className="settings-theme-preview-pill"
                            style={{ background: t.accentColor }}
                          />
                        </div>
                        <div
                          className="settings-theme-preview-card"
                          style={{
                            borderColor: t.accentColor + "40",
                            background: t.primaryColor,
                          }}
                        >
                          <div
                            className="settings-theme-preview-line"
                            style={{ background: t.textColor, opacity: 0.4 }}
                          />
                          <div
                            className="settings-theme-preview-line medium"
                            style={{ background: t.textColor, opacity: 0.2 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="settings-theme-info">
                    <div className="settings-theme-info-top">
                      <div className="settings-theme-title-wrap">
                        <IconComponent
                          size={16}
                          className="settings-theme-icon"
                          style={{ color: t.accentColor }}
                        />
                        <span className="settings-theme-name">{t.name}</span>
                      </div>
                      <div className="settings-theme-badges">
                        {t.badge && (
                          <span className="settings-theme-badge">{t.badge}</span>
                        )}
                        <span className="settings-theme-radio">
                          {isActive ? (
                            <CheckCircle2 size={16} style={{ color: t.accentColor }} />
                          ) : (
                            <Circle size={16} />
                          )}
                        </span>
                      </div>
                    </div>
                    <p className="settings-theme-desc">{t.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cloud Storage & Quota Card */}
      <div className="settings-section">
        <div className="settings-section-title">
          <HardDrive size={18} />
          <h2>Storage & Workspace Quota</h2>
        </div>

        <div className="settings-card">
          <div className="settings-storage-block">
            <div className="settings-storage-top">
              <div>
                <span className="settings-storage-heading">Allocated Cloud Disk Space</span>
                <p className="settings-storage-sub">
                  Total storage consumed across project files, uploaded assets, and deployments.
                </p>
              </div>
              <span className="settings-storage-pct-badge">{storagePercent}% Used</span>
            </div>

            {/* Progress Bar */}
            <div className="settings-progress-track">
              <div
                className="settings-progress-fill"
                style={{ width: `${Math.max(2, storagePercent)}%` }}
              />
            </div>

            {/* Metrics Breakdown */}
            <div className="settings-storage-metrics">
              <div className="settings-metric-tile">
                <span className="settings-metric-label">Used Storage</span>
                <strong className="settings-metric-val">{formatBytes(storageUsed)}</strong>
              </div>

              <div className="settings-metric-tile">
                <span className="settings-metric-label">Free Available</span>
                <strong className="settings-metric-val">
                  {storageLimit > 0 ? formatBytes(storageRemaining) : "Unlimited"}
                </strong>
              </div>

              <div className="settings-metric-tile">
                <span className="settings-metric-label">Hard Quota Limit</span>
                <strong className="settings-metric-val">{formatBytes(storageLimit)}</strong>
              </div>
            </div>

            <div className="settings-storage-callout">
              <Database size={16} />
              <span>
                Need more cloud disk quota? Platform administrators can adjust storage allocations from Server Management.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Authentication */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Lock size={18} />
          <h2>Security & Credentials</h2>
        </div>

        <div className="settings-card">
          <div className="settings-security-content">
            <div className="settings-security-info">
              <div className="settings-security-icon-badge">
                <KeyRound size={20} />
              </div>
              <div className="settings-security-text">
                <h3>Account Password</h3>
                <p>
                  To change your account password, we will send an authenticated password reset link
                  directly to <strong>{user.email}</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="settings-primary-btn"
              onClick={() => setResetModalOpen(true)}
            >
              <KeyRound size={16} />
              <span>Reset Password</span>
            </button>
          </div>

          <div className="settings-security-chips">
            <div className="settings-security-chip">
              <ShieldCheck size={14} />
              <span>JWT Bearer Authentication Active</span>
            </div>
            <div className="settings-security-chip">
              <Lock size={14} />
              <span>End-to-End SSL/TLS Transport</span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section settings-section--danger">
        <div className="settings-section-title settings-section-title--danger">
          <AlertTriangle size={18} />
          <h2>Danger Zone</h2>
        </div>

        <div className="settings-card settings-card--danger">
          <div className="settings-danger-content">
            <div className="settings-danger-details">
              <h3>Deactivate & Delete Account</h3>
              <p>
                Deleting your account will immediately revoke all authentication credentials and server access.
              </p>
              <ul className="settings-danger-list">
                <li>Immediate session termination across all devices.</li>
                <li>Projects, repositories, environment configurations, and cloud files scheduled for deletion.</li>
                <li>A <strong>24-hour grace window</strong> allows an administrator to recover your account if requested.</li>
              </ul>
            </div>

            <button
              type="button"
              className="settings-danger-btn"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={16} />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModalOpen &&
        createPortal(
          <div
            className="settings-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setResetModalOpen(false);
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="settings-modal">
              {!resetSent ? (
                <>
                  <div className="settings-modal-header">
                    <div className="settings-modal-icon-badge">
                      <Mail size={22} />
                    </div>
                    <button
                      type="button"
                      className="settings-modal-close"
                      onClick={() => setResetModalOpen(false)}
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <h2>Reset Password</h2>
                  <p>Send a secure password reset link to your verified account address:</p>

                  <strong>{user.email}</strong>

                  <div className="settings-modal-actions">
                    <button
                      type="button"
                      className="settings-secondary-btn"
                      onClick={() => setResetModalOpen(false)}
                      disabled={sendingReset}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="settings-primary-btn"
                      onClick={sendResetEmail}
                      disabled={sendingReset}
                    >
                      {sendingReset ? (
                        <span className="settings-btn-spinner-wrap">
                          <span className="settings-btn-spinner" />
                          Sending...
                        </span>
                      ) : (
                        <>
                          <Send size={16} />
                          <span>Send Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="settings-modal-header settings-modal-header--centered">
                    <div className="settings-modal-icon-badge settings-modal-icon-badge--success">
                      <CheckCircle2 size={24} />
                    </div>
                  </div>

                  <h2>Email Sent Successfully</h2>
                  <p>A password reset link with instructions has been dispatched to:</p>

                  <strong>{user.email}</strong>

                  <p className="settings-modal-subtext">
                    Please check your inbox and spam folder. The link will expire in 1 hour.
                  </p>

                  <div className="settings-modal-actions settings-modal-actions--centered">
                    <button
                      type="button"
                      className="settings-primary-btn"
                      onClick={() => {
                        setResetSent(false);
                        setResetModalOpen(false);
                      }}
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Account Deletion Confirmation Modal */}
      <ConfirmationModal
        open={deleteOpen}
        accountMode
        user={{
          username: "DELETE",
          email: user.email,
        }}
        loading={deleting}
        onDelete={handleDeleteAccount}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}

