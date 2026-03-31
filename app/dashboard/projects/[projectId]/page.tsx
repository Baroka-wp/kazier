"use server";

import { getProject } from "@/lib/project-actions";
import ProjectDashboard from "@/components/dashboard/ProjectDetail/ProjectDashboard";

type Params = {
  projectId: string;
};

export default async function ProjectDetailPage(props: { params: Promise<Params> }) {
  const params = await props.params;
  const projectId = parseInt(params.projectId, 10);

  const result = await getProject(projectId);

  if (!result.success) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
        <h1 style={{ fontSize: "1.5rem", color: "#666", marginBottom: "8px" }}>
          Projet non trouvé
        </h1>
        <p>{result.error}</p>
      </div>
    );
  }

  return <ProjectDashboard project={result.project} />;
}
