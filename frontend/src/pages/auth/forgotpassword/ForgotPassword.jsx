import "./ForgotPassword.css";

import { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../../../services/auth.api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  const [sent, setSent] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    setError("");

    try {
      await forgotPassword(email);

      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.message ??
          err.message ??
          "Unable to send reset email.",
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
        <h1>Forgot Password</h1>

        <p>
          Enter your email address and we'll send you a password reset link.
        </p>

        {sent ? (
          <div className="auth-success">
            <h3>✓ Check your inbox</h3>

            <p>
              If an account exists for this email, a password reset link has
              been sent.
            </p>

            <Link to="/" className="auth-link">
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && <div className="auth-error">{error}</div>}

            <button disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <Link to="/" className="auth-link">
              Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
