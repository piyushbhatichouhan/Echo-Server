import { useEffect, useState } from "react";

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
    <div>
      <StorageStats stats={stats} />

      <FileBrowser
        adapter={cloudWorkspace}
        mode="cloud"
        onStorageChange={refreshStats}
      />
    </div>
  );
}
