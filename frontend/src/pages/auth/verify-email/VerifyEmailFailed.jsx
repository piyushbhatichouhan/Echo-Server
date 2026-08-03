import { Link } from "react-router-dom";

export default function VerifyEmailFailed() {
  return (
    <div className="auth-page">
      <h1>❌ Verification Failed</h1>

      <p>This verification link is invalid or has expired.</p>

      <Link to="/login">Back to Login</Link>
    </div>
  );
}
