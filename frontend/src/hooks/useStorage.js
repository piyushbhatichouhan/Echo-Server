import { useEffect, useState } from "react";

import * as storageApi from "../services/storage.api";

export const useStorage = () => {
  const [overview, setOverview] = useState(null);

  const [users, setUsers] = useState([]);

  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);

    try {
      const [overviewData, usersData, projectsData] = await Promise.all([
        storageApi.getOverview(),
        storageApi.getUsers(),
        storageApi.getProjects(),
      ]);

      setOverview(overviewData);
      setUsers(usersData);
      setProjects(projectsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return {
    overview,
    users,
    projects,
    loading,
    refresh,

    updateStorageLimit: storageApi.updateStorageLimit,
    updateQuota: storageApi.updateQuota,
  };
};
