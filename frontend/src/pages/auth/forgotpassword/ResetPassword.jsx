import "./ForgotPassword.css";

import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Clock,
} from "lucide-react";

import {
  validateResetToken,
  resetPassword,
} from "../../../services/auth.api";

export default function ResetPassword() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const rawToken = searchParams.get("token");
  const token = rawToken ? rawToken.trim() : "";

  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [validationError, setValidationError] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyToken = async () => {
      if (!token) {
        if (isMounted) {
          setValid(false);
          setValidationError(
            "No reset token was found in this link. Please check your email or request a new reset link.",
          );
          setChecking(false);
        }
        return;
      }

      try {
        await validateResetToken(token);
        if (isMounted) {
          setValid(true);
          setChecking(false);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err.response?.data?.message ||
            err.message ||
            "This password reset link is invalid or has expired.";
          setValid(false);
          setValidationError(message);
          setChecking(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirm) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Unable to reset your password. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-glow glow1"></div>
        <div className="auth-glow glow2"></div>
        <div className="auth-grid"></div>
      </div>

      {checking ? (
        <div className="auth-card auth-card-center">
          <div className="auth-status-icon spin-icon">
            <Loader2 size={36} className="spin" />
          </div>
          <h2>Verifying Link</h2>
          <p className="auth-card-message">
            Checking your reset token validity and expiration window...
          </p>
        </div>
      ) : !valid ? (
        <div className="auth-card auth-card-center">
          <div className="auth-status-icon error-icon">
            <AlertCircle size={36} />
          </div>
          <h2>Invalid or Expired Link</h2>
          <p className="auth-card-message">{validationError}</p>
          <div className="auth-actions">
            <Link to="/forgot-password" className="auth-btn-primary">
              Request a New Reset Link
            </Link>
            <div className="auth-links">
              <Link to="/login" className="auth-link">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      ) : success ? (
        <div className="auth-card auth-card-center">
          <div className="auth-status-icon success-icon">
            <CheckCircle2 size={40} />
          </div>
          <h2>Password Updated!</h2>
          <p className="auth-card-message">
            Your password has been reset successfully. You can now log in using
            your new credentials.
          </p>
          <div className="auth-actions">
            <Link to="/login" className="auth-btn-primary">
              Continue to Login
            </Link>
          </div>
        </div>
      ) : (
        <div className="auth-card">
          <div className="auth-card-center" style={{ marginBottom: "16px" }}>
            <div className="auth-icon-badge">
              <KeyRound size={26} />
            </div>
            <h1>Set New Password</h1>
            <p style={{ marginBottom: "8px" }}>
              Please choose a new, secure password of at least 8 characters.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="new-password">New Password</label>
              <div className="auth-input-wrapper">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <div className="auth-input-wrapper">
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {submitError && (
              <div className="auth-alert error">
                <AlertCircle size={18} />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                "Update Password"
              )}
            </button>

            <div className="auth-links">
              <Link to="/login" className="auth-link">
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
