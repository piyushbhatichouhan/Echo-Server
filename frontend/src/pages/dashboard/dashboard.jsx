import Card from "../../components/common/card/card";
import "./dashboard.css";
import StatCard from "../../components/dashboard/StatCard/StatCard";
import useDashboard from "../../hooks/useDashboard";
import RecentProjects from "../../components/dashboard/RecentProjects/RecentProjects";
import cloudWorkspace from "../../services/cloudWorkspace";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      const data = await cloudWorkspace.getStats();
      setStats(data);
    };

    load();
  }, []);

  const {
    dashboard,

    loading,
  } = useDashboard();

  const formatBytes = (bytes) => {
    if (bytes == null) return "Unlimited";

    const units = ["B", "KB", "MB", "GB", "TB"];

    let i = 0;
    let value = bytes;

    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }

    return `${value.toFixed(1)} ${units[i]}`;
  };

  let quotaUsed;

  if (stats !== null) {
    quotaUsed = `${formatBytes(stats.used)} / ${formatBytes(stats.limit)}`;
  } else {
    quotaUsed = "Loading...";
  }

  if (loading) {
    return <h2>Loading...</h2>;
  }

  return (
    <div className="eh-dashboard">
      <div className="dashboardStats">
        <StatCard
          title="Projects"
          value={dashboard?.overview.projects ?? 0}
          icon="📁"
        />

        <StatCard
          title="Running"
          value={dashboard?.overview.running ?? 0}
          subtitle="Active deployments"
          icon="🟢"
        />

        <StatCard
          title="Deployments"
          value={dashboard?.overview.deployments ?? 0}
          subtitle="Total"
          icon="🚀"
        />

        <StatCard
          title="Storage"
          value={quotaUsed}
          subtitle="Storage Used"
          icon="💾"
        />
      </div>
      <RecentProjects projects={dashboard?.projects.recent ?? []} />
    </div>
  );
}
