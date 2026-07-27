import "./CreateProjectModal.css";

import { useState } from "react";

import Modal from "../../common/modal/Modal";
import Input from "../../common/input/Input";
import Button from "../../common/button/Button";

import { createProject } from "../../../services/project.api";

export default function CreateProjectModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (!name.trim()) return;

    try {
      setLoading(true);

      await createProject({
        name,

        description,
      });

      setName("");

      setDescription("");

      onCreated();

      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} title="Create Project" onClose={onClose}>
      <form className="createProjectForm" onSubmit={submit}>
        <div className="createProjectHero">
          <div className="createProjectIcon">🚀</div>

          <div>
            <h2>New EchoHub Project</h2>

            <p>
              Create a new project. An available port will automatically be
              assigned when the project is created.
            </p>
          </div>
        </div>

        <div className="createProjectFields">
          <Input
            label="Project Name"
            placeholder="Portfolio API"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Description"
            placeholder="REST API for portfolio website"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="createProjectInfo">
          <div>
            <span>📦</span>
            Docker deployment can be configured later.
          </div>

          <div>
            <span>🌐</span>
            GitHub can be connected after creation.
          </div>

          <div>
            <span>🔥</span>
            Port allocation is automatic.
          </div>
        </div>

        <div className="createProjectButtons">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>

          <Button type="submit" loading={loading}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
