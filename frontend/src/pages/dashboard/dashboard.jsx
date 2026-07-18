import Card from "../../components/common/Card/Card";
import "./Dashboard.css";

export default function Dashboard() {
  return (
    <div className="eh-dashboard">
      <Card title="Projects">0</Card>

      <Card title="Running Containers">0</Card>

      <Card title="Deployments">0</Card>

      <Card title="Recent Activity">Coming Soon</Card>
    </div>
  );
}
