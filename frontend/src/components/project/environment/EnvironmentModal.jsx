import { useEffect, useState } from "react";

import Modal from "../../common/modal/modal";
import Button from "../../common/button/button";
import { useToast } from "../../../context/ToastContext";
export default function EnvironmentModal({ open, onClose, onSave, variable }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const toast = useToast();
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
    try {
      if (!key.trim()) return;

      await onSave({
        key,
        value,
      });

      onClose();
    } catch (error) {
      const message = error.response?.data?.message || error.message;

      toast.error("Error", message);
    }
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
