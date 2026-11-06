import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import "./StorageQuotaModal.css";
import { HardDrive, X, Check, Save } from "lucide-react";

const PRESETS = [
  { label: "500 MB", val: 500, unit: "MB" },
  { label: "1 GB", val: 1, unit: "GB" },
  { label: "5 GB", val: 5, unit: "GB" },
  { label: "10 GB", val: 10, unit: "GB" },
  { label: "50 GB", val: 50, unit: "GB" },
];

export default function StorageQuotaModal({
  open,
  user,
  loading = false,
  onClose,
  onSave,
}) {
  const [storageValue, setStorageValue] = useState(1);
  const [storageUnit, setStorageUnit] = useState("GB");

  const handleClose = useCallback(() => {
    if (loading) return;
    onClose?.();
  }, [loading, onClose]);

  useEffect(() => {
    if (!user) return;

    const quota = Number(user.quotaBytes || 0);

    if (quota >= 1024 * 1024 * 1024 * 1024) {
      setStorageUnit("TB");
      setStorageValue(Number((quota / (1024 * 1024 * 1024 * 1024)).toFixed(2)));
    } else if (quota >= 1024 * 1024 * 1024) {
      setStorageUnit("GB");
      setStorageValue(Number((quota / (1024 * 1024 * 1024)).toFixed(2)));
    } else {
      setStorageUnit("MB");
      setStorageValue(Number((quota / (1024 * 1024)).toFixed(2)));
    }
  }, [user]);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  if (!open || !user) return null;

  const avatar = user.username ? user.username.charAt(0).toUpperCase() : "?";

  const bytes =
    storageUnit === "TB"
      ? Math.round(storageValue * 1024 * 1024 * 1024 * 1024)
      : storageUnit === "GB"
        ? Math.round(storageValue * 1024 * 1024 * 1024)
        : Math.round(storageValue * 1024 * 1024);

  const isValid = storageValue > 0 && !Number.isNaN(storageValue);

  return createPortal(
    <div
      className="storageQuotaOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="storageQuotaModal">
        <div className="quotaHeader">
          <div className="quotaHeaderLeft">
            <div className="quotaIconBadge">
              <HardDrive size={20} />
            </div>
            <div>
              <h2>Storage Quota</h2>
              <p>Configure the maximum disk storage allocated to this user.</p>
            </div>
          </div>
          <button
            type="button"
            className="quotaCloseBtn"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="quotaUserCard">
          <div className="quotaAvatar">{avatar}</div>
          <div className="quotaUserInfo">
            <h3>{user.username}</h3>
            <span>{user.email || "No email linked"}</span>
          </div>
        </div>

        <div className="quotaField">
          <label htmlFor="quota-input">Maximum Allocated Quota</label>

          <div className="storageInputGroup">
            <input
              id="quota-input"
              type="number"
              min={0.1}
              step="0.1"
              disabled={loading}
              value={storageValue}
              onChange={(e) => setStorageValue(Number(e.target.value))}
              placeholder="e.g. 5"
              autoFocus
            />

            <div className="quotaUnitPills">
              {["MB", "GB", "TB"].map((unit) => (
                <button
                  type="button"
                  key={unit}
                  disabled={loading}
                  className={`quotaUnitPill ${storageUnit === unit ? "active" : ""}`}
                  onClick={() => setStorageUnit(unit)}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          <div className="quotaPresetsRow">
            <span className="presetsLabel">Quick presets:</span>
            <div className="presetButtonsList">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  disabled={loading}
                  className={`presetBtn ${
                    storageValue === p.val && storageUnit === p.unit ? "activePreset" : ""
                  }`}
                  onClick={() => {
                    setStorageValue(p.val);
                    setStorageUnit(p.unit);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="quotaHint">
            User will be restricted to a hard limit of{" "}
            <strong>
              {storageValue || 0} {storageUnit}
            </strong>{" "}
            ({bytes ? (bytes / (1024 * 1024)).toLocaleString() : 0} MB).
          </div>
        </div>

        <div className="quotaButtons">
          <button
            type="button"
            className="cancelButton"
            disabled={loading}
            onClick={handleClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="saveButton"
            disabled={loading || !isValid}
            onClick={() => onSave(bytes)}
          >
            {loading ? (
              <span className="quotaSpinnerWrap">
                <span className="quotaSpinner" />
                Saving...
              </span>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

