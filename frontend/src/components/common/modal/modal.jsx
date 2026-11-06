import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./modal.css";

export default function Modal({
  open,
  isOpen,
  title,
  children,
  onClose,
  overlayClassName = "",
  className = "",
  zIndex,
  width,
}) {
  const isVisible = open ?? isOpen;

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!isVisible) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isVisible]);

  // Close on Escape key press
  useEffect(() => {
    if (!isVisible || !onClose) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return createPortal(
    <div
      className={`eh-modal-overlay ${overlayClassName}`.trim()}
      style={zIndex ? { zIndex } : undefined}
      onClick={onClose}
    >
      <div
        className={`eh-modal ${className}`.trim()}
        style={width ? { width, maxWidth: "94vw" } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="eh-modal-header">
          {typeof title === "string" ? <h2>{title}</h2> : title}

          {onClose && (
            <button
              type="button"
              className="eh-modal-close"
              onClick={onClose}
              aria-label="Close modal"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="eh-modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}