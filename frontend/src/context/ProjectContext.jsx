import { createContext, useContext, useEffect, useState } from "react";

import { useParams } from "react-router-dom";

import { getProject } from "../services/project.api";

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const { id } = useParams();

  const [project, setProject] = useState(null);

  const [loading, setLoading] = useState(true);

  const loadProject = async () => {
    setLoading(true);

    try {
      const data = await getProject(id);

      setProject(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  return (
    <ProjectContext.Provider
      value={{
        project,

        loading,

        refresh: loadProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export default function useProject() {
  return useContext(ProjectContext);
}
