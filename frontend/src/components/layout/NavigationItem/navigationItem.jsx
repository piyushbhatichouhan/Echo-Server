import "./navigationItem.css";
import { NavLink } from "react-router-dom";

export default function NavigationItem({
  to,
  icon: Icon,
  children,
  badge,
  badgeVariant = "accent",
  collapsed = false,
  onClick,
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={collapsed && typeof children === "string" ? children : undefined}
      className={({ isActive }) =>
        `eh-nav-item ${isActive ? "active" : ""} ${collapsed ? "collapsed" : ""}`
      }
    >
      <span className="eh-nav-icon-wrap">
        <Icon size={19} className="eh-nav-icon" />
      </span>

      {!collapsed && (
        <span
          className="eh-nav-label"
          title={typeof children === "string" ? children : undefined}
        >
          {children}
        </span>
      )}

      {!collapsed && badge && (
        <span className={`eh-nav-badge eh-nav-badge-${badgeVariant}`}>
          {badge}
        </span>
      )}

      {collapsed && (
        <span className="eh-nav-tooltip" role="tooltip">
          {children}
        </span>
      )}
    </NavLink>
  );
}