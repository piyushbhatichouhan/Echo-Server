import { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Cpu,
  HardDrive,
  Plus,
  Search,
  RefreshCw,
  X,
  Server,
  FolderPlus,
} from "lucide-react";
import useProjects from "../../hooks/useProjects";
import ProjectCard from "../../components/common/projectcard/projectcard";
import CreateProjectModal from "../../components/projects/createprojectmodal/createprojectmodal";
import { getMyStorageStats } from "../../services/storage.api";
import "./projects.css";

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

export default function Projects() {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { projects = [], loading, refresh } = useProjects();

  const refreshStats = async () => {
    try {
      const statsData = await getMyStorageStats();
      setStats(statsData);
    } catch (e) {
      console.warn("Failed to load storage stats:", e);
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refresh(), refreshStats()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Counts for filters
  const runningCount = useMemo(
    () =>
      projects.filter(
        (p) => (p.status || "").toLowerCase() === "running",
      ).length,
    [projects],
  );

  const stoppedCount = useMemo(
    () =>
      projects.filter(
        (p) => (p.status || "").toLowerCase() === "stopped",
      ).length,
    [projects],
  );

  const notDeployedCount = useMemo(
    () =>
      projects.filter((p) => {
        const s = (p.status || "").toLowerCase();
        return s === "not deployed" || s === "failed" || !s;
      }).length,
    [projects],
  );

  // Filtered projects list
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (project.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim()) ||
        (project.git_branch || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim()) ||
        (project.application_type || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim());

      if (!matchesSearch) return false;

      const s = (project.status || "").toLowerCase();
      if (statusFilter === "all") return true;
      if (statusFilter === "running") return s === "running";
      if (statusFilter === "stopped") return s === "stopped";
      if (statusFilter === "other") return s !== "running" && s !== "stopped";

      return true;
    });
  }, [projects, searchQuery, statusFilter]);

  // Storage calculation
  const usedBytes = stats?.used ?? 0;
  const limitBytes = stats?.limit ?? null;
  const storagePercentage =
    limitBytes && limitBytes > 0
      ? Math.min(100, Math.round((usedBytes / limitBytes) * 100))
      : 0;

  if (loading && projects.length === 0) {
    return (
      <div className="eh-projects eh-projects--loading">
        <div className="projects-hero-skeleton">
          <div className="skeleton-bar title-bar" />
          <div className="skeleton-bar subtitle-bar" />
        </div>
        <div className="projects-metrics-strip">
          {[1, 2, 3].map((i) => (
            <div key={i} className="metric-strip-skeleton" />
          ))}
        </div>
        <div className="eh-project-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="project-card-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="eh-projects">
      {/* Hero Header Banner */}
      <div className="projects-hero">
        <div className="projects-hero-content">
          <div className="projects-badge-row">
            <span className="platform-tag">
              <Server size={13} />
              <span>Container Workspaces</span>
            </span>

            <div
              className={`system-status-indicator ${runningCount > 0 ? "status--healthy" : "status--neutral"}`}
            >
              <span className="status-ping-dot" />
              <span>
                {runningCount > 0
                  ? `${runningCount} Active Container${runningCount > 1 ? "s" : ""}`
                  : "No Containers Active"}
              </span>
            </div>
          </div>

          <h1 className="projects-title">Projects & Applications</h1>

          <p className="projects-lead">
            Deploy, manage, and monitor containerized microservices and web workloads.
          </p>
        </div>

        <div className="projects-hero-actions">
          <button
            type="button"
            className="projects-action-btn projects-action-btn--primary"
            onClick={() => setOpen(true)}
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>

          <button
            type="button"
            className={`projects-refresh-btn ${isRefreshing ? "refreshing" : ""}`}
            onClick={handleManualRefresh}
            title="Refresh projects list"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Compact Hosting Overview Strip */}
      <div className="projects-metrics-strip">
        <div className="project-metric-tile">
          <div className="metric-tile-icon">
            <Layers size={18} />
          </div>
          <div className="metric-tile-content">
            <span className="metric-tile-label">Total Workspaces</span>
            <h3 className="metric-tile-value">{projects.length}</h3>
          </div>
        </div>

        <div className="project-metric-tile">
          <div className="metric-tile-icon live">
            <Cpu size={18} />
          </div>
          <div className="metric-tile-content">
            <span className="metric-tile-label">Running Instances</span>
            <div className="metric-tile-value-row">
              <h3 className="metric-tile-value">{runningCount}</h3>
              <span className="metric-tile-pill">{runningCount > 0 ? "Operational" : "Idle"}</span>
            </div>
          </div>
        </div>

        <div className="project-metric-tile">
          <div className="metric-tile-icon storage">
            <HardDrive size={18} />
          </div>
          <div className="metric-tile-content">
            <div className="metric-tile-storage-header">
              <span className="metric-tile-label">Storage Allocated</span>
              <span className="metric-tile-percentage">
                {limitBytes ? `${storagePercentage}%` : "Unlimited"}
              </span>
            </div>
            <h3 className="metric-tile-storage-val">
              {formatBytes(usedBytes)}
              {limitBytes ? ` / ${formatBytes(limitBytes)}` : ""}
            </h3>
            {limitBytes && (
              <div className="metric-tile-progress-track">
                <div
                  className="metric-tile-progress-fill"
                  style={{
                    width: `${storagePercentage}%`,
                    backgroundColor:
                      storagePercentage > 85
                        ? "var(--danger, #ef4444)"
                        : "var(--accent)",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="projects-toolbar">
        <div className="projects-search-wrapper">
          <Search size={16} className="projects-search-icon" />
          <input
            type="text"
            className="projects-search-input"
            placeholder="Search projects by name, branch, runtime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="projects-search-clear"
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="projects-filter-group">
          <button
            type="button"
            className={`projects-filter-pill ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All <span className="pill-count">{projects.length}</span>
          </button>

          <button
            type="button"
            className={`projects-filter-pill ${statusFilter === "running" ? "active active--running" : ""}`}
            onClick={() => setStatusFilter("running")}
          >
            <span className="dot dot--running" />
            Running <span className="pill-count">{runningCount}</span>
          </button>

          <button
            type="button"
            className={`projects-filter-pill ${statusFilter === "stopped" ? "active" : ""}`}
            onClick={() => setStatusFilter("stopped")}
          >
            Stopped <span className="pill-count">{stoppedCount}</span>
          </button>

          {notDeployedCount > 0 && (
            <button
              type="button"
              className={`projects-filter-pill ${statusFilter === "other" ? "active" : ""}`}
              onClick={() => setStatusFilter("other")}
            >
              Not Deployed <span className="pill-count">{notDeployedCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid / Empty State */}
      {filteredProjects.length === 0 ? (
        <div className="projects-empty-state">
          <div className="projects-empty-icon-wrap">
            {searchQuery || statusFilter !== "all" ? (
              <Search size={36} />
            ) : (
              <FolderPlus size={36} />
            )}
          </div>
          <h3>
            {searchQuery || statusFilter !== "all"
              ? "No matching projects found"
              : "No projects created yet"}
          </h3>
          <p>
            {searchQuery || statusFilter !== "all"
              ? `No projects matched "${searchQuery || statusFilter}". Try adjusting your search term or filter.`
              : "Get started by creating your first containerized project with Node.js, Vite, Next.js, or custom Docker."}
          </p>

          {searchQuery || statusFilter !== "all" ? (
            <button
              type="button"
              className="projects-action-btn projects-action-btn--secondary"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Reset Filters
            </button>
          ) : (
            <button
              type="button"
              className="projects-action-btn projects-action-btn--primary"
              onClick={() => setOpen(true)}
            >
              <Plus size={16} />
              <span>Create Your First Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="eh-project-grid">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Project Creation Modal */}
      <CreateProjectModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={async () => {
          await refresh();
          await refreshStats();
        }}
      />
    </div>
  );
}
