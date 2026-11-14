import "./projecttabs.css";

export default function ProjectTabs({ activeTab, onTabChange }) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "analytics", label: "Analytics" },
    { id: "files", label: "Files" },
    { id: "domains", label: "Domains & SSL" },
    { id: "environment", label: "Environment" },
    { id: "databases", label: "Databases" },
    { id: "terminal", label: "Terminal" },
    { id: "deployments", label: "Deployments & Git" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="eh-project-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`eh-project-tab ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div> 
  );
}
