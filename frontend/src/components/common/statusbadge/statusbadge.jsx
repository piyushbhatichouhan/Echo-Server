import "./StatusBadge.css";

export default function StatusBadge({ status }) {
  const cls = status || "unknown";

  return <span className={`eh-status-badge ${cls}`}>{status}</span>;
}
