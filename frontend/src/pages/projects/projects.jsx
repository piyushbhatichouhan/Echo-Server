import "./projects.css";

import ProjectCard from "../../components/common/projectcard/projectcard";
import React, { useState, useEffect } from "react";
import useProjects from "../../hooks/useProjects";
import Button from "../../components/common/button/button";
import Modal from "../../components/common/modal/modal";
import CreateProjectModal from "../../components/projects/createprojectmodal/createprojectmodal";
import StorageStats from "../../components/cloud/StorageStats/StorageStats";
import projectWorkspace from "../../services/projectWorkspace";
export default function Projects() {
  const [open, setOpen] = useState(false);

  const [stats, setStats] = useState(null);

  const refreshStats = async () => {
    const statsData = await projectWorkspace.getStats();
    setStats(statsData);
  };

  useEffect(() => {
    refreshStats();
  }, []);

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
      <StorageStats stats={stats} />
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
        onCreated={async () => {
          await refresh();
          await refreshStats();
        }}
      />
    </div>
  );
}
