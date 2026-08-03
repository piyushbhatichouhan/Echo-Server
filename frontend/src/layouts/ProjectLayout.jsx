import { Outlet } from "react-router-dom";

import ProjectHeader from "../components/project/projectheader/projectheader";
import ProjectTabs from "../components/project/projecttabs/projecttabs";
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
