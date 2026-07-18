import { useState } from "react";

import Modal from "../../common/Modal/Modal";
import Input from "../../common/Input/Input";
import Button from "../../common/Button/Button";

import { createProject } from "../../../services/project.api";

export default function CreateProjectModal({
  open,

  onClose,

  onCreated,
}) {
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
      <form className="eh-form" onSubmit={submit}>
        <Input
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Backend"
        />

        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />

        <Button type="submit" loading={loading} fullWidth>
          Create Project
        </Button>
      </form>
    </Modal>
  );
}
