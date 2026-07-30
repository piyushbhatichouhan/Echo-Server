import { useEffect, useState } from "react";

import StorageStats from "../../components/cloud/StorageStats/StorageStats";
import FileBrowser from "../../components/files/FileBrowser/FileBrowser";

import projectWorkspace from "../../services/projectWorkspace";
import cloudWorkspace from "../../services/cloudWorkspace";

export default function CloudStorage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      const data = await cloudWorkspace.getStats();
      setStats(data);
    };

    load();
  }, []);

  return (
    <div>
      <StorageStats stats={stats} />

      <FileBrowser adapter={cloudWorkspace} mode="cloud" />
    </div>
  );
}
