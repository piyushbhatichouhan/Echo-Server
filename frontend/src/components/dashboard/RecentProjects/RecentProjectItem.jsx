import "./RecentProjectItem.css";
import { useNavigate } from "react-router-dom";
import {
  Rocket,
  GitBranch,
  Clock3,
  ChevronRight,
  ExternalLink,
  GitCommit,
  Layers,
} from "lucide-react";
import StatusBadge from "../../common/statusbadge/statusbadge";
import timeAgo from "../../../utils/timeAgo";

export default function RecentProjectItem({ project }) {
  const navigate = useNavigate();
  const isRunning = (project.status || "").toLowerCase() === "running";

  return (
    <div
      className={`eh-recent-project ${isRunning ? "eh-recent-project--running" : ""}`}
      onClick={() => navigate(`/projects/${project.id}`)}
      role="button"
      tabIndex={0}
    >
      <div className="eh-recent-project-top">
        <div className="eh-recent-project-title-area">
          <div className="eh-recent-project-icon">
            <Layers size={20} />
            {isRunning && <span className="icon-pulse-badge" />}
          </div>

          <div className="eh-recent-project-name-group">
            <h3 className="eh-recent-project-title" title={project.name}>
              {project.name}
            </h3>
            <span className="eh-recent-project-date">
              <Clock3 size={12} />
              {timeAgo(project.last_deployed_at || project.updated_at)}
            </span>
          </div>
        </div>

        <div className="eh-recent-project-status-group">
          {project.port && isRunning && (
            <span className="eh-recent-port-badge" title={`Running on port ${project.port}`}>
              :{project.port}
            </span>
          )}
          <StatusBadge status={project.status} />
        </div>
      </div>

      <div className="eh-recent-project-body">
        {project.commit_message ? (
          <p className="eh-recent-commit-msg" title={project.commit_message}>
            <GitCommit size={13} className="commit-icon" />
            <span>"{project.commit_message.length > 55 ? `${project.commit_message.slice(0, 55)}...` : project.commit_message}"</span>
          </p>
        ) : (
          <p className="eh-recent-placeholder-desc">Ready for deployment</p>
        )}
      </div>

      <div className="eh-recent-project-footer">
        <div className="eh-recent-project-meta">
          {project.git_connected ? (
            <span className="eh-recent-git-tag connected">
              <GitBranch size={13} />
              {project.git_branch || "main"}
            </span>
          ) : (
            <span className="eh-recent-git-tag">Local Storage</span>
          )}

          {project.commit_hash && (
            <span className="eh-recent-hash-tag">
              #{project.commit_hash.slice(0, 7)}
            </span>
          )}
        </div>

        <div className="eh-recent-action-link">
          <span>Manage</span>
          <ChevronRight size={14} className="eh-recent-project-arrow" />
        </div>
      </div>
    </div>
  );
}
