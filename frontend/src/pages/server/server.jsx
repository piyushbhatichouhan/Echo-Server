import "./server.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { cleanupPorts } from "../../services/server.api";

export default function Server() {
  const navigate = useNavigate();
  const toast = useToast();
  const [cleaning, setCleaning] = useState(false);

  const handleCleanupPorts = async () => {
    if (cleaning) return;
    try {
      setCleaning(true);
      const res = await cleanupPorts();
      toast.success(
        "Ports Cleaned",
        res.message || `Cleaned ${res.releasedCount || 0} pseudo-allocated ports.`,
      );
    } catch (err) {
      toast.error("Cleanup Failed", err.response?.data?.message || err.message);
    } finally {
      setCleaning(false);
    }
  };

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
      title: "Clean Ports",
      description: cleaning
        ? "Cleaning up allocated ports..."
        : "Release pseudo-allocated and orphaned deployment ports.",
      available: true,
      onClick: handleCleanupPorts,
      iconText: cleaning ? "..." : "⚡",
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
        <h1>Server Echohub</h1>

        <p>Manage your server and users.</p>
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
                if (card.onClick) {
                  card.onClick();
                } else if (card.route) {
                  navigate(card.route);
                }
              }
            }}
          >
            <div>
              <h2>{card.title}</h2>

              <p>{card.description}</p>
            </div>

            <span>{card.iconText || (card.available ? "→" : "Soon")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
