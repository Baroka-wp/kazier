"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  CheckCircle2,
  XCircle,
  ArrowRight,
  CheckSquare,
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
} from "lucide-react";
import { createProject, getTeams, type Project, type TeamMember } from "@/lib/project-actions";
import { usePermissions } from "@/hooks/usePermissions";

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
const AVAILABLE_ICONS = Object.entries(ICON_MAP).map(([id, component]) => ({
  id,
  label: id.charAt(0).toUpperCase() + id.slice(1),
  component,
}));

const BOTTOM_BLOCKS = [
  {
    id: "tasks",
    label: "Tâches en cours",
    subtitle: "Cliquez pour voir",
    icon: CheckSquare,
    href: "/dashboard/tasks",
  },
  {
    id: "reports",
    label: "Reporting",
    subtitle: "Cliquez pour voir",
    icon: BarChart3,
    href: "/dashboard/rapports",
  },
];

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
        border: "2px solid #fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.32,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
        marginLeft: -8,
        border: "1px solid rgba(0,0,0,0.08)",
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

function CategoryBadge({ label }: { label?: string | null }) {
  if (!label) return null;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 9px",
        borderRadius: "0px",
        background: "rgba(107,26,42,0.08)",
        border: "1px solid rgba(107,26,42,0.15)",
        fontSize: "0.62rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: "#6B1A2A",
        textTransform: "uppercase" as const,
      }}
    >
      {label}
    </span>
  );
}

