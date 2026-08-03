import "./Settings.css";
import { useEffect, useState } from "react";
import { forgotPassword } from "../../services/auth.api";
import { getCurrentUser } from "../../services/auth.api";
import { getCloudStats } from "../../services/cloud.api";
import cloudWorkspace from "../../services/cloudWorkspace";
import { deleteAccount } from "../../services/auth.api";
import ConfirmationModal from "../../components/common/modal/ConfirmationModal";
import { User } from "lucide-react";

export default function Settings() {
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const [sendingReset, setSendingReset] = useState(false);

  const [resetSent, setResetSent] = useState(false);

  const [user, setUser] = useState(null);

  const [stats, setStats] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const sendResetEmail = async () => {
    setSendingReset(true);

    try {
      await forgotPassword(user.email);

      setResetSent(true);
    } finally {
      setSendingReset(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const data = await cloudWorkspace.getStats();
      setStats(data);
    };

    load();
  }, []);

  const formatBytes = (bytes) => {
    if (bytes == null) return "Unlimited";

    const units = ["B", "KB", "MB", "GB", "TB"];

    let i = 0;
    let value = bytes;

    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }

    return `${value.toFixed(1)} ${units[i]}`;
  };

  let quotaUsed;

  if (stats !== null) {
    quotaUsed = `${formatBytes(stats.used)} / ${formatBytes(stats.limit)}`;
  } else {
    quotaUsed = "Loading...";
  }

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [userData, statsData] = await Promise.all([getCurrentUser()]);

        setUser(userData.data ?? userData);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleDeleteAccount = async () => {
    setDeleting(true);

    try {
      await deleteAccount();

      toast.success(
        "Account scheduled for deletion",
        "Your account will be deleted after 24 hours.",
      );

      logout();
    } finally {
      setDeleting(false);
    }
  };
  if (loading || !user) {
    return <div className="settings-loading">Loading...</div>;
  }
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account and security.</p>
      </div>

      <div className="settings-section">
        <h2>Profile</h2>

        <div className="settings-card">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="settings-profile">
              <div className="settings-row">
                <span>Username</span>
                <strong>{user.username}</strong>
              </div>

              <div className="settings-row">
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>

              <div className="settings-row">
                <span>Joined</span>

                <strong>
                  {new Date(user.created_at).toLocaleDateString()}
                </strong>
              </div>

              <div className="settings-row">
                <span>Storage</span>

                <strong>{quotaUsed}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2>Security</h2>

        <div className="settings-card">
          <div className="settings-security">
            <div>
              <h3>Password</h3>

              <p>
                Send yourself a password reset email to change your password.
              </p>
            </div>

            <button
              className="settings-button"
              onClick={() => setResetModalOpen(true)}
            >
              Reset Password
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section danger">
        <h2>Danger Zone</h2>

        <div className="settings-card">
          <div className="settings-danger">
            <div>
              <h3>Delete Account</h3>

              <p>
                Your account will immediately lose access.
                <br />
                <br />
                All projects, deployments, cloud storage and logs will be
                permanently deleted after 24 hours.
                <br />
                <br />
                If you change your mind, contact an administrator during this
                24-hour period to restore your account.
              </p>
            </div>

            <button
              className="settings-danger-button"
              onClick={() => setDeleteOpen(true)}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
      {resetModalOpen && (
        <div className="settings-modal-overlay">
          <div className="settings-modal">
            {!resetSent ? (
              <>
                <h2>Reset Password</h2>

                <p>Send a password reset email to</p>

                <strong>{user.email}</strong>

                <div className="settings-modal-actions">
                  <button
                    className="settings-secondary"
                    onClick={() => setResetModalOpen(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="settings-button"
                    onClick={sendResetEmail}
                    disabled={sendingReset}
                  >
                    {sendingReset ? "Sending..." : "Send Email"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Email Sent</h2>

                <p>A password reset link has been sent to</p>

                <strong>{user.email}</strong>

                <button
                  className="settings-button"
                  onClick={() => {
                    setResetSent(false);
                    setResetModalOpen(false);
                  }}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        open={deleteOpen}
        accountMode
        user={{
          username: "DELETE",
          email: user.email,
        }}
        loading={deleting}
        onDelete={handleDeleteAccount}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
