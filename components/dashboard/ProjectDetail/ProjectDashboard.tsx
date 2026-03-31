"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Plus, Users, CheckSquare, FileText, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { Project } from "@/lib/project-actions";
import { getTasks, Task } from "@/lib/task-actions";
import { getReportsWithProjects } from "@/lib/rapports-actions";

type ProjectExtended = Project & {
  description: string | null;
  created_at?: string | Date;
};

type TaskWithStatus = Task & {
  status?: string;
  completed?: boolean;
};

type TeamMember = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
};

type Report = {
  id: number;
  full_name: string;
  work_built: string;
  created_at: string;
};

export default function ProjectDashboard({ project }: { project: ProjectExtended }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const tasksResult = await getTasks();
        const allTasks =
          "data" in tasksResult ? tasksResult.data : tasksResult.success ? tasksResult.tasks : [];
        setTasks(allTasks.filter((t: Task) => t.project_id === project.id));

        const reportsResult = await getReportsWithProjects();
        if (reportsResult.success && reportsResult.reports) {
          setReports(reportsResult.reports.filter((r) => r.project_id === project.id));
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [project.id]);

  const teamMembers = project.team_members || [];
  const inProgressTasks = tasks.filter((t) => t.status !== "terminée" && !t.completed);
  const recentReports = reports.slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          padding: "16px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
              color: "#666",
              marginBottom: "12px",
            }}
          >
            <ChevronLeft size={18} />
            Retour
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
                {project.name}
              </h1>
              <p style={{ fontSize: "0.9rem", color: "#666", margin: "4px 0 0" }}>
                {project.description || "Aucune description"}
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                style={{
                  padding: "10px 16px",
                  background: "#6B1A2A",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Plus size={16} />
                Nouvelle tâche
              </button>
              <button
                style={{
                  padding: "10px 16px",
                  background: "#fff",
                  color: "#6B1A2A",
                  border: "1px solid #6B1A2A",
                  borderRadius: "0px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Users size={16} />
                Ajouter membre
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {/* Card: Membres de l'équipe */}
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              padding: "16px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}
            >
              <Users size={18} color="#6B1A2A" />
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1A1A1A", margin: 0 }}>
                Membres de l'équipe
              </h3>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "#6B1A2A",
                }}
              >
                {teamMembers.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {teamMembers.slice(0, 3).map((member: TeamMember) => (
                <div
                  key={member.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px",
                    background: "#e8eaed",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "#6B1A2A",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {(member.first_name?.[0] || "") + (member.last_name?.[0] || "")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A" }}>
                      {member.first_name} {member.last_name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#666" }}>{member.role}</div>
                  </div>
                </div>
              ))}
              {teamMembers.length > 3 && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#666",
                    textAlign: "center",
                    marginTop: "4px",
                  }}
                >
                  +{teamMembers.length - 3} autres
                </div>
              )}
            </div>
          </div>

          {/* Card: Tâches en cours */}
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              padding: "16px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}
            >
              <CheckSquare size={18} color="#6B1A2A" />
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1A1A1A", margin: 0 }}>
                Tâches en cours
              </h3>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "#6B1A2A",
                }}
              >
                {inProgressTasks.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {loading ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                  Chargement...
                </div>
              ) : inProgressTasks.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                  Aucune tâche en cours
                </div>
              ) : (
                inProgressTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: "10px",
                      background: "#e8eaed",
                      borderLeft: `3px solid ${task.priority === "haute" ? "#ef4444" : task.priority === "moyenne" ? "#f59e0b" : "#22c55e"}`,
                    }}
                  >
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A" }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "2px" }}>
                      {task.status || "en cours"}
                    </div>
                  </div>
                ))
              )}
              {inProgressTasks.length > 3 && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#666",
                    textAlign: "center",
                    marginTop: "4px",
                  }}
                >
                  +{inProgressTasks.length - 3} autres
                </div>
              )}
            </div>
          </div>

          {/* Card: Rapports récents */}
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.08)",
              padding: "16px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}
            >
              <FileText size={18} color="#6B1A2A" />
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1A1A1A", margin: 0 }}>
                Rapports récents
              </h3>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "#6B1A2A",
                }}
              >
                {reports.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {loading ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                  Chargement...
                </div>
              ) : recentReports.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                  Aucun rapport
                </div>
              ) : (
                recentReports.map((report) => (
                  <div
                    key={report.id}
                    style={{
                      padding: "10px",
                      background: "#e8eaed",
                    }}
                  >
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A" }}>
                      {report.full_name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "2px" }}>
                      {new Date(report.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sections détaillées */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
          {/* All Tasks */}
          <div
            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", padding: "20px" }}
          >
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "#1A1A1A",
                marginBottom: "16px",
              }}
            >
              Toutes les tâches
            </h3>
            <div>
              {/* Liste complète des tâches ici */}
              <p style={{ color: "#666", fontSize: "0.9rem" }}>
                {tasks.length} tâche{tasks.length !== 1 ? "s" : ""} au total
              </p>
            </div>
          </div>

          {/* All Reports */}
          <div
            style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", padding: "20px" }}
          >
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "#1A1A1A",
                marginBottom: "16px",
              }}
            >
              Tous les rapports
            </h3>
            <div>
              {/* Liste complète des rapports ici */}
              <p style={{ color: "#666", fontSize: "0.9rem" }}>
                {reports.length} rapport{reports.length !== 1 ? "s" : ""} au total
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
