import "./Users.css";
import { useMemo, useState } from "react";
import StorageQuotaModal from "../../../../components/common/modal/StorageQuotaModal";

export default function Users({ users, loading, refresh, updateQuota }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [savingQuota, setSavingQuota] = useState(false);
  const [search, setSearch] = useState("");

  const formatBytes = (bytes = 0) => {
    const units = ["B", "KB", "MB", "GB", "TB"];

    let value = Number(bytes);
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }

    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
  };

  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [users, search]);

  if (loading) {
    return <div className="storageLoading">Loading users...</div>;
  }

  return (
    <div className="usersStorage">
      <div className="usersStorageHeader">
        <div>
          <h2>User Storage</h2>
          <p>Manage user storage quotas.</p>
        </div>

        <input
          className="usersSearch"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="usersTable">
        <div className="usersTableHead">
          <span>User</span>
          <span>Used</span>
          <span>Quota</span>
          <span>Usage</span>
          <span></span>
        </div>

        {filteredUsers.map((user) => {
          const used = Number(user.usedBytes);
          const quota = Number(user.quotaBytes);

          const available = Math.max(0, quota - used);

          const percentage =
            quota === 0 ? 0 : Math.min(100, (used / quota) * 100);

          let barClass = "quotaFill";

          if (percentage >= 90) barClass += " danger";
          else if (percentage >= 70) barClass += " warning";
          else barClass += " success";

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

              <div className="usersMetric">
                <strong>{formatBytes(used)}</strong>
              </div>

              <div className="usersMetric quotaInfo">
                <strong>{formatBytes(quota)}</strong>

                <small>{formatBytes(available)} free</small>
              </div>

              <div className="usageCell">
                <div className="quotaBar">
                  <div
                    className={barClass}
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

                <span>{percentage.toFixed(0)}%</span>
              </div>

              <button
                className="quotaButton"
                onClick={() => {
                  setSelectedUser(user);
                  setQuotaModalOpen(true);
                }}
              >
                Edit
              </button>
            </div>
          );
        })}
      </div>

      <StorageQuotaModal
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
