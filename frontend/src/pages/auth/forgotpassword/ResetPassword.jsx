import "./ForgotPassword.css";

import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";

import { resetPassword } from "../../../services/auth.api";

export default function ResetPassword() {
  const params = new URLSearchParams(useLocation().search);

  const token = params.get("token");

  const [password, setPassword] = useState("");

  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  const [error, setError] = useState("");

  const [checking, setChecking] = useState(true);

  const [valid, setValid] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        await validateResetToken(token);

        setValid(true);
      } catch {
        setValid(false);
      }

      setChecking(false);
    };

    check();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");

      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);

      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message ??
          err.message ??
          "Unable to reset password.",
      );
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow glow1"></div>

        <div className="auth-glow glow2"></div>

        <div className="auth-grid"></div>
      </div>

      <div className="auth-card">
        <h1>Reset Password</h1>

        {success ? (
          <div className="auth-success">
            <h3>✓ Password Updated</h3>

            <p>You can now log in with your new password.</p>

            <Link to="/" className="auth-link">
              Continue to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />

            {error && <div className="auth-error">{error}</div>}

            <button disabled={loading}>
              {loading ? "Saving..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
