import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ICONS = {
  success: CheckCircle2,

  error: XCircle,

  warning: AlertTriangle,

  info: Info,
};

export default function Toast({ toast, onClose }) {
  const Icon = ICONS[toast.type];

  return (
    <div className={`eh-toast ${toast.type}`}>
      <div className="eh-toast-icon">
        <Icon size={22} />
      </div>

      <div className="eh-toast-content">
        <strong>{toast.title}</strong>

        {toast.message && <p>{toast.message}</p>}
      </div>

      <button className="eh-toast-close" onClick={() => onClose(toast.id)}>
        <X size={16} />
      </button>
    </div>
  );
}
