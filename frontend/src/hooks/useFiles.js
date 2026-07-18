import { useEffect, useState } from "react";

import { getFiles } from "../services/file.api";

export default function useFiles(projectId) {
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await getFiles(projectId);

      setFiles(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      refresh();
    }
  }, [projectId]);

  return {
    files,
    loading,
    refresh,
    setFiles,
  };
}
