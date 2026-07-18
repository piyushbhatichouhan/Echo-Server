import "./ProjectHeader.css";
import StatusBadge from "../../common/statusbadge/statusbadge";

export default function ProjectHeader({ project }) {
  return (
    <div className="eh-project-header">
      <div>
        <h1>{project.name}</h1>

        <p>{project.description || "No description"}</p>
      </div>

      <div className="eh-project-info">
        <span>Port {project.port}</span>

        <StatusBadge status={status?.status} />
      </div>
    </div>
  );
}
