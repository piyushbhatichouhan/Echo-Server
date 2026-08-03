import "./DashboardLayout.css";

import { Outlet } from "react-router-dom";

import Sidebar from "../components/layout/sidebar/sidebar";
import Navbar from "../components/layout/navbar/navbar";

export default function DashboardLayout() {
  return (
    <div className="eh-layout">
      <Sidebar />

      <div className="eh-main">
        <main className="eh-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
