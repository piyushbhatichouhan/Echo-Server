import "./RecentProjectItem.css";

import { useNavigate } from "react-router-dom";

import {
  Rocket,
  Computer,
  GitBranch,
  Clock3,
  ChevronRight,
} from "lucide-react";

import StatusBadge from "../../common/statusbadge/statusbadge";

import timeAgo from "../../../utils/timeAgo";

export default function RecentProjectItem({ project }) {
  const navigate = useNavigate();

  return (
    <div
      className="eh-recent-project"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="eh-recent-project-left">
        <div className="eh-recent-project-icon">
          <Rocket size={18} />
        </div>

        <div className="eh-recent-project-content">
          <div className="eh-recent-project-header">
            <h3>{project.name}</h3>

            <StatusBadge status={project.status} />
          </div>

          <div className="eh-recent-project-meta">
            <span>
              <Computer size={14} />

              {project.git_connected ? "Connected" : "No Git"}
            </span>

            {project.git_connected && (
              <span>
                <GitBranch size={14} />

                {project.git_branch}
              </span>
            )}

            <span>
              <Clock3 size={14} />

              {timeAgo(project.updated_at)}
            </span>
          </div>
        </div>
      </div>

      <ChevronRight className="eh-recent-project-arrow" size={18} />
    </div>
  );
}
