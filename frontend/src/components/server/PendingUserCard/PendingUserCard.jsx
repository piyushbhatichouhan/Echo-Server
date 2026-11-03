import { useState } from "react";
import { UserCheck, UserX, Mail, Clock, ShieldAlert } from "lucide-react";
import timeAgo from "../../../utils/timeAgo";
import "./PendingUserCard.css";

export default function PendingUserCard({ user, onApprove, onReject }) {
  const [acting, setActing] = useState(null); // 'approve' | 'reject'

  const handleApprove = async () => {
    if (acting) return;
    setActing("approve");
    try {
      await onApprove(user.id);
    } finally {
      setActing(null);
    }
  };

  const handleReject = async () => {
    if (acting) return;
    setActing("reject");
    try {
      await onReject(user.id);
    } finally {
      setActing(null);
    }
  };

  const avatar = (user.username || "U").charAt(0).toUpperCase();

  return (
    <div className="pending-user-card">
      <div className="pending-user-main">
        <div className="pending-avatar">{avatar}</div>

        <div className="pending-info">
          <div className="pending-top-row">
            <h3 className="pending-username">{user.username}</h3>
            <span className="pending-status-pill">
              <span className="pending-status-dot" />
              Pending Approval
            </span>
          </div>

          <div className="pending-meta-row">
            <span className="pending-meta-item">
              <Mail size={13} />
              <span>{user.email}</span>
            </span>

            {user.created_at && (
              <span className="pending-meta-item">
                <Clock size={13} />
                <span>Requested {timeAgo(user.created_at)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pending-actions">
        <button
          type="button"
          className="pending-btn pending-btn--approve"
          onClick={handleApprove}
          disabled={acting !== null}
        >
          <UserCheck size={15} />
          <span>{acting === "approve" ? "Approving..." : "Approve User"}</span>
        </button>

        <button
          type="button"
          className="pending-btn pending-btn--reject"
          onClick={handleReject}
          disabled={acting !== null}
        >
          <UserX size={15} />
          <span>{acting === "reject" ? "Rejecting..." : "Reject"}</span>
        </button>
      </div>
    </div>
  );
}
