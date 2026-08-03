import "./button.css";

export default function Button({
  children,
  onClick,
  icon: Icon,
  variant = "primary",
  loading = false,
  disabled = false,
  type = "button",
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`eh-btn eh-btn-${variant}`}
    >
      {Icon && <Icon size={17} className={loading ? "eh-btn-spin" : ""} />}

      <span>{loading ? "Working..." : children}</span>
    </button>
  );
}
