import { useNavigate } from "react-router-dom";
import { Rocket, GitBranch, GitCommit, ExternalLink, Clock, Layers } from "lucide-react";
import StatusBadge from "../../common/statusbadge/statusbadge";
import timeAgo from "../../../utils/timeAgo";
import "./DeploymentActivity.css";

export default function DeploymentActivity({ activities = [] }) {
  const navigate = useNavigate();

  return (
    <div className="deploy-activity-card">
      <div className="deploy-activity-header">
        <div className="deploy-activity-title-group">
          <div className="deploy-activity-icon">
            <Rocket size={18} />
          </div>
          <div>
            <h3 className="deploy-activity-title">Live Deployment Releases</h3>
            <span className="deploy-activity-subtitle">Recent build & container operations</span>
          </div>
        </div>
        <span className="deploy-activity-count-badge">
          {activities.length} Recent
        </span>
      </div>

      {activities.length === 0 ? (
        <div className="deploy-activity-empty">
          <Layers size={36} className="deploy-activity-empty-icon" />
          <p className="deploy-activity-empty-title">No deployments recorded yet</p>
          <span className="deploy-activity-empty-text">
            When you deploy a project or trigger builds, live release history will appear here.
          </span>
        </div>
      ) : (
        <div className="deploy-activity-list">
          {activities.map((item) => (
            <div
              key={item.id}
              className="deploy-activity-item"
              onClick={() => navigate(`/projects/${item.project_id}`)}
              role="button"
              tabIndex={0}
            >
              <div className="deploy-activity-item-left">
                <div className={`deploy-status-indicator deploy-status--${(item.status || "default").toLowerCase()}`}>
                  <span className="status-ping" />
                </div>

                <div className="deploy-activity-details">
                  <div className="deploy-activity-proj-row">
                    <span className="deploy-activity-proj-name">
                      {item.project_name || "Project"}
                    </span>
                    <StatusBadge status={item.status} />
                    {item.port && (
                      <span className="deploy-port-pill">
                        :{item.port}
                      </span>
                    )}
                  </div>

                  <div className="deploy-activity-meta-row">
                    {item.git_branch && (
                      <span className="deploy-meta-tag">
                        <GitBranch size={13} />
                        {item.git_branch}
                      </span>
                    )}

                    {item.commit_hash && (
                      <span className="deploy-meta-tag commit-hash">
                        <GitCommit size={13} />
                        {item.commit_hash.slice(0, 7)}
                      </span>
                    )}

                    {item.commit_message && (
                      <span className="deploy-meta-commit" title={item.commit_message}>
                        "{item.commit_message.length > 40 ? `${item.commit_message.slice(0, 40)}...` : item.commit_message}"
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="deploy-activity-item-right">
                <span className="deploy-time">
                  <Clock size={13} />
                  {timeAgo(item.created_at)}
                </span>
                <ExternalLink size={14} className="deploy-nav-arrow" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
