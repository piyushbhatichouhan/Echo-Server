import "./server.css";
import { useNavigate } from "react-router-dom";

export default function Server() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Pending Users",
      description: "Approve or reject new registrations.",
      available: true,
      route: "/server/pending-users",
    },
    {
      title: "Users",
      description: "Manage existing users.",
      available: true,
      route: "/server/users",
    },
    {
      title: "Storage",
      description: "View storage usage.",
      available: true,
      route: "/server/storage",
    },
    {
      title: "Logs",
      description: "View server logs.",
      available: false,
    },
    {
      title: "Backups",
      description: "Manage database backups.",
      available: false,
    },
    {
      title: "Health",
      description: "Monitor server health.",
      available: false,
    },
  ];

  return (
    <div className="server">
      <div className="server__header">
        <h1>Server</h1>

        <p>Manage your EchoHub server and users.</p>
      </div>

      <div className="server__grid">
        {cards.map((card) => (
          <div
            key={card.title}
            className={`serverCard ${
              card.available ? "" : "serverCard--disabled"
            }`}
            onClick={() => {
              if (card.available) {
                navigate(card.route);
              }
            }}
          >
            <div>
              <h2>{card.title}</h2>

              <p>{card.description}</p>
            </div>

            <span>{card.available ? "→" : "Soon"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
