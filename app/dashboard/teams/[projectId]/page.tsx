import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProjectsWithTasksForTeamMember } from "@/lib/team-actions";
import TeamsProjectPageClient from "@/components/dashboard/TeamsProjectPageClient";

export const metadata: Metadata = {
  title: "Équipe - Dashboard",
  description: "Tableau Kanban des tâches de l'équipe",
};

type Params = {
  projectId: string;
};

export default async function TeamProjectsPage(props: { params: Promise<Params> }) {
  const params = await props.params;
  const session = await auth();

  if (!session || !session.user) {
    redirect("/auth/login");
  }

  const teamMemberId = parseInt((session.user as { team_id?: string }).team_id ?? "0");
  const res = await getProjectsWithTasksForTeamMember(teamMemberId);

  if (!res.success || !res.projects) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
        Erreur lors du chargement des projets.
      </div>
    );
  }

  const project = res.projects.find((p) => p.id === parseInt(params.projectId));

  if (!project) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>Projet non trouvé.</div>
    );
  }

  return (
    <TeamsProjectPageClient
      tasks={project.tasks}
      teamMemberId={teamMemberId}
      projectName={project.name}
    />
  );
}
