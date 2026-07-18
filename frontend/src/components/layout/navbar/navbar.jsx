import "./Navbar.css";

import { useLocation } from "react-router-dom";

import useAuth from "../../../hooks/useAuth";

export default function Navbar() {
  const { user } = useAuth();

  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname === "/dashboard") return "Dashboard";

    if (location.pathname === "/projects") return "Projects";

    if (location.pathname.startsWith("/projects/")) return "Project";

    if (location.pathname === "/settings") return "Settings";

    return "EchoHub";
  };

  return (
    <header className="eh-navbar">
      <div>
        <h2>{getPageTitle()}</h2>

        <p>Welcome back, {user?.username}</p>
      </div>

      <div className="eh-navbar-right">
        <div className="eh-status">
          <span className="eh-status-dot"></span>
          All Systems Operational
        </div>
      </div>
    </header>
  );
}
