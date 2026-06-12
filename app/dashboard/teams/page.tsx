import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProjectsWithTasksForTeamMember } from "@/lib/team-actions";
import ProjectCardLink from "@/components/dashboard/ProjectCardLink";

export const revalidate = 0;

export default async function TeamProjectsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { id?: string };

  const teamMemberId = user.id ?? "";

  if (!teamMemberId) {
    redirect("/login");
  }

  const result = await getProjectsWithTasksForTeamMember(teamMemberId);
  const projects = result.success ? result.projects || [] : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Sticky Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#fff",
          padding: "20px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: 700,
              color: "#1A1A1A",
              marginBottom: "4px",
              margin: 0,
            }}
          >
            Mes Projets
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#666", margin: 0 }}>
            {projects.length} projet{projects.length !== 1 ? "s" : ""} &bull; Cliquez sur un projet
            pour gérer vos tâches
          </p>
        </div>
      </div>

      {/* Content - avec padding et border-radius */}
      <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {projects.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#999",
                background: "#fafafa",
                borderRadius: "0px",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <p style={{ fontSize: "1rem", marginBottom: "8px" }}>Aucun projet assigné</p>
              <p style={{ fontSize: "0.85rem" }}>
                Vous n&apos;êtes assigné à aucun projet pour le moment
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                background: "#ffffffff",
                gap: "12px",
              }}
            >
              {projects.map((project) => (
                <ProjectCardLink key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
