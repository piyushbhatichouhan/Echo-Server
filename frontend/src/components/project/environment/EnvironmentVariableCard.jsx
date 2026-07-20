import "./EnvironmentVariableCard.css";

import { Eye, EyeOff, Copy, Pencil, Trash2 } from "lucide-react";

import { useState } from "react";

export default function EnvironmentVariableCard({
  variable,
  onEdit,
  onDelete,
}) {
  const [visible, setVisible] = useState(false);

  const copyValue = async () => {
    await navigator.clipboard.writeText(variable.value);
  };

  return (
    <div className="eh-env-card">
      <div className="eh-env-header">
        <div>
          <div className="eh-env-key">{variable.key}</div>

          <div className="eh-env-value">
            {visible
              ? variable.value
              : "•".repeat(Math.max(variable.value.length, 12))}
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
    </div>
  );
}
