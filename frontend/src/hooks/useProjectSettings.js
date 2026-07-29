import { useEffect, useState } from "react";

import {
  getProjectSettings,
  updateProjectSettings,
} from "../services/projectSettings.api";

export default function useProjectSettings(projectId) {
  const [project, setProject] = useState(null);
  const [settings, setSettings] = useState(null);

  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setLoading(true);

      const data = await getProjectSettings(projectId);

      setProject(data.project);
      setSettings(data.settings);
    } finally {
      setLoading(false);
    }
  };

  const save = async (newSettings) => {
    const updated = await updateProjectSettings(projectId, newSettings);

    setSettings(updated);

    return updated;
  };

  useEffect(() => {
    if (!projectId) return;

    refresh();
  }, [projectId]);

  return {
    project,
    settings,
    loading,
    refresh,
    save,
  };
}
