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
}) {
  const isVisible = open ?? isOpen;
  if (!isVisible) return null;

  return (
    <div
      className={`eh-modal-overlay ${overlayClassName}`.trim()}
      style={zIndex ? { zIndex } : undefined}
      onClick={onClose}
    >
      <div
        className={`eh-modal ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="eh-modal-header">
          <h2>{title}</h2>

          <button className="eh-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="eh-modal-body">{children}</div>
      </div>
    </div>
  );
}
 