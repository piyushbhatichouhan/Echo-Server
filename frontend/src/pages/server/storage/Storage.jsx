import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Users as UsersIcon,
  RefreshCw,
} from "lucide-react";
import Overview from "./tabs/Overview";
import Users from "./tabs/Users";
import { useStorage } from "../../../hooks/useStorage";
import useAuth from "../../../hooks/useAuth";
import "./Storage.css";

export default function Storage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    overview,
    users,
    loading,
    refresh,
    updateQuota,
    restoreUser,
  } = useStorage();

  // Guard: Super Admin only
  if (!user?.isOwner) {
    return (
      <div className="storage-unauthorized">
        <div className="storage-unauthorized-card">
          <ShieldAlert size={48} className="unauthorized-icon" />
          <h2>Super Admin Access Required</h2>
          <p>Server storage management and user quotas are restricted to the platform owner.</p>
          <button
            type="button"
            className="storage-btn storage-btn--primary"
            onClick={() => navigate("/dashboard")}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="server-storage-page">
      {/* Header Banner */}
      <div className="storage-header">
        <div className="storage-header-left">
          <button
            type="button"
            className="storage-back-btn"
            onClick={() => navigate("/server")}
          >
            <ArrowLeft size={16} />
            <span>Server Management</span>
          </button>

          <div className="storage-title-group">
            <div className="storage-title-row">
              <h1 className="storage-title">Storage & Quota Allocation</h1>
              <span className="super-admin-pill">
                <ShieldCheck size={12} />
                <span>Super Admin</span>
              </span>
            </div>
            <p className="storage-subtitle">
              Monitor host filesystem capacity, workspace storage distribution, and manage user disk quotas.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="storage-header-actions">
          <button
            type="button"
            className={`storage-btn storage-btn--secondary ${isRefreshing ? "refreshing" : ""}`}
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Refresh storage metrics"
          >
            <RefreshCw size={15} />
            <span>{isRefreshing ? "Fetching..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="storage-nav-tabs">
        <button
          type="button"
          className={`storage-nav-tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <HardDrive size={16} />
          <span>Overview & Distribution</span>
        </button>

        <button
          type="button"
          className={`storage-nav-tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <UsersIcon size={16} />
          <span>User Storage Quotas</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="storage-content-area">
        {activeTab === "overview" && (
          <Overview overview={overview} loading={loading} />
        )}
        {activeTab === "users" && (
          <Users
            users={users}
            refresh={refresh}
            loading={loading}
            updateQuota={updateQuota}
            restoreUser={restoreUser}
          />
        )}
      </div>
    </div>
  );
}
