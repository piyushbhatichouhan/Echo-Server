import { useEffect, useState } from "react";

import * as projectFile from "../services/projectFiles.api";
export default function useFiles(projectId) {
  const [files, setFiles] = useState([]);

  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      //   const data = await getFiles(projectId);
      const data = await projectFile.getProjectFiles(projectId);
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
