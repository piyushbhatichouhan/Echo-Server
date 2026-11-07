import "./server.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { cleanupPorts } from "../../services/server.api";
import { getSubdomainRequestStats } from "../../services/admin.api";

export default function Server() {
  const navigate = useNavigate();
  const toast = useToast();
  const [cleaning, setCleaning] = useState(false);
  const [subdomainStats, setSubdomainStats] = useState(null);

  useEffect(() => {
    getSubdomainRequestStats()
      .then((data) => setSubdomainStats(data))
      .catch(() => {});
  }, []);

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
      title: "Subdomain Requests",
      description: "Review and approve custom subdomain requests from developers.",
      available: true,
      route: "/server/subdomains",
      iconText: subdomainStats?.pending ? `${subdomainStats.pending} ⚡` : "🌐",
    },
    {
      title: "Broadcast Mailer",
      description: "Dispatch maintenance notices, feature releases, and targeted announcements to developers.",
      available: true,
      route: "/server/mailer",
      iconText: "📨",
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
      description: "Inspect live system, container, deployment, and API access logs.",
      available: true,
      route: "/server/logs",
      iconText: "📜",
    },
    {
      title: "Backups",
      description: "Manage database backups.",
      available: false,
    },
    {
      title: "Health",
      description: "Monitor server infrastructure, CPU, memory, Docker, and database telemetry.",
      available: true,
      route: "/server/health",
      iconText: "⚡",
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
