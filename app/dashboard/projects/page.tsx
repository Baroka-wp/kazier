import ProjectsGrid from "@/components/dashboard/ProjectsGrid";

export const revalidate = 0; // désactive le cache

export default async function ProjectsPage() {
  // Note: ProjectsGrid utilisera SWR pour le fetch côté client
  // Cette page server-side est gardée pour compatibilité
  // return <ProjectsGrid projects={[]} />;
  return <ProjectsGrid />;
}
