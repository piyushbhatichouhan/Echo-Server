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

  return <header className="eh-navbar"></header>;
}
