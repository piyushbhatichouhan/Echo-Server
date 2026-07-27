import "./RepositoryInfoCard.css";

import { FolderGit2, User, GitBranch } from "lucide-react";

export default function RepositoryInfoCard({ validation }) {
  if (!validation) return null;

  return (
    <div className="eh-repository-info-card">
      <div className="eh-repository-info-header">
        <FolderGit2 size={22} />

        <div>
          <h2>Repository Information</h2>

          <p>Detected information from GitHub.</p>
        </div>
      </div>

      <div className="eh-repository-info-grid">
        <div className="eh-info-tile">
          <FolderGit2 size={18} />

          <small>Repository</small>

          <strong>{validation.name}</strong>
        </div>

        <div className="eh-info-tile">
          <User size={18} />

          <small>Owner</small>

          <strong>{validation.owner}</strong>
        </div>

        <div className="eh-info-tile">
          <GitBranch size={18} />

          <small>Default Branch</small>

          <strong>{validation.defaultBranch}</strong>
        </div>
      </div>
    </div>
  );
}
