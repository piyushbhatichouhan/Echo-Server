import Card from "../../components/common/card/card";
import "./dashboard.css";
import StatCard from "../../components/dashboard/StatCard/StatCard";
import useDashboard from "../../hooks/useDashboard";
import RecentProjects from "../../components/dashboard/RecentProjects/RecentProjects";
export default function Dashboard() {
  const {
    dashboard,

    loading,
  } = useDashboard();

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
          value={dashboard?.overview.storage}
          subtitle="Used"
          icon="💾"
        />
        <RecentProjects projects={dashboard?.projects.recent ?? []} />
      </div>
    </div>
  );
}
