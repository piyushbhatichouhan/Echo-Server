import "./ProjectHeader.css";

import {
  Computer,
  GitBranch,
  Network,
  Rocket,
  Play,
  RotateCw,
  Square,
} from "lucide-react";

import Button from "../../common/button/button";
import StatusBadge from "../../common/statusbadge/statusbadge";

import useProject from "../../../context/ProjectContext";

export default function ProjectHeader({ project }) {
  return (
    <div className="eh-project-header">
      <div className="eh-project-header-left">
        <div className="eh-project-title">
          <Rocket size={26} />

          <div>
            <h1>{project.name}</h1>

            <p>{project.description || "No description"}</p>
          </div>
        </div>

        <div className="eh-project-meta">
          {/* <StatusBadge status={project.status} /> */}

          <span>
            <Network size={15} />
            Port {project.port}
          </span>

          <span>
            <Computer size={15} />

            {project.git_connected ? "Git Connected" : "No Git"}
          </span>

          {project.git_connected && (
            <span>
              <GitBranch size={15} />

              {project.git_branch}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
