import "./environmentItem.css";

import { Eye, EyeOff, Copy, Pencil, Trash2 } from "lucide-react";

import { useState } from "react";
import { useToast } from "../../../context/ToastContext";

export default function EnvironmentItem({ variable, onEdit, onDelete }) {
  const [visible, setVisible] = useState(false);
  const toast = useToast();
  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(variable.value);
      toast.success(`Variable Copied`, `${variable.key} copied to clipboard.`);
    } catch (error) {
      const message = error.response?.data?.message || error.message;

      toast.error("Error", message);
    }
  };

  return (
    <div className="eh-env-item">
      <div className="eh-env-info">
        <div className="eh-env-key">{variable.key}</div>

        <div className="eh-env-value">
          {visible
            ? variable.value
            : "•".repeat(Math.max(variable.value.length, 14))}
        </div>
      </div>

      <div className="eh-env-actions">
        <button onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        <button onClick={copyValue}>
          <Copy size={18} />
        </button>

        <button onClick={() => onEdit(variable)}>
          <Pencil size={18} />
        </button>

        <button onClick={() => onDelete(variable)}>
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
