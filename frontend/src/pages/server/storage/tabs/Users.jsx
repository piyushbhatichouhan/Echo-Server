import { useMemo, useState } from "react";
import {
  Users as UsersIcon,
  Search,
  X,
  HardDrive,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
} from "lucide-react";
import StorageQuotaModal from "../../../../components/common/modal/StorageQuotaModal";
import { useToast } from "../../../../context/ToastContext";
import "./Users.css";

function formatBytes(bytes = 0) {
  if (bytes == null || isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export default function Users({ users = [], loading, refresh, updateQuota }) {
  const toast = useToast();
  const [selectedUser, setSelectedUser] = useState(null);
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [savingQuota, setSavingQuota] = useState(false);
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q),
    );
  }, [users, search]);

  // Aggregate stats across users
  const userStats = useMemo(() => {
    let totalUsed = 0;
    let totalQuota = 0;
    for (const u of users) {
      totalUsed += Number(u.usedBytes || 0);
      totalQuota += Number(u.quotaBytes || 0);
    }
    return {
      totalUsers: users.length,
      totalUsed,
      totalQuota,
    };
  }, [users]);

  const handleOpenQuotaModal = (user) => {
    setSelectedUser(user);
    setQuotaModalOpen(true);
  };

  const handleSaveQuota = async (newBytes) => {
    if (!selectedUser) return;
    setSavingQuota(true);
    try {
      await updateQuota(selectedUser.id, newBytes);
      toast.success(
        "Quota Updated",
        `Storage quota for ${selectedUser.username} updated to ${formatBytes(newBytes)}.`,
      );
      setQuotaModalOpen(false);
      setSelectedUser(null);
      await refresh();
    } catch (err) {
      toast.error("Update Failed", err.response?.data?.message || err.message);
    } finally {
      setSavingQuota(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="users-storage-skeleton">
        <div className="stats-row-skeleton" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="user-storage-card-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="users-storage-tab">
      {/* 3 Summary Stats Tiles */}
      <div className="users-storage-metrics-strip">
        <div className="storage-metric-tile">
          <span className="tile-label">Allocated Accounts</span>
          <span className="tile-value">{userStats.totalUsers} Users</span>
          <span className="tile-sub">Provisioned with disk quotas</span>
        </div>

        <div className="storage-metric-tile">
          <span className="tile-label">Total Assigned Quota</span>
          <span className="tile-value">{formatBytes(userStats.totalQuota)}</span>
          <span className="tile-sub">Maximum capacity limit</span>
        </div>

        <div className="storage-metric-tile">
          <span className="tile-label">Total User Disk Consumption</span>
          <span className="tile-value highlight">{formatBytes(userStats.totalUsed)}</span>
          <span className="tile-sub">Files, repositories, and cloud assets</span>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="users-storage-toolbar">
        <div className="storage-search-box">
          <Search size={15} className="storage-search-icon" />
          <input
            type="text"
            placeholder="Search user quotas by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="storage-search-input"
          />
          {search && (
            <button
              type="button"
              className="storage-search-clear"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <span className="storage-count-label">
          Showing {filteredUsers.length} of {users.length} users
        </span>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="storage-empty-state">
          <div className="empty-icon-box">
            <UsersIcon size={36} />
          </div>
          <h3>No Users Found</h3>
          <p>No user accounts matched the search query "{search}".</p>
        </div>
      ) : (
        <div className="user-storage-list">
          {filteredUsers.map((u) => {
            const used = Number(u.usedBytes || 0);
            const quota = Number(u.quotaBytes || 0);
            const available = Math.max(0, quota - used);
            const percentage = quota === 0 ? 0 : Math.min(100, (used / quota) * 100);

            const avatar = (u.username || "U").charAt(0).toUpperCase();

            let barColor = "bar--normal";
            if (percentage >= 90) barColor = "bar--danger";
            else if (percentage >= 75) barColor = "bar--warning";

            return (
              <div key={u.id} className="user-storage-row-card">
                {/* Left: User Identity */}
                <div className="storage-row-identity">
                  <div className="user-initial-badge">{avatar}</div>
                  <div className="identity-text">
                    <span className="user-name">{u.username}</span>
                    <span className="user-email">{u.email}</span>
                  </div>
                </div>

                {/* Center: Usage vs Quota & Progress Bar */}
                <div className="storage-row-metrics">
                  <div className="metric-header-row">
                    <div className="usage-stat-group">
                      <span className="stat-label">Used:</span>
                      <strong className="stat-used">{formatBytes(used)}</strong>
                      <span className="stat-divider">/</span>
                      <span className="stat-quota">{formatBytes(quota)}</span>
                    </div>

                    <div className="quota-free-badge">
                      <span>{formatBytes(available)} free</span>
                      <span className="quota-pct-badge">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="storage-quota-track">
                    <div
                      className={`storage-quota-fill ${barColor}`}
                      style={{ width: `${Math.max(2, percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Right: Action */}
                <div className="storage-row-actions">
                  <button
                    type="button"
                    className="quota-action-btn"
                    onClick={() => handleOpenQuotaModal(u)}
                    title="Change storage quota for this user"
                  >
                    <Sliders size={14} />
                    <span>Edit Quota</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Storage Quota Edit Modal */}
      {quotaModalOpen && selectedUser && (
        <StorageQuotaModal
          open={quotaModalOpen}
          user={selectedUser}
          loading={savingQuota}
          onClose={() => {
            setQuotaModalOpen(false);
            setSelectedUser(null);
          }}
          onSave={handleSaveQuota}
        />
      )}
    </div>
  );
}
