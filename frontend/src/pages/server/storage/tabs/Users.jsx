import "./Users.css";
import { useState } from "react";
import StorageLimitModal from "../../../../components/common/modal/StorageLimitModal";

import { useStorage } from "../../../../hooks/useStorage";
export default function Users({ users, loading }) {
  const formatBytes = (bytes = 0) => {
    const units = ["B", "KB", "MB", "GB", "TB"];

    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }

    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
  };

  const { refresh, updateQuota } = useStorage();

  const [selectedUser, setSelectedUser] = useState(null);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [savingQuota, setSavingQuota] = useState(false);

  if (loading) {
    return <div className="storageLoading">Loading users...</div>;
  }

  return (
    <div className="usersStorage">
      <div className="usersStorageHeader">
        <div>
          <h2>User Storage</h2>

          <p>Configure storage quotas and monitor usage.</p>
        </div>

        <input placeholder="Search users..." className="usersSearch" />
      </div>

      <div className="usersTable">
        <div className="usersTableHead">
          <span>User</span>
          <span>Used</span>
          <span>Limit</span>
          <span>Usage</span>
          <span></span>
        </div>

        {users.map((user) => {
          const percentage =
            user.storageLimit == null
              ? null
              : Math.min(100, (user.used / user.storageLimit) * 100);

          return (
            <div className="usersRow" key={user.id}>
              <div className="usersIdentity">
                <div className="usersAvatar">
                  {user.username[0].toUpperCase()}
                </div>

                <div>
                  <strong>{user.username}</strong>

                  <small>{user.email}</small>
                </div>
              </div>

              <span>{formatBytes(user.used)}</span>

              <span>
                {user.storageLimit == null
                  ? "Unlimited"
                  : formatBytes(user.storageLimit)}
              </span>

              <div>
                {user.storageLimit == null ? (
                  <span className="unlimitedBadge">Unlimited</span>
                ) : (
                  <>
                    <div className="quotaBar">
                      <div
                        className="quotaFill"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>

                    <small>{percentage.toFixed(0)}%</small>
                  </>
                )}
              </div>

              <button
                className="quotaButton"
                onClick={() => {
                  setSelectedUser(user);
                  setQuotaModalOpen(true);
                }}
              >
                Edit Limit
              </button>
            </div>
          );
        })}
      </div>
      <StorageLimitModal
        open={quotaModalOpen}
        user={selectedUser}
        loading={savingQuota}
        onClose={() => {
          setQuotaModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={async (limit) => {
          setSavingQuota(true);

          try {
            await updateQuota(selectedUser.id, limit);

            await refresh();

            setQuotaModalOpen(false);
            setSelectedUser(null);
          } finally {
            setSavingQuota(false);
          }
        }}
      />
    </div>
  );
}
