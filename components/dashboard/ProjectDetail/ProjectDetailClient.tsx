"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  CheckCircle2,
  FileText,
  Users2,
  ChevronRight,
  Trash2,
  X,
  Calendar,
  File,
  ImageIcon,
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Project } from "@/lib/project-actions";
import { getTasks, Task } from "@/lib/task-actions";
import dynamic from "next/dynamic";
import { ClientOnly } from "@/components/dashboard/ClientOnly";
import { useSession } from "next-auth/react";
import { isTeamManager } from "@/lib/permissions";

const RapportsTable = dynamic(() => import("@/components/dashboard/RapportsTable"), { ssr: false });
const TasksTable = dynamic(() => import("@/components/dashboard/TasksTable/"), { ssr: false });
const TeamsTable = dynamic(() => import("@/components/dashboard/TeamsTable"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

type ProjectFile = {
  name: string;
  type: string;
  size: string;
};

/** Project enrichi avec les champs absents du type partagé */
type ProjectExtended = Project & {
  description: string | null;
  created_at?: string | Date; // Acceptation des deux formats pour éviter les erreurs TS
  files?: ProjectFile[];
};

type TaskWithStatus = Task & {
  status?: string;
  completed?: boolean;
};

type TeamMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  phone: string | null;
  age: number | null;
  is_boss: boolean;
  slack_id: string | null;
  created_at: string;
  user_id: string | null;
  email: string | null;
  role: string | null;
};

type Report = {
  id: string;
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

type GetTasksResult =
  | { success: true; tasks: Task[] }
  | { success: false; error: string }
  | { data: Task[] };

type Tab = "overview" | "team" | "tasks" | "reports";

const avatarColors = ["#6B1A2A", "#A0522D", "#2E6B5E", "#2C4A7C", "#5B3A8E"];

// ── Helpers (Sortis du rendu pour éviter les erreurs React/Performance) ───────

function getInitials(name: string): string {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function resolveTasksFromResult(res: GetTasksResult): Task[] {
  if ("data" in res) return res.data;
  if (res.success && "tasks" in res) return res.tasks;
  return [];
}

// ── Sub-Components ────────────────────────────────────────────────────────────

type SettingModalProps = {
  project: ProjectExtended;
  onClose: () => void;
  onSave: (updated: Pick<ProjectExtended, "name" | "description">) => void;
  onDelete: () => void;
};

function SettingModal({ project, onClose, onSave, onDelete }: SettingModalProps) {
  const [name, setName] = useState(project.name ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          padding: "28px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#999",
            display: "flex",
          }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1A1A1A", marginBottom: "24px" }}>
          Paramètres du projet
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#555",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Nom du projet
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.12)",
              fontSize: "0.95rem",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#555",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(0,0,0,0.12)",
              fontSize: "0.95rem",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => onSave({ name, description })}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: "#6B1A2A",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Enregistrer
          </button>

          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #e53935",
                background: "transparent",
                color: "#e53935",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Trash2 size={16} /> Supprimer
            </button>
          ) : (
            <button
              onClick={onDelete}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                background: "#e53935",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Confirmer ?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

type Props = {
  project: ProjectExtended;
};

export default function ProjectDetailClient({ project }: Props) {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? null;

  const isTM = isTeamManager(userRole); // Marqué comme unused si non utilisé
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showSettings, setShowSettings] = useState(false);

  const tabSectionRef = useRef<HTMLDivElement>(null);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const completedTasks = tasks.filter((t) => t.status === "terminée" || t.completed).length;
  const inProgressTasks = tasks.filter((t) => t.status !== "terminée" && !t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = (await getTasks()) as GetTasksResult;
      const all = resolveTasksFromResult(res) as TaskWithStatus[];
      setTasks(all.filter((t) => t.project_id === project.id));
    } catch (e) {
      console.error(e);
    }
    setLoadingTasks(false);
  }, [project.id]);

  //  Scroll effect (inchangé)
  useEffect(() => {
    if (activeTab !== "overview" && tabSectionRef.current) {
      setTimeout(() => {
        tabSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [activeTab]);

  const createdAt = project.created_at
    ? new Date(project.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const recentFiles: ProjectFile[] = project.files ?? [];

  return (
    <>
      {showSettings && (
        <SettingModal
          project={project}
          onClose={() => setShowSettings(false)}
          onSave={() => setShowSettings(false)}
          onDelete={() => router.back()}
        />
      )}

      <div
        style={{ minHeight: "100vh", background: "#e8eaed", fontFamily: "'DM Sans', sans-serif" }}
      >
        <div
          style={{
            background: "#e8eaed",
            padding: "20px 28px 0",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#888",
              fontSize: "0.85rem",
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              padding: "4px 0",
            }}
          >
            <ChevronLeft size={16} />
            RETOUR
          </button>
        </div>

        <div style={{ padding: "20px 28px 40px", maxWidth: "1200px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "28px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  color: "#1A1A1A",
                  marginBottom: "10px",
                  letterSpacing: "-0.5px",
                }}
              >
                {project.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex" }}>
                  {members.slice(0, 3).map((m, i) => (
                    <div
                      key={m.id}
                      title={m.full_name}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: avatarColors[i % avatarColors.length],
                        border: "2px solid #e8eaed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        marginLeft: i === 0 ? 0 : "-8px",
                        zIndex: 3 - i,
                        position: "relative",
                      }}
                    >
                      {getInitials(m.full_name)}
                    </div>
                  ))}
                  {members.length > 3 && (
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "#E0D8D0",
                        border: "2px solid #e8eaed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#666",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        marginLeft: "-8px",
                        position: "relative",
                      }}
                    >
                      +{members.length - 3}
                    </div>
                  )}
                </div>
                <span style={{ color: "#888", fontSize: "0.9rem" }}>
                  {members.length} membre{members.length !== 1 ? "s" : ""} actif
                  {members.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "10px",
                border: "none",
                background: "#6B1A2A",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Settings size={16} />
              Setting
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: "20px",
              alignItems: "start",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                  }}
                >
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A" }}>
                    Avancement des tâches
                  </span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#6B1A2A" }}>
                    {progressPercent}%
                  </span>
                </div>
                <div
                  style={{
                    height: "10px",
                    borderRadius: "999px",
                    background: "#EDE8E3",
                    overflow: "hidden",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progressPercent}%`,
                      background: "#6B1A2A",
                      borderRadius: "10px",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.85rem", color: "#888" }}>
                    Tâches terminées {completedTasks}/{totalTasks}
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2E6B5E" }}>
                    Dans les temps
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#1A1A1A",
                    marginBottom: "12px",
                  }}
                >
                  Description du projet
                </h3>
                {project.description ? (
                  <p style={{ fontSize: "0.92rem", color: "#555", lineHeight: 1.7 }}>
                    {project.description}
                  </p>
                ) : (
                  <p style={{ fontSize: "0.92rem", color: "#aaa", fontStyle: "italic" }}>
                    Aucune description renseignée.
                  </p>
                )}
              </div>

              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1A1A1A" }}>
                    Fichiers Récents
                  </h3>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#6B1A2A",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Tout voir
                  </button>
                </div>
                {recentFiles.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {recentFiles.slice(0, 4).map((file, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "14px",
                          borderRadius: "10px",
                          border: "1px solid rgba(0,0,0,0.07)",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                      >
                        <div style={{ color: "#6B1A2A" }}>
                          {file.type?.includes("image") ? (
                            <ImageIcon size={20} />
                          ) : (
                            <File size={20} />
                          )}
                        </div>
                        <div>
                          <p
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: "#1A1A1A",
                              marginBottom: "2px",
                            }}
                          >
                            {file.name}
                          </p>
                          <p style={{ fontSize: "0.75rem", color: "#999" }}>{file.size}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "0.88rem", color: "#bbb", fontStyle: "italic" }}>
                    Aucun fichier récent.
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#999",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: "-4px",
                }}
              >
                PERFORMANCE DU PROJET
              </p>

              <div
                onClick={() => setActiveTab("tasks")}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "#F0EDE8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6B1A2A",
                    }}
                  >
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "#1A1A1A",
                        lineHeight: 1,
                      }}
                    >
                      {loadingTasks ? "…" : inProgressTasks}
                    </p>
                    <p style={{ fontSize: "0.82rem", color: "#888", marginTop: "2px" }}>
                      Tâches en cours
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} color="#ccc" />
              </div>

              <div
                onClick={() => setActiveTab("reports")}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "#F0EDE8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6B1A2A",
                    }}
                  >
                    <FileText size={20} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "#1A1A1A",
                        lineHeight: 1,
                      }}
                    >
                      {loadingReports ? "…" : reports.length.toString().padStart(2, "0")}
                    </p>
                    <p style={{ fontSize: "0.82rem", color: "#888", marginTop: "2px" }}>
                      Rapports soumis
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} color="#ccc" />
              </div>

              <div
                onClick={() => setActiveTab("team")}
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "#F0EDE8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6B1A2A",
                    }}
                  >
                    <Users2 size={20} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: "#1A1A1A",
                        lineHeight: 1,
                      }}
                    >
                      {loadingMembers ? "…" : members.length}
                    </p>
                    <p style={{ fontSize: "0.82rem", color: "#888", marginTop: "2px" }}>
                      Membres de l&apos;équipe
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} color="#ccc" />
              </div>

              {createdAt && (
                <div
                  style={{
                    background: "#6B1A2A",
                    borderRadius: "14px",
                    padding: "20px",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 4px 16px rgba(107,26,42,0.25)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.6)",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      marginBottom: "12px",
                    }}
                  >
                    Date de création
                  </p>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                    }}
                  >
                    <Calendar size={14} color="rgba(255,255,255,0.8)" />
                    <span style={{ color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>
                      {createdAt}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {activeTab !== "overview" && (
            <div
              ref={tabSectionRef}
              style={{
                marginTop: "28px",
                background: "#fff",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  padding: "0 8px",
                }}
              >
                {(["team", "tasks", "reports"] as const).map((tab) => {
                  const labels: Record<Tab, string> = {
                    overview: "",
                    team: "Équipe",
                    tasks: "Tâches",
                    reports: "Rapports",
                  };
                  const isActive = tab === activeTab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: "16px 20px",
                        border: "none",
                        background: "transparent",
                        color: isActive ? "#6B1A2A" : "#999",
                        fontSize: "0.95rem",
                        fontWeight: isActive ? 700 : 500,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                        borderBottom: isActive ? "3px solid #6B1A2A" : "3px solid transparent",
                        transition: "all 0.15s",
                        borderRadius: 0,
                      }}
                    >
                      {labels[tab]}
                    </button>
                  );
                })}
                <button
                  onClick={() => setActiveTab("overview")}
                  style={{
                    marginLeft: "auto",
                    padding: "12px 16px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#aaa",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: "20px" }}>
                {activeTab === "team" && (
                  <ClientOnly>
                    <TeamsTable
                      members={members}
                      roles={[
                        ...new Set(
                          members.map((m) => m.role).filter((r): r is string => r !== null)
                        ),
                      ]}
                      loading={loadingMembers}
                      readOnly={isTM}
                    />
                  </ClientOnly>
                )}

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
          )}
        </div>
      </div>
    </>
  );
}
