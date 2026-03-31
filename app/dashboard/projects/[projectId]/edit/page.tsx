"use server";

import { getProject } from "@/lib/project-actions";
import ProjectEditForm from "@/components/dashboard/ProjectDetail/ProjectEditForm";

type Params = {
  projectId: string;
};

export default async function ProjectEditPage(props: { params: Promise<Params> }) {
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

  return <ProjectEditForm project={result.project} />;
}
