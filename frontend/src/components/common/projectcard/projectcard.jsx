import "./projectcard.css";

import { Link } from "react-router-dom";

import {
  Rocket,
  Computer,
  GitBranch,
  Network,
  Clock3,
  ChevronRight,
} from "lucide-react";

import Card from "../card/card";
import StatusBadge from "../statusbadge/statusbadge";

import timeAgo from "../../../utils/timeAgo";

export default function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project.id}`} className="eh-project-link">
      <Card>
        <div className="eh-project-card">
          <div className="eh-project-top">
            <div className="eh-project-title">
              <div className="eh-project-icon">
                <Rocket size={20} />
              </div>

              <div className="eh-project-heading">
                <h3>{project.name}</h3>

                <p>{project.description || "No description provided."}</p>
              </div>
            </div>

            <StatusBadge status={project.status} />
          </div>

          <div className="eh-project-info">
            <div className="eh-project-info-item">
              <Computer size={15} />

              <span>
                {project.git_connected ? "GitHub Connected" : "No Git"}
              </span>
            </div>

            {project.git_connected && (
              <div className="eh-project-info-item">
                <GitBranch size={15} />

                <span>{project.git_branch}</span>
              </div>
            )}

            <div className="eh-project-info-item">
              <Network size={15} />

              <span>Port {project.port}</span>
            </div>
          </div>

          <div className="eh-project-footer">
            <div className="eh-project-time">
              <Clock3 size={15} />

              <span>{timeAgo(project.updated_at)}</span>
            </div>

            <div className="eh-project-open">
              <span>Open</span>

              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
