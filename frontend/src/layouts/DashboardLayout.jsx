import "./DashboardLayout.css";

import { Outlet } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar/Sidebar";
import Navbar from "../components/layout/Navbar/Navbar";

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
