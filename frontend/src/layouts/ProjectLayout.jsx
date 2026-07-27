import { Outlet } from "react-router-dom";

import ProjectHeader from "../components/project/projectheader/ProjectHeader";
import ProjectTabs from "../components/project/projecttabs/ProjectTabs";
import { ProjectProvider } from "../context/ProjectContext";

export default function ProjectLayout() {
  return (
    <ProjectProvider>
      <ProjectHeader />

      <ProjectTabs />

      <Outlet />
    </ProjectProvider>
  );
}
