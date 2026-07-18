import { useEffect, useState } from "react";

import { getProject } from "../services/project.api";

export default function useProject(id) {
  const [project, setProject] = useState(null);

  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await getProject(id);

      setProject(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      refresh();
    }
  }, [id]);

  return {
    project,
    loading,
    refresh,
  };
}
