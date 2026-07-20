import { useEffect, useState } from "react";

import Modal from "../../common/Modal/Modal";
import Button from "../../common/Button/Button";

export default function EnvironmentModal({ open, onClose, onSave, variable }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (variable) {
      setKey(variable.key);
      setValue(variable.value);
    } else {
      setKey("");
      setValue("");
    }
  }, [variable, open]);

  const handleSave = async () => {
    if (!key.trim()) return;

    await onSave({
      key,
      value,
    });

    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        variable ? "Edit Environment Variable" : "Add Environment Variable"
      }
    >
      <div className="eh-env-modal">
        <label>Key</label>

        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="DATABASE_URL"
        />

        <label>Value</label>

        <textarea
          rows={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="postgres://..."
        />

        <div className="eh-modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
