import { useEffect, useState } from "react";

import { getProjects } from "../services/project.api";

export default function useProjects() {
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await getProjects();

      setProjects(data);
    } finally {
      setLoading(false);
    }
  };

  return {
    projects,
    loading,
    refresh: loadProjects,
  };
}
