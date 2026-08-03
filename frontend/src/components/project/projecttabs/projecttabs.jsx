import "./projecttabs.css";

export default function ProjectTabs({ activeTab, onTabChange }) {
  const tabs = ["overview", "files", "environment", "deployments", "settings"];

  return (
    <div className="eh-project-tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`eh-project-tab ${activeTab === tab ? "active" : ""}`}
          onClick={() => onTabChange(tab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );
}
