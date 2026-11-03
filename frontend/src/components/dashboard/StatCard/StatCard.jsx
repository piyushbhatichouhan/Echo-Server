import "./StatCard.css";

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  badgeVariant = "default",
  progress,
  variant = "default",
  onClick,
}) {
  return (
    <div
      className={`statCard ${variant !== "default" ? `statCard--${variant}` : ""} ${onClick ? "statCard--clickable" : ""}`.trim()}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="statCard__header">
        <div className="statCard__icon">{icon}</div>
        {badge && (
          <span className={`statCard__badge statCard__badge--${badgeVariant}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="statCard__content">
        <span className="statCard__title">{title}</span>
        <h2 className="statCard__value">{value}</h2>
        {subtitle && <p className="statCard__subtitle">{subtitle}</p>}

        {progress !== undefined && (
          <div className="statCard__progress-wrapper">
            <div className="statCard__progress-bar">
              <div
                className="statCard__progress-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  backgroundColor:
                    progress > 90
                      ? "var(--danger, #ef4444)"
                      : progress > 75
                      ? "var(--warning, #f59e0b)"
                      : "var(--accent, #ff8a00)",
                }}
              />
            </div>
            <span className="statCard__progress-text">{Math.round(progress)}% allocated</span>
          </div>
        )}
      </div>
    </div>
  );
}