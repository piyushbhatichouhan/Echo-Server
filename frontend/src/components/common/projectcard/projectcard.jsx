import "./ProjectCard.css";

import { Link } from "react-router-dom";

import Card from "../Card/Card";

export default function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project.id}`} className="eh-project-link">
      View Project →
      <Card>
        <div className="eh-project-card">
          <div>
            <h3>{project.name}</h3>

            <p>{project.description}</p>
          </div>

          <div className="eh-project-meta">
            <span>Port {project.port}</span>

            <span>{new Date(project.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
