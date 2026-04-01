"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  Users,
  CheckSquare,
  FileText,
  Plus,
  Settings,
  X,
  Layers,
  Database,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Project, TeamMember, getTeams } from "@/lib/project-actions";
import { getTasks, Task, getTeamMembersByProject } from "@/lib/task-actions";
import { getReportsWithProjects } from "@/lib/report-actions";
import { updateProject } from "@/lib/project-actions";
import TMKanbanWrapper from "@/components/dashboard/TMKanbanWrapper";
import GanttChart from "@/components/dashboard/GanttChart";
import MilestoneModal from "@/components/dashboard/MilestoneModal";
import TaskFormModal from "@/components/dashboard/TaskFormModal";
import { getMilestones, type Milestone, deleteMilestone } from "@/lib/milestone-actions";

type ProjectExtended = Project & {
  description: string | null;
  created_at?: string | Date;
};

type Report = {
  id: number;
  full_name: string;
  role?: string;
  work_built?: string;
  working_built?: string;
  broken_features?: string;
  validated_learning?: string;
  needed_learning?: string;
  tomorrow_build?: string;
  extra_message?: string;
  created_at: string;
  submitted_at?: string;
  project_name?: string;
};

// ── Add Member Modal ──────────────────────────────────────────────────────────
function AddMemberModal({
  project,
  onClose,
  onSaved,
}: {
  project: ProjectExtended;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>(project.team_ids || []);
  const [teams, setTeams] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    async function loadTeams() {
      const result = await getTeams();
      if (result.success && result.teams) {
        setTeams(result.teams);
      }
    }
    loadTeams();
  }, []);

  function toggleTeam(id: number) {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    setLoading(true);
    const result = await updateProject(project.id, { team_ids: selectedTeamIds });
    setLoading(false);

    if (result.success) {
      onSaved();
      onClose();
    } else {
      setServerError(result.error || "Erreur lors de la modification.");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "0",
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid rgba(0,0,0,0.08)",
          animation: "popIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                color: "#aaa",
                marginBottom: 2,
              }}
            >
              Gestion équipe
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A" }}>
              {project.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#e8eaed",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              transition: "all 0.15s",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          {serverError && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: "0",
                background: "rgba(229,62,62,0.07)",
                border: "1px solid rgba(229,62,62,0.2)",
                fontSize: "0.8rem",
                color: "#e53e3e",
              }}
            >
              {serverError}
            </div>
          )}

          <p
            style={{
              fontSize: "0.85rem",
              color: "#666",
              marginBottom: 12,
            }}
          >
            Sélectionnez les membres de l&apos;équipe pour ce projet
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              padding: 10,
              background: "#e8eaed",
              borderRadius: "8px",
              border: "1.5px solid rgba(0,0,0,0.08)",
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            {teams.map((team) => (
              <label
                key={team.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  cursor: "pointer",
                  borderRadius: "0",
                  background: selectedTeamIds.includes(team.id)
                    ? "rgba(107,26,42,0.1)"
                    : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedTeamIds.includes(team.id)}
                  onChange={() => toggleTeam(team.id)}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.85rem", color: "#666" }}>{team.full_name}</span>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: "0",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                color: "#666",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: "0",
                border: "none",
                background: loading ? "rgba(107,26,42,0.5)" : "#6B1A2A",
                color: "white",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ── Reports Modal (Voir plus) ────────────────────────────────────────────────
function ReportsModal({
  reports,
  onClose,
  onReportClick,
}: {
  reports: Report[];
  onClose: () => void;
  onReportClick: (report: Report) => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "0",
          width: "100%",
          maxWidth: 600,
          maxHeight: "80vh",
          overflowY: "auto",
          border: "1px solid rgba(0,0,0,0.08)",
          animation: "popIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "0",
                background: "rgba(107,26,42,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={18} color="#6B1A2A" />
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#aaa",
                }}
              >
                Historique
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A" }}>
                Tous les rapports
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#e8eaed",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              transition: "all 0.15s",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          {reports.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
              Aucun rapport pour ce projet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => onReportClick(report)}
                  style={{
                    padding: "14px 16px",
                    background: "#f8f9fa",
                    borderRadius: "0",
                    border: "1px solid rgba(0,0,0,0.04)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e8eaed";
                    e.currentTarget.style.borderColor = "rgba(107,26,42,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f8f9fa";
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.04)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1A1A1A" }}>
                      {report.full_name}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#888" }}>
                      {new Date(report.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ── Report Detail Modal ──────────────────────────────────────────────────────
function ReportDetailModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const fields = [
    { key: "working_built", label: "En cours de construction" },
    { key: "extra_message", label: "Message supplémentaire" },
    { key: "broken_features", label: "Ce qui est cassé / bloqué" },
    { key: "validated_learning", label: "Apprentissages validés" },
    { key: "needed_learning", label: "Apprentissages nécessaires" },
    { key: "tomorrow_build", label: "Construction de demain" },
  ];

  function ReportField({ value }: { value: string | null | undefined }) {
    if (!value) return <div style={{ fontSize: "0.83rem", color: "#ccc" }}>Non renseigné</div>;
    return (
      <div
        style={{
          fontSize: "0.83rem",
          color: "#1A1A1A",
          background: "#e8eaed",
          borderRadius: "0",
          padding: "10px 14px",
          lineHeight: 1.6,
        }}
      >
        {value}
      </div>
    );
  }

  const reportAvatar = (name: string) => {
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
    return (
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "#6B1A2A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.9rem",
          fontWeight: 700,
          color: "#fff",
        }}
      >
        {initials}
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "0",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
          animation: "popIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {reportAvatar(report.full_name)}
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1A1A1A" }}>
                {report.full_name}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#aaa", marginTop: "2px" }}>
                {new Date(report.created_at).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#e8eaed",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              transition: "all 0.15s",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", padding: "24px", flex: 1 }}>
          {fields.map(({ key, label }) => {
            const value = report[key as keyof Report] as string | null | undefined;
            return (
              <div key={key} style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#aaa",
                    marginBottom: "8px",
                  }}
                >
                  {label}
                </label>
                <ReportField value={value} />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: "0",
              border: "1.5px solid rgba(0,0,0,0.08)",
              background: "#e8eaed",
              color: "#666",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e8e4df";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#e8eaed";
            }}
          >
            Fermer
          </button>
        </div>
      </div>
      <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProjectDashboard({ project }: { project: ProjectExtended }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "kanban" | "gantt">("overview");

  // Modals state
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [projectMembers, setProjectMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const tasksResult = await getTasks();
        const allTasks =
          "data" in tasksResult ? tasksResult.data : tasksResult.success ? tasksResult.tasks : [];
        setTasks((allTasks || []).filter((t: Task) => t.project_id === project.id));

        const reportsResult = await getReportsWithProjects();
        if (reportsResult.success && reportsResult.reports) {
          setReports(reportsResult.reports.filter((r) => r.project_id === project.id) as Report[]);
        }

        const milestonesResult = await getMilestones(project.id);
        if (milestonesResult.success && milestonesResult.milestones) {
          setMilestones(milestonesResult.milestones);
        }

        const membersResult = await getTeamMembersByProject(project.id);
        if (membersResult.success && membersResult.members) {
          setProjectMembers(membersResult.members);
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
  const inProgressTasks = tasks.filter((t) => t.status !== "terminée");
  const completedTasks = tasks.filter((t) => t.status === "terminée");
  const recentReports = reports.slice(0, 5);
  const totalTasks = tasks.length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Calculate remaining time
  function getRemainingTime() {
    if (!project.start_date || !project.end_date) return null;

    const now = new Date();
    const endDate = new Date(project.end_date);
    const startDate = new Date(project.start_date);

    // If project hasn't started yet
    if (now < startDate) {
      const daysUntilStart = Math.ceil(
        (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return `Début dans ${daysUntilStart}j`;
    }

    // If project has ended
    if (now > endDate) {
      const daysOverdue = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      return `Terminé il y a ${daysOverdue}j`;
    }

    // Project is ongoing - calculate remaining days
    const remainingDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (remainingDays > 30) {
      const remainingMonths = Math.floor(remainingDays / 30);
      const remainingDaysInMonth = remainingDays % 30;
      return remainingDaysInMonth > 0
        ? `${remainingMonths} mois ${remainingDaysInMonth}j restants`
        : `${remainingMonths} mois restants`;
    }

    return `${remainingDays}j restants`;
  }

  const remainingTime = getRemainingTime();

  // Calculate time progress percentage
  function getTimeProgress() {
    if (!project.start_date || !project.end_date) return 0;

    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);

    // If project hasn't started yet
    if (now < startDate) return 0;

    // If project has ended
    if (now > endDate) return 100;

    // Calculate progress
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    return Math.round((elapsed / totalDuration) * 100);
  }

  const timeProgress = getTimeProgress();

  // ── Helpers ────────────────────────────────────────────────────────────────
  const AVATAR_COLORS = [
    "#6B1A2A",
    "#8B2A3A",
    "#4A1020",
    "#9B3A4A",
    "#5A0A1A",
    "#7C2233",
    "#3A0D18",
  ];

  function getInitials(name = "") {
    return name
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  function getAvatarColor(name = "") {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function Avatar({ name, size = 40 }: { name: string; size?: number }) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: getAvatarColor(name),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.35,
          fontWeight: 700,
          color: "#fff",
          flexShrink: 0,
          border: "2px solid #fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {getInitials(name)}
      </div>
    );
  }

  function AvatarStack({
    members = [],
    size = 40,
  }: {
    members: typeof teamMembers;
    size?: number;
  }) {
    const visible = members.slice(0, 5);
    const extra = members.length - 5;
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        {visible.map((m, i) => (
          <div key={i} style={{ marginLeft: i === 0 ? 0 : -10 }}>
            <Avatar name={`${m.first_name || ""} ${m.last_name || ""}`} size={size} />
          </div>
        ))}
        {extra > 0 && (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: "#E8E2DA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: size * 0.32,
              fontWeight: 700,
              color: "#6B1A2A",
              marginLeft: -10,
              flexShrink: 0,
              border: "2px solid #fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            +{extra}
          </div>
        )}
      </div>
    );
  }

  function StatCard({
    label,
    value,
    icon: Icon,
    color = "#6B1A2A",
    subtext,
  }: {
    label: string;
    value: string | number;
    icon: React.ComponentType<{ size?: number; color?: string }>;
    color?: string;
    subtext?: string;
  }) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: "0",
          padding: "16px",
          border: "1px solid rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "0",
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 700, color: "#1A1A1A", lineHeight: 1.1 }}>
            {value}
          </div>
          {subtext && (
            <div style={{ fontSize: "0.7rem", color: "#888", marginTop: "2px" }}>{subtext}</div>
          )}
        </div>
      </div>
    );
  }

  function handleTaskSaved() {
    // Refresh tasks
    setLoading(true);
    getTasks().then((result) => {
      const allTasks = "data" in result ? result.data : result.success ? result.tasks : [];
      setTasks((allTasks || []).filter((t: Task) => t.project_id === project.id));
      setLoading(false);
    });
  }

  function handleMemberSaved() {
    // Refresh would be handled by parent component or SWR
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F2ED" }}>
      {/* Header */}
      <div
        style={{
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          padding: "12px 24px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => router.back()}
              style={{
                background: "none",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                color: "#666",
                borderRadius: "0",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e8eaed";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "0",
                  background: "rgba(107,26,42,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {project.icon === "database" && <Database size={28} color="#6B1A2A" />}
                {project.icon === "settings" && <Settings size={28} color="#6B1A2A" />}
                {project.icon === "users" && <Users size={28} color="#6B1A2A" />}
                {project.icon === "layers" && <Layers size={28} color="#6B1A2A" />}
                {project.icon === "file-text" && <FileText size={28} color="#6B1A2A" />}
                {project.icon === "check-square" && <CheckSquare size={28} color="#6B1A2A" />}
                {(!project.icon ||
                  ![
                    "database",
                    "settings",
                    "users",
                    "layers",
                    "file-text",
                    "check-square",
                  ].includes(project.icon)) && <FileText size={28} color="#6B1A2A" />}
              </div>
              <div>
                <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#1A1A1A", margin: 0 }}>
                  {project.name}
                </h1>
                <p style={{ fontSize: "0.9rem", color: "#666", margin: "4px 0 0" }}>
                  {project.description || "Aucune description"}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button
                onClick={() => router.push(`/dashboard/projects/${project.id}/edit`)}
                style={{
                  padding: "10px 14px",
                  background: "#e8eaed",
                  color: "#666",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: "0",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#dadbdc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#e8eaed";
                }}
                title="Modifier le projet"
              >
                <Settings size={18} />
                <span>Modifier</span>
              </button>
              <button
                onClick={() => setActiveTab("overview")}
                style={{
                  padding: "10px 20px",
                  background: activeTab === "overview" ? "#6B1A2A" : "#fff",
                  color: activeTab === "overview" ? "#fff" : "#666",
                  border: activeTab === "overview" ? "none" : "1px solid rgba(0,0,0,0.15)",
                  borderRadius: "0",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Vue d&apos;ensemble
              </button>
              <button
                onClick={() => setActiveTab("kanban")}
                style={{
                  padding: "10px 20px",
                  background: activeTab === "kanban" ? "#6B1A2A" : "#fff",
                  color: activeTab === "kanban" ? "#fff" : "#666",
                  border: activeTab === "kanban" ? "none" : "1px solid rgba(0,0,0,0.15)",
                  borderRadius: "0",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Kanban
              </button>
              <button
                onClick={() => setActiveTab("gantt")}
                style={{
                  padding: "10px 20px",
                  background: activeTab === "gantt" ? "#6B1A2A" : "#fff",
                  color: activeTab === "gantt" ? "#fff" : "#666",
                  border: activeTab === "gantt" ? "none" : "1px solid rgba(0,0,0,0.15)",
                  borderRadius: "0",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Gantt
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {activeTab === "overview" ? (
          <>
            {/* Stats Row - Asymmetric Layout */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1fr",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              {/* Team Card - Large */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "0",
                  padding: "16px",
                  border: "1px solid rgba(0,0,0,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "0",
                        background: "rgba(107,26,42,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >
                      <Users size={18} color="#6B1A2A" />
                    </div>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        color: "#888",
                        textTransform: "uppercase",
                      }}
                    >
                      Équipe
                    </span>
                  </div>
                  <span style={{ fontSize: "1.4rem", fontWeight: 700, color: "#6B1A2A" }}>
                    {teamMembers.length}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", minHeight: "44px" }}>
                  {teamMembers.length > 0 ? (
                    <AvatarStack members={teamMembers} size={40} />
                  ) : (
                    <span style={{ color: "#999", fontSize: "0.8rem" }}>Aucun membre</span>
                  )}
                </div>
              </div>

              {/* Tasks Stats */}
              <StatCard
                label="Tâches"
                value={totalTasks}
                icon={CheckSquare}
                color="#6B1A2A"
                subtext={`${completionRate}% terminées • ${inProgressTasks.length} en cours`}
              />

              {/* Time Progress */}
              <StatCard
                label="Progression"
                value={`${timeProgress}%`}
                icon={FileText}
                color="#2D7A4F"
                subtext={remainingTime || "Aucune échéance"}
              />
            </div>

            {/* Two Column Layout */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 360px",
                gap: "10px",
              }}
            >
              {/* Reports */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "0",
                  padding: "16px",
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "0",
                        background: "rgba(107,26,42,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >
                      <FileText size={16} color="#6B1A2A" />
                    </div>
                    <h3
                      style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1A1A1A", margin: 0 }}
                    >
                      Rapports
                    </h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#888" }}>
                      {reports.length} au total
                    </span>
                    {reports.length > 5 && (
                      <button
                        onClick={() => setShowReportsModal(true)}
                        style={{
                          padding: "5px 10px",
                          background: "#e8eaed",
                          color: "#666",
                          border: "1px solid rgba(0,0,0,0.1)",
                          borderRadius: "0",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#dadbdc";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#e8eaed";
                        }}
                      >
                        Voir plus
                      </button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#999" }}>
                    Chargement...
                  </div>
                ) : recentReports.length === 0 ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "#999" }}>
                    Aucun rapport pour ce projet
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {recentReports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        style={{
                          padding: "12px 14px",
                          background: "#f8f9fa",
                          borderRadius: "0",
                          border: "1px solid rgba(0,0,0,0.08)",
                          transition: "all 0.15s",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#e8eaed";
                          e.currentTarget.style.borderColor = "rgba(107,26,42,0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#f8f9fa";
                          e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1A1A1A" }}>
                            {report.full_name}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#888" }}>
                            {new Date(report.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions / Info */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "0",
                  padding: "16px",
                  border: "1px solid rgba(0,0,0,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#888",
                    textTransform: "uppercase",
                  }}
                >
                  Actions rapides
                </h3>

                <button
                  onClick={() => setShowCreateTask(true)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#6B1A2A",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#8B2A3A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#6B1A2A";
                  }}
                >
                  <Plus size={16} />
                  Nouvelle tâche
                </button>

                <button
                  onClick={() => setShowAddMember(true)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#e8eaed",
                    color: "#666",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: "0",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#dadbdc";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#e8eaed";
                  }}
                >
                  <Users size={16} />
                  Ajouter un membre
                </button>

                <div
                  style={{
                    marginTop: "auto",
                    padding: "12px",
                    background: "#f8f9fa",
                    borderRadius: "0",
                    border: "1px solid rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#888",
                      marginBottom: "8px",
                      fontWeight: 600,
                    }}
                  >
                    STATISTIQUES
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "5px",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", color: "#666" }}>Tâches en cours</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1A1A1A" }}>
                      {inProgressTasks.length}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "5px",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", color: "#666" }}>Tâches terminées</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1A1A1A" }}>
                      {completedTasks.length}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.8rem", color: "#666" }}>Rapports totaux</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1A1A1A" }}>
                      {reports.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === "kanban" ? (
          /* Kanban Tab */
          <div style={{ height: "calc(100vh - 200px)" }}>
            <TMKanbanWrapper
              tasks={tasks}
              isLoading={loading}
              projects={[{ id: project.id, name: project.name || "Projet" }]}
              selectedProjectId={project.id}
              onProjectChange={() => {}}
              onAddTask={() => setShowCreateTask(true)}
              isTM={true}
            />
          </div>
        ) : (
          /* Gantt Tab */
          <div
            style={{
              height: "calc(100vh - 200px)",
              background: "#fff",
              borderRadius: "0",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <GanttChart
              tasks={tasks}
              milestones={milestones}
              projectStart={project.start_date ? new Date(project.start_date) : null}
              projectEnd={project.end_date ? new Date(project.end_date) : null}
              projectId={project.id}
              teamMembers={teamMembers.map((m) => ({
                id: m.id,
                first_name: m.first_name || "",
                last_name: m.last_name || "",
              }))}
              onAddMilestone={() => {
                setEditingMilestone(null);
                setShowMilestoneModal(true);
              }}
              onEditMilestone={(milestone) => {
                setEditingMilestone(milestone);
                setShowMilestoneModal(true);
              }}
              onDeleteMilestone={async (id) => {
                const result = await deleteMilestone(id);
                if (result.success) {
                  setMilestones(milestones.filter((m) => m.id !== id));
                }
              }}
              onTaskUpdate={() => {
                // Refresh tasks
                const refreshData = async () => {
                  const tasksResult = await getTasks();
                  const allTasks =
                    "data" in tasksResult
                      ? tasksResult.data
                      : tasksResult.success
                        ? tasksResult.tasks
                        : [];
                  setTasks((allTasks || []).filter((t: Task) => t.project_id === project.id));

                  const milestonesResult = await getMilestones(project.id);
                  if (milestonesResult.success && milestonesResult.milestones) {
                    setMilestones(milestonesResult.milestones);
                  }
                };
                refreshData();
              }}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateTask && (
        <TaskFormModal
          show={showCreateTask}
          mode="create"
          task={null}
          projectId={project.id}
          teamMembers={projectMembers.map((m) => ({
            id: m.id,
            first_name: m.first_name || "",
            last_name: m.last_name || "",
          }))}
          onClose={() => setShowCreateTask(false)}
          onSuccess={handleTaskSaved}
        />
      )}

      {showAddMember && (
        <AddMemberModal
          project={project}
          onClose={() => setShowAddMember(false)}
          onSaved={handleMemberSaved}
        />
      )}

      {showReportsModal && (
        <ReportsModal
          reports={reports}
          onClose={() => setShowReportsModal(false)}
          onReportClick={(report) => {
            setShowReportsModal(false);
            setSelectedReport(report);
          }}
        />
      )}

      {selectedReport && (
        <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}

      {showMilestoneModal && (
        <MilestoneModal
          mode={editingMilestone ? "update" : "create"}
          milestone={editingMilestone}
          projectId={project.id}
          onClose={() => {
            setShowMilestoneModal(false);
            setEditingMilestone(null);
          }}
          onSaved={async () => {
            setShowMilestoneModal(false);
            setEditingMilestone(null);
            const result = await getMilestones(project.id);
            if (result.success && result.milestones) {
              setMilestones(result.milestones);
            }
          }}
        />
      )}
    </div>
  );
}
