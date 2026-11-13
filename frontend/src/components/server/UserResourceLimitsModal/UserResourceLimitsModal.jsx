import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "./UserResourceLimitsModal.css";
import { Cpu, HardDrive, Layers, X, Save, AlertTriangle } from "lucide-react";

const RAM_PRESETS = [
  { label: "256 MB", val: 256 },
  { label: "512 MB (Default)", val: 512 },
  { label: "768 MB", val: 768 },
  { label: "1 GB (1024 MB)", val: 1024 },
  { label: "2 GB (2048 MB)", val: 2048 },
];

const ACTIVE_PRESETS = [1, 2, 3, 5, 8];
const MAX_PROJECT_PRESETS = [3, 5, 10, 15, 20];

export default function UserResourceLimitsModal({
  open,
  user,
  loading = false,
  onClose,
  onSave,
}) {
  const [ramLimitMb, setRamLimitMb] = useState(
    Number(user?.ram_limit_mb || 512),
  );
  const [maxActiveProjects, setMaxActiveProjects] = useState(
    Number(user?.max_active_projects || 2),
  );
  const [maxProjects, setMaxProjects] = useState(
    Number(user?.max_projects || 5),
  );
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    if (loading) return;
    setError("");
    onClose?.();
  }, [loading, onClose]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Escape key listener
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  if (!open || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const ram = Number(ramLimitMb);
    const active = Number(maxActiveProjects);
    const total = Number(maxProjects);

    if (isNaN(ram) || ram < 64) {
      setError("RAM limit must be at least 64 MB.");
      return;
    }
    if (isNaN(active) || active < 1) {
      setError("Active projects cap must be at least 1.");
      return;
    }
    if (isNaN(total) || total < 1) {
      setError("Total projects cap must be at least 1.");
      return;
    }
    if (active > total) {
      setError("Active projects cap cannot be greater than the total projects cap.");
      return;
    }

    try {
      await onSave({
        ramLimitMb: ram,
        maxActiveProjects: active,
        maxProjects: total,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update resource limits.");
    }
  };

  const avatar = user.username ? user.username.charAt(0).toUpperCase() : "U";

  return createPortal(
    <div
      className="resLimitsOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="resLimitsModal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="resLimitsHeader">
          <div className="resLimitsHeaderLeft">
            <div className="resLimitsIconBadge">
              <Cpu size={22} />
            </div>
            <div>
              <h2>Resource Allowances</h2>
              <p>Configure hardware memory and active project limits for this account.</p>
            </div>
          </div>

          <button
            type="button"
            className="resLimitsClose"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* User preview banner */}
        <div className="resLimitsUserBanner">
          <div className="resLimitsAvatar">{avatar}</div>
          <div className="resLimitsUserInfo">
            <span className="resLimitsUsername">{user.username}</span>
            <span className="resLimitsEmail">{user.email}</span>
          </div>
          <span className="resLimitsTag">Developer Account</span>
        </div>

        {error && (
          <div className="resLimitsErrorBanner" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form className="resLimitsBody" onSubmit={handleSubmit}>
          {/* 1. RAM Cap Field */}
          <div className="resLimitsField">
            <div className="resLimitsFieldHeader">
              <div className="resLimitsFieldLabel">
                <HardDrive size={16} />
                <span>Account RAM Allowance (MB)</span>
              </div>
              <span className="resLimitsCurrentVal">{ramLimitMb} MB ({ (ramLimitMb / 1024).toFixed(2) } GB)</span>
            </div>
            <p className="resLimitsFieldHelp">
              Maximum cumulative memory consumed by all active running project containers owned by this user.
            </p>

            <div className="resLimitsInputRow">
              <input
                type="number"
                min="64"
                max="32768"
                step="64"
                value={ramLimitMb}
                onChange={(e) => {
                  setRamLimitMb(e.target.value);
                  if (error) setError("");
                }}
                disabled={loading}
                required
              />
              <span className="resLimitsUnitTag">MB</span>
            </div>

            <div className="resLimitsChips">
              {RAM_PRESETS.map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  className={`resLimitsChip ${Number(ramLimitMb) === preset.val ? "active" : ""}`}
                  onClick={() => {
                    setRamLimitMb(preset.val);
                    if (error) setError("");
                  }}
                  disabled={loading}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Active Projects Cap Field */}
          <div className="resLimitsField">
            <div className="resLimitsFieldHeader">
              <div className="resLimitsFieldLabel">
                <Cpu size={16} />
                <span>Max Active Running Deployments</span>
              </div>
              <span className="resLimitsCurrentVal">{maxActiveProjects} Running</span>
            </div>
            <p className="resLimitsFieldHelp">
              Maximum concurrent live running containers permitted. Starting another project will be blocked until an existing one is stopped.
            </p>

            <div className="resLimitsInputRow">
              <input
                type="number"
                min="1"
                max="50"
                value={maxActiveProjects}
                onChange={(e) => {
                  setMaxActiveProjects(e.target.value);
                  if (error) setError("");
                }}
                disabled={loading}
                required
              />
              <span className="resLimitsUnitTag">Active</span>
            </div>

            <div className="resLimitsChips">
              {ACTIVE_PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`resLimitsChip ${Number(maxActiveProjects) === val ? "active" : ""}`}
                  onClick={() => {
                    setMaxActiveProjects(val);
                    if (error) setError("");
                  }}
                  disabled={loading}
                >
                  {val} {val === 2 ? "(Default)" : "Active"}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Total Projects Cap Field */}
          <div className="resLimitsField">
            <div className="resLimitsFieldHeader">
              <div className="resLimitsFieldLabel">
                <Layers size={16} />
                <span>Total Workspaces / Projects Cap</span>
              </div>
              <span className="resLimitsCurrentVal">{maxProjects} Workspaces</span>
            </div>
            <p className="resLimitsFieldHelp">
              Total number of project workspaces this developer can create on their dashboard.
            </p>

            <div className="resLimitsInputRow">
              <input
                type="number"
                min="1"
                max="100"
                value={maxProjects}
                onChange={(e) => {
                  setMaxProjects(e.target.value);
                  if (error) setError("");
                }}
                disabled={loading}
                required
              />
              <span className="resLimitsUnitTag">Projects</span>
            </div>

            <div className="resLimitsChips">
              {MAX_PROJECT_PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`resLimitsChip ${Number(maxProjects) === val ? "active" : ""}`}
                  onClick={() => {
                    setMaxProjects(val);
                    if (error) setError("");
                  }}
                  disabled={loading}
                >
                  {val} {val === 5 ? "(Default)" : "Projects"}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="resLimitsFooter">
            <button
              type="button"
              className="resLimitsCancelBtn"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="resLimitsSaveBtn"
              disabled={loading}
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Allowances</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
