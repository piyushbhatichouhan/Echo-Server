import "./NavigationItem.css";
import { NavLink } from "react-router-dom";

export default function NavigationItem({ to, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive ? "eh-nav-item active" : "eh-nav-item"
      }
    >
      <Icon size={20} />

      <span>{children}</span>
    </NavLink>
  );
}
