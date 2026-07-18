import "./Card.css";

export default function Card({
  title,

  children,

  actions,
}) {
  return (
    <div className="eh-card">
      {(title || actions) && (
        <div className="eh-card-header">
          <h3>{title}</h3>

          {actions}
        </div>
      )}

      <div className="eh-card-body">{children}</div>
    </div>
  );
}
