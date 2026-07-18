import "./Input.css";

export default function Input({
  label,

  ...props
}) {
  return (
    <div className="eh-input-group">
      <label>{label}</label>

      <input className="eh-input" {...props} />
    </div>
  );
}
