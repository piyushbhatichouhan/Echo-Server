import "./StatCard.css";

export default function StatCard({ title, value, subtitle, icon }) {
  return (
    <div className="statCard">
      <div className="statCard__icon">{icon}</div>

      <div className="statCard__content">
        <span className="statCard__title">{title}</span>

        <h2 className="statCard__value">{value}</h2>

        {subtitle && <p className="statCard__subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