function ProgressBar({ value, height = 8 }: { value: number; height?: number }) {
  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: "50%",
        background: "rgba(107,26,42,0.1)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          borderRadius: "50%",
          background: "linear-gradient(90deg,#6B1A2A,#9B3A4A)",
          transition: "width 0.6s ease",
        }}
      />
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
        border: "1px solid rgba(0,0,0,0.08)",
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
    team_ids: [] as number[],
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
              background: "#F5F2ED",
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
                background: "#F5F2ED",
                borderRadius: "0px",
                border: "1.5px solid rgba(0,0,0,0.08)",
              }}
            >
              {AVAILABLE_ICONS.map(({ id, label, component: IC }) => (
                <button
                  key={id}
                  onClick={() => setField("icon", id)}
                  title={label}
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
                background: "#F5F2ED",
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
                background: "#F5F2ED",
                fontSize: "0.82rem",
                fontFamily: "'DM Sans',sans-serif",
                color: "#1A1A1A",
                outline: "none",
                resize: "vertical" as const,
                boxSizing: "border-box" as const,
              }}
            />
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
                background: "#F5F2ED",
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
                background: "#F5F2ED",
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

  const { data, mutate, isLoading } = useSWR<{ data: Project[] }>("/api/projects", fetcher, {
    dedupingInterval: 500,
  });
  const projects = data?.data ?? [];
  const featured = projects[0] ?? null;
  const smallProjects = projects.slice(1, 3);
  const allMembers = projects
    .flatMap((p) => p.team_members ?? [])
    .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
    .slice(0, 4);

  useEffect(() => {
    (async () => {
      const result = await getTeams();
      if (result.success && result.teams) setTeams(result.teams);
    })();
  }, []);

  function addToast(type: "success" | "error", message: string) {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  // ── card style helpers ────────────────────────────────────────────────────
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
          .pg-row2 { grid-template-columns: 1fr 1fr !important; }
        }
        @media(max-width:600px){
          .pg-row2 { grid-template-columns: 1fr !important; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
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
        {/* Loader pendant le chargement */}
        {isLoading && (
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
            <p
              style={{
                fontSize: "0.9rem",
                color: "#666",
                fontWeight: 500,
              }}
            >
              Chargement des projets...
            </p>
          </div>
        )}

        {!isLoading && (
          <>
            {/* ── Row 1 : Featured + Stats ── */}
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
                    border: "1.5px solid rgba(0,0,0,0.07)",
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
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "0px",
                          background: "rgba(107,26,42,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ProjectIcon iconId={featured.icon} size={22} />
                      </div>
                      <CategoryBadge label={featured.name} />
                    </div>
                    {(featured.team_members?.length ?? 0) > 0 && (
                      <AvatarStack members={featured.team_members!} size={34} />
                    )}
                  </div>
                  <h2
                    style={{
                      fontSize: "clamp(1.3rem,2.5vw,1.8rem)",
                      fontWeight: 700,
                      color: "#1A1A1A",
                      lineHeight: 1.2,
                      margin: 0,
                    }}
                  >
                    {featured.description || featured.name}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#999" }}>
                        Progress
                      </span>
                      <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "#6B1A2A" }}>
                        —
                      </span>
                    </div>
                    <ProgressBar value={0} height={9} />
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "#F5F2ED",
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

              {/* Stats */}
              <div
                style={{
                  background: "#6B1A2A",
                  borderRadius: "0px",
                  padding: "24px 20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
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
                      textTransform: "uppercase" as const,
                      color: "rgba(255,255,255,0.55)",
                      marginBottom: 5,
                    }}
                  >
                    ACTIF MAINTENANT
                  </p>
                  <p style={{ fontSize: "2.8rem", fontWeight: 800, lineHeight: 1, margin: 0 }}>
                    {projects.length}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {[
                    { label: "In Production", value: Math.ceil(projects.length * 0.66) },
                    { label: "Concept Phase", value: Math.floor(projects.length * 0.34) },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 12px",
                        borderRadius: "0px",
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.75)" }}>
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          background: "rgba(255,255,255,0.15)",
                          padding: "2px 9px",
                          borderRadius: "0px",
                        }}
                      >
                        {String(value).padStart(2, "0")}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push("/dashboard/projects");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "0px",
                    border: "none",
                    background: "#fff",
                    color: "#6B1A2A",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F5E8EA")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  Voir tout
                </button>
              </div>
            </div>

            {/* ── Row 2 : Small projects + New card ── */}
            <div
              className="pg-row2"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}
            >
              {smallProjects.map((project) => {
                const IC = project.icon ? ICON_MAP[project.icon] : null;
                return (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                    style={{
                      background: "#fff",
                      borderRadius: "0px",
                      padding: "20px",
                      border: "1.5px solid rgba(0,0,0,0.07)",
                      border: "1px solid rgba(0,0,0,0.08)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                    onMouseEnter={hoverEnter}
                    onMouseLeave={hoverLeave}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "9px",
                          background: "rgba(107,26,42,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {IC ? (
                          <IC size={20} color="#6B1A2A" />
                        ) : (
                          <Briefcase size={20} color="#6B1A2A" />
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          color: "#6B1A2A",
                          background: "rgba(107,26,42,0.08)",
                          padding: "3px 8px",
                          borderRadius: "0px",
                          border: "1px solid rgba(107,26,42,0.15)",
                        }}
                      >
                        {project.team_members?.length ?? 0} équipes
                      </span>
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          color: "#1A1A1A",
                          marginBottom: 3,
                        }}
                      >
                        {project.name}
                      </h3>
                      {project.description && (
                        <p
                          style={{
                            fontSize: "0.72rem",
                            color: "#999",
                            margin: 0,
                            lineHeight: 1.4,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical" as const,
                            overflow: "hidden",
                          }}
                        >
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        {(project.team_members?.length ?? 0) > 0 ? (
                          <AvatarStack members={project.team_members!} size={28} />
                        ) : (
                          <span style={{ fontSize: "0.7rem", color: "#ccc" }}>Aucun membre</span>
                        )}
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#aaa" }}>
                          —%
                        </span>
                      </div>
                      <ProgressBar value={0} height={5} />
                    </div>
                  </div>
                );
              })}

              {/* Placeholders */}
              {smallProjects.length < 2 &&
                Array.from({ length: 2 - smallProjects.length }).map((_, i) => (
                  <div
                    key={`ph-${i}`}
                    style={{
                      background: "#F5F2ED",
                      borderRadius: "0px",
                      padding: "20px",
                      border: "1.5px dashed rgba(0,0,0,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <p style={{ fontSize: "0.78rem", color: "#ccc" }}>Projet à venir</p>
                  </div>
                ))}

              {/* New project */}
              <div
                onClick={() => isSuperAdmin && setShowCreateModal(true)}
                style={{
                  background: "#F5F2ED",
                  borderRadius: "0px",
                  padding: "20px",
                  border: "1.5px dashed rgba(107,26,42,0.2)",
                  cursor: isSuperAdmin ? "pointer" : "default",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  textAlign: "center" as const,
                }}
                onMouseEnter={(e) => {
                  if (isSuperAdmin) {
                    e.currentTarget.style.background = "rgba(107,26,42,0.05)";
                    e.currentTarget.style.borderColor = "rgba(107,26,42,0.35)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#F5F2ED";
                  e.currentTarget.style.borderColor = "rgba(107,26,42,0.2)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    border: "2px dashed rgba(107,26,42,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={20} color="#6B1A2A" strokeWidth={2.5} />
                </div>
                <div>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: "#1A1A1A",
                      marginBottom: 3,
                    }}
                  >
                    Nouveau
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "#999", lineHeight: 1.4 }}>
                    {isSuperAdmin
                      ? "Initialize a fresh project for your team"
                      : "Droits insuffisants"}
                  </p>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateModal(true);
                    }}
                    style={{
                      padding: "7px 18px",
                      borderRadius: "0px",
                      border: "none",
                      background: "#6B1A2A",
                      color: "#fff",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                    }}
                  >
                    Démarrer
                  </button>
                )}
              </div>
            </div>

            {/* ── Row 3 : Bottom blocks ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {BOTTOM_BLOCKS.map(({ id, label, subtitle, icon: IC, href }) => (
                <div
                  key={id}
                  onClick={() => router.push(href)}
                  style={{
                    background: "#fff",
                    borderRadius: "0px",
                    padding: "18px 20px",
                    border: "1.5px solid rgba(0,0,0,0.07)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(107,26,42,0.1)";
                    e.currentTarget.style.borderColor = "rgba(107,26,42,0.15)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "0px",
                      background: "rgba(107,26,42,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IC size={20} color="#6B1A2A" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1A1A1A", margin: 0 }}>
                      {label}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "#aaa", margin: 0 }}>{subtitle}</p>
                  </div>
                  <AvatarStack members={allMembers} size={30} />
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      border: "1.5px solid rgba(0,0,0,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <ArrowRight size={14} color="#888" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateModal
          teams={teams}
          onClose={() => setShowCreateModal(false)}
          onSaved={async (project) => {
            addToast("success", `"${project.name}" créé avec succès !`);
            await mutate();
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
