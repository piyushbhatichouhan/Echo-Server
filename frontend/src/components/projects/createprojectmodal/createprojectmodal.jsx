import "./CreateProjectModal.css";

import { useState } from "react";

import Modal from "../../common/modal/Modal";
import Input from "../../common/input/Input";
import Button from "../../common/button/Button";

import { createProject } from "../../../services/project.api";

export default function CreateProjectModal({ open, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [applicationType, setApplicationType] = useState("static");
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

        applicationType,
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
          <div className="formGroup">
            <label>Application Type</label>

            <select
              value={applicationType}
              onChange={(e) => setApplicationType(e.target.value)}
            >
              <option value="static">🌐 Static Website</option>
              <option value="custom">⚙ Custom</option>
            </select>
          </div>
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
