import { getProjects } from "./project.api";

export const getDashboardData = async () => {
  const projects = await getProjects();

  return {
    projects,
  };
};
