import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Search,
  X,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";
import useServer from "../../../hooks/useServer";
import useAuth from "../../../hooks/useAuth";
import { useToast } from "../../../context/ToastContext";
import PendingUserCard from "../../../components/server/PendingUserCard/PendingUserCard";
import "./pendingUsers.css";

export default function PendingUsers() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { pendingUsers = [], loading, approve, reject } = useServer();

  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Guard: Super Admin only
  if (!user?.isOwner) {
    return (
      <div className="pending-unauthorized">
        <div className="pending-unauthorized-card">
          <ShieldAlert size={48} className="unauthorized-icon" />
          <h2>Super Admin Access Required</h2>
          <p>User registration approval is restricted to the platform owner.</p>
          <button
            type="button"
            className="pending-btn pending-btn--primary"
            onClick={() => navigate("/dashboard")}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleApprove = async (id) => {
    try {
      await approve(id);
      toast.success("User Approved", "The account has been approved and activated.");
    } catch (err) {
      toast.error("Approval Failed", err.response?.data?.message || err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await reject(id);
      toast.success("User Rejected", "The registration request was rejected.");
    } catch (err) {
      toast.error("Rejection Failed", err.response?.data?.message || err.message);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingUsers;
    return pendingUsers.filter(
      (u) =>
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q),
    );
  }, [pendingUsers, search]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Reload will be triggered via useServer or window
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="pending-users-page">
      {/* Header Banner */}
      <div className="pending-header">
        <div className="pending-header-left">
          <button
            type="button"
            className="pending-back-btn"
            onClick={() => navigate("/server")}
          >
            <ArrowLeft size={16} />
            <span>Server Management</span>
          </button>

          <div className="pending-title-group">
            <div className="pending-title-row">
              <h1 className="pending-title">Pending Registrations</h1>
              <span className="super-admin-pill">
                <ShieldCheck size={12} />
                <span>Super Admin</span>
              </span>
            </div>
            <p className="pending-subtitle">
              Review and approve newly registered developer accounts requesting access to EchoServer.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="pending-header-actions">
          <div
            className={`pending-count-pill ${
              pendingUsers.length > 0 ? "pill--has-pending" : "pill--all-clear"
            }`}
          >
            <span className="pill-dot" />
            <span>
              {pendingUsers.length > 0
                ? `${pendingUsers.length} Pending Approval`
                : "All Registrations Reviewed"}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar Strip */}
      <div className="pending-toolbar">
        <div className="pending-search-box">
          <Search size={15} className="pending-search-icon" />
          <input
            type="text"
            placeholder="Search pending requests by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pending-search-input"
          />
          {search && (
            <button
              type="button"
              className="pending-search-clear"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <span className="pending-result-count">
          Showing {filteredUsers.length} of {pendingUsers.length} requests
        </span>
      </div>

      {/* Main Content List / Skeleton / Empty */}
      {loading ? (
        <div className="pending-skeleton-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pending-card-skeleton" />
          ))}
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="pending-empty-state">
          <div className="pending-empty-icon-wrap">
            <CheckCircle2 size={40} className="empty-success-icon" />
          </div>
          <h3>All Caught Up!</h3>
          <p>
            There are currently no pending registration requests awaiting administrative review.
          </p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="pending-empty-state">
          <div className="pending-empty-icon-wrap">
            <Users size={36} />
          </div>
          <h3>No Matching Requests</h3>
          <p>No pending users match the search filter "{search}".</p>
        </div>
      ) : (
        <div className="pending-list">
          {filteredUsers.map((pendingUser) => (
            <PendingUserCard
              key={pendingUser.id}
              user={pendingUser}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
