import { getProjects } from "@/lib/project-actions";
import ProjectsGrid from "@/components/dashboard/ProjectsGrid";

export const revalidate = 0; // désactive le cache

export default async function ProjectsPage() {
  const result = await getProjects();
  const projects = result.success ? result.projects! : [];

  return <ProjectsGrid projects={projects} />;
}