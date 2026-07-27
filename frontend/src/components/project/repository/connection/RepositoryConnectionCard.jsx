import "./RepositoryConnectionCard.css";

import { Computer, GitBranch, CheckCircle2 } from "lucide-react";

import Input from "../../../common/input/input";
import Button from "../../../common/button/button";

export default function RepositoryConnectionCard({
  repositoryUrl,
  setRepositoryUrl,

  branch,
  setBranch,

  repository,

  validation,

  validating,
  connecting,
  cloning,

  onValidate,
  onConnect,
  onClone,
}) {
  return (
    <div className="eh-repository-connection-card">
      <div className="eh-repository-card-header">
        <div className="eh-repository-card-title">
          <Computer size={22} />

          <div>
            <h2>Repository</h2>

            <p>Connect a GitHub repository to this project.</p>
          </div>
        </div>
      </div>

      <div className="eh-repository-fields">
        <Input
          label="Repository URL"
          placeholder="https://github.com/user/repository.git"
          value={repositoryUrl}
          onChange={(e) => setRepositoryUrl(e.target.value)}
        />

        <Input
          label="Branch"
          placeholder="main"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        />
      </div>

      <div className="eh-repository-actions">
        <Button
          variant="secondary"
          loading={validating}
          disabled={!repositoryUrl}
          onClick={onValidate}
        >
          Validate
        </Button>

        {validation && !repository && (
          <Button loading={connecting} onClick={onConnect}>
            Connect
          </Button>
        )}

        {repository && (
          <Button loading={cloning} onClick={onClone}>
            Clone
          </Button>
        )}
      </div>

      {validation && (
        <div className="eh-validation-success">
          <CheckCircle2 size={18} />
          Repository validated successfully.
        </div>
      )}
    </div>
  );
}
