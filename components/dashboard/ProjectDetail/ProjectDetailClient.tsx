"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  Database,
  Settings,
  Users,
  Zap,
  Briefcase,
  BarChart3,
  Target,
  Lock,
  Layers,
  Cpu,
  Workflow,
  Boxes,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Project } from "@/lib/project-actions";
import { getTasks } from "@/lib/task-actions";
import { getReportsWithProjects } from "@/lib/report-actions";
import { Task } from "@/lib/task-actions";
import dynamic from "next/dynamic";
import { ClientOnly } from "@/components/dashboard/ClientOnly";
import { useSession } from "next-auth/react";
import { isTeamManager } from "@/lib/permissions";

const RapportsTable = dynamic(() => import("@/components/dashboard/RapportsTable"), { ssr: false });
const TasksTable = dynamic(() => import("@/components/dashboard/TasksTable/"), { ssr: false });
const TeamsTable = dynamic(() => import("@/components/dashboard/TeamsTable"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

type TeamMember = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  phone: string | null;
  age: number | null;
  is_boss: boolean;
  slack_id: string | null;
  created_at: string;
  user_id: number | null;
  email: string | null;
  role: string | null;
};

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
  extra_message: string;
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

// ── Tabs ───────────────────────────────────────────────────────────────────────

type Tab = "team" | "tasks" | "reports";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "team", label: "Équipe" },
  { id: "tasks", label: "Tâches" },
  { id: "reports", label: "Rapports" },
];

// ── Component ──────────────────────────────────────────────────────────────────

type Props = {
  project: Project;
};

export default function ProjectDetailClient({ project }: Props) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? null;
  const isTM = isTeamManager(userRole);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("team");

  // ── States Équipe ─────────────────────────────────────────────────────────
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // ── States Tâches ─────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // ── States Rapports ───────────────────────────────────────────────────────
  const [reports, setReports] = useState<Report[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // ── Charger les membres du projet ─────────────────────────────────────────

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    const res = await fetch("/api/equipe?limit=100");
    const data = await res.json();
    if (data?.data) {
      const projectMembers = (data.data as TeamMember[]).filter((m) =>
        project.team_ids.includes(m.id)
      );
      setMembers(projectMembers);
    }
    setLoadingMembers(false);
  }, [project.team_ids]);

  useEffect(() => {
    if (activeTab !== "team") return;
    async function run() {
      await loadMembers();
    }
    void run();
  }, [activeTab, loadMembers]);

  // ── Charger les tâches du projet ──────────────────────────────────────────

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    const res = await getTasks();
    if ("success" in res && res.success && "tasks" in res && res.tasks) {
      setTasks(res.tasks.filter((t) => t.project_id === project.id));
    } else if ("data" in res) {
      setTasks(res.data.filter((t) => t.project_id === project.id));
    }
    setLoadingTasks(false);
  }, [project.id]);

  useEffect(() => {
    if (activeTab !== "tasks") return;
    async function run() {
      await loadTasks();
    }
    void run();
  }, [activeTab, loadTasks]);

  // ── Charger les rapports du projet ────────────────────────────────────────

  useEffect(() => {
    if (activeTab === "reports") {
      (async () => {
        setLoadingReports(true);
        const res = await getReportsWithProjects();
        if (res.success && res.reports) {
          const projectReports: Report[] = res.reports
            .filter((r) => r.project_id === project.id)
            .map((r) => ({
              id: r.id,
              full_name: r.full_name,
              role: r.role,
              built: r.work_built ?? "",
              working_built: r.working_built ?? "",
              blocked: r.broken_features ?? "",
              validated_learning: r.validated_learning ?? "",
              needed_learning: r.needed_learning ?? "",
              tomorrow_build: r.tomorrow_build ?? "",
              extra_message: r.extra_message ?? "",
              submitted_at: r.created_at,
              project_id: r.project_id,
              project_name: r.project_name,
            }));

          setReports(projectReports);
          setRoles([...new Set(projectReports.map((r) => r.role).filter(Boolean))]);
          setProjects([{ id: project.id, name: project.name ?? "" }]);
        }
        setLoadingReports(false);
      })();
    }
  }, [activeTab, project.id, project.name]);

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
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
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(107,26,42,0.07)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#F5F2ED")}
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {(() => {
              const icon = AVAILABLE_ICONS.find((i) => i.id === project.icon);
              if (!icon?.component) return null;
              const Icon = icon.component;
              return (
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
                  <Icon size={28} />
                </div>
              );
            })()}

            <div>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#1A1A1A",
                  marginBottom: "2px",
                }}
              >
                {project.name}
              </h1>
              <p style={{ fontSize: "0.85rem", color: "#888" }}>
                {project.team_members?.length ?? 0} équipe
                {(project.team_members?.length ?? 0) !== 1 ? "s" : ""}
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
        {TABS.map((tab) => {
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
        {/* ── Équipe ── */}
        {activeTab === "team" && (
          <ClientOnly>
            <TeamsTable
              members={members}
              roles={[...new Set(members.map((m) => m.role).filter(Boolean) as string[])]}
              loading={loadingMembers}
              readOnly={isTM}
              onPageChange={undefined}
              onSearch={undefined}
              totalItems={undefined}
              totalPages={undefined}
              currentPage={undefined}
            />
          </ClientOnly>
        )}

        {/* ── Tâches ── */}
        {activeTab === "tasks" && (
          <ClientOnly>
            <TasksTable
              tasks={tasks}
              loading={loadingTasks}
              isEmpty={!loadingTasks && tasks.length === 0}
              onRefresh={loadTasks}
              defaultProjectId={project.id}
            />
          </ClientOnly>
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
                <p style={{ fontSize: "1rem", marginBottom: "4px" }}>
                  Aucun rapport pour ce projet
                </p>
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
