import "./ForgotPassword.css";

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

import { forgotPassword } from "../../../services/auth.api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) return;

    setLoading(true);
    setError("");

    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.message ??
          err.message ??
          "Unable to send reset email. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow glow1"></div>
        <div className="auth-glow glow2"></div>
        <div className="auth-grid"></div>
      </div>

      <div className="auth-card">
        {sent ? (
          <div className="auth-card-center">
            <div className="auth-status-icon success-icon">
              <CheckCircle2 size={40} />
            </div>

            <h2>Check Your Inbox</h2>

            <p className="auth-card-message">
              If an account exists for <strong>{email}</strong>, a password
              reset link has been sent. The link is valid for{" "}
              <strong>30 minutes</strong>.
            </p>

            <div className="auth-alert info" style={{ marginBottom: "20px" }}>
              <span>
                Didn't receive an email? Check your spam folder or request a new
                link.
              </span>
            </div>

            <div className="auth-actions">
              <button
                type="button"
                className="auth-btn-primary"
                onClick={() => {
                  setSent(false);
                  setError("");
                }}
              >
                Send Another Link
              </button>

              <div className="auth-links">
                <Link to="/login" className="auth-link">
                  <ArrowLeft size={16} /> Back to Login
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="auth-card-center" style={{ marginBottom: "16px" }}>
              <div className="auth-icon-badge">
                <Mail size={26} />
              </div>

              <h1>Forgot Password</h1>

              <p style={{ marginBottom: "8px" }}>
                Enter your email address and we'll send you a password reset link
                valid for 30 minutes.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="reset-email">Email Address</label>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              {error && (
                <div className="auth-alert error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>

              <div className="auth-links">
                <Link to="/login" className="auth-link">
                  <ArrowLeft size={16} /> Back to Login
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
