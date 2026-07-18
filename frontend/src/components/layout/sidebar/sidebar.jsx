import "./Sidebar.css";

import NavigationItem from "../NavigationItem/NavigationItem";
import { Home, FolderKanban, Settings } from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import Button from "../../common/button/button";

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="eh-sidebar">
      <div className="eh-sidebar-logo">
        <h2>EchoHub</h2>

        <p>Self Hosted Platform</p>
      </div>

      <nav className="eh-sidebar-nav">
        <NavigationItem to="/dashboard" icon={Home}>
          Dashboard
        </NavigationItem>

        <NavigationItem to="/projects" icon={FolderKanban}>
          Projects
        </NavigationItem>

        <NavigationItem to="/settings" icon={Settings}>
          Settings
        </NavigationItem>
      </nav>

      <div className="eh-sidebar-footer">
        <div className="eh-user-card">
          <div className="eh-avatar">
            {user?.username?.charAt(0).toUpperCase()}
          </div>

          <div>
            <div className="eh-user-name">{user?.username}</div>

            <div className="eh-user-email">{user?.email}</div>
          </div>
        </div>

        <Button variant="secondary" onClick={logout}>
          Logout
        </Button>
      </div>
    </aside>
  );
}
