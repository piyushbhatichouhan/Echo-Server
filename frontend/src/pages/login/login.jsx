import "./login.css";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import useAuth from "../../hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [remember, setRemember] = useState(false);

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    setLoading(true);

    try {
      await login(email, password);

      navigate("/dashboard");
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message || err.message || "Unable to login.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login__background">
        <div className="login__glow login__glow--1"></div>

        <div className="login__glow login__glow--2"></div>

        <div className="login__grid"></div>
      </div>

      <div className="login__container">
        <div className="login__brand">
          <h1>EchoHub</h1>
        </div>

        <div className="login__card">
          <div className="login__header">
            <h2>Welcome Back</h2>

            <span>Sign in to continue to your dashboard.</span>
          </div>

          <form className="login__form" onSubmit={handleSubmit}>
            <div className="login__field">
              <label>Email</label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login__field">
              <label>Password</label>

              <div className="login__passwordWrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="login__showPassword"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login__options">
              <button type="button" className="login__textButton">
                Forgot password?
              </button>
            </div>

            {error && <div className="login__error">{error}</div>}

            <button className="login__button" type="submit" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="login__footer">
            <span>Don't have an account?</span>

            <Link to="/register" className="login__textButton">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
