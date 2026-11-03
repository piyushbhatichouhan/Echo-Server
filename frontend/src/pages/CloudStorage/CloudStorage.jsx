import { useEffect, useState } from "react";
import "./CloudStorage.css";

import StorageStats from "../../components/cloud/StorageStats/StorageStats";
import FileBrowser from "../../components/files/FileBrowser/FileBrowser";

import projectWorkspace from "../../services/projectWorkspace";
import cloudWorkspace from "../../services/cloudWorkspace";

export default function CloudStorage() {
  const [stats, setStats] = useState(null);

  const refreshStats = async () => {
    try {
      const data = await cloudWorkspace.getStats();
      setStats(data);
    } catch (e) {
      console.error("Failed to load cloud storage stats:", e);
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  return (
    <div className="eh-cloud-storage-page">
      <StorageStats stats={stats} title="Cloud & User Storage Quota" />

      <FileBrowser
        adapter={cloudWorkspace}
        mode="cloud"
        onStorageChange={refreshStats}
      />
    </div>
  );
}

