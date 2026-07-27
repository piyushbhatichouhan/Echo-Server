import "./Toast.css";

import Toast from "./Toast";

import { useToast } from "../../../context/ToastContext";

export default function ToastContainer() {
  const {
    toasts,

    removeToast,
  } = useToast();

  return (
    <div className="eh-toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}
