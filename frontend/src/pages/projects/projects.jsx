import "./Projects.css";

import ProjectCard from "../../components/common/ProjectCard/ProjectCard";
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
        <h1>Projects</h1>

        <Button onClick={() => setOpen(true)}>New Project</Button>
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
