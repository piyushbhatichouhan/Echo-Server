import "./register.css";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useToast } from "../../context/ToastContext";
import { register } from "../../services/auth.api";
import { Eye, EyeOff } from "lucide-react";
export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(
        "Passwords don't match",
        "Please make sure both passwords are identical.",
      );
      return;
    }

    try {
      setLoading(true);

      await register({
        username,
        email,
        password,
      });

      toast.success(
        "Account Created",
        "Your account has been created successfully.",
      );

      navigate("/login");
    } catch (err) {
      toast.error(
        "Registration Failed",
        err.response?.data?.message ||
          err.message ||
          "Unable to create account.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login__background">
        <div className="login__glow login__glow--1" />
        <div className="login__glow login__glow--2" />
        <div className="login__grid" />
      </div>

      <div className="login__container">
        <div className="login__brand">
          <h1>EchoHub</h1>
        </div>

        <div className="login__card">
          <div className="login__header">
            <h2>Create Account</h2>
            <span>Create your EchoHub account to get started.</span>
          </div>

          <form
            className="login__form"
            onSubmit={handleSubmit}
            autoComplete="off"
          >
            <div className="login__field">
              <label>Username</label>

              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="login__field">
              <label>Email</label>

              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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
                  autoComplete="new-password"
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

            <div className="login__field">
              <label>Confirm Password</label>

              <div className="login__passwordWrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button className="login__button" type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="login__footer">
            <span>Already have an account?</span>

            <Link to="/login" className="login__textButton">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
