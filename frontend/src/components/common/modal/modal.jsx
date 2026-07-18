import "./Modal.css";

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="eh-modal-overlay" onClick={onClose}>
      <div className="eh-modal" onClick={(e) => e.stopPropagation()}>
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
