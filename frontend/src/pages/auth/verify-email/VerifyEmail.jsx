import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { verifyEmail } from "../../../services/auth.api";
import "./VerifyEmail.css";

export default function VerifyEmail() {
  const [params] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");

    if (!token) {
      setLoading(false);
      setMessage("Invalid verification link.");
      return;
    }

    const run = async () => {
      try {
        const res = await verifyEmail(token);

        setSuccess(true);
        setMessage(res.message);
      } catch (err) {
        setMessage(
          err.response?.data?.message ?? err.message ?? "Verification failed.",
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <div className="verify-page">
      <div className="verify-card">
        <h1>Email Verification</h1>

        {loading ? (
          <p>Verifying your email...</p>
        ) : success ? (
          <>
            <p className="verify-success">{message}</p>

            <Link to="/login" className="verify-button">
              Continue to Login
            </Link>
          </>
        ) : (
          <>
            <p className="verify-error">{message}</p>

            <Link to="/login" className="verify-button">
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
