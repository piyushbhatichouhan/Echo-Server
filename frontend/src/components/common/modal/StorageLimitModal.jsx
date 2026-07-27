import { useEffect, useState } from "react";
import "./StorageLimitModal.css";

export default function StorageLimitModal({
  open,
  user,
  loading = false,
  onClose,
  onSave,
}) {
  const [unlimited, setUnlimited] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (user.storageLimit == null) {
      setUnlimited(true);

      setStorageUnit("GB");
      setStorageValue(1);
    } else {
      setUnlimited(false);

      if (user.storageLimit >= 1024 * 1024 * 1024) {
        setStorageUnit("GB");

        setStorageValue(Math.round(user.storageLimit / (1024 * 1024 * 1024)));
      } else {
        setStorageUnit("MB");

        setStorageValue(Math.round(user.storageLimit / (1024 * 1024)));
      }
    }
  }, [user]);
  const [storageValue, setStorageValue] = useState(1);
  const [storageUnit, setStorageUnit] = useState("GB");
  if (!open || !user) return null;

  return (
    <div className="modalOverlay">
      <div className="storageLimitModal">
        <h2>Edit Storage Limit</h2>

        <div className="storageLimitUser">
          <strong>{user.username}</strong>

          <span>{user.email}</span>
        </div>

        <div
          className={`storageLimitField ${
            unlimited ? "storageLimitField--disabled" : ""
          }`}
        >
          <label>Storage Limit</label>

          <div className="storageInputGroup">
            <input
              type="number"
              min={1}
              value={storageValue}
              onChange={(e) => setStorageValue(Number(e.target.value))}
              disabled={unlimited}
            />

            <select
              value={storageUnit}
              onChange={(e) => setStorageUnit(e.target.value)}
              disabled={unlimited}
            >
              <option value="MB">MB</option>
              <option value="GB">GB</option>
            </select>
          </div>
        </div>

        <div className="storagePolicy">
          <div
            className={`policyCard ${!unlimited ? "policyCard--active" : ""}`}
            onClick={() => setUnlimited(false)}
          >
            <div className="policyRadio" />

            <div>
              <h4>Limited Storage</h4>

              <p>Set a maximum storage quota for this user.</p>
            </div>
          </div>

          <div
            className={`policyCard ${unlimited ? "policyCard--active" : ""}`}
            onClick={() => setUnlimited(true)}
          >
            <div className="policyRadio" />

            <div>
              <h4>Unlimited Storage</h4>

              <p>No quota restrictions will be enforced.</p>
            </div>
          </div>
        </div>

        <div className="modalButtons">
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>

          <button
            className="saveButton"
            disabled={!unlimited && storageValue <= 0}
            onClick={() => {
              const bytes =
                storageUnit === "GB"
                  ? storageValue * 1024 * 1024 * 1024
                  : storageValue * 1024 * 1024;

              onSave(unlimited ? null : bytes);
            }}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
