import { Link } from "react-router-dom";

export default function VerifyEmailSuccess() {
  return (
    <div className="auth-page">
      <h1>✅ Email Verified</h1>

      <p>Your account has been successfully verified.</p>

      <Link to="/login">Go to Login</Link>
    </div>
  );
}
