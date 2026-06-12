"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  CheckCircle2,
  XCircle,
  BarChart3,
  Briefcase,
  Database,
  Settings,
  Users,
  Zap,
  Target,
  Lock,
  Layers,
  Cpu,
  Workflow,
  Boxes,
  ArrowRight,
  FileText,
} from "lucide-react";
import { createProject, getTeams, type Project, type TeamMember } from "@/lib/project-actions";
import { usePermissions } from "@/hooks/usePermissions";
import type { Task } from "@/lib/task-actions";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  database: Database,
  settings: Settings,
  users: Users,
  zap: Zap,
  briefcase: Briefcase,
  chart: BarChart3,
  target: Target,
  lock: Lock,
  layers: Layers,
  cpu: Cpu,
  workflow: Workflow,
  boxes: Boxes,
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#6B1A2A", "#8B2A3A", "#4A1020", "#9B3A4A", "#5A0A1A", "#7C2233", "#3A0D18"];
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

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: getAvatarColor(name),
        border: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.32,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
        marginLeft: -8,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function AvatarStack({ members = [], size = 34 }: { members: TeamMember[]; size?: number }) {
  const visible = members.slice(0, 4);
  const extra = members.length - 4;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", paddingLeft: 8 }}>
        {visible.map((m, i) => (
          <Avatar key={i} name={m.full_name ?? m.first_name ?? "?"} size={size} />
        ))}
      </div>
      {extra > 0 && (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: "#E8E2DA",
            border: "2px solid #fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.3,
            fontWeight: 700,
            color: "#6B1A2A",
            marginLeft: -8,
            flexShrink: 0,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

function ToastNotification({
  toast,
  onClose,
}: {
  toast: { id: number; type: "success" | "error"; message: string };
  onClose: () => void;
}) {
  const ok = toast.type === "success";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#fff",
        border: `1.5px solid ${ok ? "rgba(45,122,79,0.2)" : "rgba(229,62,62,0.2)"}`,
        borderRadius: "0px",
        padding: "10px 14px",
        minWidth: 260,
        animation: "slideIn 0.25s ease",
      }}
    >
      {ok ? <CheckCircle2 size={16} color="#2D7A4F" /> : <XCircle size={16} color="#e53e3e" />}
      <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#1A1A1A", flex: 1 }}>
        {toast.message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#aaa",
          display: "flex",
          padding: 2,
        }}
      >
        <X size={13} />
      </button>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({
  teams,
  onClose,
  onSaved,
}: {
  teams: TeamMember[];
  onClose: () => void;
  onSaved: (p: Project) => void;
}) {
  const [values, setValues] = useState({
    name: "",
    description: "",
    icon: "",
    team_ids: [] as string[],
    start_date: "",
    end_date: "",
  });
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  function setField(key: string, value: string | number[]) {
    setValues((v) => ({ ...v, [key]: value }));
    setServerError("");
  }
  function toggleTeam(id: number) {
    setValues((v) => ({
      ...v,
      team_ids: v.team_ids.includes(id) ? v.team_ids.filter((x) => x !== id) : [...v.team_ids, id],
    }));
  }
  async function handleSubmit() {
    if (!values.name.trim()) {
      setServerError("Le nom est requis.");
      return;
    }
    setSaving(true);
    const result = await createProject({
      name: values.name,
      description: values.description,
      icon: values.icon || null,
      team_ids: values.team_ids,
      start_date: values.start_date || null,
      end_date: values.end_date || null,
    });
    setSaving(false);
    if (result.success) {
      onSaved(result.project);
      onClose();
    } else setServerError(result.error ?? "Erreur lors de la création.");
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 120,
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
          borderRadius: "0px",
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid rgba(0,0,0,0.08)",
          animation: "popIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
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
              Nouveau projet
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1A1A1A" }}>
              Ajouter un projet
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: "0px",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "#e8eaed",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
            }}
          >
            <X size={13} />
          </button>
        </div>

        <div style={{ padding: "16px 20px 20px" }}>
          {serverError && (
            <div
              style={{
                marginBottom: 10,
                padding: "7px 10px",
                borderRadius: "0px",
                background: "rgba(229,62,62,0.07)",
                border: "1px solid rgba(229,62,62,0.2)",
                fontSize: "0.78rem",
                color: "#e53e3e",
              }}
            >
              {serverError}
            </div>
          )}

          {/* Icons */}
          <div style={{ marginBottom: 14 }}>
            <small
              style={{
                display: "block",
                fontSize: "0.65rem",
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "#999",
                marginBottom: 7,
              }}
            >
              Icône du projet
            </small>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 7,
                padding: 9,
                background: "#e8eaed",
                borderRadius: "0px",
                border: "1.5px solid rgba(0,0,0,0.08)",
              }}
            >
              {Object.entries(ICON_MAP).map(([id, IC]) => (
                <button
                  key={id}
                  onClick={() => setField("icon", id)}
                  title={id}
                  style={{
                    width: "100%",
                    padding: 9,
                    borderRadius: "0px",
                    border:
                      values.icon === id ? "2px solid #6B1A2A" : "1.5px solid rgba(0,0,0,0.08)",
                    background: values.icon === id ? "rgba(107,26,42,0.1)" : "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: values.icon === id ? "#6B1A2A" : "#666",
                    transition: "all 0.15s",
                  }}
                >
                  <IC size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 9 }}>
            <small
              style={{
                display: "block",
                fontSize: "0.65rem",
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "#999",
                marginBottom: 4,
              }}
            >
              Nom
            </small>
            <input
              type="text"
              value={values.name}
              placeholder="Ex: Kazier"
              onChange={(e) => setField("name", e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "0px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                fontSize: "0.82rem",
                fontFamily: "'DM Sans',sans-serif",
                color: "#1A1A1A",
                outline: "none",
                boxSizing: "border-box" as const,
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 9 }}>
            <small
              style={{
                display: "block",
                fontSize: "0.65rem",
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "#999",
                marginBottom: 4,
              }}
            >
              Description
            </small>
            <textarea
              value={values.description}
              placeholder="Décrivez le projet..."
              onChange={(e) => setField("description", e.target.value)}
              style={{
                width: "100%",
                minHeight: 72,
                padding: "8px 10px",
                borderRadius: "0px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                fontSize: "0.82rem",
                fontFamily: "'DM Sans',sans-serif",
                color: "#1A1A1A",
                outline: "none",
                resize: "vertical" as const,
                boxSizing: "border-box" as const,
              }}
            />
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 9 }}>
            {/* Start Date */}
            <div>
              <small
                style={{
                  display: "block",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  color: "#999",
                  marginBottom: 4,
                }}
              >
                Début
              </small>
              <input
                type="date"
                value={values.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "0px",
                  border: "1.5px solid rgba(0,0,0,0.08)",
                  background: "#e8eaed",
                  fontSize: "0.82rem",
                  fontFamily: "'DM Sans',sans-serif",
                  color: "#1A1A1A",
                  outline: "none",
                  boxSizing: "border-box" as const,
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <small
                style={{
                  display: "block",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  color: "#999",
                  marginBottom: 4,
                }}
              >
                Fin
              </small>
              <input
                type="date"
                value={values.end_date}
                onChange={(e) => setField("end_date", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "0px",
                  border: "1.5px solid rgba(0,0,0,0.08)",
                  background: "#e8eaed",
                  fontSize: "0.82rem",
                  fontFamily: "'DM Sans',sans-serif",
                  color: "#1A1A1A",
                  outline: "none",
                  boxSizing: "border-box" as const,
                }}
              />
            </div>
          </div>

          {/* Teams */}
          <div style={{ marginBottom: 14 }}>
            <small
              style={{
                display: "block",
                fontSize: "0.65rem",
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "#999",
                marginBottom: 7,
              }}
            >
              Équipes ({values.team_ids.length})
            </small>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 7,
                padding: 9,
                background: "#e8eaed",
                borderRadius: "0px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                maxHeight: 180,
                overflowY: "auto",
              }}
            >
              {teams.length === 0 ? (
                <p style={{ fontSize: "0.78rem", color: "#999", gridColumn: "1 / -1" }}>
                  Aucune équipe disponible
                </p>
              ) : (
                teams.map((team) => (
                  <label
                    key={team.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 7px",
                      cursor: "pointer",
                      borderRadius: "0px",
                      background: values.team_ids.includes(team.id)
                        ? "rgba(107,26,42,0.1)"
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={values.team_ids.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                      style={{ cursor: "pointer" }}
                    />
                    <span
                      style={{ fontSize: "0.72rem", color: "#666", whiteSpace: "nowrap" as const }}
                    >
                      {team.full_name}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 9 }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                flex: 1,
                padding: 9,
                borderRadius: "0px",
                border: "1.5px solid rgba(0,0,0,0.08)",
                background: "#e8eaed",
                color: "#666",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                flex: 1,
                padding: 9,
                borderRadius: "0px",
                border: "none",
                background: "#6B1A2A",
                color: "#fff",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans',sans-serif",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Enregistrement..." : "Ajouter"}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

function ProjectIcon({ iconId, size = 22 }: { iconId?: string | null; size?: number }) {
  const IC = iconId ? ICON_MAP[iconId] : null;
  return IC ? <IC size={size} color="#6B1A2A" /> : <Briefcase size={size} color="#6B1A2A" />;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProjectsGrid() {
  const router = useRouter();
  const { isSuperAdmin } = usePermissions();

  const [teams, setTeams] = useState<TeamMember[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toasts, setToasts] = useState<
    { id: number; type: "success" | "error"; message: string }[]
  >([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const { data, mutate, isLoading } = useSWR<{ data: Project[] }>("/api/projects", fetcher, {
    dedupingInterval: 500,
  });
  const sortedProjects = (data?.data ?? []).sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });

  const projects = sortedProjects;
  const featured = projects[0] ?? null;
  const otherProjects = projects.slice(1);

  useEffect(() => {
    (async () => {
      const result = await getTeams();
      if (result.success && result.teams) setTeams(result.teams);
    })();
  }, []);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setTasksLoading(true);
        const result = await fetch("/api/tasks?limit=1000");
        const data = await result.json();
        const tasks: Task[] = data.data || [];
        setAllTasks(tasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setTasksLoading(false);
      }
    }
    fetchTasks();
  }, []);

  // Calculate time progress percentage (same as ProjectDashboard)
  const getProjectTimeProgress = (projectId: number): number => {
    const project = projects.find((p) => p.id === projectId);
    if (!project?.start_date || !project?.end_date) return 0;

    const now = new Date();
    const startDate = new Date(project.start_date);
    const endDate = new Date(project.end_date);

    if (now < startDate) return 0;
    if (now > endDate) return 100;

    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    return Math.round((elapsed / totalDuration) * 100);
  };

  // Get remaining time info
  const getRemainingTimeInfo = (projectId: number): { days: number; isUrgent: boolean } => {
    const project = projects.find((p) => p.id === projectId);
    if (!project?.end_date) return { days: 0, isUrgent: false };

    const now = Date.now();
    const endDate = new Date(project.end_date).getTime();
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

    return { days: Math.max(0, daysLeft), isUrgent: daysLeft <= 3 };
  };

  const getGlobalKPIs = () => {
    const tasksEnCours = allTasks.filter((t) => t.status === "en cours").length;
    const activeProjectIds = new Set<number>();
    allTasks.forEach((task) => {
      if ((task.status === "en cours" || task.status === "à faire") && task.project_id) {
        activeProjectIds.add(task.project_id);
      }
    });
    const activeProjects = projects.filter((p) => activeProjectIds.has(p.id));
    return { tasksEnCours, activeProjects };
  };

  function addToast(type: "success" | "error", message: string) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  const hoverEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.boxShadow = "0 8px 24px rgba(107,26,42,0.13)";
    e.currentTarget.style.borderColor = "rgba(107,26,42,0.18)";
    e.currentTarget.style.transform = "translateY(-2px)";
  };
  const hoverLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
    e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)";
    e.currentTarget.style.transform = "translateY(0)";
  };

  return (
    <>
      <style>{`
        @media(max-width:900px){
          .pg-row1 { grid-template-columns: 1fr !important; }
          .pg-row2 { grid-template-columns: 1fr !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        style={{
          padding: "16px",
          maxWidth: 1100,
          margin: "0 auto",
          fontFamily: "'DM Sans',sans-serif",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 20px",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid rgba(107,26,42,0.1)",
                borderTopColor: "#6B1A2A",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>
              Chargement des projets...
            </p>
          </div>
        ) : (
          <>
            {/* Top Block - Reports */}
            <div
              style={{
                marginBottom: 8,
              }}
            >
              <div
                onClick={() => router.push("/dashboard/rapports")}
                style={{
                  background: "#F8F6F3",
                  borderRadius: "0px",
                  padding: "20px 24px",
                  border: "1.5px dashed rgba(107,26,42,0.25)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(107,26,42,0.05)";
                  e.currentTarget.style.borderColor = "#6B1A2A";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#F8F6F3";
                  e.currentTarget.style.borderColor = "rgba(107,26,42,0.25)";
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "0px",
                    background: "rgba(107,26,42,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6B1A2A",
                  }}
                >
                  <FileText size={26} strokeWidth={1.5} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#6B1A2A",
                      margin: "0 0 4px 0",
                    }}
                  >
                    Rapports
                  </p>
                  <p style={{ fontSize: "0.7rem", color: "#999", margin: 0 }}>
                    Voir tous les rapports
                  </p>
                </div>
              </div>
            </div>

            {/* Row 1 : Featured + Stats */}
            <div
              className="pg-row1"
              style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: 16 }}
            >
              {/* Featured */}
              {featured ? (
                <div
                  onClick={() => router.push(`/dashboard/projects/${featured.id}`)}
                  style={{
                    background: "#fff",
                    borderRadius: "0px",
                    padding: "24px 28px",
                    border: "1px solid rgba(0,0,0,0.08)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                  }}
                  onMouseEnter={hoverEnter}
                  onMouseLeave={hoverLeave}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "0px",
                          background: "rgba(107,26,42,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <ProjectIcon iconId={featured.icon} size={24} />
                      </div>
                      <h3
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: 700,
                          color: "#1A1A1A",
                          margin: 0,
                          lineHeight: 1.2,
                        }}
                      >
                        {featured.name}
                      </h3>
                    </div>
                    {(featured.team_members?.length ?? 0) > 0 && (
                      <AvatarStack members={featured.team_members!} size={34} />
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "#666",
                      margin: "8px 0 0 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {featured.description || "Aucune description"}
                  </p>

                  {/* Time-based progress info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      background: "rgba(247,243,237,0.6)",
                      borderRadius: "0px",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "#888",
                          }}
                        >
                          Progression
                        </span>
                        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#6B1A2A" }}>
                          {tasksLoading ? "..." : `${getProjectTimeProgress(featured.id)}%`}
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 6,
                          borderRadius: "0px",
                          background: "rgba(107,26,42,0.1)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${getProjectTimeProgress(featured.id)}%`,
                            height: "100%",
                            background: "linear-gradient(90deg,#6B1A2A,#9B3A4A)",
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ width: "1px", height: "40px", background: "rgba(0,0,0,0.08)" }} />
                    <div style={{ textAlign: "center" }}>
                      {(() => {
                        const { days, isUrgent } = getRemainingTimeInfo(featured.id);
                        return (
                          <>
                            <div
                              style={{
                                fontSize: "1.4rem",
                                fontWeight: 800,
                                color: isUrgent ? "#dc2626" : "#6B1A2A",
                              }}
                            >
                              {tasksLoading ? "..." : `${days}j`}
                            </div>
                            <div
                              style={{
                                fontSize: "0.6rem",
                                fontWeight: 600,
                                color: "#888",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              {isUrgent ? "Urgent" : "Restant"}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "#e8eaed",
                    borderRadius: "0px",
                    padding: "24px 28px",
                    border: "1.5px dashed rgba(107,26,42,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <p style={{ color: "#aaa", fontSize: "0.88rem" }}>Aucun projet disponible</p>
                </div>
              )}

              {/* Stats Block - Red */}
              <div
                style={{
                  background: "#6B1A2A",
                  borderRadius: "0px",
                  padding: "24px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  color: "#fff",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.55)",
                      marginBottom: 5,
                    }}
                  >
                    TÂCHES EN COURS
                  </p>
                  <p style={{ fontSize: "2.8rem", fontWeight: 800, lineHeight: 1, margin: 0 }}>
                    {tasksLoading ? "..." : getGlobalKPIs().tasksEnCours}
                  </p>
                </div>

                {/* Active projects list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p
                    style={{
                      fontSize: "0.55rem",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.45)",
                      marginBottom: 2,
                    }}
                  >
                    PROJETS ACTIFS
                  </p>
                  {tasksLoading ? (
                    <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)" }}>
                      Chargement...
                    </p>
                  ) : getGlobalKPIs().activeProjects.length === 0 ? (
                    <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
                      Aucun projet actif
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {getGlobalKPIs()
                        .activeProjects.slice(0, 4)
                        .map((project) => (
                          <div
                            key={project.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 8px",
                              borderRadius: "0px",
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#4CAF50",
                              }}
                            />
                            <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.85)" }}>
                              {project.name}
                            </span>
                          </div>
                        ))}
                      {getGlobalKPIs().activeProjects.length > 4 && (
                        <p style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)" }}>
                          +{getGlobalKPIs().activeProjects.length - 4} autres
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Open Kanban Button */}
                {featured && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push("/dashboard/tasks");
                    }}
                    style={{
                      marginTop: "auto",
                      width: "100%",
                      padding: "12px",
                      borderRadius: "0px",
                      border: "none",
                      background: "#fff",
                      color: "#6B1A2A",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F5E8EA")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <span>OUVRIR LE KANBAN</span>
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Row 2 : All other projects */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {otherProjects.map((project) => {
                const IC = project.icon ? ICON_MAP[project.icon] : null;
                const timeProgress = getProjectTimeProgress(project.id);

                return (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    style={{
                      background: "#fff",
                      borderRadius: "0px",
                      padding: "20px",
                      border: "1px solid rgba(0,0,0,0.08)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                    onMouseEnter={hoverEnter}
                    onMouseLeave={hoverLeave}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "0px",
                          background: "rgba(107,26,42,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {IC ? <IC size={24} /> : <Briefcase size={24} color="#6B1A2A" />}
                      </div>
                      <h3
                        style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: "#1A1A1A",
                          margin: 0,
                          lineHeight: 1.2,
                          flex: 1,
                        }}
                      >
                        {project.name}
                      </h3>
                    </div>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#666",
                        margin: 0,
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        minHeight: "2.24rem",
                      }}
                    >
                      {project.description || "Aucune description"}
                    </p>

                    {/* Progress bar */}
                    <div style={{ marginTop: "auto" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "#888",
                          }}
                        >
                          Progression
                        </span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#6B1A2A" }}>
                          {tasksLoading ? "..." : timeProgress}%
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 6,
                          borderRadius: "0px",
                          background: "rgba(107,26,42,0.1)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${timeProgress}%`,
                            height: "100%",
                            background: "linear-gradient(90deg,#6B1A2A,#9B3A4A)",
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                    </div>

                    {(project.team_members?.length ?? 0) > 0 && (
                      <AvatarStack members={project.team_members!} size={30} />
                    )}
                  </div>
                );
              })}

              {/* New Project Card */}
              {isSuperAdmin && (
                <div
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    background: "#F8F6F3",
                    borderRadius: "0px",
                    padding: "20px",
                    border: "1.5px dashed rgba(107,26,42,0.25)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    minHeight: 180,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(107,26,42,0.05)";
                    e.currentTarget.style.borderColor = "#6B1A2A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#F8F6F3";
                    e.currentTarget.style.borderColor = "rgba(107,26,42,0.25)";
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "0px",
                      background: "rgba(107,26,42,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6B1A2A",
                    }}
                  >
                    <Plus size={26} strokeWidth={1.5} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: "#6B1A2A",
                        margin: "0 0 4px 0",
                      }}
                    >
                      Nouveau projet
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "#999", margin: 0 }}>
                      Créer un nouveau projet
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateModal
          teams={teams}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            mutate();
            setShowCreateModal(false);
            addToast("success", "Projet créé avec succès");
          }}
        />
      )}

      {toasts.map((t) => (
        <ToastNotification
          key={t.id}
          toast={t}
          onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
        />
      ))}
    </>
  );
}
