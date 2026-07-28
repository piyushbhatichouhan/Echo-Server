import { useEffect, useState } from "react";
import "./StorageQuotaModal.css";

export default function StorageQuotaModal({
  open,
  user,
  loading = false,
  onClose,
  onSave,
}) {
  const [storageValue, setStorageValue] = useState(1);
  const [storageUnit, setStorageUnit] = useState("GB");

  useEffect(() => {
    if (!user) return;

    const quota = Number(user.quotaBytes || 0);

    if (quota >= 1024 * 1024 * 1024) {
      setStorageUnit("GB");
      setStorageValue(Number((quota / (1024 * 1024 * 1024)).toFixed(2)));
    } else {
      setStorageUnit("MB");
      setStorageValue(Number((quota / (1024 * 1024)).toFixed(2)));
    }
  }, [user]);

  if (!open || !user) return null;

  const avatar = user.username ? user.username.charAt(0).toUpperCase() : "?";

  const bytes =
    storageUnit === "GB"
      ? Math.round(storageValue * 1024 * 1024 * 1024)
      : Math.round(storageValue * 1024 * 1024);

  return (
    <div className="modalOverlay">
      <div className="storageQuotaModal">
        <div className="quotaHeader">
          <h2>Storage Quota</h2>

          <p>Configure the maximum storage this user is allowed to use.</p>
        </div>

        <div className="quotaUserCard">
          <div className="quotaAvatar">{avatar}</div>

          <div className="quotaUserInfo">
            <h3>{user.username}</h3>

            <span>{user.email}</span>
          </div>
        </div>

        <div className="quotaField">
          <label>Quota</label>

          <div className="storageInputGroup">
            <input
              type="number"
              min={1}
              step="0.1"
              disabled={loading}
              value={storageValue}
              onChange={(e) => setStorageValue(Number(e.target.value))}
            />

            <select
              disabled={loading}
              value={storageUnit}
              onChange={(e) => setStorageUnit(e.target.value)}
            >
              <option value="MB">MB</option>
              <option value="GB">GB</option>
            </select>
          </div>

          <div className="quotaHint">
            This user will be allowed to store up to{" "}
            <strong>
              {storageValue} {storageUnit}
            </strong>
            .
          </div>
        </div>

        <div className="quotaButtons">
          <button className="cancelButton" disabled={loading} onClick={onClose}>
            Cancel
          </button>

          <button
            className="saveButton"
            disabled={
              loading || storageValue <= 0 || Number.isNaN(storageValue)
            }
            onClick={() => onSave(bytes)}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
