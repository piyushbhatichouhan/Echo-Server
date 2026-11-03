import "./sidebar.css";

import { useState, useEffect } from "react";
import {
  Home,
  FolderKanban,
  Settings,
  Server,
  HardDrive,
  Radio,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Crown,
  Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import NavigationItem from "../NavigationItem/navigationItem";
import ThemeSwitcher from "../../common/ThemeSwitcher/ThemeSwitcher";

export default function Sidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("eh_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("eh_sidebar_collapsed", next ? "true" : "false");
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Keyboard shortcut: Ctrl+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNavClick = () => {
    if (mobileOpen) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="eh-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`eh-sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        {/* Brand / Header */}
        <div className="eh-sidebar-header">
          <Link
            to="/dashboard"
            className="eh-sidebar-brand"
            onClick={handleNavClick}
            title="EchoHub Dashboard"
          >
            <div className="eh-brand-emblem">
              <Radio size={19} className="eh-brand-icon" />
              <span className="eh-brand-glow" />
            </div>

            {!collapsed && (
              <div className="eh-brand-info">
                <div className="eh-brand-title">
                  <span>Echo</span>
                  <span className="eh-brand-accent">Server</span>
                </div>
                <div className="eh-brand-subtitle">
                  <span className="eh-status-pulse">
                    <span className="pulse-dot" />
                    <span className="pulse-ring" />
                  </span>
                  <span>Cloud Platform</span>
                </div>
              </div>
            )}
          </Link>

          {/* Desktop Collapse / Mobile Close */}
          <div className="eh-header-actions">
            <button
              type="button"
              className="eh-icon-btn eh-collapse-toggle"
              onClick={toggleCollapse}
              title={
                collapsed
                  ? "Expand sidebar (Ctrl+B)"
                  : "Collapse sidebar (Ctrl+B)"
              }
              aria-label="Toggle Sidebar"
            >
              {collapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>

            {mobileOpen && (
              <button
                type="button"
                className="eh-icon-btn eh-mobile-close-btn"
                onClick={onCloseMobile}
                aria-label="Close Navigation"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Live Server Status Chip (Expanded only) */}
        {!collapsed && (
          <div className="eh-server-status-chip">
            <div className="eh-status-pill">
              <span className="eh-live-dot" />
              <span className="eh-status-label">Operational</span>
            </div>
            <span className="eh-status-engine">v2.4 • Core</span>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="eh-sidebar-nav">
          {/* Main Group */}
          <div className="eh-nav-group">
            {!collapsed && <div className="eh-nav-section-title">Core</div>}

            <NavigationItem
              to="/dashboard"
              icon={Home}
              collapsed={collapsed}
              onClick={handleNavClick}
            >
              Dashboard
            </NavigationItem>

            <NavigationItem
              to="/projects"
              icon={FolderKanban}
              collapsed={collapsed}
              onClick={handleNavClick}
            >
              Projects
            </NavigationItem>

            <NavigationItem
              to="/cloud-storage"
              icon={HardDrive}
              collapsed={collapsed}
              onClick={handleNavClick}
            >
              Cloud Storage
            </NavigationItem>
          </div>

          {/* Management Group (Only for Owner) */}
          {user?.isOwner && (
            <div className="eh-nav-group">
              {!collapsed && (
                <div className="eh-nav-section-title">Management</div>
              )}

              <NavigationItem
                to="/server"
                icon={Server}
                badge={collapsed ? undefined : "Owner"}
                badgeVariant="owner"
                collapsed={collapsed}
                onClick={handleNavClick}
              >
                Server Admin
              </NavigationItem>
            </div>
          )}

          {/* Preferences Group */}
          <div className="eh-nav-group">
            {!collapsed && (
              <div className="eh-nav-section-title">Preferences</div>
            )}

            <NavigationItem
              to="/settings"
              icon={Settings}
              collapsed={collapsed}
              onClick={handleNavClick}
            >
              Settings
            </NavigationItem>
          </div>
        </nav>

        {/* Footer / User Profile & Tools */}
        <div className="eh-sidebar-footer">
          {/* Theme Switcher (when expanded) */}
          {!collapsed && (
            <div className="eh-sidebar-theme-wrapper">
              <span className="eh-theme-caption">Theme</span>
              <ThemeSwitcher compact={true} />
            </div>
          )}

          {/* User Profile Card */}
          <div
            className={`eh-user-card ${collapsed ? "collapsed" : ""}`}
            title={`${user?.username || "User"} (${user?.email || ""})`}
          >
            <div className="eh-avatar-wrap">
              <div className="eh-avatar">
                {user?.username?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="eh-avatar-status" />
            </div>

            {!collapsed && (
              <div className="eh-user-details">
                <div className="eh-user-name-row">
                  <span className="eh-user-name">{user?.username || "User"}</span>
                  {user?.isOwner && (
                    <span className="eh-owner-badge" title="Platform Owner">
                      <Crown size={11} />
                      <span>Owner</span>
                    </span>
                  )}
                </div>
                <div className="eh-user-email">{user?.email || ""}</div>
              </div>
            )}

            <button
              type="button"
              className="eh-logout-action-btn"
              onClick={logout}
              title="Log out of Echo Server"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
