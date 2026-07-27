import "./RecentProjects.css";

import RecentProjectItem from "./RecentProjectItem";

export default function RecentProjects({ projects }) {
  return (
    <section className="recentProjects">
      <h2>Recent Projects</h2>

      {projects.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        projects.map((project) => (
          <RecentProjectItem key={project.id} project={project} />
        ))
      )}
    </section>
  );
}
