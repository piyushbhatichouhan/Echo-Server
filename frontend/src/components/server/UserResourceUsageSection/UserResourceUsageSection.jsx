import { useState, useEffect, useMemo, useCallback } from "react";
import {
  HardDrive,
  Layers,
  Activity,
  RefreshCw,
  Search,
  Sliders,
  Server,
  Box,
  Users as UsersIcon,
  ShieldCheck,
} from "lucide-react";
import { getUsersResourceUsage, updateUserLimits } from "../../../services/admin.api";
import { useToast } from "../../../context/ToastContext";
import UserResourceLimitsModal from "../UserResourceLimitsModal/UserResourceLimitsModal";
import "./UserResourceUsageSection.css";

function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let s = Number(bytes);
  let i = 0;
  while (s >= 1024 && i < units.length - 1) {
    s /= 1024;
    i++;
  }
  return `${s.toFixed(1)} ${units[i]}`;
}

export default function UserResourceUsageSection() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'active' | 'idle'

  // Limits Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [limitsModalOpen, setLimitsModalOpen] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getUsersResourceUsage();
      setData(res);
    } catch (err) {
      console.warn("Failed to fetch user resource usage:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await getUsersResourceUsage();
        if (active) setData(res);
      } catch (err) {
        console.warn("Failed to fetch user resource usage:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleOpenLimits = (u) => {
    setSelectedUser({
      id: u.userId,
      username: u.username,
      email: u.email,
      ram_limit_mb: u.limits?.ramLimitMb,
      max_active_projects: u.limits?.maxActiveProjects,
      max_projects: u.limits?.maxProjects,
    });
    setLimitsModalOpen(true);
  };

  const handleSaveLimits = async (limits) => {
    if (!selectedUser) return;
    setSavingLimits(true);
    try {
      await updateUserLimits(selectedUser.id, limits);
      toast.success(
        "Resource Caps Updated",
        `Updated allowances for ${selectedUser.username} successfully.`,
      );
      setLimitsModalOpen(false);
      setSelectedUser(null);
      await fetchData();
    } catch (err) {
      toast.error("Update Failed", err.response?.data?.message || err.message);
      throw err;
    } finally {
      setSavingLimits(false);
    }
  };

  const usersList = useMemo(() => data?.users || [], [data?.users]);
  const system = useMemo(() => data?.system || {}, [data?.system]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return usersList.filter((u) => {
      if (filter === "active" && (u.usage?.activeProjects || 0) === 0) return false;
      if (filter === "idle" && (u.usage?.activeProjects || 0) > 0) return false;

      if (!q) return true;
      return (
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    });
  }, [usersList, search, filter]);

  const activeUsersCount = useMemo(() => {
    return usersList.filter((u) => (u.usage?.activeProjects || 0) > 0).length;
  }, [usersList]);

  return (
    <section className="user-res-section" id="tenant-resource-usage">
      {/* Section Header */}
      <div className="user-res-header">
        <div className="user-res-header-left">
          <div className="user-res-badge">
            <Activity size={18} />
          </div>
          <div>
            <div className="user-res-title-row">
              <h2>Tenant Resource Usage</h2>
              <span className="user-res-live-pill">
                <span className="user-res-ping-dot" /> Live Telemetry
              </span>
            </div>
            <p>
              Monitor real-time RAM, container concurrency, and workspace allocations for every developer using the service.
            </p>
          </div>
        </div>

        <div className="user-res-header-actions">
          <button
            type="button"
            className={`user-res-refresh-btn ${isRefreshing ? "refreshing" : ""}`}
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh live user resource metrics"
          >
            <RefreshCw size={15} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Aggregate Host & Workload Telemetry Strip */}
      <div className="user-res-summary-grid">
        <div className="user-res-summary-card">
          <div className="summary-card-icon ram">
            <HardDrive size={20} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Developer RAM In Use</span>
            <h3 className="summary-card-value">
              {system.totalAllocatedRamMb ?? 0} MB
            </h3>
            <span className="summary-card-meta">
              of {system.hostTotalRamMb ?? 0} MB Total Host Physical RAM
            </span>
          </div>
        </div>

        <div className="user-res-summary-card">
          <div className="summary-card-icon live">
            <Box size={20} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Active Containers</span>
            <h3 className="summary-card-value">
              {system.totalRunningContainers ?? 0} Live
            </h3>
            <span className="summary-card-meta">
              Across {activeUsersCount} active developer{activeUsersCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="user-res-summary-card">
          <div className="summary-card-icon host">
            <Server size={20} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Host Free Headroom</span>
            <h3 className="summary-card-value">
              {system.hostFreeRamMb ?? 0} MB Free
            </h3>
            <span className="summary-card-meta">
              {system.hostRamUsagePercent ?? 0}% Host Memory Utilized
            </span>
          </div>
        </div>

        <div className="user-res-summary-card">
          <div className="summary-card-icon users">
            <UsersIcon size={20} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Total Accounts</span>
            <h3 className="summary-card-value">
              {system.totalUsers ?? 0} Users
            </h3>
            <span className="summary-card-meta">
              {activeUsersCount} currently running workloads
            </span>
          </div>
        </div>
      </div>

      {/* Controls: Search and Status Filters */}
      <div className="user-res-controls">
        <div className="user-res-search-wrap">
          <Search size={15} className="user-res-search-icon" />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="user-res-filter-tabs">
          <button
            type="button"
            className={`user-res-filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Accounts ({usersList.length})
          </button>
          <button
            type="button"
            className={`user-res-filter-btn ${filter === "active" ? "active" : ""}`}
            onClick={() => setFilter("active")}
          >
            Active Workloads ({activeUsersCount})
          </button>
          <button
            type="button"
            className={`user-res-filter-btn ${filter === "idle" ? "active" : ""}`}
            onClick={() => setFilter("idle")}
          >
            Idle ({usersList.length - activeUsersCount})
          </button>
        </div>
      </div>

      {/* Users Resource Table */}
      {loading ? (
        <div className="user-res-skeleton-wrap">
          {[1, 2, 3].map((i) => (
            <div key={i} className="user-res-row-skeleton" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="user-res-empty">
          <p>No developer accounts match the selected filter or query.</p>
        </div>
      ) : (
        <div className="user-res-table-wrap">
          <table className="user-res-table">
            <thead>
              <tr>
                <th>Developer</th>
                <th>Active Deployments</th>
                <th>RAM Consumed vs Cap</th>
                <th>CPU Capacity</th>
                <th>Workspaces</th>
                <th>Storage Quota</th>
                <th className="actions-col">Allowance Controls</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const avatar = (u.username || "U").charAt(0).toUpperCase();
                const activeCount = u.usage?.activeProjects || 0;
                const maxActive = u.limits?.maxActiveProjects;
                const usedRam = u.usage?.usedRamMb || 0;
                const ramLimit = u.limits?.ramLimitMb;
                const ramPct = u.usage?.ramPercentage || 0;
                const cpuPct = u.usage?.cpuPercent || 0;
                const totalProj = u.usage?.totalProjects || 0;
                const maxProj = u.limits?.maxProjects;
                const usedStorage = u.usage?.usedStorageBytes || 0;
                const quotaStorage = u.limits?.quotaBytes || 0;

                const storagePct =
                  quotaStorage > 0
                    ? Math.min(100, Math.round((usedStorage / quotaStorage) * 100))
                    : 0;

                return (
                  <tr key={u.userId} className="user-res-tr">
                    {/* 1. Developer Info */}
                    <td className="user-res-td user-info-cell">
                      <div className="user-res-avatar">{avatar}</div>
                      <div className="user-res-name-block">
                        <div className="user-res-username-row">
                          <span className="user-res-username">{u.username}</span>
                          {u.isOwner && (
                            <span className="user-res-owner-tag">
                              <ShieldCheck size={11} /> Owner
                            </span>
                          )}
                          {u.disabled && (
                            <span className="user-res-disabled-tag">Disabled</span>
                          )}
                        </div>
                        <span className="user-res-email">{u.email}</span>
                      </div>
                    </td>

                    {/* 2. Active Deployments */}
                    <td className="user-res-td">
                      <div className="user-res-metric-cell">
                        <div className="metric-cell-header">
                          <strong>
                            {activeCount} {maxActive ? `/ ${maxActive}` : "Active"}
                          </strong>
                          <span className={`metric-cell-pill ${activeCount > 0 ? "live" : "idle"}`}>
                            {activeCount > 0 ? `${activeCount} Live` : "Idle"}
                          </span>
                        </div>
                        <div className="user-res-mini-bar">
                          <div
                            className="mini-bar-fill"
                            style={{
                              width: maxActive
                                ? `${Math.min(100, Math.round((activeCount / maxActive) * 100))}%`
                                : `${activeCount > 0 ? 100 : 0}%`,
                              backgroundColor:
                                maxActive && activeCount >= maxActive
                                  ? "var(--danger, #ef4444)"
                                  : "var(--accent)",
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* 3. RAM Consumed vs Cap */}
                    <td className="user-res-td">
                      <div className="user-res-metric-cell">
                        <div className="metric-cell-header">
                          <strong>
                            {usedRam} MB {ramLimit ? `/ ${ramLimit} MB` : ""}
                          </strong>
                          <span className="metric-cell-percentage">
                            {ramLimit ? `${ramPct}%` : "Uncapped"}
                          </span>
                        </div>
                        <div className="user-res-mini-bar">
                          <div
                            className="mini-bar-fill"
                            style={{
                              width: `${ramPct}%`,
                              backgroundColor:
                                ramPct > 85 ? "var(--danger, #ef4444)" : "#c084fc",
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* 4. CPU Capacity */}
                    <td className="user-res-td">
                      <div className="user-res-metric-cell">
                        <div className="metric-cell-header">
                          <strong>{cpuPct}%</strong>
                          <span className="metric-cell-percentage">
                            {cpuPct > 0 ? "Active" : "Idle"}
                          </span>
                        </div>
                        <div className="user-res-mini-bar">
                          <div
                            className="mini-bar-fill"
                            style={{
                              width: `${Math.min(cpuPct, 100)}%`,
                              backgroundColor:
                                cpuPct > 85 ? "var(--danger, #ef4444)" : "var(--success, #10b981)",
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* 5. Workspaces */}
                    <td className="user-res-td">
                      <div className="metric-simple-val">
                        <Layers size={13} className="cell-sub-icon" />
                        <span>
                          {totalProj} {maxProj ? `of ${maxProj} Max` : "Projects"}
                        </span>
                      </div>
                    </td>

                    {/* 6. Storage */}
                    <td className="user-res-td">
                      <div className="user-res-metric-cell">
                        <div className="metric-cell-header">
                          <span>{formatBytes(usedStorage)}</span>
                          <span className="metric-cell-percentage">
                            {quotaStorage > 0 ? `${storagePct}%` : "Unlimited"}
                          </span>
                        </div>
                        {quotaStorage > 0 && (
                          <div className="user-res-mini-bar">
                            <div
                              className="mini-bar-fill"
                              style={{
                                width: `${storagePct}%`,
                                backgroundColor:
                                  storagePct > 85
                                    ? "var(--danger, #ef4444)"
                                    : "var(--accent)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 7. Edit Caps Action */}
                    <td className="user-res-td actions-col">
                      <button
                        type="button"
                        className="user-res-edit-btn"
                        onClick={() => handleOpenLimits(u)}
                        title={`Configure RAM and project caps for ${u.username}`}
                      >
                        <Sliders size={13} />
                        <span>Edit Caps</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Resource Limits Modal */}
      <UserResourceLimitsModal
        key={selectedUser?.id || "empty"}
        open={limitsModalOpen}
        user={selectedUser}
        loading={savingLimits}
        onClose={() => {
          setLimitsModalOpen(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveLimits}
      />
    </section>
  );
}
