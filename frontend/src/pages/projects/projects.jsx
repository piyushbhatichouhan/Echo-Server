import "./Projects.css";

import ProjectCard from "../../components/common/projectcard/projectcard";
import React, { useState } from "react";
import useProjects from "../../hooks/useProjects";
import Button from "../../components/common/button/button";
import Modal from "../../components/common/modal/modal";
import CreateProjectModal from "../../components/projects/createprojectmodal/createprojectmodal";
export default function Projects() {
  const [open, setOpen] = useState(false);

  const {
    projects,

    loading,

    refresh,
  } = useProjects();

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="eh-projects">
      <div className="eh-projects-header">
        <div className="eh-projects-title">
          <h1>Projects</h1>

          <p>
            {projects.length === 0
              ? "No projects yet"
              : `${projects.length} Project${projects.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <Button onClick={() => setOpen(true)}>+ New Project</Button>
      </div>

      <div className="eh-project-grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <CreateProjectModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={refresh}
      />
    </div>
  );
}
