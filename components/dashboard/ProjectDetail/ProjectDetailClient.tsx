"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, Database, Settings, Users, Zap, Briefcase, BarChart3, Target, Lock, Layers, Cpu, Workflow, Boxes } from "lucide-react";
import { useRouter } from "next/navigation";
import { Project } from "@/lib/project-actions";
import { getTasks } from "@/lib/task-actions";
import { getReportsWithProjects } from "@/lib/report-actions";
import { Task } from "@/lib/task-actions";
import dynamic from "next/dynamic";
import { ClientOnly } from "@/components/dashboard/ClientOnly";

const RapportsTable = dynamic(() => import("@/components/dashboard/RapportsTable"), { ssr: false });
const TasksTable = dynamic(() => import("@/components/dashboard/TasksTable"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

// Type aligné sur RapportsTable
type Report = {
  id: number;
  full_name: string;
  role: string;
  built: string;
  working_built: string;
  blocked: string;
  validated_learning: string;
  needed_learning: string;
  tomorrow_build: string;
  submitted_at: string;
  project_id: number | null;
  project_name: string;
  project_icon?: string;
};

// ── Icons Map ─────────────────────────────────────────────────────────────────

const AVAILABLE_ICONS = [
  { id: "database", component: Database },
  { id: "settings", component: Settings },
  { id: "users", component: Users },
  { id: "zap", component: Zap },
  { id: "briefcase", component: Briefcase },
  { id: "chart", component: BarChart3 },
  { id: "target", component: Target },
  { id: "lock", component: Lock },
  { id: "layers", component: Layers },
  { id: "cpu", component: Cpu },
  { id: "workflow", component: Workflow },
  { id: "boxes", component: Boxes },
];

function getIconComponent(iconId: string | null) {
  if (!iconId) return null;
  const icon = AVAILABLE_ICONS.find(i => i.id === iconId);
  return icon?.component || null;
}

// ── Tabs ───────────────────────────────────────────────────────────────────────

type Tab = "general" | "tasks" | "reports";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "general", label: "Général" },
  { id: "tasks", label: "Tâches" },
  { id: "reports", label: "Rapports" },
];

// ── Component ──────────────────────────────────────────────────────────────────

type Props = {
  project: Project;
};

export default function ProjectDetailClient({ project }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);

  const iconId = project.icon;

  // Charger les tâches du projet
  useEffect(() => {
    if (activeTab === "tasks") {
      (async () => {
        setLoadingTasks(true);
        const res = await getTasks();
        if ('success' in res && res.success && 'tasks' in res && res.tasks) {
          const projectTasks = res.tasks.filter(t => t.project_id === project.id);
          setTasks(projectTasks);
        } else if ('data' in res) {
          const projectTasks = res.data.filter(t => t.project_id === project.id);
          setTasks(projectTasks);
        }
        setLoadingTasks(false);
      })();
    }
  }, [activeTab, project.id]);

  // Charger les rapports du projet
  useEffect(() => {
    if (activeTab === "reports") {
      (async () => {
        setLoadingReports(true);
        const res = await getReportsWithProjects();
        if (res.success && res.reports) {
          // Mapper les champs de report-actions vers le type attendu par RapportsTable
          const projectReports: Report[] = res.reports
            .filter(r => r.project_id === project.id)
            .map(r => ({
              id:                  r.id,
              full_name:           r.full_name,
              role:                r.role,
              built:               r.work_built ?? "",        // work_built → built
              working_built:       r.working_built ?? "",
              blocked:             r.broken_features ?? "",   // broken_features → blocked
              validated_learning:  r.validated_learning ?? "",
              needed_learning:     r.needed_learning ?? "",
              tomorrow_build:      r.tomorrow_build ?? "",
              submitted_at:        r.created_at,
              project_id:          r.project_id,
              project_name:        r.project_name,
            }));

          setReports(projectReports);

          // Récupérer les rôles uniques
          const uniqueRoles = [...new Set(projectReports.map(r => r.role).filter(Boolean))];
          setRoles(uniqueRoles);

          // Passer le projet courant pour le filtre
          setProjects([{ id: project.id, name: project.name ?? "" }]);
        }
        setLoadingReports(false);
      })();
    }
  }, [activeTab, project.id, project.name]);

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      {/* Header avec back button */}
      <div style={{ background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => router.back()}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#F5F2ED",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(107,26,42,0.07)"}
            onMouseLeave={e => e.currentTarget.style.background = "#F5F2ED"}
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {IconComponent ? (
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(107,26,42,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6B1A2A",
                }}
              >
                {(() => {
                  const IconComponent = getIconComponent(iconId);
                  return IconComponent ? <IconComponent size={28} /> : null;
                })()}
              </div>
            ) : null}

            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1A1A1A", marginBottom: "2px" }}>
                {project.name}
              </h1>
              <p style={{ fontSize: "0.85rem", color: "#888" }}>
                {project.team_members?.length ?? 0} équipe{(project.team_members?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          gap: "2px",
          paddingLeft: "20px",
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {TABS.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "16px 20px",
                borderRadius: "0",
                border: "none",
                background: "transparent",
                color: isActive ? "#6B1A2A" : "#999",
                fontSize: "0.95rem",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                borderBottom: isActive ? "3px solid #6B1A2A" : "3px solid transparent",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px 20px" }}>
        {/* ── Général ── */}
        {activeTab === "general" && (
          <div>
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                border: "1.5px solid rgba(0,0,0,0.06)",
                padding: "24px",
                maxWidth: "700px",
              }}
            >
              {/* Description */}
              <div style={{ marginBottom: "24px" }}>
                <h3
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#999",
                    marginBottom: "8px",
                  }}
                >
                  Description
                </h3>
                <p style={{ fontSize: "0.95rem", color: "#666", lineHeight: 1.7 }}>
                  {project.description}
                </p>
              </div>

              {/* Équipes */}
              {project.team_members && project.team_members.length > 0 && (
                <div>
                  <h3
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#999",
                      marginBottom: "12px",
                    }}
                  >
                    Équipes assignées ({project.team_members.length})
                  </h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {project.team_members.map(member => (
                      <div
                        key={member.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "rgba(107,26,42,0.08)",
                          border: "1px solid rgba(107,26,42,0.15)",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: "#6B1A2A",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                          }}
                        >
                          {member.first_name?.[0] ?? ''}
                          {member.last_name?.[0] ?? ''}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A" }}>
                            {member.full_name}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "#999" }}>
                            {member.first_name ?? ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tâches ── */}
        {activeTab === "tasks" && (
          <div>
            {loadingTasks ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                Chargement des tâches...
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
                <p style={{ fontSize: "1rem", marginBottom: "4px" }}>Aucune tâche pour ce projet</p>
              </div>
            ) : (
              <ClientOnly>
                <TasksTable tasks={tasks} />
              </ClientOnly>
            )}
          </div>
        )}

        {/* ── Rapports ── */}
        {activeTab === "reports" && (
          <div>
            {loadingReports ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                Chargement des rapports...
              </div>
            ) : reports.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#999" }}>
                <p style={{ fontSize: "1rem", marginBottom: "4px" }}>Aucun rapport pour ce projet</p>
              </div>
            ) : (
              <ClientOnly>
                <RapportsTable reports={reports} roles={roles} projects={projects} />
              </ClientOnly>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
