import useServer from "../../../hooks/useServer";

import PendingUserCard from "../../../components/server/PendingUserCard/PendingUserCard";

import "./pendingUsers.css";

export default function PendingUsers() {
  const {
    pendingUsers,

    loading,

    approve,

    reject,
  } = useServer();

  if (loading) {
    return <h2>Loading...</h2>;
  }

  return (
    <div className="pendingUsersPage">
      <h1>Pending Users</h1>

      <p>Approve or reject newly registered users.</p>

      {pendingUsers.length === 0 && <h3>No pending registrations.</h3>}

      {pendingUsers.map((user) => (
        <PendingUserCard
          key={user.id}
          user={user}
          onApprove={approve}
          onReject={reject}
        />
      ))}
    </div>
  );
}
