import "./projectcard.css";
import { Link } from "react-router-dom";
import {
  Layers,
  GitBranch,
  GitCommit,
  Clock3,
  ChevronRight,
  Server,
  Zap,
  Box,
} from "lucide-react";
import StatusBadge from "../statusbadge/statusbadge";
import timeAgo from "../../../utils/timeAgo";

const APP_ICONS = {
  node: <Server size={18} />,
  vite: <Zap size={18} />,
  next: <Layers size={18} />,
  custom: <Box size={18} />,
};

const APP_LABELS = {
  node: "Node.js",
  vite: "Vite SPA",
  next: "Next.js",
  custom: "Docker",
};

export default function ProjectCard({ project }) {
  const isRunning = (project.status || "").toLowerCase() === "running";
  const appType = (project.application_type || "node").toLowerCase();
  const appIcon = APP_ICONS[appType] || <Layers size={18} />;
  const appLabel = APP_LABELS[appType] || project.application_type || "App";

  return (
    <Link to={`/projects/${project.id}`} className="eh-project-link">
      <div className={`eh-project-card ${isRunning ? "eh-project-card--running" : ""}`}>
        {/* Top Header */}
        <div className="eh-project-card-header">
          <div className="eh-project-card-identity">
            <div className="eh-project-card-icon">
              {appIcon}
              {isRunning && <span className="running-dot-ping" />}
            </div>
            <div className="eh-project-card-heading">
              <h3 className="eh-project-card-name" title={project.name}>
                {project.name}
              </h3>
              <span className="eh-project-runtime-tag">{appLabel}</span>
            </div>
          </div>

          <div className="eh-project-card-badges">
            {project.port && isRunning && (
              <span className="eh-project-port-pill" title={`Listening on port ${project.port}`}>
                :{project.port}
              </span>
            )}
            <StatusBadge status={project.status} />
          </div>
        </div>

        {/* Description or commit snippet */}
        <div className="eh-project-card-body">
          {project.commit_message ? (
            <p className="eh-project-commit-msg" title={project.commit_message}>
              <GitCommit size={14} className="commit-icon" />
              <span>"{project.commit_message.length > 55 ? `${project.commit_message.slice(0, 55)}...` : project.commit_message}"</span>
            </p>
          ) : (
            <p className="eh-project-desc" title={project.description}>
              {project.description || "Containerized application workspace ready for deployment."}
            </p>
          )}
        </div>

        {/* Metadata Strip */}
        <div className="eh-project-card-meta">
          <div className="eh-project-git-info">
            {project.git_connected ? (
              <span className="eh-git-branch-tag connected" title={project.git_branch || "main"}>
                <GitBranch size={13} />
                <span>{project.git_branch || "main"}</span>
              </span>
            ) : (
              <span className="eh-git-branch-tag unlinked">Local Codebase</span>
            )}

            {project.commit_hash && (
              <span className="eh-commit-hash-tag">
                #{project.commit_hash.slice(0, 7)}
              </span>
            )}
          </div>

          <span className="eh-project-time-tag">
            <Clock3 size={13} />
            {timeAgo(project.last_deployment || project.updated_at)}
          </span>
        </div>

        {/* Card Footer Action */}
        <div className="eh-project-card-footer">
          <span className="eh-project-footer-label">Open Workspace</span>
          <ChevronRight size={15} className="eh-project-footer-arrow" />
        </div>
      </div>
    </Link>
  );
}
