import "./DashboardLayout.css";

import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Radio } from "lucide-react";

import Sidebar from "../components/layout/sidebar/sidebar";

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="eh-layout">
      {/* Mobile Top Header Bar */}
      <header className="eh-mobile-topbar">
        <button
          type="button"
          className="eh-mobile-menu-trigger"
          onClick={() => setMobileOpen(true)}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="eh-mobile-brand">
          <div className="eh-mobile-emblem">
            <Radio size={16} />
          </div>
          <span className="eh-mobile-title">Echo Server</span>
        </div>
      </header>

      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="eh-main">
        <main className="eh-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
