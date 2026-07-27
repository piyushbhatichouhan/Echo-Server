import "./PendingUserCard.css";

export default function PendingUserCard({ user, onApprove, onReject }) {
  return (
    <div className="pendingUserCard">
      <div className="pendingUserCard__info">
        <h3>{user.username}</h3>

        <p>{user.email}</p>
      </div>

      <div className="pendingUserCard__actions">
        <button className="approveButton" onClick={() => onApprove(user.id)}>
          Approve
        </button>

        <button className="rejectButton" onClick={() => onReject(user.id)}>
          Reject
        </button>
      </div>
    </div>
  );
}
