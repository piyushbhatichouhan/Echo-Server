import { useEffect, useState } from "react";

import * as publicationApi from "../services/publication.api";

export default function usePublication(projectId) {
  const [publication, setPublication] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const pubrefresh = async () => {
    try {
      setLoading(true);

      const data = await publicationApi.getPublication(projectId);

      setPublication(data);

      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setPublication(null);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;

    pubrefresh();
  }, [projectId]);

  return {
    publication,
    loading,
    error,
    pubrefresh,
  };
}
