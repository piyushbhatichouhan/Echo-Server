import "./Storage.css";
import { useState } from "react";

import Overview from "./tabs/Overview";
import Users from "./tabs/Users";
import Projects from "./tabs/Projects";
import Cleanup from "./tabs/Cleanup";
import { useStorage } from "../../../hooks/useStorage";
export default function Storage() {
  const [activeTab, setActiveTab] = useState("overview");
  const {
    overview,
    users,
    projects,
    loading,
    refresh,
    updateQuota,
    restoreUser,
  } = useStorage();
  return (
    <div className="storagePage">
      <div className="storageHeader">
        <div>
          <h1>Storage Management</h1>

          <p>
            Monitor server storage usage, user quotas and project allocation.
          </p>
        </div>
      </div>
      <div className="storageTabs">
        <button
          className={`storageTab ${
            activeTab === "overview" ? "storageTab--active" : ""
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>

        <button
          className={`storageTab ${
            activeTab === "users" ? "storageTab--active" : ""
          }`}
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>

        <button
          className={`storageTab ${
            activeTab === "projects" ? "storageTab--active" : ""
          }`}
          onClick={() => setActiveTab("projects")}
        >
          Projects
        </button>

        <button
          className={`storageTab ${
            activeTab === "cleanup" ? "storageTab--active" : ""
          }`}
          onClick={() => setActiveTab("cleanup")}
        >
          Cleanup
        </button>
      </div>
      <div className="storageContent">
        <main className="storageContent">
          {activeTab === "overview" && (
            <Overview overview={overview} loading={loading} />
          )}
          {activeTab === "users" && (
            <Users
              users={users}
              refresh={refresh}
              loading={loading}
              updateQuota={updateQuota}
              restoreUser={restoreUser}
            />
          )}
          {activeTab === "projects" && (
            <Projects projects={projects} loading={loading} />
          )}
          {activeTab === "cleanup" && <Cleanup />}
        </main>
      </div>
    </div>
  );
}
