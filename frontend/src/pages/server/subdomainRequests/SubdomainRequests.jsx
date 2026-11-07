import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Globe,
  Crown,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Copy, 
  Check,
  AlertTriangle,
  X,
  Send,
  ExternalLink,
  ShieldAlert,
  User,
  FolderGit2,
} from "lucide-react";
import {
  getSubdomainRequests,
  approveSubdomainRequest,
  rejectSubdomainRequest,
  revokeCustomSubdomain,
  deleteSubdomainRequest,
  sendTestNotification,
} from "../../../services/admin.api";
import useAuth from "../../../hooks/useAuth";
import { useToast } from "../../../context/ToastContext";
import "./SubdomainRequests.css";

const STATUS_FILTERS = [
  { id: "all", label: "All Custom Subdomains" },
  { id: "approved", label: "Active & Claimed" },
  { id: "pending", label: "Pending Review" },
  { id: "rejected", label: "Revoked" },
];

export default function SubdomainRequests() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState({
    open: false,
    request: null,
    reason: "",
    submitting: false,
  });

  // Action busy state
  const [actingId, setActingId] = useState(null);
  const [testingEmail, setTestingEmail] = useState(false);

  const isSuperAdmin = Boolean(currentUser?.isOwner || currentUser?.is_owner);

  const fetchRequests = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      const data = await getSubdomainRequests();
      setRequests(data || []);
    } catch (err) {
      toast.error("Error", err.response?.data?.message || err.message || "Failed to load requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchRequests();
    }
  }, [isSuperAdmin, fetchRequests]);

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (request) => {
    try {
      setActingId(request.id);
      const res = await approveSubdomainRequest(request.id);
      toast.success(
        "Subdomain Approved",
        res.message || `Approved "${request.subdomain}" for project "${request.project_name}".`,
      );
      await fetchRequests(true);
    } catch (err) {
      toast.error("Approval Failed", err.response?.data?.message || err.message);
    } finally {
      setActingId(null);
    }
  };

  const openRejectModal = (request) => {
    setRejectModal({
      open: true,
      request,
      reason: "",
      submitting: false,
    });
  };

  const closeRejectModal = () => {
    if (rejectModal.submitting) return;
    setRejectModal({
      open: false,
      request: null,
      reason: "",
      submitting: false,
    });
  };

  const handleConfirmReject = async () => {
    const { request, reason } = rejectModal;
    if (!request) return;

    try {
      setRejectModal((prev) => ({ ...prev, submitting: true }));
      const isApproved = request.status === "approved" || request.is_live_custom;
      const res = await revokeCustomSubdomain(request.id, reason.trim());
      toast.success(
        isApproved ? "Custom Domain Revoked" : "Request Rejected",
        res.message ||
          (isApproved
            ? `Revoked custom subdomain "${request.subdomain}". Reverted project to standard domain.`
            : `Declined subdomain request for "${request.subdomain}".`),
      );
      closeRejectModal();
      await fetchRequests(true);
    } catch (err) {
      toast.error("Action Failed", err.response?.data?.message || err.message);
      setRejectModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleDelete = async (id, subdomain) => {
    if (!window.confirm(`Are you sure you want to remove the record for "${subdomain}"?`)) {
      return;
    }
    try {
      setActingId(id);
      await deleteSubdomainRequest(id);
      toast.success("Request Removed", `Record for "${subdomain}" removed.`);
      await fetchRequests(true);
    } catch (err) {
      toast.error("Delete Failed", err.response?.data?.message || err.message);
    } finally {
      setActingId(null);
    }
  };

  const handleTestEmail = async () => {
    try {
      setTestingEmail(true);
      const res = await sendTestNotification("subdomain");
      toast.success(
        "Test Alert Sent",
        res.message || "Test notification email dispatched to piyushbhatichouhan@gmail.com",
      );
    } catch (err) {
      toast.error("Test Failed", err.response?.data?.message || err.message);
    } finally {
      setTestingEmail(false);
    }
  };

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!rejectModal.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [rejectModal.open]);

  // Counts
  const counts = useMemo(() => {
    const c = { all: requests.length, pending: 0, approved: 0, rejected: 0 };
    requests.forEach((r) => {
      if (r.status in c) c[r.status]++;
    });
    return c;
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        r.subdomain?.toLowerCase().includes(q) ||
        r.hostname?.toLowerCase().includes(q) ||
        r.project_name?.toLowerCase().includes(q) ||
        r.developer_username?.toLowerCase().includes(q) ||
        r.developer_email?.toLowerCase().includes(q)
      );
    });
  }, [requests, statusFilter, search]);

  if (!isSuperAdmin) {
    return (
      <div className="subdomain-req-unauthorized">
        <div className="subdomain-req-unauthorized-card">
          <ShieldAlert size={48} className="unauthorized-icon" />
          <h2>Super Admin Access Required</h2>
          <p>Custom subdomain approvals are strictly restricted to the platform owner.</p>
          <button
            type="button"
            className="subdomain-req-btn subdomain-req-btn--primary"
            onClick={() => navigate("/server")}
          >
            Back to Server Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="subdomain-req-page">
      {/* Top Navigation Bar */}
      <div className="subdomain-req-header">
        <button
          type="button"
          className="subdomain-req-back-btn"
          onClick={() => navigate("/server")}
          aria-label="Back to Server Settings"
        >
          <ArrowLeft size={18} />
          <span>Server Hub</span>
        </button>

        <div className="subdomain-req-title-wrap">
          <div className="subdomain-req-badge">
            <Crown size={14} />
            <span>Custom Domain Management</span>
          </div>
          <h1>Custom Subdomain Allocations</h1>
          <p>
            Monitor, inspect, and manage custom subdomains assigned by developers across all projects.
          </p>
        </div>
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="subdomain-req-toolbar">
        <div className="subdomain-req-search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subdomain, project, developer, or email..."
            className="subdomain-req-search-input"
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="subdomain-req-actions-group">
          <button
            type="button"
            className="subdomain-req-test-btn"
            onClick={handleTestEmail}
            disabled={testingEmail}
            title="Send a sample notification email to piyushbhatichouhan@gmail.com"
          >
            <Send size={15} />
            <span>{testingEmail ? "Sending..." : "Test Email Alert"}</span>
          </button>

          <button
            type="button"
            className={`subdomain-req-refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={() => fetchRequests(true)}
            disabled={loading || refreshing}
            title="Refresh list"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="subdomain-req-filter-tabs">
        {STATUS_FILTERS.map((tab) => {
          const count = counts[tab.id] ?? 0;
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`subdomain-req-filter-tab ${isActive ? "active" : ""}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              <span>{tab.label}</span>
              <span className={`tab-count ${tab.id === "pending" && count > 0 ? "tab-count--highlight" : ""}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="subdomain-req-loading">
          <div className="subdomain-req-spinner" />
          <span>Loading subdomain requests...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="subdomain-req-empty">
          <Globe size={44} className="empty-icon" />
          <h3>
            {search
              ? "No matching requests found"
              : statusFilter === "pending"
              ? "No pending requests"
              : "No requests found"}
          </h3>
          <p>
            {search
              ? `No subdomain requests match your query "${search}".`
              : statusFilter === "pending"
              ? "All developer custom subdomain requests have been processed."
              : "When developers request custom subdomains for their projects, they will appear here for review."}
          </p>
        </div>
      ) : (
        <div className="subdomain-req-list">
          {filteredRequests.map((req) => {
            const isActing = actingId === req.id;
            const isApproved = req.status === "approved";
            const isPending = req.status === "pending";
            const isRejected = req.status === "rejected";

            return (
              <div
                key={req.id}
                className={`subdomain-req-card status--${req.status}`}
              >
                <div className="req-card-main">
                  {/* Icon Emblem */}
                  <div className={`req-emblem req-emblem--${req.status}`}>
                    {isApproved ? (
                      <Crown size={22} />
                    ) : isPending ? (
                      <Clock size={22} />
                    ) : (
                      <XCircle size={22} />
                    )}
                  </div>

                  {/* Body Details */}
                  <div className="req-body">
                    <div className="req-subdomain-row">
                      <div className="req-hostname-wrap">
                        <span className="req-hostname-prefix">https://</span>
                        <strong className="req-subdomain-title">{req.subdomain}</strong>
                        <span className="req-hostname-suffix">
                          .{req.hostname?.replace(new RegExp(`^${req.subdomain}\\.`, "i"), "") || "devpiyush.in"}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="req-copy-btn"
                        onClick={() => handleCopy(`https://${req.hostname}`, req.id)}
                        title="Copy full hostname"
                      >
                        {copiedId === req.id ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedId === req.id ? "Copied" : "Copy"}</span>
                      </button>

                      <a
                        href={`https://${req.hostname}`}
                        target="_blank"
                        rel="noreferrer"
                        className="req-visit-link"
                        title="Open live project in browser"
                      >
                        <ExternalLink size={13} />
                        <span>Visit Live</span>
                      </a>

                      <span className={`req-status-pill pill--${req.status}`}>
                        {isApproved ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>{req.is_live_custom ? "Live on Web" : "Active"}</span>
                          </>
                        ) : isPending ? (
                          <>
                            <Clock size={12} />
                            <span>Pending Review</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            <span>Revoked</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Metadata: Project & Developer */}
                    <div className="req-meta-row">
                      <div className="req-meta-item" title="Associated Project">
                        <FolderGit2 size={14} />
                        <span className="meta-label">Project:</span>
                        <strong className="meta-value">{req.project_name || "Unknown"}</strong>
                        {req.project_id && (
                          <span className="meta-id">({String(req.project_id).slice(0, 8)}...)</span>
                        )}
                      </div>

                      <div className="req-meta-item" title="Requesting Developer">
                        <User size={14} />
                        <span className="meta-label">Developer:</span>
                        <span className="meta-value">
                          {req.developer_username} ({req.developer_email})
                        </span>
                        {req.can_custom_subdomain && (
                          <span className="meta-privilege-tag">Privilege Active</span>
                        )}
                      </div>

                      <div className="req-meta-item" title="Submission Timestamp">
                        <Clock size={14} />
                        <span className="meta-label">Assigned:</span>
                        <span className="meta-value">
                          {new Date(req.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Rejection / Admin Notes */}
                    {isRejected && req.admin_notes && (
                      <div className="req-rejection-callout">
                        <AlertTriangle size={14} className="rejection-icon" />
                        <div>
                          <strong>Rejection Reason:</strong> {req.admin_notes}
                        </div>
                      </div>
                    )}

                    {isApproved && req.reviewed_at && (
                      <div className="req-approved-callout">
                        <CheckCircle2 size={14} className="approved-icon" />
                        <div>
                          Authorized and verified. Active routing enabled for project.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="req-card-actions">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        className="action-btn action-btn--approve"
                        onClick={() => handleApprove(req)}
                        disabled={isActing}
                      >
                        <Check size={15} />
                        <span>Approve Subdomain</span>
                      </button>

                      <button
                        type="button"
                        className="action-btn action-btn--reject"
                        onClick={() => openRejectModal(req)}
                        disabled={isActing}
                      >
                        <X size={15} />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {(isApproved || req.is_live_custom) && (
                    <button
                      type="button"
                      className="action-btn action-btn--danger"
                      onClick={() => openRejectModal(req)}
                      disabled={isActing}
                      title="Revoke this custom subdomain and revert project to standard domain"
                    >
                      <XCircle size={14} />
                      <span>Revoke Custom Domain</span>
                    </button>
                  )}

                  {isRejected && (
                    <>
                      <button
                        type="button"
                        className="action-btn action-btn--approve"
                        onClick={() => handleApprove(req)}
                        disabled={isActing}
                        title="Re-authorize this custom subdomain"
                      >
                        <Check size={14} />
                        <span>Re-Authorize</span>
                      </button>

                      <button
                        type="button"
                        className="action-btn action-btn--secondary"
                        onClick={() => handleDelete(req.id, req.subdomain)}
                        disabled={isActing}
                        title="Remove record"
                      >
                        <X size={14} />
                        <span>Remove</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject / Revoke Modal */}
      {rejectModal.open &&
        createPortal(
          <div
            className="subdomain-req-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeRejectModal();
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="subdomain-req-modal">
              <div className="modal-header">
                <div className="modal-icon-badge">
                  <XCircle size={22} />
                </div>
                <div>
                  <h2>
                    {rejectModal.request?.status === "approved" ||
                    rejectModal.request?.is_live_custom
                      ? "Revoke Custom Subdomain"
                      : "Reject Subdomain Request"}
                  </h2>
                  <p>
                    {rejectModal.request?.status === "approved" ||
                    rejectModal.request?.is_live_custom
                      ? "Immediately unroute this custom subdomain and revert the project to standard domain."
                      : "Decline the requested custom prefix for this project."}
                  </p>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={closeRejectModal}
                  disabled={rejectModal.submitting}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="modal-info-box">
                  <span className="info-label">Target Subdomain:</span>
                  <strong className="info-value">
                    https://{rejectModal.request?.hostname}
                  </strong>
                  <span className="info-sub">
                    Project: {rejectModal.request?.project_name} ({rejectModal.request?.developer_username})
                  </span>
                  {(rejectModal.request?.status === "approved" ||
                    rejectModal.request?.is_live_custom) && (
                    <div className="info-revert-notice">
                      Project will automatically route to its standard default domain.
                    </div>
                  )}
                </div>

                <div className="modal-field">
                  <label htmlFor="reject-reason-input">
                    Reason for Revocation <span className="optional-tag">(Optional)</span>:
                  </label>
                  <textarea
                    id="reject-reason-input"
                    rows={3}
                    value={rejectModal.reason}
                    onChange={(e) =>
                      setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    placeholder="e.g. Inappropriate content, trademark infringement, or administrative revocation."
                    className="modal-textarea"
                    disabled={rejectModal.submitting}
                    autoFocus
                  />
                  <span className="field-hint">
                    This note will be emailed to the developer and displayed in their project publication tab.
                  </span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn modal-btn--cancel"
                  onClick={closeRejectModal}
                  disabled={rejectModal.submitting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="modal-btn modal-btn--reject"
                  onClick={handleConfirmReject}
                  disabled={rejectModal.submitting}
                >
                  {rejectModal.submitting ? (
                    <span className="btn-spinner-wrap">
                      <span className="btn-spinner" />
                      Processing...
                    </span>
                  ) : (
                    <>
                      <XCircle size={15} />
                      <span>
                        {rejectModal.request?.status === "approved" ||
                        rejectModal.request?.is_live_custom
                          ? "Revoke Custom Subdomain"
                          : "Confirm Rejection"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

