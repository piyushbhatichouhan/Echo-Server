import { useNavigate } from "react-router-dom";
import { FolderGit2, ArrowRight, Plus } from "lucide-react";
import Button from "../../common/button/button";
import RecentProjectItem from "./RecentProjectItem";
import "./RecentProjects.css";

export default function RecentProjects({ projects = [], onNewProject }) {
  const navigate = useNavigate();

  return (
    <section className="recentProjects">
      <div className="recentProjects-header">
        <div className="recentProjects-title-group">
          <div className="recentProjects-icon">
            <FolderGit2 size={18} />
          </div>
          <div>
            <h2 className="recentProjects-title">Active Projects</h2>
            <span className="recentProjects-subtitle">Your hosted application workspaces</span>
          </div>
        </div>

        <div className="recentProjects-actions">
          {onNewProject && (
            <button
              type="button"
              className="recent-projects-quick-add"
              onClick={onNewProject}
            >
              <Plus size={14} />
              <span>New</span>
            </button>
          )}

          <button
            type="button"
            className="recent-projects-view-all"
            onClick={() => navigate("/projects")}
          >
            <span>View All</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="recentProjects-empty">
          <div className="recent-empty-icon-wrap">
            <FolderGit2 size={40} />
          </div>
          <h3>No projects created yet</h3>
          <p>Deploy your first web application, API backend, or container workspace.</p>
          {onNewProject && (
            <Button onClick={onNewProject} variant="primary">
              <Plus size={16} /> Create Your First Project
            </Button>
          )}
        </div>
      ) : (
        <div className="recentProjects-grid">
          {projects.map((project) => (
            <RecentProjectItem key={project.id} project={project} />
          ))}
        </div>
      )}
    </section>
  );
}
