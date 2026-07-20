import { useCallback, useEffect, useState } from "react";

import {
  getEnvironmentVariables,
  createEnvironmentVariable,
  updateEnvironmentVariable,
  deleteEnvironmentVariable,
} from "../services/environment.api";

export default function useEnvironment(projectId) {
  const [variables, setVariables] = useState([]);

  const [loading, setLoading] = useState(true);

  const refreshVariables = useCallback(async () => {
    const data = await getEnvironmentVariables(projectId);

    setVariables(data);
  }, [projectId]);

  const createVariable = async (payload) => {
    await createEnvironmentVariable(projectId, payload);

    await refreshVariables();
  };

  const updateVariable = async (id, payload) => {
    await updateEnvironmentVariable(projectId, id, payload);

    await refreshVariables();
  };

  const removeVariable = async (id) => {
    await deleteEnvironmentVariable(projectId, id);

    await refreshVariables();
  };

  useEffect(() => {
    if (!projectId) return;

    const load = async () => {
      try {
        await refreshVariables();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [projectId, refreshVariables]);

  return {
    variables,
    loading,

    createVariable,
    updateVariable,
    removeVariable,

    refreshVariables,
  };
}
