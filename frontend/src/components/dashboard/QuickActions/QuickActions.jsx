import { useNavigate } from "react-router-dom";
import { Plus, Cloud, Layers, Settings, ChevronRight, Zap } from "lucide-react";
import "./QuickActions.css";

export default function QuickActions({ onNewProject }) {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Deploy New Project",
      desc: "Node.js, Vite, Next.js or Docker",
      icon: <Plus size={18} />,
      accent: "orange",
      onClick: onNewProject,
    },
    {
      title: "Cloud File Storage",
      desc: "Browse disks, archives & buckets",
      icon: <Cloud size={18} />,
      accent: "cyan",
      onClick: () => navigate("/cloud-storage"),
    },
    {
      title: "Project Workspaces",
      desc: "Manage existing apps & git",
      icon: <Layers size={18} />,
      accent: "emerald",
      onClick: () => navigate("/projects"),
    },
    {
      title: "Server Administration",
      desc: "Users, quotas & engine config",
      icon: <Settings size={18} />,
      accent: "amber",
      onClick: () => navigate("/server"),
    },
  ];

  return (
    <div className="quick-actions-card">
      <div className="quick-actions-header">
        <Zap size={16} className="quick-actions-icon-accent" />
        <h3 className="quick-actions-title">Developer Shortcuts</h3>
      </div>

      <div className="quick-actions-grid">
        {actions.map((act, idx) => (
          <div
            key={idx}
            className={`quick-action-item quick-action--${act.accent}`}
            onClick={act.onClick}
            role="button"
            tabIndex={0}
          >
            <div className="quick-action-icon-box">{act.icon}</div>
            <div className="quick-action-content">
              <span className="quick-action-item-title">{act.title}</span>
              <span className="quick-action-item-desc">{act.desc}</span>
            </div>
            <ChevronRight size={15} className="quick-action-arrow" />
          </div>
        ))}
      </div>
    </div>
  );
}
