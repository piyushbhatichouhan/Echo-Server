import { useState } from "react";
import "./manageUsers.css";

import { useUsers } from "../../../hooks/useUsers";
import Button from "../../../components/common/button/button";
import { useToast } from "../../../context/ToastContext";

import ConfirmationModal from "../../../components/common/modal/ConfirmationModal";

export default function ManageUsers() {
  const {
    users,
    loading,
    disableUser,
    enableUser,
    deleteUser,
    refresh,
    restoreUser,
  } = useUsers();

  const [search, setSearch] = useState("");
  const toast = useToast();
  const visibleUsers = users.filter((user) => !user.is_owner);

  const filteredUsers = visibleUsers.filter((user) => {
    return (
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    );
  });

  const [workingUser, setWorkingUser] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [confirmAction, setConfirmAction] = useState(null);

  const [confirmTitle, setConfirmTitle] = useState("");

  const [confirmMessage, setConfirmMessage] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDisable = async (id) => {
    if (!window.confirm("Disable this user?")) return;

    setWorkingUser(id);

    try {
      await disableUser(id);

      toast.success("User disabled", "The account has been disabled.");

      await refresh();
    } catch (error) {
      toast.error("Error", error.response?.data?.message || error.message);
    } finally {
      setWorkingUser(null);
    }
  };

  const handleEnable = async (id) => {
    if (!window.confirm("Enable this user?")) return;
    setWorkingUser(id);
    try {
      await enableUser(id);

      toast.success("User enabled", "The account has been enabled.");

      await refresh();
    } catch (error) {
      toast.error("Error", error.response?.data?.message || error.message);
    } finally {
      setWorkingUser(null);
    }
  };

  const askDelete = (user) => {
    setSelectedUser(user);
    setDeleteOpen(true);

    setConfirmTitle("Delete User");

    setConfirmMessage(
      `Delete "${user.username}"?\n\nThis action cannot be undone.`,
    );

    setConfirmAction(() => () => handleDelete(user.id));
  };

  const handleDelete = async (id) => {
    setWorkingUser(id);
    try {
      await deleteUser(id);

      toast.success("User deleted", "The account has been removed.");

      await refresh();
    } catch (error) {
      toast.error("Error", error.response?.data?.message || error.message);
    } finally {
      setWorkingUser(null);
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreUser(id);

      toast.success("User restored", "Deletion has been cancelled.");

      await refresh();
    } catch (error) {
      toast.error("Error", error.response?.data?.message || error.message);
    }
  };

  return (
    <div className="manageUsers">
      <div className="usersHeader">
        <div>
          <h1>Manage Users</h1>

          <p>Manage registered EchoHub users.</p>
          <p>{visibleUsers.length} registered users</p>
        </div>

        <input
          className="usersSearch"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="usersLoading">Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="usersEmpty">
          <h3>No users found</h3>

          <p>Try another search.</p>
        </div>
      ) : (
        <div className="usersList">
          {filteredUsers.map((user) => (
            <div className="userCard" key={user.id}>
              <div className="userCard__left">
                <div className="userAvatar">
                  {user.username.charAt(0).toUpperCase()}
                </div>

                <div className="userInfo">
                  <div className="userTop">
                    <h2>{user.username}</h2>

                    <span
                      className={`userStatus ${
                        user.disabled
                          ? "userStatus--disabled"
                          : "userStatus--active"
                      }`}
                    >
                      {user.disabled ? "Disabled" : "Active"}
                    </span>
                  </div>

                  <p>{user.email}</p>

                  <span className="userJoined">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="userActions">
                {user.pending_deletion && (
                  <div className="userPendingDeletion">Pending deletion</div>
                )}
                {user.disabled ? (
                  <Button
                    variant="success"
                    onClick={() => handleEnable(user.id)}
                    loading={workingUser === user.id}
                    disabled={workingUser !== null}
                  >
                    Enable
                  </Button>
                ) : (
                  <Button
                    variant="warning"
                    onClick={() => handleDisable(user.id)}
                    loading={workingUser === user.id}
                    disabled={workingUser !== null}
                  >
                    Disable
                  </Button>
                )}

                {user.pending_deletion ? (
                  <Button
                    variant="primary"
                    onClick={() => handleRestore(user.id)}
                  >
                    Restore
                  </Button>
                ) : (
                  <Button variant="danger" onClick={() => askDelete(user)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmationModal
        open={deleteOpen}
        user={selectedUser}
        title={confirmTitle}
        message={confirmMessage}
        danger
        onCancel={() => {
          setDeleteOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={async () => {
          await confirmAction();

          setDeleteOpen(false);
          setSelectedUser(null);
        }}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedUser(null);
        }}
        onDelete={handleDelete}
        loading={loading}
      />
    </div>
  );
}
