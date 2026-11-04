import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Search,
  X,
  RefreshCw,
  Users as UsersIcon,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Lock,
  Unlock,
  Key,
  Globe,
} from "lucide-react";
import { useUsers } from "../../../hooks/useUsers";
import useAuth from "../../../hooks/useAuth";
import { useToast } from "../../../context/ToastContext";
import ConfirmationModal from "../../../components/common/modal/ConfirmationModal";
import "./manageUsers.css";

const STATUS_FILTERS = [
  { id: "all", label: "All Users" },
  { id: "active", label: "Active" },
  { id: "disabled", label: "Disabled" },
  { id: "pending_deletion", label: "Pending Deletion" },
];

export default function ManageUsers() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const {
    users = [],
    loading,
    disableUser,
    enableUser,
    deleteUser,
    refresh,
    restoreUser,
    toggleCustomSubdomain,
  } = useUsers();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workingUser, setWorkingUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // In-app modal confirmation for enable/disable instead of window.confirm
  const [actionModal, setActionModal] = useState({
    open: false,
    type: null, // 'disable' | 'enable'
    targetUser: null,
  });

  // Guard: Super Admin only
  if (!currentUser?.isOwner) {
    return (
      <div className="users-unauthorized">
        <div className="users-unauthorized-card">
          <ShieldAlert size={48} className="unauthorized-icon" />
          <h2>Super Admin Access Required</h2>
          <p>User directory and account management is restricted to the platform owner.</p>
          <button
            type="button"
            className="users-btn users-btn--primary"
            onClick={() => navigate("/dashboard")}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Filter out owners from the list (can't delete/disable yourself)
  const visibleUsers = useMemo(() => {
    return users.filter((u) => !u.is_owner);
  }, [users]);

  // Counts for tabs
  const counts = useMemo(() => {
    let active = 0;
    let disabled = 0;
    let pendingDeletion = 0;

    for (const u of visibleUsers) {
      if (u.pending_deletion) {
        pendingDeletion++;
      } else if (u.disabled) {
        disabled++;
      } else {
        active++;
      }
    }

    return {
      all: visibleUsers.length,
      active,
      disabled,
      pending_deletion: pendingDeletion,
    };
  }, [visibleUsers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return visibleUsers.filter((u) => {
      // Status filter
      if (statusFilter === "active" && (u.disabled || u.pending_deletion)) return false;
      if (statusFilter === "disabled" && !u.disabled) return false;
      if (statusFilter === "pending_deletion" && !u.pending_deletion) return false;

      // Text query
      if (!q) return true;
      return (
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.id || "").toLowerCase().includes(q)
      );
    });
  }, [visibleUsers, statusFilter, search]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleToggleState = (u, actionType) => {
    setActionModal({
      open: true,
      type: actionType,
      targetUser: u,
    });
  };

  const confirmToggleState = async () => {
    const { type, targetUser } = actionModal;
    if (!targetUser) return;

    setWorkingUser(targetUser.id);
    setActionModal({ open: false, type: null, targetUser: null });

    try {
      if (type === "disable") {
        await disableUser(targetUser.id);
        toast.success("User Disabled", `Account for "${targetUser.username}" is now disabled.`);
      } else if (type === "enable") {
        await enableUser(targetUser.id);
        toast.success("User Enabled", `Account for "${targetUser.username}" is now active.`);
      } else if (type === "grant_subdomain") {
        await toggleCustomSubdomain(targetUser.id, true);
        toast.success("Privilege Granted", `"${targetUser.username}" can now choose custom subdomains on devpiyush.in.`);
      } else if (type === "revoke_subdomain") {
        await toggleCustomSubdomain(targetUser.id, false);
        toast.success("Privilege Revoked", `Custom subdomain privilege revoked from "${targetUser.username}".`);
      }
      await refresh();
    } catch (err) {
      toast.error("Operation Failed", err.response?.data?.message || err.message);
    } finally {
      setWorkingUser(null);
    }
  };

  const askDelete = (u) => {
    setSelectedUser(u);
    setDeleteOpen(true);
  };

  const handleDelete = async (id) => {
    setWorkingUser(id);
    try {
      await deleteUser(id);
      toast.success("User Deleted", "The account has been scheduled for removal.");
      await refresh();
    } catch (err) {
      toast.error("Delete Failed", err.response?.data?.message || err.message);
    } finally {
      setWorkingUser(null);
      setDeleteOpen(false);
      setSelectedUser(null);
    }
  };

  const handleRestore = async (id) => {
    setWorkingUser(id);
    try {
      await restoreUser(id);
      toast.success("Account Restored", "Scheduled account deletion cancelled.");
      await refresh();
    } catch (err) {
      toast.error("Restore Failed", err.response?.data?.message || err.message);
    } finally {
      setWorkingUser(null);
    }
  };

  return (
    <div className="manage-users-page">
      {/* Header Banner */}
      <div className="manage-header">
        <div className="manage-header-left">
          <button
            type="button"
            className="manage-back-btn"
            onClick={() => navigate("/server")}
          >
            <ArrowLeft size={16} />
            <span>Server Management</span>
          </button>

          <div className="manage-title-group">
            <div className="manage-title-row">
              <h1 className="manage-title">User Directory & Accounts</h1>
              <span className="super-admin-pill">
                <ShieldCheck size={12} />
                <span>Super Admin</span>
              </span>
            </div>
            <p className="manage-subtitle">
              Manage developer account authorizations, toggle access permissions, and audit registered users.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="manage-header-actions">
          <div className="users-stat-strip">
            <div className="stat-pill">
              <span className="stat-num">{counts.all}</span>
              <span className="stat-lbl">Total</span>
            </div>
            <div className="stat-pill stat-pill--active">
              <span className="stat-num">{counts.active}</span>
              <span className="stat-lbl">Active</span>
            </div>
            {counts.disabled > 0 && (
              <div className="stat-pill stat-pill--disabled">
                <span className="stat-num">{counts.disabled}</span>
                <span className="stat-lbl">Disabled</span>
              </div>
            )}
            {counts.pending_deletion > 0 && (
              <div className="stat-pill stat-pill--danger">
                <span className="stat-num">{counts.pending_deletion}</span>
                <span className="stat-lbl">Deleting</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className={`manage-btn manage-btn--secondary ${isRefreshing ? "refreshing" : ""}`}
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh user list"
          >
            <RefreshCw size={15} />
            <span>{isRefreshing ? "Fetching..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Toolbar & Filter Strip */}
      <div className="manage-toolbar">
        {/* Search Input */}
        <div className="manage-search-box">
          <Search size={15} className="manage-search-icon" />
          <input
            type="text"
            placeholder="Search by username, email, or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="manage-search-input"
          />
          {search && (
            <button
              type="button"
              className="manage-search-clear"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="manage-status-tabs">
          {STATUS_FILTERS.map((f) => {
            const count = counts[f.id] ?? 0;
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                className={`manage-filter-tab ${isActive ? "active" : ""}`}
                onClick={() => setStatusFilter(f.id)}
              >
                <span>{f.label}</span>
                <span className="filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Users List / Skeletons / Empty */}
      {loading ? (
        <div className="users-skeleton-list">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="users-card-skeleton" />
          ))}
        </div>
      ) : visibleUsers.length === 0 ? (
        <div className="users-empty-state">
          <div className="empty-icon-wrap">
            <UsersIcon size={40} />
          </div>
          <h3>No Registered Users</h3>
          <p>There are no developer accounts registered on this EchoHub instance yet.</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="users-empty-state">
          <div className="empty-icon-wrap">
            <Search size={36} />
          </div>
          <h3>No Matching Users</h3>
          <p>No user accounts match your filter criteria or search query "{search}".</p>
        </div>
      ) : (
        <div className="users-cards-list">
          {filteredUsers.map((u) => {
            const avatar = (u.username || "U").charAt(0).toUpperCase();
            const isWorking = workingUser === u.id;

            let statusLabel = "Active";
            let statusClass = "status--active";

            if (u.pending_deletion) {
              statusLabel = "Pending Deletion";
              statusClass = "status--deleting";
            } else if (u.disabled) {
              statusLabel = "Disabled";
              statusClass = "status--disabled";
            }

            return (
              <div key={u.id} className="user-management-card">
                <div className="user-card-left">
                  <div className="user-avatar-badge">{avatar}</div>

                  <div className="user-details-box">
                    <div className="user-title-row">
                      <h3 className="user-name">{u.username}</h3>
                      <span className={`user-status-pill ${statusClass}`}>
                        <span className="status-ping-dot" />
                        {statusLabel}
                      </span>
                      {u.can_custom_subdomain && (
                        <span className="user-subdomain-badge" title="Allowed to configure custom subdomains on devpiyush.in">
                          <Globe size={11} />
                          <span>Custom Subdomain</span>
                        </span>
                      )}
                    </div>

                    <div className="user-meta-strip">
                      <span className="user-meta-item">
                        <Mail size={13} />
                        <span>{u.email}</span>
                      </span>

                      {u.created_at && (
                        <span className="user-meta-item">
                          <Calendar size={13} />
                          <span>Joined {new Date(u.created_at).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="user-card-actions">
                  {/* If marked for deletion, show Restore */}
                  {u.pending_deletion ? (
                    <button
                      type="button"
                      className="user-action-btn btn--restore"
                      onClick={() => handleRestore(u.id)}
                      disabled={isWorking}
                    >
                      <RotateCcw size={14} />
                      <span>{isWorking ? "Restoring..." : "Restore Account"}</span>
                    </button>
                  ) : (
                    <>
                      {/* Enable or Disable Button */}
                      {u.disabled ? (
                        <button
                          type="button"
                          className="user-action-btn btn--enable"
                          onClick={() => handleToggleState(u, "enable")}
                          disabled={isWorking}
                        >
                          <Unlock size={14} />
                          <span>Enable</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="user-action-btn btn--disable"
                          onClick={() => handleToggleState(u, "disable")}
                          disabled={isWorking}
                        >
                          <Lock size={14} />
                          <span>Disable</span>
                        </button>
                      )}

                      {/* Custom Subdomain Permission Toggle Button */}
                      <button
                        type="button"
                        className={`user-action-btn ${
                          u.can_custom_subdomain
                            ? "btn--subdomain-revoke"
                            : "btn--subdomain-grant"
                        }`}
                        onClick={() =>
                          handleToggleState(
                            u,
                            u.can_custom_subdomain
                              ? "revoke_subdomain"
                              : "grant_subdomain",
                          )
                        }
                        disabled={isWorking}
                        title={
                          u.can_custom_subdomain
                            ? "Revoke custom subdomain privilege"
                            : "Grant exclusive custom subdomain privilege on devpiyush.in"
                        }
                      >
                        <Globe size={14} />
                        <span>
                          {u.can_custom_subdomain
                            ? "Revoke Subdomain"
                            : "Allow Subdomain"}
                        </span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        className="user-action-btn btn--delete"
                        onClick={() => askDelete(u)}
                        disabled={isWorking}
                        title="Delete user account"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Delete User */}
      <ConfirmationModal
        open={deleteOpen}
        user={selectedUser}
        loading={workingUser !== null}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedUser(null);
        }}
        onDelete={() => handleDelete(selectedUser?.id)}
      />

      {/* In-App Confirmation Dialog for Enable / Disable (Replaces window.confirm) */}
      {actionModal.open && actionModal.targetUser && (
        <div className="modal-backdrop-custom">
          <div className="action-confirm-card">
            <div className="action-confirm-header">
              {actionModal.type === "disable" ? (
                <Lock size={32} className="modal-icon-warn" />
              ) : actionModal.type === "enable" ? (
                <Unlock size={32} className="modal-icon-success" />
              ) : actionModal.type === "grant_subdomain" ? (
                <Globe size={32} className="modal-icon-success" />
              ) : (
                <Globe size={32} className="modal-icon-warn" />
              )}
              <h3>
                {actionModal.type === "disable"
                  ? `Disable "${actionModal.targetUser.username}"?`
                  : actionModal.type === "enable"
                  ? `Enable "${actionModal.targetUser.username}"?`
                  : actionModal.type === "grant_subdomain"
                  ? `Grant Custom Subdomain Access to "${actionModal.targetUser.username}"?`
                  : `Revoke Custom Subdomain Access from "${actionModal.targetUser.username}"?`}
              </h3>
            </div>

            <p className="action-confirm-desc">
              {actionModal.type === "disable"
                ? `Disabling this account will immediately revoke access and prevent the developer from logging in or deploying workloads.`
                : actionModal.type === "enable"
                ? `Enabling this account will restore access and allow the developer to log in and manage their workspaces.`
                : actionModal.type === "grant_subdomain"
                ? `Granting custom subdomain privilege will allow "${actionModal.targetUser.username}" to choose their own custom subdomain on devpiyush.in when publishing hosted projects.`
                : `Revoking this privilege will prevent "${actionModal.targetUser.username}" from choosing custom subdomains on devpiyush.in. Existing published projects will remain active until modified.`}
            </p>

            <div className="action-confirm-buttons">
              <button
                type="button"
                className="confirm-btn confirm-btn--cancel"
                onClick={() => setActionModal({ open: false, type: null, targetUser: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`confirm-btn ${
                  actionModal.type === "disable" || actionModal.type === "revoke_subdomain"
                    ? "confirm-btn--warning"
                    : "confirm-btn--primary"
                }`}
                onClick={confirmToggleState}
              >
                {actionModal.type === "disable"
                  ? "Yes, Disable Account"
                  : actionModal.type === "enable"
                  ? "Yes, Enable Account"
                  : actionModal.type === "grant_subdomain"
                  ? "Yes, Grant Privilege"
                  : "Yes, Revoke Privilege"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
