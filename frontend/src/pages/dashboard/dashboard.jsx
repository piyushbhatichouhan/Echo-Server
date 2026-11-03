import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  Cpu,
  Rocket,
  HardDrive,
  Plus,
  Cloud,
  RefreshCw,
  Server,
  Activity,
  CheckCircle2,
} from "lucide-react";
import useDashboard from "../../hooks/useDashboard";
import useAuth from "../../hooks/useAuth";
import cloudWorkspace from "../../services/cloudWorkspace";
import StatCard from "../../components/dashboard/StatCard/StatCard";
import RecentProjects from "../../components/dashboard/RecentProjects/RecentProjects";
import DeploymentActivity from "../../components/dashboard/DeploymentActivity/DeploymentActivity";
import CreateProjectModal from "../../components/projects/createprojectmodal/createprojectmodal";
import Button from "../../components/common/button/button";
import ThemeSwitcher from "../../components/common/ThemeSwitcher/ThemeSwitcher";
import "./dashboard.css";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatBytes(bytes) {
  if (bytes == null || isNaN(bytes)) return "Unlimited";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let s = Number(bytes);
  let i = 0;
  while (s >= 1024 && i < units.length - 1) {
    s /= 1024;
    i++;
  }
  return `${s.toFixed(1)} ${units[i]}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dashboard, loading, refresh } = useDashboard();
  const [stats, setStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadCloudStats = async () => {
    try {
      const data = await cloudWorkspace.getStats();
      setStats(data);
    } catch (e) {
      console.warn("Could not load cloud storage stats:", e);
    }
  };

  useEffect(() => {
    loadCloudStats();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refresh(), loadCloudStats()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Combine storage info from dashboard or cloudWorkspace
  const storageInfo = dashboard?.overview?.storage || stats;
  const usedBytes = storageInfo?.used ?? 0;
  const limitBytes = storageInfo?.limit ?? null;
  const freeBytes = storageInfo?.free ?? null;

  const storagePercentage =
    limitBytes && limitBytes > 0
      ? Math.min(100, Math.round((usedBytes / limitBytes) * 100))
      : 0;

  const quotaDisplay = limitBytes
    ? `${formatBytes(usedBytes)} / ${formatBytes(limitBytes)}`
    : `${formatBytes(usedBytes)} used`;

  const isPlatformOnline = !loading;

  if (loading && !dashboard) {
    return (
      <div className="eh-dashboard eh-dashboard--loading">
        <div className="dashboard-hero-skeleton">
          <div className="skeleton-bar title-bar" />
          <div className="skeleton-bar subtitle-bar" />
        </div>
        <div className="dashboard-stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card-skeleton" />
          ))}
        </div>
        <div className="dashboard-content-layout">
          <div className="dashboard-main-col">
            <div className="section-skeleton" />
            <div className="section-skeleton" />
          </div>
          <div className="dashboard-side-col">
            <div className="section-skeleton small" />
            <div className="section-skeleton small" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="eh-dashboard">
      {/* Hero / Header Section */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div className="dashboard-badge-row">
            <span className="platform-tag">
              <Server size={13} />
              <span>EchoHub Cloud Engine</span>
            </span>

            <div className="system-status-indicator status--healthy">
              <span className="status-ping-dot" />
              <span>Platform Operational</span>
            </div>
          </div>

          <h1 className="dashboard-greeting">
            {getGreeting()},{" "}
            <span className="dashboard-greeting-name">
              {user?.username || "Developer"}
            </span>
          </h1>

          <p className="dashboard-lead">
            Manage your Docker container deployments, microservices, and file storage from a unified control plane.
          </p>
        </div>

        <div className="dashboard-hero-actions">
          <ThemeSwitcher compact />

          <button
            type="button"
            className="dashboard-action-btn dashboard-action-btn--primary"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>

          <button
            type="button"
            className="dashboard-action-btn dashboard-action-btn--secondary"
            onClick={() => navigate("/cloud-storage")}
          >
            <Cloud size={16} />
            <span>Cloud Storage</span>
          </button>

          <button
            type="button"
            className={`dashboard-refresh-btn ${isRefreshing ? "refreshing" : ""}`}
            onClick={handleManualRefresh}
            title="Refresh dashboard stats"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="dashboard-stats-grid">
        <StatCard
          title="Active Projects"
          value={dashboard?.overview?.projects ?? 0}
          subtitle="Configured application workspaces"
          icon={<Layers size={22} />}
          badge={`${dashboard?.overview?.running ?? 0} running`}
          badgeVariant={(dashboard?.overview?.running ?? 0) > 0 ? "success" : "default"}
          onClick={() => navigate("/projects")}
        />

        <StatCard
          title="Live Instances"
          value={dashboard?.overview?.running ?? 0}
          subtitle="Running containerized workloads"
          icon={<Cpu size={22} />}
          variant="success"
          badge={
            (dashboard?.overview?.running ?? 0) > 0
              ? "All Systems Live"
              : "No Containers Active"
          }
          badgeVariant={(dashboard?.overview?.running ?? 0) > 0 ? "success" : "default"}
          onClick={() => navigate("/projects")}
        />

        <StatCard
          title="Total Releases"
          value={dashboard?.overview?.deployments ?? 0}
          subtitle="Historical container deployments"
          icon={<Rocket size={22} />}
          badge="CI/CD Pipeline"
          badgeVariant="accent"
        />

        <StatCard
          title="Storage Allocated"
          value={quotaDisplay}
          subtitle={
            freeBytes != null
              ? `${formatBytes(freeBytes)} remaining capacity`
              : "Cloud & workspace storage"
          }
          icon={<HardDrive size={22} />}
          progress={storagePercentage}
          badge={limitBytes ? `${storagePercentage}%` : "Unlimited"}
          badgeVariant={storagePercentage > 85 ? "warning" : "accent"}
          onClick={() => navigate("/cloud-storage")}
        />
      </div>

      {/* Main Content Layout: Left (Projects) + Right (Live Deployment Activity) */}
      <div className="dashboard-content-layout">
        <div className="dashboard-main-col">
          <RecentProjects
            projects={dashboard?.projects?.recent ?? []}
            onNewProject={() => setIsCreateOpen(true)}
          />
        </div>

        <div className="dashboard-side-col">
          <DeploymentActivity
            activities={dashboard?.activity?.recent ?? []}
          />
        </div>
      </div>

      {/* Project Creation Modal */}
      <CreateProjectModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          setIsCreateOpen(false);
          refresh();
        }}
      />
    </div>
  );
}
